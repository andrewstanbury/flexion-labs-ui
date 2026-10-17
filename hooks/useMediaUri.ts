import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFetchSignedUrl } from './mediaApi';
import { localPath, isFileCached, isCachedFrom, downloadToCache } from './mediaCache';
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
 * ⚠️ Step 3 CANNOT FIRE against core-go as things stand, and must not be relied
 * on as a safety net. Two independent reasons:
 *
 *   - `scripts/import-to-postgres.js` writes video_url / thumbnail_url /
 *     preview_url as literal NULL, so core-go omits them from the response and
 *     every caller passes `undefined` here. (The DynamoDB catalogue in
 *     flexion-labs-exercises DOES populate them, which is why the parameter
 *     still exists — a consumer of that API could use it.)
 *   - Even if a CloudFront path were stored, it would 403: the distribution
 *     requires a trusted key group, so unsigned requests return
 *     `MissingKey`. Only the original media.physitrack.com URLs work unsigned,
 *     and the product deliberately migrated off that third-party CDN.
 *
 * Consequence, observed for real on 2026-07-31: when signing broke (the Lambda
 * was missing CLOUDFRONT_PRIVATE_KEY after the AWS cutover), NO media rendered
 * anywhere in either app. There was no degraded mode. If you want one, it needs
 * signed-URL caching or an unsigned origin — not this parameter.
 *
 * Lifted into the design system in v0.8.6 (was duplicated per app). Crucially it
 * RESETS the URI to null while re-resolving when exerciseId/file changes, so a
 * reused player/image never momentarily shows the PREVIOUS exercise's media —
 * the practitioner's copy lacked this and could flash stale media.
 *
 * v0.40.0: a cache hit still asks the server (when online) which object it
 * serves now, and re-downloads when that changed. Before, a cached file was
 * final: an exercise viewed before its generated panels were approved kept its
 * original thumbnail on that phone indefinitely. The cached file shows at once
 * and offline, exactly as before; it is only replaced when the server
 * disagrees.
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
    // Asked even on a cache hit, to learn whether the cached copy is current.
    enabled: !!exerciseId && localExists !== null,
    staleTime: SIGNED_URL_STALE,
    gcTime: SIGNED_URL_GC,
    retry: 1,
  });
  const signedUrl = signedUrlData?.signedUrl ?? null;

  useEffect(() => {
    if (localExists === null || !signedUrl) return;
    // Cached and current: nothing to do.
    if (localExists && isCachedFrom(exerciseId, file, signedUrl)) return;
    let cancelled = false;
    // Not cached: show the remote file while it downloads. Cached but stale:
    // keep showing the cached one until the replacement has landed.
    if (!localExists) setUri(signedUrl);
    downloadToCache(exerciseId, file, signedUrl)
      .then((local) => {
        // A cache-busting suffix: the replacement lands at the same path, and
        // an image component would otherwise keep the old bitmap for that URI.
        if (!cancelled && local) setUri(localExists ? `${local}?v=${Date.now()}` : local);
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
