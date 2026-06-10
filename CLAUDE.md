# CLAUDE.md — @flexion-labs/ui

Guidance for AI agents (and humans) working in this repo. Read this **before**
touching anything: this package has an unusual setup with cross-repo blast
radius, and several "obvious" cleanups will silently break two production apps.

## What this is

`@flexion-labs/ui` is the shared design system (tokens, primitives, composites,
shell components, theme) for the two Flexion Labs apps:

- **flexion-labs-client** (patient app)
- **flexion-labs-practitioner** (practitioner app)

It ships **raw TypeScript source — there is no build step.** Each app's
Metro/Babel transpiles the source on its own. So `.ts`/`.tsx` here is the
artifact; do not add a compile/dist step.

## The cross-repo contract (read this first)

Both apps consume this package as a **git-tag dependency**, e.g.:

```json
"@flexion-labs/ui": "github:andrewstanbury/flexion-labs-ui#v0.6.0"
```

Consequences:

- **`index.ts` is an immutable public contract.** It is the only surface app
  code imports from (`@flexion-labs/ui`). **Never rename or remove an export
  without updating BOTH apps in the same release.** Removing/renaming an export
  here breaks both apps at their next re-resolve, with no compile error in this
  repo to warn you.
- App code must import from the package root (`@flexion-labs/ui`), never from a
  deep path inside the package.
- Release history is in [`CHANGELOG.md`](./CHANGELOG.md) (keep it updated on every
  version bump) plus the git tags. Current tags: v0.1.0 … v0.8.7.

### Current public export surface (the contract)

Summarized from `index.ts`. Treat as additive-only unless you are coordinating a
breaking release across both apps.

- **Tokens** (`tokens.ts`): `colors`, `semantic`, `space`, `layout`, `radius`,
  `controlHeight`, `typography`, `motion`, `shadow`, `tokens`, `theme(scheme)`,
  and the `Scheme` / `Tokens` types.
- **Theme/provider** (`UIProvider.tsx`): `UIProvider`, `useScheme`, `useTheme`,
  `FontScaleProvider`, `useFontScale`.
- **Utils** (`lib/`): `formatBytes`, `appLockLogic` (`shouldLockOnForeground`,
  `isLockArmed`), `secureKeyValueStorage` (`createSecureKeyValueStorage`,
  `toSafeKey`, `SecureBackend`/`KeyValueStore` types — encrypted-at-rest KV store
  with an injected native backend; the apps wrap it with expo-secure-store).
- **Hooks** (`hooks/`): `useThemeStore`, `useIsDark`, `useTabBarPadding`, `useAudioMixingStore`, `useHaptic`.
- **Primitives** (`primitives/`): `Pressable`, `Text`, `Button`, `Input`,
  `Card`, `Icon`, `Screen`, `Stack`.
- **Composites** (`composites/`): `FormField`, `SectionHeader`, `ListItem`,
  `SegmentedControl`, `ToggleRow`, `EmptyState`, `StatusScreen`,
  `AuthScreenShell`, `StorageBar`, `OfflineBanner`.
- **Shell** (`shell/`): `TabBar`, `Header`, `BackButton`, `Modal`,
  `KeyboardScreen`.

> Note: `useButtonShape` was a v0.1.0 export removed in v0.2.0 — it is **not**
> part of the surface. Do not reintroduce references to it.

## Dependencies — self-contained toolchain (owner-approved 2026-06-08)

This package carries its **own `devDependencies`** (the toolchain plus the peer
deps it imports at type-check/test time), each **pinned to the exact version
the apps resolve** for Expo SDK 54, plus a committed `package-lock.json`. So
`npm ci && npm run verify` (tsc + eslint + jest) runs standalone — which is
what lets CI work (see below).

Previously this repo had **no deps of its own** and its `node_modules` was a
**symlink** to the client app's (`node_modules -> ../flexion-labs-client/node_modules`),
borrowing that app's installed toolchain. That was deferred-for-owner-review;
the owner chose self-containment on 2026-06-08, so the symlink model is retired.

- These are `devDependencies`, so **consumers are unaffected** — npm does not
  install a dependency's devDependencies. The public contract (`index.ts`,
  `peerDependencies`) is unchanged.
- **Keep the pins aligned with the apps.** If the apps bump Expo / React Native
  / the toolchain, bump the matching pins here in the same wave, so this package
  keeps type-checking and testing against the versions the apps actually run.
  The versions here were taken from the client app's resolved tree, not guessed.

