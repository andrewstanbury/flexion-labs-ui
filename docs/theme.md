# Theming: the two dark-mode resolution paths

> This is the long form of the "Theming" section in
> [`../CLAUDE.md`](../CLAUDE.md). It documents a **latent divergence** between
> two independent dark-mode resolution paths. Read it before changing anything
> theming-related — and do not "fix" the divergence inside this repo alone (see
> [Intended fix](#intended-fix-deferred)).

## The two paths

Dark mode is currently resolved **two different ways** in this package, and they
do not talk to each other.

### Path 1 — `UIProvider` → `useScheme()` → `useTheme()` (OS-driven)

`UIProvider.tsx`:

- `useScheme()` returns the scheme from the React Native **OS** color scheme
  (`useColorScheme()`), unless an app wraps its tree in
  `<UIProvider scheme="dark|light">` to override it.
- `useTheme()` is `theme(useScheme())` — so it returns the resolved semantic
  token palette for whatever `useScheme()` decided.
- **Primitive token colors** (the `StyleSheet`-based colors in `Button`, `Card`,
  `Text`, etc.) flow through this path.

Crucially: **neither consuming app currently renders a
`<UIProvider scheme={...}>` wrapper**, so in practice this path follows the OS
color scheme, full stop.

### Path 2 — `useThemeStore` → `useIsDark()` (preference-driven)

`hooks/useThemeStore.ts` + `hooks/useIsDark.ts`:

- `useThemeStore` is a Zustand store persisted to AsyncStorage holding the user's
  explicit preference: `'light' | 'dark' | 'system'`.
- `useIsDark()` resolves the effective boolean:
  `preference === 'dark' || (preference === 'system' && OS === 'dark')`.
- **NativeWind `dark:` utility classes** are driven from this path (the apps set
  NativeWind's color scheme from the store).

## The divergence

Because the apps don't wrap their tree in `<UIProvider scheme={...}>`:

| User preference | OS scheme | NativeWind `dark:` (path 2) | Token colors (path 1) | Agree? |
| --------------- | --------- | --------------------------- | --------------------- | ------ |
| `system`        | dark      | dark                        | dark                  | yes    |
| `system`        | light     | light                       | light                 | yes    |
| `dark` (forced) | light     | **dark**                    | **light**             | **no** |
| `light` (forced)| dark      | **light**                   | **dark**              | **no** |

So a user who forces dark mode while their OS is in light mode sees NativeWind
`dark:` classes go dark while primitive token colors stay light (and vice
versa). The two paths only agree when the preference is `system`.

## Intended fix (deferred)

The real fix spans **both apps** and is **user-visible**, so it is **deferred
for owner review** — do not land it from this repo alone.

Each app should wrap its tree so the provider scheme follows the **persisted
preference**, not the OS:

```tsx
import { UIProvider, useIsDark } from '@flexion-labs/ui';

function ThemedRoot({ children }: { children: React.ReactNode }) {
  const isDark = useIsDark();
  return <UIProvider scheme={isDark ? 'dark' : 'light'}>{children}</UIProvider>;
}
```

That makes `useTheme()` token colors follow the same source of truth as the
NativeWind `dark:` classes, collapsing the two paths into one.

## Pinned behavior

`UIProvider.tsx` and `hooks/useIsDark.ts` each have characterization tests
(`__tests__/`) asserting the **current** behavior — including that the two paths
resolve independently. They exist so a future agent changing either path sees
the intent and is forced to update the pin deliberately rather than by accident.
If you implement the fix above, update those tests.
