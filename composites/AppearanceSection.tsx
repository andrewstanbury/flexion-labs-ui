import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { layout, space } from '../tokens';
import { useTheme } from '../UIProvider';
import { Button } from '../primitives/Button';
import { Pressable } from '../primitives/Pressable';
import { Text } from '../primitives/Text';
import { SegmentedControl } from './SegmentedControl';
import { ToggleRow } from './ToggleRow';
import { PALETTE_IDS, paletteLabel, paletteSwatch, type PaletteId } from '../lib/palettes';
import {
  useAppearanceStore,
  type FontChoice,
  type MotionChoice,
  type TextSize,
} from '../hooks/useAppearanceStore';

// AppearanceSection (v0.32.0) — the retaskable-style appearance settings in
// one block: colour palette (optionally a separate one for dark mode), text
// size, font, bold text, contrast and motion. Drop it into a settings screen;
// light/dark/system stays wherever the app already has it. Pass `copy` to
// translate the labels.
export type AppearanceCopy = {
  colour: string;
  darkColour: string;
  darkColourHint: string;
  textSize: string;
  font: string;
  fontSystem: string;
  fontRounded: string;
  fontSerif: string;
  boldText: string;
  highContrast: string;
  highContrastHint: string;
  motion: string;
  motionSystem: string;
  motionReduce: string;
  motionAllow: string;
  reset: string;
};

export const DEFAULT_APPEARANCE_COPY: AppearanceCopy = {
  colour: 'Colour',
  darkColour: 'Different colour in dark mode',
  darkColourHint: 'Pick a second palette for when dark mode is on',
  textSize: 'Text size',
  font: 'Font',
  fontSystem: 'System',
  fontRounded: 'Rounded',
  fontSerif: 'Serif',
  boldText: 'Bold text',
  highContrast: 'High contrast',
  highContrastHint: 'Darker text and borders',
  motion: 'Motion',
  motionSystem: 'System',
  motionReduce: 'Reduce',
  motionAllow: 'Full',
  reset: 'Reset to defaults',
};

function Label({ children }: { children: string }) {
  return (
    <Text variant="bodyStrong" style={{ marginBottom: space[2] }}>
      {children}
    </Text>
  );
}

function PalettePicker({ value, onChange }: { value: PaletteId; onChange: (id: PaletteId) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
      {PALETTE_IDS.map((id) => {
        const on = id === value;
        const label = paletteLabel(id);
        return (
          <Pressable.Touch
            key={id}
            onPress={() => onChange(id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label}
            style={{ width: 56, alignItems: 'center', gap: space[1] }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                padding: 3,
                borderWidth: 2,
                borderColor: on ? t.textPrimary : 'transparent',
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 18,
                  backgroundColor: paletteSwatch(id),
                  // Hairline so near-black Ink stays visible on dark surfaces.
                  borderWidth: 1,
                  borderColor: t.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {on ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
              </View>
            </View>
            <Text variant="caption" color={on ? 'primary' : 'secondary'} numberOfLines={1}>
              {label}
            </Text>
          </Pressable.Touch>
        );
      })}
    </View>
  );
}

export function AppearanceSection({ copy: partial }: { copy?: Partial<AppearanceCopy> }) {
  const copy = { ...DEFAULT_APPEARANCE_COPY, ...partial };
  const a = useAppearanceStore();
  const separateDark = a.paletteDark !== 'same';
  return (
    <View style={{ gap: layout.gapXl }}>
      <View>
        <Label>{copy.colour}</Label>
        <PalettePicker value={a.palette} onChange={(palette) => a.set({ palette })} />
      </View>

      <View style={{ gap: layout.gapMd }}>
        <ToggleRow
          title={copy.darkColour}
          subtitle={copy.darkColourHint}
          value={separateDark}
          onValueChange={(on) => a.set({ paletteDark: on ? a.palette : 'same' })}
        />
        {separateDark ? (
          <PalettePicker
            value={a.paletteDark === 'same' ? a.palette : a.paletteDark}
            onChange={(paletteDark) => a.set({ paletteDark })}
          />
        ) : null}
      </View>

      <View>
        <Label>{copy.textSize}</Label>
        <SegmentedControl<TextSize>
          options={[
            { value: 'sm', label: 'A−' },
            { value: 'md', label: 'A' },
            { value: 'lg', label: 'A+' },
            { value: 'xl', label: 'A++' },
          ]}
          value={a.textSize}
          onChange={(textSize) => a.set({ textSize })}
        />
      </View>

      <View>
        <Label>{copy.font}</Label>
        <SegmentedControl<FontChoice>
          options={[
            { value: 'system', label: copy.fontSystem },
            { value: 'rounded', label: copy.fontRounded },
            { value: 'serif', label: copy.fontSerif },
          ]}
          value={a.font}
          onChange={(font) => a.set({ font })}
        />
      </View>

      <ToggleRow title={copy.boldText} value={a.boldText} onValueChange={(boldText) => a.set({ boldText })} />
      <ToggleRow
        title={copy.highContrast}
        subtitle={copy.highContrastHint}
        value={a.contrast === 'high'}
        onValueChange={(on) => a.set({ contrast: on ? 'high' : 'default' })}
      />

      <View>
        <Label>{copy.motion}</Label>
        <SegmentedControl<MotionChoice>
          options={[
            { value: 'system', label: copy.motionSystem },
            { value: 'reduce', label: copy.motionReduce },
            { value: 'allow', label: copy.motionAllow },
          ]}
          value={a.motion}
          onChange={(motion) => a.set({ motion })}
        />
      </View>

      <Button.Ghost size="sm" fullWidth={false} onPress={a.reset}>
        {copy.reset}
      </Button.Ghost>
    </View>
  );
}