## The no-`files`-whitelist rule (do not reintroduce)

`package.json` intentionally has **NO `files` field.** The whole source tree
must ship.

Why: an earlier `files` whitelist silently dropped `lib/` (it omitted
`formatBytes`), which broke a release — see tag `v0.3.0` → hotfix `v0.3.1`
("include lib/ in published files"). The whitelist was removed entirely in a
later chore commit. **Do not add a `files` field back.** When you add a new
top-level folder, it ships automatically — that's the intended behavior.

## Verification — mandatory

```bash
npm run verify   # tsc --noEmit && eslint . && jest
```

CI (`.github/workflows/ci.yml`) now runs type-check + lint + test on every PR
and push to master — the safety net this repo previously lacked. A bad
commit/tag still breaks BOTH apps, so `npm run verify` being green remains a
hard precondition for any commit you push and for cutting any release tag.

## Releasing — the dance and its silent failure modes

npm **caches git dependencies by COMMIT**, not by tag name. So bumping/moving a
tag is not enough — each consuming app must be forced to re-resolve, or it keeps
running stale code with no error.

1. `npm run verify` — must be green (CI runs it too, but don't push a tag on red).
2. Bump `version` in `package.json`, commit.
3. Tag and push: `git tag vX.Y.Z && git push origin master vX.Y.Z`.
4. In **each** app, repoint the dep AND force a fresh resolve:
   ```bash
   npm pkg set "dependencies.@flexion-labs/ui=github:andrewstanbury/flexion-labs-ui#vX.Y.Z"
   rm -rf node_modules/@flexion-labs/ui
   npm install "@flexion-labs/ui@github:andrewstanbury/flexion-labs-ui#vX.Y.Z"
   ```
5. In **each** app, re-typecheck before merging: `npx tsc --noEmit && npx jest`.

Silent failure modes to watch for:

- Skipping the `rm -rf node_modules/@flexion-labs/ui` → app stays on the old
  commit even though `package.json` shows the new tag.
- Updating only one app → the two apps drift to different versions of the design
  system.
- Renaming/removing an export and only updating one app → the other app breaks
  at its next install with no warning from this repo.

## Theming — two resolution paths, now bridged at the app layer

Dark mode is resolved by **two paths** in this package:

1. **`UIProvider` / `useScheme()` / `useTheme()`** (`UIProvider.tsx`) — resolves
   the scheme from a `<UIProvider scheme=...>` prop if present, else the **OS**
   via `useColorScheme()`. Primitive **token colors** (`StyleSheet`-based) come
   from this path.
2. **`useIsDark()` + `useThemeStore`** (`hooks/`) — resolves dark mode from the
   **persisted user preference** (`useThemeStore`, AsyncStorage:
   light/dark/system). NativeWind `dark:` classes are driven from this path.

These used to disagree (token colors followed the OS, `dark:` classes followed
the store). **As of v0.6.0 both apps bridge them**: each wraps its tree in
`<UIProvider scheme={useIsDark() ? 'dark' : 'light'}>` (see `app/_layout.tsx` in
flexion-labs-client / flexion-labs-practitioner), so `useTheme()` token colors
and `dark:` classes both follow the persisted preference. **Keep that wrapper in
place** — removing it reintroduces the OS-vs-store divergence. A characterization
test pins the resolution behavior; update it if you change either path.

The two schemes diverge **by design** (v0.6.0): light mode is pastel pink
(`blossom` ramp), dark mode is sage green. See `tokens.ts` `semantic.light` /
`semantic.dark` and the `accent*` roles (`accent`, `accentSurface`, `accentOn`,
`accentBorder`, `accentEdge`) — filled accent surfaces carry a readable
`accentOn` foreground (dark plum on pink, white on green). Characterization
tests in `UIProvider.tsx` / `hooks/useIsDark.ts` `__tests__/` pin the resolution
behavior; update them if you change either path.

See [`docs/theme.md`](./docs/theme.md) for the full breakdown (truth table + how
the two paths are bridged).

## NativeWind note

Components use NativeWind `className`. Each consuming app must include this
package in its Tailwind `content` glob so the classes are generated:

```js
content: [
  './app/**/*.{ts,tsx}',
  './components/**/*.{ts,tsx}',
  './node_modules/@flexion-labs/ui/**/*.{ts,tsx}',
],
```
