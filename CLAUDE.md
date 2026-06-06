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
- There is **no CHANGELOG.** Release history lives in **git tags + commit
  messages** (`git tag`, `git log`). Current tags: v0.1.0 … v0.6.0.

### Current public export surface (the contract)

Summarized from `index.ts`. Treat as additive-only unless you are coordinating a
breaking release across both apps.

- **Tokens** (`tokens.ts`): `colors`, `semantic`, `space`, `layout`, `radius`,
  `controlHeight`, `typography`, `motion`, `shadow`, `tokens`, `theme(scheme)`,
  and the `Scheme` / `Tokens` types.
- **Theme/provider** (`UIProvider.tsx`): `UIProvider`, `useScheme`, `useTheme`,
  `FontScaleProvider`, `useFontScale`.
- **Utils** (`lib/`): `formatBytes`, `appLockLogic` (`shouldLockOnForeground`,
  `isLockArmed`).
- **Hooks** (`hooks/`): `useThemeStore`, `useIsDark`.
- **Primitives** (`primitives/`): `Pressable`, `Text`, `Button`, `Input`,
  `Card`, `Icon`, `Screen`, `Stack`.
- **Composites** (`composites/`): `FormField`, `SectionHeader`, `ListItem`,
  `SegmentedControl`, `ToggleRow`, `EmptyState`, `StatusScreen`,
  `AuthScreenShell`, `StorageBar`, `OfflineBanner`.
- **Shell** (`shell/`): `TabBar`, `Header`, `BackButton`, `Modal`,
  `KeyboardScreen`.

> Note: `useButtonShape` was a v0.1.0 export removed in v0.2.0 — it is **not**
> part of the surface. Do not reintroduce references to it.

## The `node_modules` symlink (do not touch)

This repo has **no real dependencies of its own.** Its `node_modules` is a
**symlink** to the client app's:

```
node_modules -> ../flexion-labs-client/node_modules
```

`npm run verify` (tsc + jest) works locally **only** because of this symlink —
it borrows the consuming app's installed toolchain (react-native, jest-expo,
nativewind, etc.). `package.json` lists only `peerDependencies`; there are no
`devDependencies`.

**Do not** replace/delete the symlink, add devDependencies, or `npm install`
into this repo. Changing the dependency/install model has blast radius on both
consuming apps and is deferred for owner review. If you think you need a dep
here, stop and flag it.

## The no-`files`-whitelist rule (do not reintroduce)

`package.json` intentionally has **NO `files` field.** The whole source tree
must ship.

Why: an earlier `files` whitelist silently dropped `lib/` (it omitted
`formatBytes`), which broke a release — see tag `v0.3.0` → hotfix `v0.3.1`
("include lib/ in published files"). The whitelist was removed entirely in a
later chore commit. **Do not add a `files` field back.** When you add a new
top-level folder, it ships automatically — that's the intended behavior.

## Verification — mandatory, there is no CI

```bash
npm run verify   # tsc --noEmit && jest
```

There is **no CI safety net** on this repo (see below for why a clean CI is
non-trivial under the symlink/no-own-deps model). A bad commit/tag breaks BOTH
apps. So `npm run verify` being green is a hard precondition for any commit you
push and for cutting any release tag. Run it from the repo root so it picks up
the symlinked toolchain.

## Releasing — the dance and its silent failure modes

npm **caches git dependencies by COMMIT**, not by tag name. So bumping/moving a
tag is not enough — each consuming app must be forced to re-resolve, or it keeps
running stale code with no error.

1. `npm run verify` — must be green (no CI to catch you).
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
`accentOn` foreground (dark plum on pink, white on green).

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
