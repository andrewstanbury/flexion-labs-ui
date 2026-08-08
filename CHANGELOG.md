# Changelog — @flexion-labs/ui

The shared design system for the Flexion Labs client + practitioner apps. Consumed
via git tag (`github:andrewstanbury/flexion-labs-ui#vX.Y.Z`). Newest first.

## v0.20.6

`PanelCarousel` no longer behaves like a slider — no swipe gesture, no page
dots, no ScrollView. Frames now crossfade in place, and playback **stops on
the last panel instead of looping** (a video that ends, not a GIF that
repeats). Matches "identical to a video player" rather than a carousel: the
viewer can't swipe mid-exercise anyway, so paging UI was never load-bearing,
just visual noise that read as "slider" instead of "video."

Same props as v0.20.5 (`autoPlay`, `active`, `intervalMs`, `style`,
`aspectRatio`) — this is a rendering/interaction rewrite, not an API change.

## v0.20.5

`PanelCarousel` auto-plays by default — steps through panels on a timer,
looping, like a video played hands-free. A static image sequence with no
auto-advance isn't usable mid-exercise, when the viewer can't touch the
screen to swipe. New props: `autoPlay` (default `true`), `active` (default
`true`, mirrors the video views this replaces — pauses the timer when
backgrounded/off-screen), `intervalMs` (default 1800). Manual swipe still
works as an override; the next auto-tick picks up from wherever it lands.

**Additive, but changes default behaviour**: any existing `PanelCarousel`
usage now auto-plays unless it explicitly passes `autoPlay={false}`.

## v0.20.4

Two fixes, both caught from real use of the panel-carousel pilot:

