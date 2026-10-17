// What the status strip says about sync, as pure data: the words, the tone and
// the icon for each state. Pure so every state is testable without rendering.
//
// The idea is Retaskable's status strip (its sync button): an icon that stays
// in view and changes with the state, its words the spoken label and the first
// lines of its dropdown, so the state is there at a glance without a label that
// comes and goes.

import type { SyncState } from '../composites/SyncStatusDot';

export type SyncTone = 'ok' | 'busy' | 'warn';

export type SyncWords = { label: string; detail: string };

export type SyncStatusView = SyncWords & {
  tone: SyncTone;
  icon: 'cloud-done-outline' | 'sync-outline' | 'cloud-offline-outline';
};

/** The default (English) words. Apps with their own copy pass `describe` to the strip. */
export function syncWords(state: SyncState, pendingCount: number): SyncWords {
  const n = Math.max(0, pendingCount);
  const changes = `${n} change${n === 1 ? '' : 's'}`;
  if (state === 'offline') {
    return {
      label: 'Offline',
      detail:
        n > 0
          ? `${changes} saved on this phone. ${n === 1 ? 'It sends' : 'They send'} when you're back online.`
          : "Anything you do is saved on this phone and sends when you're back online.",
    };
  }
  if (state === 'syncing') {
    return {
      label: n > 0 ? `Syncing ${changes}` : 'Syncing',
      detail: 'Sending what you did on this phone. Keep going: nothing is lost.',
    };
  }
  return { label: 'All changes saved', detail: "Everything you've done is saved to your account." };
}

const LOOK: Record<SyncState, Omit<SyncStatusView, keyof SyncWords>> = {
  saved: { tone: 'ok', icon: 'cloud-done-outline' },
  syncing: { tone: 'busy', icon: 'sync-outline' },
  offline: { tone: 'warn', icon: 'cloud-offline-outline' },
};

export function syncStatus(
  state: SyncState,
  pendingCount: number,
  describe: (state: SyncState, pendingCount: number) => SyncWords = syncWords,
): SyncStatusView {
  return { ...describe(state, pendingCount), ...LOOK[state] };
}

/** Whether the sync icon turns: only while syncing, and never with reduced motion. */
export function syncSpins(state: SyncState, reduceMotion: boolean): boolean {
  return state === 'syncing' && !reduceMotion;
}

/** The waiting-changes badge on the icon: hidden at 0, capped at "99+". */
export function pendingBadge(pendingCount: number): string | null {
  if (pendingCount <= 0) return null;
  return pendingCount > 99 ? '99+' : String(pendingCount);
}
