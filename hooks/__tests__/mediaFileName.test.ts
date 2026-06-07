import { mediaFileExerciseId } from '../mediaFileName';

describe('mediaFileExerciseId', () => {
  it('recovers a UUID exerciseId (which contains hyphens) from a cache filename', () => {
    const id = '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d';
    expect(mediaFileExerciseId(`${id}-video.mp4`)).toBe(id);
    expect(mediaFileExerciseId(`${id}-preview.gif`)).toBe(id);
    expect(mediaFileExerciseId(`${id}-thumbnail.jpg`)).toBe(id);
  });

  it('returns null for names without a known media suffix', () => {
    expect(mediaFileExerciseId('not-a-media-file.txt')).toBeNull();
    expect(mediaFileExerciseId('abc-video.part')).toBeNull();
    expect(mediaFileExerciseId('')).toBeNull();
  });
});
