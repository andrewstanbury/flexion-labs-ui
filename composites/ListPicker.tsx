import { useState } from 'react';
import { View, Modal, type StyleProp, type ViewStyle } from 'react-native';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space } from '../tokens';
import { useScheme, useTheme } from '../UIProvider';
import { Pressable } from '../primitives/Pressable';
import { Text } from '../primitives/Text';
import { Icon } from '../primitives/Icon';

// ListPicker — a tap-to-open list selector. Where SegmentedControl is a fixed
// row of pills (good for 2–3 options), ListPicker scales to any number: the
// closed state is a single row showing the current selection; tapping opens a
// bottom-sheet modal listing every option with the active one checked. Use it
// for settings with many choices (e.g. language). Same options/value/onChange
// shape as SegmentedControl so it's a near drop-in.

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export type ListPickerOption<T extends string> = {
  value: T;
  label: string;
  icon?: IoniconsName;
};

export type ListPickerProps<T extends string> = {
  options: ListPickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
  // Shown as the sheet heading and woven into the trigger's accessibility label.
  title?: string;
  style?: StyleProp<ViewStyle>;
};

export function ListPicker<T extends string>({
  options,
  value,
  onChange,
  title,
  style,
}: ListPickerProps<T>) {
  const scheme = useScheme();
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const surface = scheme === 'dark' ? colors.sand[800] : colors.white;
  const selected = options.find((o) => o.value === value);

  const close = () => setOpen(false);

  return (
    <>
      <Pressable.Scale
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title ? `${title}: ${selected?.label ?? ''}` : selected?.label}
        onPress={() => setOpen(true)}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[3],
            backgroundColor: surface,
            borderRadius: radius.card,
            paddingVertical: space[3],
            paddingHorizontal: space[4],
          },
          style,
        ]}
      >
        {selected?.icon ? <Icon name={selected.icon} size={18} color="secondary" /> : null}
        <Text variant="body" style={{ flex: 1, fontWeight: '600' }}>
          {selected?.label ?? ''}
        </Text>
        <Icon name="chevron-down" size="sm" color="muted" />
      </Pressable.Scale>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          {/* Backdrop sits behind the sheet so a tap outside closes, while taps
              on the sheet don't bubble through to it. */}
          <Pressable.Touch
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={close}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
          />
          <View
            style={{
              backgroundColor: surface,
              borderTopLeftRadius: radius.card,
              borderTopRightRadius: radius.card,
              paddingTop: space[3],
              paddingHorizontal: space[3],
              paddingBottom: space[6],
            }}
          >
            {title ? (
              <Text
                variant="label"
                color="secondary"
                style={{ paddingHorizontal: space[3], paddingVertical: space[2], textTransform: 'uppercase', letterSpacing: 1.5 }}
              >
                {title}
              </Text>
            ) : null}
            {options.map((o) => {
              const active = o.value === value;
              return (
                <Pressable.Touch
                  key={o.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={o.label}
                  onPress={() => {
                    onChange(o.value);
                    close();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space[3],
                    paddingVertical: space[3],
                    paddingHorizontal: space[3],
                    borderRadius: radius.lg,
                    backgroundColor: active ? t.accentSurface : colors.transparent,
                  }}
                >
                  {o.icon ? <Icon name={o.icon} size={18} color={active ? t.accentOn : colors.sand[500]} /> : null}
                  <Text
                    variant="body"
                    color={active ? undefined : 'secondary'}
                    style={{ flex: 1, ...(active ? { color: t.accentOn, fontWeight: '600' } : null) }}
                  >
                    {o.label}
                  </Text>
                  {active ? <Icon name="checkmark" size="sm" color={t.accentOn} /> : null}
                </Pressable.Touch>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}
