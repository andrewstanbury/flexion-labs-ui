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

export function createNavOrderStore<K extends string>(
  name: string,
  allKeys: readonly K[],
  alwaysVisible: readonly K[],
) {
  return createPersistedStore<NavOrderState<K>>(
    name,
    (set) => ({
      order: [...allKeys],
      hidden: defaultHidden(allKeys),
      toggleTab: (key) =>
        set((s) => {
          const wasVisible = !s.hidden[key];
          if (wasVisible && !canHideNavTab(allKeys, s.hidden, key, alwaysVisible)) return s;
          return { hidden: { ...s.hidden, [key]: wasVisible } };
        }),
      moveTab: (key, direction) =>
        set((s) => {
          const idx = s.order.indexOf(key);
          const swapWith = direction === 'up' ? idx - 1 : idx + 1;
          if (idx < 0 || swapWith < 0 || swapWith >= s.order.length) return s;
          const next = [...s.order];
          [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
          return { order: next };
        }),
      reset: () => set({ order: [...allKeys], hidden: defaultHidden(allKeys) }),
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
          order: [...persistedOrder, ...missing],
          hidden: { ...defaultHidden(allKeys), ...(p?.hidden ?? {}) },
        };
      },
    },
  );
}
