import { View, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { radius, space, shadow } from '../tokens';
import { useTheme } from '../UIProvider';

type Variant = 'plain' | 'elevated';

export type CardProps = ViewProps & {
  variant?: Variant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
};

function paddingFor(p: CardProps['padding']) {
  switch (p) {
    case 'none': return 0;
    case 'sm':   return space[3];
    case 'md':   return space[4];
    case 'lg':
    default:     return space[5];
  }
}

function CardRoot({ variant = 'plain', padding = 'lg', style, children, ...rest }: CardProps) {
  const t = useTheme();
  const bg = variant === 'elevated' ? t.surfaceElevated : t.surfaceMuted;
  const elevation = variant === 'elevated' ? shadow.card : shadow.none;
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius.card,
          padding: paddingFor(padding),
          ...elevation,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const make = (variant: Variant) => (props: Omit<CardProps, 'variant'>) =>
  <CardRoot variant={variant} {...props} />;

export const Card = Object.assign(CardRoot, {
  Plain:    make('plain'),
  Elevated: make('elevated'),
});
