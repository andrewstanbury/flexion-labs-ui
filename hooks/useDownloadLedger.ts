import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Device-wide record of downloaded exercise media, keyed by exerciseId — the
// "kept on record" half of the offline subsystem. The on-disk cache
// (mediaCache) is content-addressed by exerciseId, so it already de-duplicates
// (one file per exercise, shared across programs). This ledger remembers the
// display name + media flags for each downloaded exercise so the Manage
// Downloads screen can list and delete EVERYTHING on disk — including media for
// programs that have since changed or been removed — instead of only what the
// current programs reference. Without it, downloaded media for a dropped program
// would be on disk but invisible (and so undeletable) in the UI.
//
// Source-of-truth rule: the disk is authoritative. `reconcile(cachedIds)` keeps
// the ledger honest against it — entries whose file is gone (evicted by the
// size cap, or deleted out-of-band) are dropped, and any cached exercise missing
// from the ledger is added as a minimal entry so nothing on disk is ever
// orphaned. Shared by both apps (lifted into @flexion-labs/ui).

export interface DownloadLedgerEntry {
  exerciseId: string;
  name_en?: string;
  name_en_us?: string;
  has_video?: boolean;
  has_preview?: boolean;
  updatedAt: number;
}

interface DownloadLedgerState {
  entries: Record<string, DownloadLedgerEntry>;
  // Upsert entries when media is downloaded. Merges over any existing entry so a
  // later record with richer metadata wins; bumps updatedAt.
  record: (items: Omit<DownloadLedgerEntry, 'updatedAt'>[], now: number) => void;
  // Forget specific exercises (called alongside clearExercises on the disk side).
  remove: (exerciseIds: string[]) => void;
  // Make the ledger match the disk: drop entries with no cached file; add a
  // minimal entry for any cached exercise the ledger doesn't know about (so it's
  // always listable + deletable). Pass listCachedExerciseIds() + a timestamp.
  reconcile: (cachedIds: string[], now: number) => void;
  clear: () => void;
}

export const useDownloadLedger = create<DownloadLedgerState>()(
  persist(
    (set) => ({
      entries: {},
      record: (items, now) =>
        set((s) => {
          const entries = { ...s.entries };
          for (const it of items) {
            if (!it.exerciseId) continue;
            entries[it.exerciseId] = { ...entries[it.exerciseId], ...it, updatedAt: now };
          }
          return { entries };
        }),
      remove: (exerciseIds) =>
        set((s) => {
          if (exerciseIds.length === 0) return s;
          const entries = { ...s.entries };
          for (const id of exerciseIds) delete entries[id];
          return { entries };
        }),
      reconcile: (cachedIds, now) =>
        set((s) => {
          const cached = new Set(cachedIds);
          const entries: Record<string, DownloadLedgerEntry> = {};
          // Keep only entries that still have a file on disk.
          for (const id of cachedIds) {
            entries[id] = s.entries[id] ?? { exerciseId: id, updatedAt: now };
          }
          // (entries for ids not in `cached` are dropped by omission above)
          // Stable no-op short-circuit: if nothing changed, return prior state.
          const prevIds = Object.keys(s.entries);
          if (prevIds.length === cached.size && prevIds.every((id) => cached.has(id))) {
            return s;
          }
          return { entries };
        }),
      clear: () => set({ entries: {} }),
    }),
    {
      name: 'download-ledger',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
