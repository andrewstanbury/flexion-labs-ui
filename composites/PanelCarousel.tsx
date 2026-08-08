import { useCallback, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
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
  testID,
}: {
  uris: string[];
  aspectRatio?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!containerWidth) return;
      const next = Math.round(e.nativeEvent.contentOffset.x / containerWidth);
      setIndex(Math.max(0, Math.min(next, uris.length - 1)));
    },
    [containerWidth, uris.length],
  );

  if (uris.length === 0) return null;

  return (
    <View testID={testID} onLayout={onLayout} style={{ width: '100%', aspectRatio }}>
      {containerWidth > 0 && (
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
              style={{ width: containerWidth, aspectRatio }}
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
