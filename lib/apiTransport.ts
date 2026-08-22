// The HTTP transport both apps share: one bounded, authenticated request with
// consistent error shaping.
//
// It lived as a byte-identical copy in each app and had already drifted in BOTH
// directions — the LLM timeout existed only in the practitioner app, the
// app-context header and its extraction only in the patient app. Neither
// benefited from the other's fix, and nothing made that visible.
//
// Amplify is NOT a dependency here. The caller injects `fetchIdToken`, the same
// way useMediaUri takes an injected `fetchSignedUrl`, so the design system does
// not acquire an auth library to make one HTTP call.

/**
 * Carries the HTTP status so callers can tell a permanent client error (4xx —
 * the request will never succeed as-is) from a transient one (5xx / network /
 * timeout, worth retrying). The offline-write drain uses this to drop poison
 * ops instead of retrying them forever.
 */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Hard ceiling on any single request. Without it a stalled connection (server
 * accepts but never responds, a black-holed proxy, captive portal) leaves fetch
 * hanging forever — the query stays `fetching` and a screen that gates on it
 * spins indefinitely. On timeout we abort so the promise rejects and the UI
 * falls back to cached/local data instead of waiting.
 */
export const REQUEST_TIMEOUT_MS = 15000;

/**
 * AI plan generation is not an ordinary request and must not share the ceiling
 * above. The backend is provisioned end-to-end for a long call:
 *
 *   core_go_lambda timeout_seconds = 120  ("Plan generation is the long pole")
 *   internal/llm openAIRequestTimeout = 120s
 *
 * while the app aborted at 15s — an 8x mismatch, so the client gave up long
 * before the server could possibly answer.
 *
 * Deliberately slightly ABOVE the server's 120s rather than equal to it: when
 * generation genuinely runs too long the SERVER's timeout should win and return
 * a real error the UI can show. A client that aborts first turns every slow
 * generation into an opaque cancellation with nothing to report.
 */
export const LLM_REQUEST_TIMEOUT_MS = 125000;

/** Header naming which app is asking. The server treats it as narrowing only. */
export const APP_CONTEXT_HEADER = 'X-Flexion-App';

export type ApiTransportConfig = {
  baseUrl: string;
  /**
   * Returns a bearer token. May hang — the transport bounds it, because the
   * underlying refresh takes no AbortSignal and a stall there never settles.
   */
  fetchIdToken: () => Promise<string>;
  /**
   * 'client' | 'practitioner'. Sent on every request so a person who is both a
   * practitioner and somebody's patient is resolved for the app they are
   * actually in.
   */
  appContext?: string;
};

/**
 * Bounds a promise that cannot be aborted.
 *
 * status 0, deliberately NOT 408: isPermanentFailure() treats every 4xx as
 * poison and DROPS the queued write, so a 4xx here would turn a hang into
 * silent data loss on the offline queue. 0 means "no HTTP response happened",
 * which is both true and transient — matching how an aborted fetch behaves.
 */
export async function withTimeout<T>(work: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ApiError(0, message)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Request headers. Extracted rather than inlined because the app-context
 * declaration is one line inside a spread, and re-ordering that spread is an
 * easy edit with no visible symptom — the app keeps working and a
 * practitioner-patient quietly reverts to the wrong role.
 */
export function apiHeaders(idToken: string, appContext?: string, extra?: HeadersInit): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
    ...(appContext ? { [APP_CONTEXT_HEADER]: appContext } : {}),
    ...((extra as Record<string, string>) ?? {}),
  };
}

/**
 * Only a structured { message | error } field is surfaced — never the raw body,
 * which can echo back PII (a client's email or name) or a server stack trace
 * into a user-facing error string.
 */
export function errorDetailFrom(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: unknown; message?: unknown };
    const field = parsed?.message ?? parsed?.error;
    if (typeof field === 'string' && field.length <= 200) return field;
  } catch {
    // Non-JSON body — drop it rather than surfacing raw text.
  }
  return '';
}

export type ApiTransport = {
  request: <T>(path: string, init?: RequestInit, timeoutMs?: number) => Promise<T>;
};

export function createApiTransport(config: ApiTransportConfig): ApiTransport {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  if (!baseUrl.trim()) throw new Error('createApiTransport: baseUrl is required');

  return {
    // timeoutMs is per-request: ordinary CRUD keeps the tight default while the
    // AI-generation endpoints pass LLM_REQUEST_TIMEOUT_MS. The auth handshake
    // keeps the SHORT ceiling either way — a stalled token refresh is never
    // worth waiting two minutes on, whatever the request behind it is.
    async request<T>(path: string, init?: RequestInit, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<T> {
      const idToken = await withTimeout(
        config.fetchIdToken(),
        REQUEST_TIMEOUT_MS,
        'Timed out checking your sign-in. Please try again.',
      );
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`${baseUrl}${path}`, {
          ...init,
          signal: controller.signal,
          headers: apiHeaders(idToken, config.appContext, init?.headers),
        });
        if (!res.ok) {
          const raw = await res.text().catch(() => '');
          throw new ApiError(res.status, errorDetailFrom(raw) || `Request failed (${res.status}).`);
        }
        return (await res.json()) as T;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
