import { View, type ViewProps, type StyleProp, type ViewStyle, type FlexAlignType } from 'react-native';
import { layout } from '../tokens';

// Stack — Spec-style flex container with named gaps. Stack.V is column,
// Stack.H is row. Use `gap` prop with a semantic name (xs/sm/md/lg/xl)
// instead of free-form numbers.

type Gap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
type Align = 'start' | 'center' | 'end' | 'stretch';

const GAP_MAP: Record<Exclude<Gap, number>, number> = {
  none: 0,
  xs:   layout.gapXs,
  sm:   layout.gapSm,
  md:   layout.gapMd,
  lg:   layout.gapLg,
  xl:   layout.gapXl,
};

const ALIGN_MAP: Record<Align, FlexAlignType> = {
  start:   'flex-start',
  center:  'center',
  end:     'flex-end',
  stretch: 'stretch',
};

export type StackProps = ViewProps & {
  gap?: Gap;
  align?: Align;
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
};

const JUSTIFY_MAP = {
  start:   'flex-start',
  center:  'center',
  end:     'flex-end',
  between: 'space-between',
  around:  'space-around',
  evenly:  'space-evenly',
} as const;

function resolveGap(gap: Gap | undefined): number {
  if (gap === undefined) return 0;
  if (typeof gap === 'number') return gap;
  return GAP_MAP[gap];
}

function makeStack(direction: 'row' | 'column') {
  return function StackImpl({
    gap = 'md',
    align,
    justify,
    wrap,
    style,
    children,
    ...rest
  }: StackProps) {
    return (
      <View
        {...rest}
        style={[
          {
            flexDirection: direction,
            gap: resolveGap(gap),
            alignItems: align ? ALIGN_MAP[align] : undefined,
            justifyContent: justify ? JUSTIFY_MAP[justify] : undefined,
            flexWrap: wrap ? 'wrap' : 'nowrap',
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  };
}

const StackV = makeStack('column');
const StackH = makeStack('row');

export const Stack = Object.assign(StackV, {
  V: StackV,
  H: StackH,
});
