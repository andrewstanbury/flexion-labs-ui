import { LLM_REQUEST_TIMEOUT_MS, REQUEST_TIMEOUT_MS } from '../apiTransport';

// Ported from the practitioner app when the constants moved here in v0.28.0.
// It followed them deliberately: this is the only place the relationship
// between the client's ceiling and the BACKEND's is written down and checked,
// and leaving it behind would have quietly dropped that invariant.
//
// The backend's ceilings live in another repo (core_go_lambda
// `timeout_seconds` and internal/llm `openAIRequestTimeout`, both 120s), so
// nothing can import them — hence the duplicated constant.
const SERVER_LLM_CEILING_MS = 120_000;

describe('request timeouts', () => {
  // The bug: the app aborted AI plan generation at 15s while the backend was
  // provisioned to spend up to 120s on it. Our own AbortController fired, which
  // surfaces as `FetchRequestCanceledException` from expo/fetch and reads like
  // a network fault rather than a self-inflicted cancellation.
  it('gives AI generation longer than the backend is provisioned to take', () => {
    expect(LLM_REQUEST_TIMEOUT_MS).toBeGreaterThan(SERVER_LLM_CEILING_MS);
  });

  // Strictly greater, not equal: when generation genuinely runs too long the
  // SERVER's timeout should win and return an error the UI can show. A client
  // that aborts first turns every slow generation into an opaque cancellation
  // with nothing to report to the user.
  it('lets the server time out first, so the failure is reportable', () => {
    expect(LLM_REQUEST_TIMEOUT_MS - SERVER_LLM_CEILING_MS).toBeGreaterThanOrEqual(1_000);
  });

  // Ordinary CRUD keeps a tight ceiling. Raising the default to cover the LLM
  // case would mean every stalled read hangs a screen for two minutes — the
  // opposite of why the timeout exists.
  it('keeps ordinary requests on a short leash', () => {
    expect(REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(15_000);
    expect(LLM_REQUEST_TIMEOUT_MS).toBeGreaterThan(REQUEST_TIMEOUT_MS);
  });
});
