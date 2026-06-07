import type { MediaFile } from './mediaFiles';

// The media subsystem needs a signed-URL fetcher, but that's built on each app's
// authed apiFetch (different base URL / auth), which the design system can't
// depend on. So each app INJECTS its `fetchSignedUrl` at startup — the same
// pattern as the apps' own `configureApiClient`. Call this once, early (next to
// configureApiClient in the root layout), before any media hook runs.

export interface SignedUrlResult {
  signedUrl: string;
}

export type FetchSignedUrl = (exerciseId: string, file: MediaFile) => Promise<SignedUrlResult>;

let _fetchSignedUrl: FetchSignedUrl | null = null;

export function configureMediaApi(opts: { fetchSignedUrl: FetchSignedUrl }): void {
  _fetchSignedUrl = opts.fetchSignedUrl;
}

export function getFetchSignedUrl(): FetchSignedUrl {
  if (!_fetchSignedUrl) {
    throw new Error(
      'configureMediaApi({ fetchSignedUrl }) must be called at app startup before media hooks run.',
    );
  }
  return _fetchSignedUrl;
}
