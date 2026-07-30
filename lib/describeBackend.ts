// Which backend the app is actually talking to.
//
// Exists because "is it on AWS yet?" was, for a while, a question nobody in the
// app could answer. The API base is an env var baked in at build time, so the
// only way to know was to read eas.json — and during a provider migration that
// is exactly the fact you most need visible.
//
// Pure and string-only on purpose: it takes the URL rather than reading
// process.env, so it is testable and the apps stay in charge of where the value
// comes from.

export type BackendProvider = 'AWS' | 'Railway' | 'Local' | 'Unknown';

export interface BackendInfo {
  provider: BackendProvider;
  /** Host only — the path carries no useful signal and makes the pill too wide. */
  host: string;
  /** Short label for the status bar pill. */
  label: string;
}

/**
 * Classify an API base URL by hosting provider.
 *
 * Matching is on the host, not the whole URL, so a path segment that happens to
 * contain "railway" cannot flip the label.
 */
export function describeBackend(apiUrl: string | undefined | null): BackendInfo {
  const raw = (apiUrl ?? '').trim();
  if (!raw) return { provider: 'Unknown', host: '', label: 'no API URL' };

  let host: string;
  try {
    // Tolerate a bare host with no scheme; URL requires one.
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`).host;
  } catch {
    return { provider: 'Unknown', host: raw, label: raw };
  }

  const h = host.toLowerCase();

  // Local first: a tunnel or LAN address is never "the backend we shipped".
  if (h === 'localhost' || h.startsWith('localhost:') || h.startsWith('127.0.0.1') || h.startsWith('10.') || h.startsWith('192.168.')) {
    return { provider: 'Local', host, label: 'LOCAL' };
  }

  // Lambda Function URLs, API Gateway and CloudFront all count as AWS — the
  // point of the badge is the provider, not which AWS product is in front.
  if (
    h.endsWith('.on.aws') ||
    h.endsWith('.amazonaws.com') ||
    h.endsWith('.cloudfront.net')
  ) {
    return { provider: 'AWS', host, label: 'AWS' };
  }

  if (h.endsWith('.railway.app') || h.endsWith('.up.railway.app')) {
    return { provider: 'Railway', host, label: 'RAILWAY' };
  }

  // A custom domain in front of either provider lands here. Showing the host is
  // more honest than guessing — and if it is unexpected, that is worth seeing.
  return { provider: 'Unknown', host, label: host };
}
