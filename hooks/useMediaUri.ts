import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFetchSignedUrl } from './mediaApi';
import { localPath, isFileCached, downloadToCache } from './mediaCache';
import type { MediaFile } from './mediaFiles';

export type { MediaFile };

// CloudFront URLs expire at 60 min. Keep the cached value fresh for 45 min and
// retain it for 50 before GC (staleTime < gcTime, so a still-valid URL isn't
// refetched on every focus/mount).
const SIGNED_URL_STALE = 45 * 60 * 1000;
const SIGNED_URL_GC = 50 * 60 * 1000;

/**
 * Resolves a URI for exercise media using this priority chain:
 *   1. Local cache (instant, offline-safe)
 *   2. CloudFront signed URL (fetched via the app-injected `fetchSignedUrl`)
 *   3. directFallbackUrl — the original CDN URL stored on the exercise record
 *
 * Lifted into the design system in v0.8.6 (was duplicated per app). Crucially it
 * RESETS the URI to null while re-resolving when exerciseId/file changes, so a
 * reused player/image never momentarily shows the PREVIOUS exercise's media —
 * the practitioner's copy lacked this and could flash stale media.
 */
export function useMediaUri(
  exerciseId: string,
  file: MediaFile,
  directFallbackUrl?: string | null,
): string | null {
  const [localExists, setLocalExists] = useState<boolean | null>(null);
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (!exerciseId) {
      setUri(null);
      setLocalExists(null);
      return;
    }
    // Reset while we re-resolve: without this, `uri` keeps the PREVIOUS
    // exercise's value when `exerciseId` changes.
    setLocalExists(null);
    const exists = isFileCached(exerciseId, file);
    if (exists) {
      const path = localPath(exerciseId, file);
      setUri(path ?? null);
      setLocalExists(true);
    } else {
      setUri(null);
      setLocalExists(false);
    }
  }, [exerciseId, file]);

  const { data: signedUrlData, isError: signedUrlFailed } = useQuery({
    queryKey: ['signed-url', exerciseId, file],
    queryFn: () => getFetchSignedUrl()(exerciseId, file),
    enabled: !!exerciseId && localExists === false,
    staleTime: SIGNED_URL_STALE,
    gcTime: SIGNED_URL_GC,
    retry: 1,
  });
  const signedUrl = signedUrlData?.signedUrl ?? null;

  useEffect(() => {
    if (localExists !== false || !signedUrl) return;
    let cancelled = false;
    setUri(signedUrl);
    downloadToCache(exerciseId, file, signedUrl)
      .then((local) => {
        if (!cancelled && local) setUri(local);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [localExists, signedUrl, exerciseId, file]);

  useEffect(() => {
    if (localExists !== false) return;
    if (signedUrl) return;
    if (!signedUrlFailed && signedUrlData === undefined) return;
    if (!directFallbackUrl) return;
    setUri(directFallbackUrl);
  }, [localExists, signedUrl, signedUrlFailed, signedUrlData, directFallbackUrl]);

  return uri;
}
