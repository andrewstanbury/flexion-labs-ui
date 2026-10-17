// The cache's source sidecars (v0.40.0): a cached file is replaced when the
// server starts serving a different object under the same exercise/file.

const mockFs = new Map<string, string>();

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-file-system', () => {
  class File {
    name: string;
    constructor(_dir: unknown, name: string) {
      this.name = name;
    }
    get uri() {
      return `file:///cache/flexion-media/${this.name}`;
    }
    get exists() {
      return mockFs.has(this.name);
    }
    delete() {
      mockFs.delete(this.name);
    }
    move(dest: File) {
      mockFs.set(dest.name, mockFs.get(this.name) ?? '');
      mockFs.delete(this.name);
    }
    write(text: string) {
      mockFs.set(this.name, text);
    }
    textSync() {
      return mockFs.get(this.name) ?? '';
    }
    static async downloadFileAsync(url: string, dest: File) {
      mockFs.set(dest.name, `downloaded:${url}`);
      return dest;
    }
  }
  class Directory {
    constructor(..._args: unknown[]) {}
    get exists() {
      return true;
    }
    create() {}
    list() {
      return [];
    }
  }
  return { File, Directory, Paths: { cache: 'file:///cache' } };
});

import { cachedSource, downloadToCache, isCachedFrom, mediaSourceOf } from '../mediaCache';

const OLD = 'https://cdn/physitrack/115/thumbnail.jpg?Signature=a';
const NEW = 'https://cdn/content-review/wi/male/panel_1.png?Signature=b';

describe('mediaCache sources', () => {
  beforeEach(() => mockFs.clear());

  it('strips the signature from a source', () => {
    expect(mediaSourceOf(NEW)).toBe('https://cdn/content-review/wi/male/panel_1.png');
  });

  it('records where a download came from', async () => {
    await downloadToCache('115', 'thumbnail', OLD);
    expect(cachedSource('115', 'thumbnail')).toBe('https://cdn/physitrack/115/thumbnail.jpg');
    expect(isCachedFrom('115', 'thumbnail', OLD.replace('Signature=a', 'Signature=z'))).toBe(true);
  });

  it('replaces the cached file when the server serves something else', async () => {
    await downloadToCache('115', 'thumbnail', OLD);
    expect(isCachedFrom('115', 'thumbnail', NEW)).toBe(false);
    await downloadToCache('115', 'thumbnail', NEW);
    expect(mockFs.get('115-thumbnail.jpg')).toBe(`downloaded:${NEW}`);
    expect(isCachedFrom('115', 'thumbnail', NEW)).toBe(true);
  });

  it('treats a file cached before sidecars existed as unknown', () => {
    mockFs.set('115-thumbnail.jpg', 'legacy');
    expect(cachedSource('115', 'thumbnail')).toBeNull();
    expect(isCachedFrom('115', 'thumbnail', OLD)).toBe(false);
  });

  it('does not download again when the cached file is current', async () => {
    await downloadToCache('115', 'thumbnail', NEW);
    mockFs.set('115-thumbnail.jpg', 'kept');
    await downloadToCache('115', 'thumbnail', NEW);
    expect(mockFs.get('115-thumbnail.jpg')).toBe('kept');
  });
});
