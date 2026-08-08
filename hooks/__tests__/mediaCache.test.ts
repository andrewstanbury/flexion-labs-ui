// Unit test for the on-disk media cache. We mock `expo-file-system` with a
// tiny in-memory FS backend so the real cache logic (size-cap LRU eviction,
// disk-truth listing) runs in the fast node lane — same approach as the other
// offline tests, which stub the FS layer rather than touch expo-file-system.

type FakeFile = {
  name: string;
  size: number;
  modificationTime: number;
};

// Shared in-memory store keyed by file name. Reset per test via resetFakeFs().
const mockFs = new Map<string, FakeFile>();

function resetFakeFs() {
  mockFs.clear();
}

function seedFile(name: string, size: number, modificationTime: number) {
  mockFs.set(name, { name, size, modificationTime });
}

jest.mock('expo-file-system', () => {
  // The cache directory lives under Paths.cache; we ignore the parent path and
  // just track files by name in the shared map.
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
    get size() {
      return mockFs.get(this.name)?.size ?? 0;
    }
    get modificationTime() {
      return mockFs.get(this.name)?.modificationTime;
    }
    delete() {
      mockFs.delete(this.name);
    }
  }

  class Directory {
    constructor(..._args: unknown[]) {}
    get exists() {
      return true;
    }
    create() {}
    list(): File[] {
      return [...mockFs.keys()].map((name) => new File(undefined, name));
    }
  }

  return { File, Directory, Paths: { cache: 'file:///cache' } };
});

import {
  cleanupCache,
  listCachedExerciseIds,
  cacheSizeBytes,
  CACHE_BYTE_LIMIT,
  isExerciseCached,
} from '../mediaCache';

describe('mediaCache (in-memory FS backend)', () => {
  beforeEach(() => resetFakeFs());

  describe('cleanupCache — size-cap LRU eviction', () => {
    it('evicts oldest-first until under the byte limit', () => {
      const MB = 1024 * 1024;
      // Three video files, 200 MB each (600 MB total) — over a 500 MB cap.
      // mtimes: a oldest, c newest.
      seedFile('a-video.mp4', 200 * MB, 1000);
      seedFile('b-video.mp4', 200 * MB, 2000);
      seedFile('c-video.mp4', 200 * MB, 3000);

      cleanupCache(); // default CACHE_BYTE_LIMIT = 500 MB

      // Evicts oldest (a) → 400 MB, now under cap; b and c survive.
      expect(mockFs.has('a-video.mp4')).toBe(false);
      expect(mockFs.has('b-video.mp4')).toBe(true);
      expect(mockFs.has('c-video.mp4')).toBe(true);
      expect(cacheSizeBytes()).toBe(400 * MB);
    });

    it('keeps evicting in mtime order when one removal is not enough', () => {
      const MB = 1024 * 1024;
      // 4 x 200 MB = 800 MB, cap 500 MB → must drop the two oldest (a, b).
      seedFile('a-video.mp4', 200 * MB, 1000);
      seedFile('b-video.mp4', 200 * MB, 2000);
      seedFile('c-video.mp4', 200 * MB, 3000);
      seedFile('d-video.mp4', 200 * MB, 4000);

      cleanupCache(500 * MB);

      expect(mockFs.has('a-video.mp4')).toBe(false);
      expect(mockFs.has('b-video.mp4')).toBe(false);
      expect(mockFs.has('c-video.mp4')).toBe(true);
      expect(mockFs.has('d-video.mp4')).toBe(true);
    });

    it('is a no-op when total size is under the limit', () => {
      const MB = 1024 * 1024;
      seedFile('a-video.mp4', 100 * MB, 1000);
      seedFile('b-video.mp4', 100 * MB, 2000);

      cleanupCache(500 * MB);

      expect(mockFs.size).toBe(2);
    });

    it('uses CACHE_BYTE_LIMIT as the default cap (500 MB)', () => {
      expect(CACHE_BYTE_LIMIT).toBe(500 * 1024 * 1024);
    });
  });

  describe('listCachedExerciseIds — disk-truth playable set', () => {
    it('returns exerciseIds with video/preview media and excludes thumbnails', () => {
      // UUID-style ids (contain hyphens) to exercise the suffix-strip parser.
      seedFile('11111111-1111-1111-1111-111111111111-video.mp4', 10, 1);
      seedFile('22222222-2222-2222-2222-222222222222-preview.gif', 10, 1);
      // Thumbnail-only exercise — must be excluded.
      seedFile('33333333-3333-3333-3333-333333333333-thumbnail.jpg', 10, 1);

      const ids = listCachedExerciseIds().sort();

      expect(ids).toEqual([
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
      ]);
      expect(ids).not.toContain('33333333-3333-3333-3333-333333333333');
    });

    it('dedupes an exercise that has both a thumbnail and a video', () => {
      seedFile('ex1-thumbnail.jpg', 10, 1);
      seedFile('ex1-video.mp4', 10, 1);

      expect(listCachedExerciseIds()).toEqual(['ex1']);
    });

    it('returns an empty list when only thumbnails are cached', () => {
      seedFile('ex1-thumbnail.jpg', 10, 1);
      expect(listCachedExerciseIds()).toEqual([]);
    });
  });

  describe('isExerciseCached — panel-image exercises', () => {
    it('is false for a panel exercise with none of its panels downloaded', () => {
      expect(isExerciseCached('ex1', false, false, 3)).toBe(false);
    });

    it('is false while only some panels are downloaded', () => {
      seedFile('ex1-panel1.jpg', 10, 1);
      seedFile('ex1-panel2.jpg', 10, 1);
      expect(isExerciseCached('ex1', false, false, 3)).toBe(false);
    });

    it('is true once every panel is downloaded', () => {
      seedFile('ex1-panel1.jpg', 10, 1);
      seedFile('ex1-panel2.jpg', 10, 1);
      seedFile('ex1-panel3.jpg', 10, 1);
      expect(isExerciseCached('ex1', false, false, 3)).toBe(true);
    });

    it('still prefers video/preview over panels when both are present', () => {
      seedFile('ex1-panel1.jpg', 10, 1);
      // has_video true but the video itself isn't downloaded yet.
      expect(isExerciseCached('ex1', true, false, 1)).toBe(false);
    });

    it('defaults panelCount to 0, matching pre-panel behaviour', () => {
      expect(isExerciseCached('ex1', false, false)).toBe(false);
    });
  });
});
