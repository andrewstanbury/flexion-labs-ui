# @flexion-labs/ui

Shared design system for the Flexion Labs **client** (patient) and **practitioner** apps:
components, design tokens, and theme.

Both apps consume this as a git-tag dependency (use the current tag):

```json
"@flexion-labs/ui": "github:andrewstanbury/flexion-labs-ui#v0.8.9"
```

## What's in here

- `tokens.ts` — colors, spacing, radius, typography, the resolved `theme(scheme)`.
- `UIProvider.tsx` — `useScheme` / `useTheme` (colors) and `FontScaleProvider` / `useFontScale` (text scaling).
- `hooks/` — `useThemeStore` (persisted light/dark/system preference), `useIsDark`,
  `useTabBarPadding`, `useAudioMixingStore`, `useHaptic`, and the offline media
  subsystem (`mediaCache`, `mediaApi`, `downloadMedia`, `useMediaUri`,
  `useDownloadProgress`, `prefetchPolicy`, `mediaFiles`, `mediaFileName`).
- `lib/` — `formatBytes`, `appLockLogic`.
- `primitives/` — `Text`, `Button`, `Input`, `Card`, `Icon`, `Pressable`, `Screen`, `Stack`.
- `composites/` — `SegmentedControl`, `ToggleRow`, `ListItem`, `SectionHeader`,
  `FormField`, `EmptyState`, `StatusScreen`, `AuthScreenShell`, `StorageBar`,
  `OfflineBanner`, `SyncStatusDot`, `SyncStatusBar`, `SyncStatusShell`.
- `shell/` — `TabBar`, `Header`, `BackButton`, `Modal`, `KeyboardScreen`.

> The authoritative export list is `index.ts` — treat it as additive-only (see
> CLAUDE.md "cross-repo contract"). This list is a summary.

> Agents: read [`CLAUDE.md`](./CLAUDE.md) first — it captures the cross-repo
> release contract and the setup pitfalls (git-tag consumption, the
> no-`files`-whitelist rule, and the now-retired `node_modules` symlink model).

## Theming

The two schemes **diverge by design** (since v0.6.0): light mode is a pastel-pink
(`blossom`) palette, dark mode is sage green. Colors resolve through `useTheme()`
(StyleSheet/token path); each app bridges its persisted light/dark/system
preference into the package by wrapping its tree in
`<UIProvider scheme={useIsDark() ? 'dark' : 'light'}>`. See
[`docs/theme.md`](./docs/theme.md) and CLAUDE.md "Theming" for the two-path
breakdown and why that wrapper must stay.

> History: v0.1.0 supported a per-app `buttonShape` ('raised' vs 'flat'). Both
> apps settled on the raised look, so v0.2.0 dropped it. Re-add from git history
> if a per-app button look is ever needed again.

## Consuming-app setup (NativeWind)

Because the components use NativeWind `className`, each app must include this
package in its Tailwind `content` glob so the classes are generated:

```js
// tailwind.config.js
content: [
  './app/**/*.{ts,tsx}',
  './components/**/*.{ts,tsx}',
  './node_modules/@flexion-labs/ui/**/*.{ts,tsx}',
],
```

## Releasing

This package ships TypeScript source (no build step); Metro/Babel in each app
transpiles it. A bad tag breaks **both** apps, so:

1. `npm run verify` (tsc + jest) — must be green.
2. Bump `version` in `package.json`, commit.
3. Tag and push: `git tag vX.Y.Z && git push origin master vX.Y.Z`.
4. In **each** app, bump the dep ref and force npm to re-resolve the git tag
   (npm caches it by commit):
   ```bash
   npm pkg set "dependencies.@flexion-labs/ui=github:andrewstanbury/flexion-labs-ui#vX.Y.Z"
   rm -rf node_modules/@flexion-labs/ui
   npm install "@flexion-labs/ui@github:andrewstanbury/flexion-labs-ui#vX.Y.Z"
   ```
5. `npx tsc --noEmit && npx jest` in each app before merging.

> No `files` whitelist — the whole source tree ships. (An earlier whitelist
> silently dropped `lib/` and broke a release; don't reintroduce it.)
