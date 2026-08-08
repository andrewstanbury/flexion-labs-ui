import type { ReactNode } from 'react';
import { render } from '@testing-library/react-native';
import { Icon } from '../Icon';
import { UIProvider } from '../../UIProvider';
import { theme, type Scheme } from '../../tokens';

// Regression coverage for a real bug: every ColorRole EXCEPT 'accent'/'danger'
// resolved to the literal role-name string ("secondary", "primary", ...)
// instead of an actual color, because the old resolution logic used
// `!(c in t)` to decide "is this a raw color string?" — which is only false
// for role names that happen to collide with an actual theme key
// (t.accent/t.danger exist; t.primary/t.secondary/t.muted/t.inverse don't,
// since the real keys are textPrimary/textSecondary/etc). Ionicons then
// received an invalid color string and fell back to its default (black),
// invisible against a dark background. No test existed to catch it.

function withScheme(scheme: Scheme) {
  return ({ children }: { children: ReactNode }) => (
    <UIProvider scheme={scheme}>{children}</UIProvider>
  );
}

const ROLE_TO_KEY = {
  primary: 'textPrimary',
  secondary: 'textSecondary',
  muted: 'textMuted',
  accent: 'accent',
  danger: 'danger',
  inverse: 'surface',
} as const;

describe('<Icon /> — color role resolution', () => {
  it.each(Object.entries(ROLE_TO_KEY))(
    'resolves color="%s" to a real theme color, not the literal role name',
    (role, key) => {
      for (const scheme of ['light', 'dark'] as const) {
        const t = theme(scheme);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { getByTestId } = render(<Icon name="settings-outline" color={role as any} />, {
          wrapper: withScheme(scheme),
        });
        const color = getByTestId('Ionicons-icon').props.color;
        expect(color).toBe(t[key]);
        expect(color).not.toBe(role);
      }
    },
  );

  it('passes an arbitrary raw color string straight through unresolved', () => {
    const { getByTestId } = render(<Icon name="settings-outline" color="#FF00FF" />);
    expect(getByTestId('Ionicons-icon').props.color).toBe('#FF00FF');
  });

  it('defaults to the primary text color when no color prop is given', () => {
    const { getByTestId } = render(<Icon name="settings-outline" />, { wrapper: withScheme('dark') });
    expect(getByTestId('Ionicons-icon').props.color).toBe(theme('dark').textPrimary);
  });
});
