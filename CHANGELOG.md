# Changelog — @flexion-labs/ui

The shared design system for the Flexion Labs client + practitioner apps. Consumed
via git tag (`github:andrewstanbury/flexion-labs-ui#vX.Y.Z`). Newest first.

## v0.8.8
- Add `createSecureKeyValueStorage` + `toSafeKey` (`lib/secureKeyValueStorage.ts`): a
  framework-agnostic factory for an encrypted-at-rest key/value store, structurally
  compatible with Amplify v6's `KeyValueStorageInterface`. The native secure store is
  injected by the consumer (no `expo-secure-store` / `aws-amplify` dependency here).
  Handles the ~2KB Android value cap (chunking) and the lack of an enumerate API
  (key index for `clear()`). Lifted from the duplicate copies in client + practitioner;
  each app now provides a thin wrapper that injects expo-secure-store.

## v0.8.7
- Add an 8px margin below the SyncStatusBar so the sync icon has breathing room above screen content.

## v0.8.6
- Fix the SyncStatusShell "double notch": Screen now drops its own top safe-area
  pad when an ancestor (the shell) already consumed it (via TopInsetConsumedContext),
  so the reserved top area is notch + the short bar — not notch×2. (The native
  SafeAreaView can't see a JS inset override, hence the explicit flag.)
- Lift useMediaUri into the design system (3-tier media resolution: local cache →
  injected signed URL → direct fallback), including the URI-reset that prevents a
  reused player/image from flashing the previous exercise's media.

## v0.8.5
- Shrink the SyncStatusBar row further (24→20px) — closer to the icon height.

## v0.8.4
- Shrink the SyncStatusBar reserved row (34→24px) + dot icon (22→18px) — the
  dedicated top bar was too tall.

## v0.8.3
- Give the sync indicator dedicated, non-overlapping space. Add `SyncStatusBar`
  (a thin top row hosting the dot at the right, with an inline tap-to-reveal
  detail) and `SyncStatusShell` (wraps the screen stack: pads the notch + bar
  once, zeroes the top inset for descendants so screens don't double-pad). Both
  apps now use the same top-right placement via the shell. `SyncStatusDot`
  (popover variant) and `SyncStatusIcon`/`syncStatusLabel` exported too.

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
