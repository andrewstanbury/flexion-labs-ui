// Narration recordings, fetched to local files before they play. A local file
// loads in milliseconds and never buffers mid-line; a signed CDN URL streamed
// at the moment its panel starts could take a second or more, which on a
// device read as a late or missing narrator.
//
// Files are keyed by the URL WITHOUT its query string: the signature changes
// every time a URL is signed, the recording at a path does not. Returns the
// local URI synchronously when it is already cached, otherwise a promise; on
// web, or if anything fails, the original URL (the player streams it).

type FS = typeof import('expo-file-system');
let fsModule: FS | null | undefined;
function loadFs(): FS | null {
  if (fsModule === undefined) {
    try {
      // Loaded on first use, never at import: see PanelCarousel's note on
      // native modules and index.ts.
      fsModule = require('expo-file-system') as FS;
    } catch {
      fsModule = null;
    }
  }
  return fsModule;
}

/** A stable, filesystem-safe name for a recording URL (query ignored). */
export function narrationFileName(url: string): string {
  const path = url.split(/[?#]/)[0];
  let hash = 5381;
  for (let i = 0; i < path.length; i++) hash = ((hash * 33) ^ path.charCodeAt(i)) >>> 0;
  const tail = path
    .split('/')
    .slice(-3)
    .join('-')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-80);
  const ext = /\.[a-z0-9]{2,4}$/i.test(tail) ? '' : '.mp3';
  return `${hash.toString(36)}-${tail}${ext}`;
}

const inFlight = new Map<string, Promise<string>>();

export function resolveNarrationFile(url: string): string | Promise<string> {
  if (!/^https?:/i.test(url)) return url; // already local (file:, asset)
  const fs = loadFs();
  let isWeb = false;
  try {
    isWeb = require('react-native').Platform.OS === 'web';
  } catch {
    // no platform info: assume native
  }
  if (!fs || isWeb) return url;
  try {
    const dir = new fs.Directory(fs.Paths.cache, 'flexion-narration');
    const name = narrationFileName(url);
    const dest = new fs.File(dir, name);
    if (dest.exists && (dest.size ?? 0) > 0) return dest.uri;
    const pending = inFlight.get(name);
    if (pending) return pending;
    const download = (async () => {
      if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
      // Into a .part file, then moved into place: an interrupted download never
      // leaves a truncated file that later reads as cached.
      const tmp = new fs.File(dir, `${name}.part`);
      try {
        if (tmp.exists) tmp.delete();
      } catch {
        // best-effort
      }
      await fs.File.downloadFileAsync(url, tmp);
      if (dest.exists) dest.delete();
      tmp.move(dest);
      return dest.uri;
    })()
      .catch(() => url)
      .finally(() => inFlight.delete(name));
    inFlight.set(name, download);
    return download;
  } catch {
    return url;
  }
}