- **`PanelCarousel` no longer crops.** Was `resizeMode="cover"`, which fills
  the frame by cropping whatever overflows — since panel images are portrait
  and most containers aren't, this cropped the top/bottom off every panel.
  Now `"contain"` (whole image always visible, letterboxed against
  `theme.surfaceMuted` if the aspect ratios don't match) — plus a regression
  test pinning it.
- **`DownloadLedgerEntry` gets `panel_count`.** Missed in v0.20.2's
  `DownloadItem` pass — the ledger is a separate persisted type that
  `record()` writes into, and without this field a panel-only exercise's
  downloaded-state label would silently drop back to defaults.

## v0.20.3

`PanelCarousel` gains an optional `style` prop, overriding the default
`width:'100%', aspectRatio` container sizing entirely (e.g. a fixed-height
layout). Images now measure both width *and* height off the container (was
width-only, assuming aspect-ratio sizing), so it works correctly either way.

## v0.20.2

`DownloadItem` gets an optional `panel_count`. Without it, `runMediaDownloads`
(auto-download + manual download) had no way to know a panel-only exercise
had anything to fetch at all — it calls `mediaFilesFor(item)` directly with
whatever shape the caller passes.

## v0.20.1

Fixes a bug introduced by v0.20.0 before it ever shipped in an app:
`isExerciseCached` only checked `video`/`preview`, so a panel-only exercise
would never show as "downloaded" in Settings → Downloads even after every
panel image was cached. Added an optional `panelCount` 4th argument
(default 0, existing callers unaffected) that checks every `panelN` file is
present.

## v0.20.0

Ordered instructional panel images (a video alternative) — new primitive plus
the media-file plumbing to fetch/download them.

- **New `PanelCarousel`**: presentational horizontal pager for an ordered list
  of image URIs, with a swipe-position dot indicator. Takes plain `uris:
  string[]` — no exercise/network knowledge, matching the rest of this
  package's data-in-props convention.
- **`mediaFilesFor`**: now accepts an optional `panel_count`, appending
  `panel1..panelN` (clamped to 1-6) after the existing thumbnail/preview/video
  files, so panel images flow through the existing offline-download pipeline
  for free.
- **`MediaFile`**: extended with the new `panel1..panel6` values (additive —
  existing `'thumbnail' | 'preview' | 'video'` usage is unaffected).

**Additive — nothing changes until an app opts in** by passing `panel_count`
and rendering `PanelCarousel`.

## v0.19.0

Grouped list rows — the structural half of the Strata comparison, and the last
of the three design decisions from that review.

- **New `ListItem.Group`**: rows inside ONE card separated by hairlines, instead
  of each row being its own rounded card. Denser, and the model the owner picked.

**Additive — nothing changes until a screen opts in.** Existing `ListItem`
usage renders exactly as before; grouping is signalled by context, so a row does
not need to know which model it is in and the two cannot be half-applied. This
matters because the alternative — changing `ListItem`'s default — would have
silently restyled every list in both apps at their next re-resolve, across
roughly 69 screens, with no compile error anywhere to flag it.

Inside a group a row contributes no surface, radius or `minHeight`; the
container owns all three and clips its children, so square rows cannot paint
over its rounded corners. Separators are drawn BETWEEN rows rather than as a
per-row top border, because a row cannot see its own position — a per-row border
either double-draws at the seam or leaves a stray line above the first row.
Null children are filtered first, so a conditionally-rendered row does not leave
a separator with nothing beneath it.

Adopting this per screen is deliberately NOT part of this release. It is a
visual change across both apps and wants a device, not a diff.

## v0.18.0

Strata pass 2: density and card treatment. Follows v0.17.0's type scale — that
was the "designed" half, this is the "fits more on screen" half. Token values
plus the `Card` primitive; no API change.

- **Card gains a 1px hairline border** (`t.border` — `sand[200]` light,
  `sand[700]` dark) on **both** variants. This is the main visual change. Plain
  cards carry no shadow at all, so on the cream light surface the edge is what
  separates a card from the page behind it.
- **Card shadow softened** `0.06/8/2` -> `0.05/6/1`. With the border doing the
  defining, the shadow only needs to lift the card slightly — together with the
  `radius.card` 24 -> 13 shipped in v0.17.0, this is most of what read as
  "floating" rather than "crisp".
- **Page gutters and card padding tightened**: `layout.screenX` 24 -> 20,
  `layout.screenY` 32 -> 24, `layout.card` 20 -> 16.
- **`Card` default padding `lg` -> `md`** (20 -> 16). The padding ladder itself
  is unchanged, so `padding="lg"` still gives 20 where a card wants it.

Deliberately NOT changed:

- **`controlHeight` stays 40/48/52.** The reference app uses 38/46/52, but
  bigger touch targets matter more for a rehab audience than matching it
  exactly. This is an owner decision, not an oversight — don't "fix" it for
  consistency.

Also adds the first tests pinning the visual scale. Before this, `layout` and
`shadow` had no assertions at all: the density and elevation values could be
changed in either direction with a fully green suite, which is exactly how a
design system drifts one harmless-looking diff at a time.

## v0.17.0

Tighter visual scale, adapted from the sibling `quorum-ui` library the owner
preferred. No API change — token values only, so every one of the 29 components
moves together.

- **Type scale down 1-2px** from `h1` through `label` (`body` 16 -> 15, `h1`
  24 -> 22, `h3` 18 -> 16). 16px body is the platform default and reads as
  unstyled; 15px reads as chosen.
- **Weights up one step** on headings, labels and buttons — smaller text needs
  more weight to hold the same presence.
- **`letterSpacing` added**: negative on headings (large type looks loose at
  default tracking), positive on `label`. This was absent entirely, and is the
  single change that most makes type look deliberate.
- **Radius tightened**: `card` 24 -> 13, `field` 16 -> 12, `lg` 16 -> 14,
  `xl` 20 -> 18. `card` at 24 was the loudest thing in the old look — on a
  screen made mostly of cards it read as soft rather than precise.
- **Fix: `Text` was dropping `letterSpacing`.** It picked style fields one by
  one, so the new tracking would have been silently ignored — tokens changed,
  nothing rendered differently. Now spread conditionally, with two tests that
  pin the wiring (not the values, so future scale changes stay free).

Deliberately NOT changed: `layout` gutters and `shadow`. Those shift every
screen's rhythm at once and are better judged on a device than in a diff.

## v0.16.0

**Removes react-native-reanimated.** This unblocks Expo Go for both apps.

reanimated 4 requires `react-native-worklets`, a separate native module Expo Go
cannot load. Requiring it kills the app at IMPORT time — natively, with no JS
error and nothing in the Metro logs. Because `index.ts` re-exports everything,
one animating primitive took down every screen in BOTH apps, presenting as
"the app crashes the instant the bundle reaches 100%".

Found by marker-bisection on a device: app mounts -> `@flexion-labs/ui` dies ->
26 modules OK, `primitives/Button` dies -> its only suspect import is
reanimated -> isolated probe dies on `react-native-worklets` before reanimated
is even reached.

Migrated to React Native's built-in `Animated`, which has no native dependency
beyond RN itself:

- `primitives/Pressable` — press scale, `useNativeDriver: true`. Unchanged feel.
- `primitives/Button` — 3D press via `interpolate` (an `Animated.Value` cannot
  be read synchronously, so `press.value * edge` has no equivalent). Unchanged.
- `composites/ToastViewport` — entrance preserved. **The EXIT animation is
  lost**: core Animated cannot animate an unmounting component, which is
  exactly what reanimated's layout animations provided. Toasts now vanish
  rather than fading up. Restoring it means holding dismissed toasts mounted
  through an exit tween in `useToastStore` — a state-machine change, so it is
  deliberately not bundled in here.

Also dropped from `peerDependencies` and `devDependencies`, and the jest mock
removed. New `__tests__/noReanimated.test.ts` fails if either package is
imported or declared again — nothing else catches this, since it type-checks,
lints and unit-tests clean (jest mocked reanimated) and only fails on a phone.


## v0.15.0
- **BREAKING (runtime, not API): dropped the `@react-navigation/bottom-tabs`
  dependency.** As of Expo SDK 56 expo-router no longer builds on React
  Navigation — SDK 57's expo-router depends on `standard-navigation` and has no
  `@react-navigation/*` dependency at all. This package was the ONLY thing
  pulling `@react-navigation/bottom-tabs` into either app, and that orphaned
  copy threw at module scope under SDK 57. Because `index.ts` re-exports
  everything, the throw took down the entire design system, and with it every
  screen in both apps — presenting as an instant native crash in Expo Go with no
  JS error, and `TypeError: undefined is not a function` in a dev client.
- `useTabBarPadding` now reads the bar height from the new
  **`useTabBarHeightStore`**, which `shell/TabBar` populates via `onLayout`.
  A store rather than a context because the tab bar renders as a SIBLING of the
  screens, so a provider inside `TabBar` could never reach the scroll views that
  need the value; React Navigation supplied it from inside the navigator, and
  there is no navigator to hook into now. Measured rather than derived from the
  style constants, so it stays correct across OS font-scale and safe-area
  changes. Public API of `useTabBarPadding` is unchanged.
- Added `expo-secure-store` to `peerDependencies` — it was imported by
  `lib/secureKeyValueStorage` but never declared.
- Regression test asserts `useTabBarPadding` never imports `@react-navigation/*`
  again.

## v0.11.0
- **ListPicker** — a new composite for settings with many options. Where
  `SegmentedControl` is a fixed row of pills (good for 2–3 options), `ListPicker`
  is a single row showing the current selection that opens a bottom-sheet list of
  all options (label + optional icon, the active one checked) — so it scales to
  any number of choices. Same `options` / `value` / `onChange` shape as
  `SegmentedControl` (a near drop-in), themed via `useTheme()` (light + dark),
  accessible (button/selected roles, tap-outside-to-dismiss). Built for the
  multi-language selector in both apps.

## v0.10.0
- **Toasts** — new non-blocking status notifications. `useToast()` fires a
  transient message from anywhere (`const toast = useToast(); toast('Invitation
  sent', { variant: 'success' })`); `<ToastViewport />` is the visual host,
  mounted once per app as an absolute overlay at the top (mirrors
  `OfflineBanner`'s safe-area positioning, floats above it at `zIndex: 60`).
  Floating-pill style, themed via `useTheme()` (green `accent` for success, red
  `danger` for error, neutral for info), auto-dismisses (errors linger longer),
  tap to dismiss, caps at 3 on screen. Backed by `useToastStore` — a
  deliberately **non-persisted** zustand store (transient by nature), so no
  provider wiring is needed. Replaces blocking `Alert.alert` popups for
  single-message confirmations; multi-button confirm dialogs stay as `Alert`.

## v0.9.0
- **Responsive navigation** — new `Sidebar` shell component, the wide-screen
  (tablet / desktop web) counterpart to `TabBar`. It takes the **same**
  `{ state, navigation, tabs }` props as `TabBar` (plus an optional `brand`
  wordmark) so a layout can swap one for the other based on screen width with no
  other changes. Renders a vertical rail that collapses to icons-only; the
  Settings destination is pinned to the bottom, every other tab stacks under the
  brand header in route order.
- New `useIsWide(breakpoint?)` hook + `WIDE_BREAKPOINT` (768) — true when the
  viewport is at least tablet-width. Reactive to rotation / window resize.
- New `useSidebarStore` — persisted collapsed/expanded state for the rail
  (default **collapsed**), mirroring `useThemeStore`. The toggle survives reloads.
- `useTabBarPadding` now returns just the safe-area inset on wide screens (no
  phantom bottom gap once navigation is a left rail).
- All additive — no existing export changed. Wire-up in each app:
  `tabBarPosition: isWide ? 'left' : 'bottom'` + render `<Sidebar>` when wide,
  else `<TabBar>`.

## v0.8.12
- `AuthScreenShell` (Welcome / Sign-In) now uses the same keyboard-aware scroll
  as `KeyboardScreen` (react-native-keyboard-controller) instead of the bare RN
  `KeyboardAvoidingView` — so the focused field stays clear of the keyboard on
  both platforms, with tap/swipe dismissal. Same props. Adds an AuthScreenShell
  render test.

## v0.8.11
- `KeyboardScreen` is rebuilt on **react-native-keyboard-controller**'s
  `KeyboardAwareScrollView` (apps already mount its `<KeyboardProvider>`), so the
  **focused field is reliably scrolled clear of the keyboard on both iOS and
  Android** — the bare RN `KeyboardAvoidingView` it used before was unreliable on
  Android. Dismissal is consistent: tap a non-interactive area
  (`keyboardShouldPersistTaps="handled"`) or swipe down on iOS
  (`keyboardDismissMode="interactive"`). New optional `bottomOffset` prop (gap
  kept above the keyboard). Same public props otherwise — additive. Adds
  `react-native-keyboard-controller` as a peer dependency (both apps already have
  it). Use `KeyboardScreen` for every form/input screen; for search-over-a-list
  screens, prefer a sticky search header + list dismissal instead.

## v0.8.10
- `Input` (all variants: `Text`, `Password`, `Code`, `Area`) now focuses the
  field when **anywhere in the bordered box is tapped**, not just the thin text
  line. The container is a `Pressable` that focuses the inner `TextInput` on
  press (it was a plain `View`, so its padding was dead space). The container is
  `accessible={false}` so the `TextInput` stays the single accessibility node.
  No public API change.

## v0.8.9
- Offline downloads become **disk-truth + device-wide**. Add
  `listCachedExerciseIds()` to `mediaCache` (every exerciseId with playable
  video/preview media on disk, thumbnails excluded) and a new persisted
  `useDownloadLedger` (`hooks/useDownloadLedger.ts`): an exerciseId-keyed record
  of downloaded media (name + flags) so the Manage Downloads screen can list and
  delete EVERYTHING on disk — including media for programs that have since
  changed or been removed — instead of only what the current programs reference.
  `reconcile(cachedIds)` keeps the ledger honest against the disk. Dedup is
  unchanged (the cache was already content-addressed by exerciseId — one file per
  exercise, shared across programs). Apps stop auto-evicting on program change;
  the size-cap LRU (`cleanupCache`) remains the only automatic eviction.

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
