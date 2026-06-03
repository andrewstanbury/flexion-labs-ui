import { View } from 'react-native';
import { layout, space } from '../tokens';
import { useTheme } from '../UIProvider';
import { Pressable } from '../primitives/Pressable';
import { Icon } from '../primitives/Icon';
import { Text } from '../primitives/Text';

// Header — three variants:
// - Plain: title only, left/right slots optional
// - Back:  back chevron on the left, calls onBack
// - Modal: close X on the right, calls onClose
//
// All variants share the same 56-pt height, semantic colors, and gutter.

type Variant = 'plain' | 'back' | 'modal';

export type HeaderProps = {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onBack?: () => void;
  onClose?: () => void;
  backLabel?: string;
};

type RootProps = HeaderProps & { variant: Variant };

function HeaderRoot({
  variant,
  title,
  left,
  right,
  onBack,
  onClose,
  backLabel = 'Back',
}: RootProps) {
  const t = useTheme();

  const leftSlot =
    variant === 'back' && onBack ? (
      <Pressable.Scale
        onPress={onBack}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[1],
          paddingHorizontal: space[3],
          paddingVertical: space[2],
          borderRadius: 9999,
          backgroundColor: t.surfaceMuted,
        }}
      >
        <Icon name="chevron-back" size="sm" color="secondary" />
        <Text variant="label" color="secondary">{backLabel}</Text>
      </Pressable.Scale>
    ) : (
      left ?? null
    );

  const rightSlot =
    variant === 'modal' && onClose ? (
      <Pressable.Scale
        onPress={onClose}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Icon name="close" size="lg" color="secondary" />
      </Pressable.Scale>
    ) : (
      right ?? null
    );

  return (
    <View
      style={{
        height: 56,
        paddingHorizontal: layout.screenX,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: t.surface,
      }}
    >
      <View style={{ minWidth: 60 }}>{leftSlot}</View>
      {title ? <Text variant="h3" color="primary">{title}</Text> : <View />}
      <View style={{ minWidth: 60, alignItems: 'flex-end' }}>{rightSlot}</View>
    </View>
  );
}

const make = (variant: Variant) => (props: HeaderProps) =>
  <HeaderRoot variant={variant} {...props} />;

export const Header = Object.assign(HeaderRoot, {
  Plain: make('plain'),
  Back:  make('back'),
  Modal: make('modal'),
});
