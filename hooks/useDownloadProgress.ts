import { create } from 'zustand';

// Ephemeral (non-persisted) download UI state for the manual-download model.
// `inflight` flags exercises whose media is downloading right now; `version`
// bumps whenever a download or removal changes the on-disk cache, so views
// re-derive cache presence (which isn't reactive on its own). Shared by both
// apps' offline/media subsystem (lifted into the design system in v0.7.6).
interface DownloadProgress {
  inflight: Record<string, boolean>;
  version: number;
  start: (exerciseId: string) => void;
  finish: (exerciseId: string) => void;
  bump: () => void;
}

export const useDownloadProgress = create<DownloadProgress>((set) => ({
  inflight: {},
  version: 0,
  start: (id) => set((s) => ({ inflight: { ...s.inflight, [id]: true } })),
  finish: (id) =>
    set((s) => {
      const next = { ...s.inflight };
      delete next[id];
      return { inflight: next, version: s.version + 1 };
    }),
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
