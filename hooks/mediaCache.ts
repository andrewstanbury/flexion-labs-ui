import { Platform } from 'react-native';
import { File, Directory, Paths } from 'expo-file-system/next';
import type { MediaFile } from './mediaFiles';
import { mediaFileExerciseId } from './mediaFileName';

// On-disk cache for exercise media (thumbnail/preview/video). Shared by both
// apps' offline subsystem (lifted into the design system in v0.8.0). Pure
// file-system layer — no API/auth dependency; callers pass already-signed URLs.
// expo-file-system/next is not supported on web — all operations are no-ops there.

const WEB = Platform.OS === 'web';

const CACHE_DIR = WEB ? null : new Directory(Paths.cache, 'flexion-media');

function fileRef(exerciseId: string, file: MediaFile): File | null {
  if (WEB || !CACHE_DIR) return null;
  const ext = file === 'video' ? 'mp4' : file === 'preview' ? 'gif' : 'jpg';
  return new File(CACHE_DIR, `${exerciseId}-${file}.${ext}`);
}

export function localPath(exerciseId: string, file: MediaFile): string | null {
  return fileRef(exerciseId, file)?.uri ?? null;
}

export function isFileCached(exerciseId: string, file: MediaFile): boolean {
  try {
    return fileRef(exerciseId, file)?.exists ?? false;
  } catch {
    return false;
  }
}

// In-flight downloads keyed by `${exerciseId}-${file}`. Concurrent callers (the
// auto-download pass, its reconnect retry, and a manual tap can all overlap)
// share the same promise instead of racing two writes to the same destination.
const inFlight = new Map<string, Promise<string | null>>();

function ext(file: MediaFile): string {
  return file === 'video' ? 'mp4' : file === 'preview' ? 'gif' : 'jpg';
}

