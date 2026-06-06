# Theming: the two dark-mode resolution paths

> This is the long form of the "Theming" section in
> [`../CLAUDE.md`](../CLAUDE.md). It documents the **two independent dark-mode
> resolution paths** in this package and how the consuming apps bridge them
> (shipped in v0.6.0). Read it before changing anything theming-related — the
> app-side `<UIProvider scheme>` wrapper described below is load-bearing.

## The two paths

Dark mode is resolved **two different ways** in this package. On their own they
do not talk to each other; the apps bridge them at the root (see
[The fix](#the-fix-shipped-in-v060)).

### Path 1 — `UIProvider` → `useScheme()` → `useTheme()` (OS-driven)

`UIProvider.tsx`:

- `useScheme()` returns the scheme from the React Native **OS** color scheme
  (`useColorScheme()`), unless an app wraps its tree in
  `<UIProvider scheme="dark|light">` to override it.
- `useTheme()` is `theme(useScheme())` — so it returns the resolved semantic
  token palette for whatever `useScheme()` decided.
- **Primitive token colors** (the `StyleSheet`-based colors in `Button`, `Card`,
  `Text`, etc.) flow through this path.

In isolation (no `<UIProvider scheme>` wrapper) this path follows the OS color
scheme. **As of v0.6.0 both apps wrap their tree in
`<UIProvider scheme={useIsDark() ? 'dark' : 'light'}>`** (see
[The fix](#the-fix-shipped-in-v060)), so in the running apps this path follows
the persisted preference, not the OS.

### Path 2 — `useThemeStore` → `useIsDark()` (preference-driven)

`hooks/useThemeStore.ts` + `hooks/useIsDark.ts`:

- `useThemeStore` is a Zustand store persisted to AsyncStorage holding the user's
  explicit preference: `'light' | 'dark' | 'system'`.
- `useIsDark()` resolves the effective boolean:
  `preference === 'dark' || (preference === 'system' && OS === 'dark')`.
- **NativeWind `dark:` utility classes** are driven from this path (the apps set
  NativeWind's color scheme from the store).

## The divergence (what the wrapper prevents)

**Without** an app-side `<UIProvider scheme={...}>` wrapper, the two paths
disagree whenever the user forces a scheme against their OS:

| User preference | OS scheme | NativeWind `dark:` (path 2) | Token colors (path 1, unwrapped) | Agree? |
| --------------- | --------- | --------------------------- | -------------------------------- | ------ |
| `system`        | dark      | dark                        | dark                             | yes    |
| `system`        | light     | light                       | light                            | yes    |
| `dark` (forced) | light     | **dark**                    | **light**                        | **no** |
| `light` (forced)| dark      | **light**                   | **dark**                         | **no** |

A user who forced dark mode while their OS was light would see NativeWind `dark:`
classes go dark while primitive token colors stayed light. This is exactly the
state the v0.6.0 wrapper eliminates — the table above is the *unwrapped* package
behavior (still what the characterization tests pin), not what the running apps
do.

## The fix (shipped in v0.6.0)

Each app wraps its tree so the provider scheme follows the **persisted
preference**, not the OS. Both `flexion-labs-client` and `flexion-labs-practitioner`
do this in `app/_layout.tsx`:

```tsx
import { UIProvider, useIsDark } from '@flexion-labs/ui';

function ThemedRoot({ children }: { children: React.ReactNode }) {
  const isDark = useIsDark();
  return <UIProvider scheme={isDark ? 'dark' : 'light'}>{children}</UIProvider>;
}
```

That makes `useTheme()` token colors follow the same source of truth as the
NativeWind `dark:` classes, collapsing the two paths into one. **Keep the wrapper
in place** — removing it from either app reintroduces the divergence above.

## Pinned behavior

`hooks/__tests__/themeResolution.test.tsx` is a characterization test asserting
the package's **in-isolation** path behavior (no `UIProvider` wrapper): path 1
follows the OS, path 2 follows the persisted store, and they disagree under a
forced preference. It pins *why the app-side wrapper is required* — so a future
agent changing either path, or removing the wrapper, sees the intent and updates
the pin deliberately rather than by accident.
