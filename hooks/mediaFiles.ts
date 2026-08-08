export type PanelMediaFile = 'panel1' | 'panel2' | 'panel3' | 'panel4' | 'panel5' | 'panel6';
export type MediaFile = 'thumbnail' | 'preview' | 'video' | PanelMediaFile;

const PANEL_FILES: readonly PanelMediaFile[] = [
  'panel1',
  'panel2',
  'panel3',
  'panel4',
  'panel5',
  'panel6',
];

// The media files to fetch for an exercise: always the thumbnail, plus the
// preview/video it actually has (so we don't request files that don't exist),
// plus panel1..panelN when the exercise has ordered panel images instead of
// (or alongside) a video. Import-free → unit-testable in a fast node project.
// Shared by both apps' offline/media subsystem (lifted into the design system
// in v0.7.6; panel_count added alongside PanelCarousel).
export function mediaFilesFor(opts: {
  has_video: boolean;
  has_preview: boolean;
  panel_count?: number;
}): MediaFile[] {
  const files: MediaFile[] = ['thumbnail'];
  if (opts.has_preview) files.push('preview');
  if (opts.has_video) files.push('video');
  const panelCount = Math.max(0, Math.min(opts.panel_count ?? 0, PANEL_FILES.length));
  files.push(...PANEL_FILES.slice(0, panelCount));
  return files;
}