export function downloadToCache(
  exerciseId: string,
  file: MediaFile,
  signedUrl: string,
): Promise<string | null> {
  if (WEB || !CACHE_DIR) return Promise.resolve(null);
  const key = `${exerciseId}-${file}`;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const p = doDownload(exerciseId, file, signedUrl).finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

async function doDownload(
  exerciseId: string,
  file: MediaFile,
  signedUrl: string,
): Promise<string | null> {
  if (WEB || !CACHE_DIR) return null;
  const dest = fileRef(exerciseId, file);
  if (!dest) return null;
  // Download to a sibling `.part` file, then atomically move it into place on
  // success. A download interrupted mid-stream (Wi-Fi drop, app kill, disk
  // full) thus never leaves a truncated file at the real path — which
  // `isFileCached`/`dest.exists` would otherwise treat as a complete cache hit
  // and serve as an unplayable video.
  const tmp = new File(CACHE_DIR, `${exerciseId}-${file}.${ext(file)}.part`);
  try {
    if (dest.exists) return dest.uri;
    if (!CACHE_DIR.exists) CACHE_DIR.create({ intermediates: true, idempotent: true });
    // Clear any stale partial left by a previously interrupted attempt.
    try {
      if (tmp.exists) tmp.delete();
    } catch {
      // best-effort
    }
    await File.downloadFileAsync(signedUrl, tmp);
    try {
      if (dest.exists) dest.delete();
    } catch {
      // best-effort
    }
    tmp.move(dest);
    return dest.uri;
  } catch {
    try {
      if (tmp.exists) tmp.delete();
    } catch {
      // best-effort
    }
    return null;
  }
}

// Soft cap on the on-disk media cache. Videos are by far the biggest cached
// asset (Physitrack averages ~3–6 MB each); a few hundred exercises can quickly
// grow past a gigabyte. Auto-download pulls every active program's media, so the
// active set needs headroom; we trim oldest-first once the directory exceeds
// this size (on startup and after each prefetch pass).
export const CACHE_BYTE_LIMIT = 500 * 1024 * 1024;

export function cleanupCache(limit = CACHE_BYTE_LIMIT): void {
  if (WEB || !CACHE_DIR) return;
  try {
    if (!CACHE_DIR.exists) return;
    const entries = CACHE_DIR.list().filter((e): e is File => e instanceof File);
    let total = 0;
    for (const f of entries) total += f.size ?? 0;
    if (total <= limit) return;
    // Sort oldest → newest by modificationTime; files without an mtime are
    // assumed brand-new and protected.
    entries.sort((a, b) => (a.modificationTime ?? Infinity) - (b.modificationTime ?? Infinity));
    for (const f of entries) {
      if (total <= limit) break;
      const sz = f.size ?? 0;
      try {
        f.delete();
        total -= sz;
      } catch {
        // Best-effort. A failed delete shouldn't break startup.
      }
    }
  } catch {
    // Best-effort cleanup. Never throws into the caller.
  }
}

// Delete cached media whose exerciseId isn't in `keep`. The offline prefetcher
// calls this after a pass so the cache tracks the current active-assignment set
// — without it, media for dropped/expired assignments would linger until the
// size cap eventually evicted it.
export function evictExcept(keep: Set<string>): void {
  if (WEB || !CACHE_DIR) return;
  try {
    if (!CACHE_DIR.exists) return;
    for (const e of CACHE_DIR.list()) {
      if (!(e instanceof File)) continue;
      const name = e.uri.split('/').pop() ?? '';
      const id = mediaFileExerciseId(name);
      if (id && !keep.has(id)) {
        try {
          e.delete();
        } catch {
          // Best-effort; a failed delete shouldn't abort the sweep.
        }
      }
    }
  } catch {
    // Best-effort. Never throws into the caller.
  }
}

// Whether an exercise counts as "downloaded for offline" — its playable media
// is on disk. Keyed off the video (or the preview when there's no video), NOT
// the thumbnail, since thumbnails cache incidentally just from browsing lists.
export function isExerciseCached(
  exerciseId: string,
  hasVideo: boolean,
  hasPreview: boolean,
): boolean {
  if (hasVideo) return isFileCached(exerciseId, 'video');
  if (hasPreview) return isFileCached(exerciseId, 'preview');
  return false;
}

// Total bytes currently held by the on-disk media cache. Powers the
// Settings → Offline storage readout.
export function cacheSizeBytes(): number {
  if (WEB || !CACHE_DIR) return 0;
  try {
    if (!CACHE_DIR.exists) return 0;
    let total = 0;
    for (const e of CACHE_DIR.list()) {
      if (e instanceof File) total += e.size ?? 0;
    }
    return total;
  } catch {
    return 0;
  }
}

// Wipe all downloaded media. Re-downloads on the next prefetch pass (Wi-Fi /
// opted-in cellular) or on demand when a screen opens. Best-effort.
export function clearCache(): void {
  if (WEB || !CACHE_DIR) return;
  try {
    if (!CACHE_DIR.exists) return;
    for (const e of CACHE_DIR.list()) {
      if (!(e instanceof File)) continue;
      try {
        e.delete();
      } catch {
        // Best-effort; skip files that fail to delete.
      }
    }
  } catch {
    // Best-effort. Never throws into the caller.
  }
}

// Bytes cached for a specific set of exerciseIds (all file kinds) — powers the
// per-program storage breakdown.
export function cacheSizeForExercises(exerciseIds: string[]): number {
  if (WEB || !CACHE_DIR) return 0;
  const want = new Set(exerciseIds);
  try {
    if (!CACHE_DIR.exists) return 0;
    let total = 0;
    for (const e of CACHE_DIR.list()) {
      if (!(e instanceof File)) continue;
      const id = mediaFileExerciseId(e.uri.split('/').pop() ?? '');
      if (id && want.has(id)) total += e.size ?? 0;
    }
    return total;
  } catch {
    return 0;
  }
}

// Delete cached media for a set of exerciseIds (one program's exercises).
// Best-effort; shared exercises re-download on next view / prefetch.
export function clearExercises(exerciseIds: string[]): void {
  if (WEB || !CACHE_DIR) return;
  const want = new Set(exerciseIds);
  try {
    if (!CACHE_DIR.exists) return;
    for (const e of CACHE_DIR.list()) {
      if (!(e instanceof File)) continue;
      const id = mediaFileExerciseId(e.uri.split('/').pop() ?? '');
      if (id && want.has(id)) {
        try {
          e.delete();
        } catch {
          // Best-effort; skip files that fail to delete.
        }
      }
    }
  } catch {
    // Best-effort. Never throws into the caller.
  }
}
