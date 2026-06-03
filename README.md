# @flexion-labs/ui

Shared design system for the Flexion Labs **client** (patient) and **practitioner** apps:
components, design tokens, and theme.

Both apps consume this as a git-tag dependency:

```json
"@flexion-labs/ui": "github:andrewstanbury/flexion-labs-ui#v0.1.0"
```

## What's in here

- `tokens.ts` — colors, spacing, radius, typography, the resolved `theme(scheme)`.
- `UIProvider.tsx` — `useScheme` / `useTheme` (colors), `useButtonShape`, and `FontScaleProvider` / `useFontScale` (text scaling).
- `primitives/` — `Text`, `Button`, `Input`, `Card`, `Icon`, `Pressable`, `Screen`, `Stack`.
- `composites/` — `SegmentedControl`, `ToggleRow`, `ListItem`, `SectionHeader`, `FormField`, `EmptyState`, `StatusScreen`, `AuthScreenShell`.
- `shell/` — `TabBar`, `Header`, `BackButton`, `Modal`, `KeyboardScreen`.

## Per-app theming

Most tokens are shared. The two apps differ in exactly one component look — the
**button** — so each app injects its choice at the root:

```tsx
// client (raised/physical buttons)
<UIProvider buttonShape="raised">…</UIProvider>

// practitioner (flat pill buttons)
<UIProvider buttonShape="flat">…</UIProvider>
```

Colors can also be injected per app in future via `UIProvider`; today both apps
use the shared default palette (the client additionally uses the `coral`/`energy`
tokens, which are simply unused by the practitioner).

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
transpiles it. To release: commit, then tag (`git tag v0.1.1 && git push --tags`)
and bump the dependency ref in each app.
