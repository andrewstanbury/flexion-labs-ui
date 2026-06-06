export type MediaFile = 'thumbnail' | 'preview' | 'video';

// The media files to fetch for an exercise: always the thumbnail, plus the
// preview/video it actually has (so we don't request files that don't exist).
// Import-free → unit-testable in a fast node project. Shared by both apps'
// offline/media subsystem (lifted into the design system in v0.7.6).
export function mediaFilesFor(opts: {
  has_video: boolean;
  has_preview: boolean;
}): MediaFile[] {
  const files: MediaFile[] = ['thumbnail'];
  if (opts.has_preview) files.push('preview');
  if (opts.has_video) files.push('video');
  return files;
}
