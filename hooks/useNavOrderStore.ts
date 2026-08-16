import { createPersistedStore } from './createPersistedStore';

// Persisted tab order + visibility for a bottom nav bar. Generic over the
// app's own key union (K) so each app supplies its own tab keys/labels while
// sharing the actual store logic — this used to be two byte-for-byte-near-
// identical `useNavFlagsStore.ts` files (visibility only, no reordering,
// deliberately gated to dev/Expo Go/non-production builds as a prototyping
// tool). Promoted into a real, always-on end-user feature: `alwaysVisible`
// lets each app protect whichever tab it can't afford to let someone hide
// (e.g. the patient app's Workout tab — "adherence is the product," per the
// original store's own comment) while every other tab stays freely
// reorderable and toggleable.
//
// Reordering is arrow-button-based (moveTab, not drag-and-drop) — this
// package deliberately avoids react-native-reanimated (see Pressable.tsx),
// and a real drag gesture needs it; see AGENTS.md's own account of
// react-native-draggable-flatlist crashing Expo Go for exactly this reason.

export interface NavOrderState<K extends string> {
  order: K[];
  hidden: Partial<Record<K, boolean>>;
  toggleTab: (key: K) => void;
  moveTab: (key: K, direction: 'up' | 'down') => void;
  reset: () => void;
}

/**
 * True when `key` may be hidden: not in `alwaysVisible`, and not the last
 * remaining visible tab (a navigator with nothing in it).
 */
export function canHideNavTab<K extends string>(
  allKeys: readonly K[],
  hidden: Partial<Record<K, boolean>>,
  key: K,
  alwaysVisible: readonly K[],
): boolean {
  if (alwaysVisible.includes(key)) return false;
  const visibleCount = allKeys.filter((k) => !hidden[k]).length;
  return !(visibleCount <= 1 && !hidden[key]);
}

function defaultHidden<K extends string>(allKeys: readonly K[]): Record<K, boolean> {
  return allKeys.reduce((acc, k) => ({ ...acc, [k]: false }), {} as Record<K, boolean>);
}

/**
 * Moves `pinned` to the end of `order`, preserving the relative order of both
 * groups. Applied on every path that can produce an order — initial state,
 * reset, moveTab and rehydration — so a pinned tab cannot end up anywhere else.
 *
 * Rehydration matters most: the order is persisted per device, so a device that
 * saved an order before a tab was pinned would otherwise keep that stale order
 * forever, with no UI left to correct it.
 */
export function pinNavTabsLast<K extends string>(order: readonly K[], pinned: readonly K[]): K[] {
  if (pinned.length === 0) return [...order];
  return [...order.filter((k) => !pinned.includes(k)), ...pinned.filter((k) => order.includes(k))];
}

/** True when `key` may be reordered — pinned tabs hold their position. */
export function canMoveNavTab<K extends string>(key: K, pinnedLast: readonly K[]): boolean {
  return !pinnedLast.includes(key);
}

export function createNavOrderStore<K extends string>(
  name: string,
  allKeys: readonly K[],
  alwaysVisible: readonly K[],
  // Tabs held at the end of the bar, in the order given. Additive and
  // defaulted, so existing callers keep their current behaviour exactly.
  pinnedLast: readonly K[] = [],
) {
  return createPersistedStore<NavOrderState<K>>(
    name,
    (set) => ({
      order: pinNavTabsLast([...allKeys], pinnedLast),
      hidden: defaultHidden(allKeys),
      toggleTab: (key) =>
        set((s) => {
          const wasVisible = !s.hidden[key];
          if (wasVisible && !canHideNavTab(allKeys, s.hidden, key, alwaysVisible)) return s;
          return { hidden: { ...s.hidden, [key]: wasVisible } };
        }),
      moveTab: (key, direction) =>
        set((s) => {
          if (!canMoveNavTab(key, pinnedLast)) return s;
          const idx = s.order.indexOf(key);
          const swapWith = direction === 'up' ? idx - 1 : idx + 1;
          if (idx < 0 || swapWith < 0 || swapWith >= s.order.length) return s;
          // Refuse to displace a pinned tab as well as to move one: without
          // this, moving the second-to-last tab down would swap it past the
          // pinned one and unpin it from the other side.
          if (!canMoveNavTab(s.order[swapWith], pinnedLast)) return s;
          const next = [...s.order];
          [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
          return { order: next };
        }),
      reset: () => set({ order: pinNavTabsLast([...allKeys], pinnedLast), hidden: defaultHidden(allKeys) }),
    }),
    {
      version: 1,
      // A persisted value from an older build could predate a tab added
      // since (missing from `order`, absent from `hidden`) — appended to the
      // end of the order and defaulted to visible, rather than rendering
      // nowhere with no way to switch it back on.
      merge: (persisted, current) => {
        const p = persisted as Partial<NavOrderState<K>> | undefined;
        const persistedOrder = (p?.order ?? []).filter((k) => allKeys.includes(k));
        const missing = allKeys.filter((k) => !persistedOrder.includes(k));
        return {
          ...current,
          ...p,
          // Re-pinned on every rehydrate, not just on first run: a device that
          // persisted an order before a tab was pinned would otherwise keep
          // that order forever, and the UI no longer offers a way to fix it.
          order: pinNavTabsLast([...persistedOrder, ...missing], pinnedLast),
          hidden: { ...defaultHidden(allKeys), ...(p?.hidden ?? {}) },
        };
      },
    },
  );
}
