import { getFetchSignedUrl } from './mediaApi';
import { downloadToCache, isFileCached } from './mediaCache';
import { mediaFilesFor } from './mediaFiles';
import { useDownloadProgress } from './useDownloadProgress';

// A media-bearing exercise to fetch. Only the media flags drive the fetch;
// optional display names are carried by some call sites and ignored here.
export interface DownloadItem {
  exerciseId: string;
  has_video: boolean;
  has_preview: boolean;
  panel_count?: number;
  name_en?: string;
  name_en_us?: string;
}

// Sequential, best-effort fetch of each exercise's media into the on-disk cache.
// Marks each exercise in-flight while it downloads (so the UI can show a spinner)
// and bumps the cache version on completion so views re-render. Shared by the
// manual downloader and the auto-download prefetch; the gating policy lives in
// the callers. Uses the app-injected signed-URL fetcher (configureMediaApi).
// Lifted into the design system in v0.8.1.
export async function runMediaDownloads(items: DownloadItem[]): Promise<void> {
  const { start, finish } = useDownloadProgress.getState();
  const fetchSignedUrl = getFetchSignedUrl();
  for (const item of items) {
    if (!item.exerciseId) continue;
    start(item.exerciseId);
    try {
      for (const file of mediaFilesFor(item)) {
        if (isFileCached(item.exerciseId, file)) continue;
        try {
          const { signedUrl } = await fetchSignedUrl(item.exerciseId, file);
          if (signedUrl) await downloadToCache(item.exerciseId, file, signedUrl);
        } catch {
          // Skip this file; the on-demand useMediaUri path retries on view.
        }
      }
    } finally {
      finish(item.exerciseId);
    }
  }
}
