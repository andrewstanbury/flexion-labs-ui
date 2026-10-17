// The real module (jest.setup.ts mocks it for component tests).
const { narrationFileName, resolveNarrationFile } = jest.requireActual('../lib/narrationFiles');

describe('narrationFileName', () => {
  it('ignores the signature so a re-signed URL hits the same file', () => {
    const a = narrationFileName('https://cdn/x/1679/male/r1/narration_2.mp3?Expires=1&Signature=A');
    const b = narrationFileName('https://cdn/x/1679/male/r1/narration_2.mp3?Expires=2&Signature=B');
    expect(a).toBe(b);
    expect(a).toMatch(/narration_2\.mp3$/);
  });

  it('different recordings get different files', () => {
    expect(narrationFileName('https://cdn/1/narration_1.mp3')).not.toBe(narrationFileName('https://cdn/2/narration_1.mp3'));
  });

  it('adds an extension when the path has none, and keeps names filesystem-safe', () => {
    expect(narrationFileName('https://cdn/a b/c?d')).toMatch(/^[a-z0-9]+-[a-zA-Z0-9._-]+\.mp3$/);
  });
});

describe('resolveNarrationFile', () => {
  it('passes a local URI straight through', () => {
    expect(resolveNarrationFile('file:///tmp/a.mp3')).toBe('file:///tmp/a.mp3');
  });
});

describe('resolveNarrationFile — downloading', () => {
  // An in-memory expo-file-system.
  function withFs(opts: { fail?: boolean; web?: boolean } = {}) {
    const files = new Map<string, number>();
    const downloads: string[] = [];
    class Directory {
      uri: string;
      constructor(...parts: (string | Directory)[]) {
        this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
      }
      get exists() {
        return true;
      }
      create() {}
    }
    class File {
      uri: string;
      constructor(dir: Directory, name: string) {
        this.uri = `${dir.uri}/${name}`;
      }
      get exists() {
        return files.has(this.uri);
      }
      get size() {
        return files.get(this.uri) ?? 0;
      }
      delete() {
        files.delete(this.uri);
      }
      move(dest: File) {
        files.set(dest.uri, files.get(this.uri) ?? 0);
        files.delete(this.uri);
      }
      static downloadFileAsync = jest.fn(async (url: string, dest: File) => {
        downloads.push(url);
        if (opts.fail) throw new Error('offline');
        files.set(dest.uri, 1234);
        return dest;
      });
    }
    // A fresh registry per test: the module requires these lazily, at call time.
    jest.resetModules();
    jest.doMock('expo-file-system', () => ({ File, Directory, Paths: { cache: new Directory('cache') } }));
    jest.doMock('react-native', () => ({ Platform: { OS: opts.web ? 'web' : 'ios' } }));
    const mod: typeof import('../lib/narrationFiles') = jest.requireActual('../lib/narrationFiles');
    return { resolve: mod.resolveNarrationFile, files, downloads };
  }
  afterEach(() => {
    jest.dontMock('expo-file-system');
    jest.dontMock('react-native');
  });

  const URL = 'https://cdn/c/r1/narration_1.mp3?Signature=abc';

  it('downloads once, then answers from the cache synchronously', async () => {
    const fs = withFs();
    const first = fs.resolve(URL);
    expect(first).toBeInstanceOf(Promise);
    const again = fs.resolve(URL); // in flight: the same download
    const uri = await first;
    expect(await again).toBe(uri);
    expect(uri).toMatch(/^cache\/flexion-narration\/.+narration_1\.mp3$/);
    expect(fs.downloads).toHaveLength(1);
    expect(fs.resolve(`${URL}&re-signed`)).toBe(uri);
  });

  it('streams the URL when the download fails', async () => {
    const fs = withFs({ fail: true });
    await expect(fs.resolve(URL)).resolves.toBe(URL);
  });

  it('streams the URL on web', () => {
    const fs = withFs({ web: true });
    expect(fs.resolve(URL)).toBe(URL);
  });
});
