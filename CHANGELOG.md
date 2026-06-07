# Changelog — @flexion-labs/ui

The shared design system for the Flexion Labs client + practitioner apps. Consumed
via git tag (`github:andrewstanbury/flexion-labs-ui#vX.Y.Z`). Newest first.

## v0.8.2
- Add `SyncStatusDot` — a persistent, tappable header indicator for offline-first
  sync state (saved / syncing / offline + pending count). Pure presentation; each
  app computes the state from its own queues + connectivity via a `useSyncStatus`.

## v0.8.1
- Offline consolidation Phase 3b: lift `downloadMedia` (`runMediaDownloads`) and add
  `configureMediaApi({ fetchSignedUrl })` — apps inject their signed-URL fetcher at
  startup (next to `configureApiClient`) so the media subsystem can live here without
  depending on an app's `apiFetch`. (`useMediaUri` stays per-app for now.)

## v0.8.0
- Offline consolidation Phase 3 (foundation): lift the on-disk media cache layer
  — `mediaCache` (localPath / isFileCached / downloadToCache / cleanupCache /
  evictExcept / isExerciseCached / cacheSizeBytes / clearCache /
  cacheSizeForExercises / clearExercises) + the `mediaFileExerciseId` filename
  helper, with `MediaFile` sourced from the lifted `mediaFiles`. Behavior-
  preserving reconciliation (identical filename scheme + equivalent ID
  extraction). Declares `expo-file-system` as a peerDependency. **Touches offline
  caching — verify offline download/playback on device.**

## v0.7.6
- Begin consolidating the apps' duplicated offline/media subsystem: lift the
  import-light, logic-identical leaf primitives — `mediaFilesFor` (+ `MediaFile`
  type), `canPrefetch`, `useDownloadProgress`. (The heavier, diverged cluster —
  `mediaCache`, `useMediaUri`, the downloaders/stores — is entangled with the
  per-app `packages/api` and is a later phase.)

## v0.7.5
- Lift `useAudioMixingStore` (the "don't pause background music" preference, identical
  in both apps) into the package; both apps now re-export it.
- Lift a generic `useHaptic(enabled)` helper (success/light haptic + Expo-Go
  white-screen guard); the practitioner wraps it with its own preference.
- Declare `expo-haptics` as a peerDependency.

## v0.7.4
- Lift `useTabBarPadding` into the package — bottom inset so scroll content clears
  the floating tab bar (falls back to the safe-area inset off-tab). Declare
  `@react-navigation/bottom-tabs` as a peerDependency. Apps re-export it.

## v0.7.3
- Add `Input.Area` — a real multiline textarea (top-aligned, comfortable height),
  replacing the cramped `<Input.Text multiline />`.

## v0.7.2
- `Button` tints its left/right icon to the label color on every variant, so the
  icon and text always match (no more white icon next to dark text).

## v0.7.1
- Unify the primary `Button`'s border and 3D "depression" edge to one soft color.

## v0.7.0
- Soften the `blossom` pastel-pink ramp (the earlier pink read too vibrant on the
  cream surfaces); lighten the Button border/edge.
- `Text` follows the phone's OS text size natively (`maxFontSizeMultiplier` cap)
  instead of the in-app `FontScaleProvider` multiplier (now a deprecated no-op).

## v0.6.0
- Pastel-pink light mode / sage-green dark mode. Add the `blossom` ramp and the
  `accent*` fill tokens (`accentSurface`/`accentOn`/`accentBorder`/`accentEdge`) so
  filled accents carry a readable foreground. `Button`, `SegmentedControl`,
  `ToggleRow` resolve their accent through the theme.

## v0.5.0
- Share `appLockLogic`, `useIsDark`, `useThemeStore`.

## v0.4.0
- Tactile Duolingo-style `Button` press (raised face drops onto its base).

## v0.3.1
- Fix: include `lib/` in the published files (`formatBytes` was missing). This is
  why the package has **no `files` whitelist** — see CLAUDE.md; do not reintroduce one.

## v0.3.0
- Add `StorageBar`, `OfflineBanner`, `formatBytes`.

## v0.2.0
- **Breaking:** drop `buttonShape`; `Button` is always the raised look. (`useButtonShape`
  removed — do not reference it.)

## v0.1.0
- Initial shared design system: tokens, `UIProvider`/theme, primitives, composites,
  shell components.
