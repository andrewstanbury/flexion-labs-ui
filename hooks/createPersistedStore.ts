import { create, type StateCreator } from 'zustand';
import { persist, createJSONStorage, type PersistOptions } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Every on-device persisted preference in this codebase (theme, sidebar
// collapse, audio mixing, feature flags, and — per app — reminders,
// download prefs, app lock, session prefs, locale, nav-flags, ...) was its
// own hand-copied `create(persist(...))` block, identical apart from the
// state shape and the storage key. This collapses that boilerplate to one
// call, still returning a genuine Zustand store (subscribable, selectable,
// and readable outside React via `.getState()` — unlike a plain
// `useState`-backed persisted hook, which only apps like Strata's Quorum
// use because nothing there reads settings state outside a component).
//
// `options` accepts any Zustand persist option except `name`/`storage`
// (fixed by this factory) — e.g. `version`/`migrate` for a store whose
// shape has changed since an earlier release (see useFeatureFlagsStore).
export function createPersistedStore<T>(
  name: string,
  initializer: StateCreator<T, [], []>,
  options?: Omit<PersistOptions<T>, 'name' | 'storage'>,
) {
  return create<T>()(
    persist(initializer, {
      name,
      storage: createJSONStorage(() => AsyncStorage),
      ...options,
    }),
  );
}
