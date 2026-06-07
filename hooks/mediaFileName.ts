// Cache files are named `${exerciseId}-${file}.${ext}` (see mediaCache.ts).
// exerciseIds are UUIDs — they contain hyphens — so we recover the id by
// stripping the known media suffix rather than splitting on '-'. Import-free so
// it unit-tests in a fast node project. Shared by both apps' offline subsystem
// (lifted into the design system in v0.8.0).
const SUFFIX = /-(thumbnail|preview|video)\.(jpg|gif|mp4)$/;

export function mediaFileExerciseId(fileName: string): string | null {
  const m = SUFFIX.exec(fileName);
  if (!m) return null;
  return fileName.slice(0, m.index);
}
