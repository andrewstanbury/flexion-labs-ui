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

// v0.18.0 defaults to 'md' (16) rather than 'lg' (20). The ladder itself is
// unchanged, so anything that genuinely wants the roomier padding can still ask
// for `padding="lg"` — this only moves what a card gets when it says nothing.
function CardRoot({ variant = 'plain', padding = 'md', style, children, ...rest }: CardProps) {
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
          // The hairline is v0.18.0's main visual change, on BOTH variants. On
          // the cream light surface the edge does real work — plain cards carry
          // no shadow at all, so without it they rely entirely on a background
          // that barely differs from the page behind them.
          borderWidth: 1,
          borderColor: t.border,
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
