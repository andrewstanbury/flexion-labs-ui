import type { ComponentProps, ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { layout, radius, space } from '../tokens';
import { useTheme } from '../UIProvider';
import { Pressable } from '../primitives/Pressable';
import { Text } from '../primitives/Text';

// Small interactive pieces from the retaskable kit (v0.31.0), restyled to the
// FlexionLabs palette. They share the Button's physical language: a face
// resting on a slightly darker base edge, filled with the accent when "on".

type IoniconName = ComponentProps<typeof Ionicons>['name'];
const EDGE = 2;

function useRaised(on: boolean) {
  const t = useTheme();
  return on
    ? { face: t.accentSurface, edge: t.accentEdge, border: t.accentBorder, fg: t.accentOn }
    : { face: t.surfaceElevated, edge: t.border, border: t.border, fg: t.textPrimary };
}

// Chip — a single toggleable pill ("Morning", "Knee", "Favourites"). For a
// row of mutually exclusive filters use FilterChips.
export type ChipProps = {
  label: string;
  on: boolean;
  onPress: () => void;
  icon?: IoniconName;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, on, onPress, icon, style }: ChipProps) {
  const c = useRaised(on);
  return (
    <Pressable.Touch
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={[{ alignSelf: 'flex-start' }, style]}
    >
      <View style={{ borderRadius: radius.pill, paddingBottom: EDGE, backgroundColor: c.edge }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[1],
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.face,
            paddingHorizontal: layout.gapLg,
            paddingVertical: space[2],
          }}
        >
          {icon ? <Ionicons name={icon} size={16} color={c.fg} /> : null}
          <Text variant="bodyStrong" style={{ color: c.fg }}>
            {label}
          </Text>
        </View>
      </View>
    </Pressable.Touch>
  );
}

// IconButton — a 44pt round tap target holding one icon. `label` is required:
// an icon alone has no accessible name. `filled` gives the accent disc used
// for a screen's single primary action (add, send).
export type IconButtonProps = {
  icon: IoniconName;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ icon, label, onPress, disabled = false, filled = false, style }: IconButtonProps) {
  const t = useTheme();
  return (
    <Pressable.Touch
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={[
        {
          width: 44,
          height: 44,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: filled ? t.accentSurface : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={filled ? 22 : 24} color={filled ? t.accentOn : t.textPrimary} />
    </Pressable.Touch>
  );
}

// Choice — a selectable raised card with a label, optional hint and optional
// leading element. For picking one of a few rich options (a program, a time
// of day) where a plain chip can't carry the explanation.
export type ChoiceProps = {
  label: string;
  hint?: string;
  leading?: ReactNode;
  on: boolean;
  onPress: () => void;
  fullWidth?: boolean;
};

export function Choice({ label, hint, leading, on, onPress, fullWidth = true }: ChoiceProps) {
  const c = useRaised(on);
  const t = useTheme();
  return (
    <Pressable.Touch
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      style={{ alignSelf: fullWidth ? 'stretch' : 'flex-start' }}
    >
      <View style={{ borderRadius: radius.lg, paddingBottom: EDGE + 1, backgroundColor: c.edge }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: layout.gapMd,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.face,
            paddingHorizontal: layout.card,
            paddingVertical: space[3],
          }}
        >
          {leading}
          <View style={{ flexShrink: 1 }}>
            <Text variant="bodyStrong" style={{ color: c.fg }}>
              {label}
            </Text>
            {hint ? (
              <Text variant="caption" style={{ color: on ? c.fg : t.textSecondary, opacity: on ? 0.85 : 1 }}>
                {hint}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable.Touch>
  );
}

// RadioOption — one row of a single-choice list, with a radio mark. The
// picked row gets a stronger border and a muted fill.
export type RadioOptionProps = {
  label: string;
  hint?: string;
  on: boolean;
  onPress: () => void;
};

export function RadioOption({ label, hint, on, onPress }: RadioOptionProps) {
  const t = useTheme();
  return (
    <Pressable.Touch
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.gapMd,
        borderRadius: radius.lg,
        borderWidth: on ? 1.5 : 1,
        borderColor: on ? t.textPrimary : t.border,
        backgroundColor: on ? t.surfaceMuted : t.surfaceElevated,
        paddingHorizontal: layout.card,
        paddingVertical: space[3],
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: on ? t.textPrimary : t.textMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.textPrimary }} /> : null}
      </View>
      <View style={{ flexShrink: 1 }}>
        <Text variant="body">{label}</Text>
        {hint ? (
          <Text variant="caption" color="secondary">
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable.Touch>
  );
}

// Checklist — steps the user ticks off. `boxed` (default) gives each item its
// own bordered row, the look for a "what needs you" panel; unboxed is a plain
// compact list.
export type ChecklistItem = { text: string; on: boolean };

export type ChecklistProps = {
  items: readonly ChecklistItem[];
  onToggle?: (index: number) => void;
  boxed?: boolean;
};

export function Checklist({ items, onToggle, boxed = true }: ChecklistProps) {
  const t = useTheme();
  return (
    <View style={{ gap: boxed ? space[2] : space[1] }}>
      {items.map((item, i) => {
        const box = (
          <View
            style={{
              width: boxed ? 22 : 18,
              height: boxed ? 22 : 18,
              borderRadius: 5,
              borderWidth: 1.5,
              borderColor: item.on ? t.success : t.textMuted,
              backgroundColor: item.on ? t.success : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item.on ? <Ionicons name="checkmark" size={boxed ? 16 : 13} color={t.surfaceElevated} /> : null}
          </View>
        );
        return (
          <Pressable.Touch
            key={`${i}-${item.text}`}
            onPress={onToggle ? () => onToggle(i) : undefined}
            disabled={!onToggle}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.on }}
            accessibilityLabel={item.text}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: layout.gapMd,
              ...(boxed
                ? {
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: t.border,
                    backgroundColor: t.surfaceElevated,
                    paddingHorizontal: layout.card,
                    paddingVertical: space[3],
                  }
                : { paddingVertical: space[1] }),
            }}
          >
            {box}
            <Text
              variant="body"
              color={item.on ? 'muted' : 'primary'}
              style={item.on ? { textDecorationLine: 'line-through' } : undefined}
            >
              {item.text}
            </Text>
          </Pressable.Touch>
        );
      })}
    </View>
  );
}
