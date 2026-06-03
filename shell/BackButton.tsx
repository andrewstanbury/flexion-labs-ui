import { space, radius } from '../tokens';
import { useTheme } from '../UIProvider';
import { Pressable } from '../primitives/Pressable';
import { Icon } from '../primitives/Icon';
import { Text } from '../primitives/Text';

// BackButton — inline pill ("← Back") used at the top-left of centered
// hero screens (auth, modal-style detail pages). Distinct from
// Header.Back which is a full-width 56pt header bar — use that one when
// you need a route-level header, this one when you want an unobtrusive
// affordance inside a centered scroll layout.

export type BackButtonProps = {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
};

export function BackButton({ onPress, label = 'Back', disabled }: BackButtonProps) {
  const t = useTheme();
  return (
    <Pressable.Scale
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: space[3],
        paddingVertical: space[2],
        borderRadius: radius.pill,
        backgroundColor: t.surfaceMuted,
        gap: space[1],
      }}
    >
      <Icon name="chevron-back" size="sm" color="secondary" />
      <Text variant="label" color="secondary" style={{ fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable.Scale>
  );
}
