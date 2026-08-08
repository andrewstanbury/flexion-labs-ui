import { useCallback, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../UIProvider';

// Auto-sizing horizontal pager for an ordered set of static images — e.g.
// instructional panel frames stepping through an exercise, in place of a
// video. Swipe to advance/go back; dots show position. Presentational only:
// the app resolves each panel's URI (e.g. via useMediaUri) and passes the
// plain ordered array in, so this stays free of app/network concerns.
export function PanelCarousel({
  uris,
  aspectRatio = 1,
  style,
  testID,
}: {
  uris: string[];
  // Only used to size the default container (width:'100%', aspectRatio) —
  // ignored once `style` is passed.
  aspectRatio?: number;
  // Overrides the default aspect-ratio sizing entirely (e.g. a fixed height
  // layout). Each image is measured to fill whatever this resolves to.
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const theme = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [index, setIndex] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!size.width) return;
      const next = Math.round(e.nativeEvent.contentOffset.x / size.width);
      setIndex(Math.max(0, Math.min(next, uris.length - 1)));
    },
    [size.width, uris.length],
  );

  if (uris.length === 0) return null;

  return (
    <View testID={testID} onLayout={onLayout} style={style ?? { width: '100%', aspectRatio }}>
      {size.width > 0 && size.height > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          testID={testID ? `${testID}-scroll` : undefined}
        >
          {uris.map((uri, i) => (
            <Image
              key={`${uri}-${i}`}
              source={{ uri }}
              style={{ width: size.width, height: size.height }}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}
      {uris.length > 1 && (
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          className="items-center justify-end pb-3"
        >
          <View className="flex-row gap-1.5">
            {uris.map((_, i) => (
              <View
                key={i}
                testID={testID ? `${testID}-dot-${i}` : undefined}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === index ? theme.accentStrong : theme.surfaceMuted,
                  opacity: i === index ? 1 : 0.6,
                }}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
