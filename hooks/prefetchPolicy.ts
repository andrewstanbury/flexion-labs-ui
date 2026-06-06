// Pure decision for whether it's OK to pre-download (large) exercise media right
// now. Import-free → unit-testable in a fast node project. Shared by both apps'
// offline/media subsystem (lifted into the design system in v0.7.6).
export function canPrefetch(opts: {
  connected: boolean;
  isWifi: boolean;
  allowCellular: boolean;
}): boolean {
  return opts.connected && (opts.isWifi || opts.allowCellular);
}
