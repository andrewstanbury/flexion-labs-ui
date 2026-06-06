# @flexion-labs/ui

Shared design system for the Flexion Labs **client** (patient) and **practitioner** apps:
components, design tokens, and theme.

Both apps consume this as a git-tag dependency:

```json
"@flexion-labs/ui": "github:andrewstanbury/flexion-labs-ui#v0.1.0"
```

## What's in here

- `tokens.ts` — colors, spacing, radius, typography, the resolved `theme(scheme)`.
- `UIProvider.tsx` — `useScheme` / `useTheme` (colors) and `FontScaleProvider` / `useFontScale` (text scaling).
- `hooks/` — `useThemeStore` (persisted light/dark/system preference), `useIsDark`.
- `lib/` — `formatBytes`, `appLockLogic`.
- `primitives/` — `Text`, `Button`, `Input`, `Card`, `Icon`, `Pressable`, `Screen`, `Stack`.
- `composites/` — `SegmentedControl`, `ToggleRow`, `ListItem`, `SectionHeader`, `FormField`, `EmptyState`, `StatusScreen`, `AuthScreenShell`, `StorageBar`, `OfflineBanner`.
- `shell/` — `TabBar`, `Header`, `BackButton`, `Modal`, `KeyboardScreen`.

> Agents: read [`CLAUDE.md`](./CLAUDE.md) first — it captures the cross-repo
> release contract and the setup pitfalls (git-tag consumption, the
> `node_modules` symlink, the no-`files`-whitelist rule).

## Theming

Both apps share the same components and palette. The client additionally uses
the `coral`/`energy` tokens, which are simply unused by the practitioner. Colors
could be injected per app in future via `UIProvider` if the two ever need to
diverge; as of v0.2.0 they don't.

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
3. Tag and push: `git tag v0.3.2 && git push origin master v0.3.2`.
4. In **each** app, bump the dep ref and force npm to re-resolve the git tag
   (npm caches it by commit):
   ```bash
   npm pkg set "dependencies.@flexion-labs/ui=github:andrewstanbury/flexion-labs-ui#v0.3.2"
   rm -rf node_modules/@flexion-labs/ui
   npm install "@flexion-labs/ui@github:andrewstanbury/flexion-labs-ui#v0.3.2"
   ```
5. `npx tsc --noEmit && npx jest` in each app before merging.

> No `files` whitelist — the whole source tree ships. (An earlier whitelist
> silently dropped `lib/` and broke a release; don't reintroduce it.)
