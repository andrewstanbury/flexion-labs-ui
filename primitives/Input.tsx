import { useState } from 'react';
import {
  TextInput as RNTextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { controlHeight, radius, space, typography } from '../tokens';
import { useTheme } from '../UIProvider';
import { Pressable } from './Pressable';

export type InputProps = Omit<TextInputProps, 'style'> & {
  invalid?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

function TextInputImpl({ invalid, containerStyle, ...rest }: InputProps) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          height: controlHeight.lg,
          backgroundColor: t.surfaceElevated,
          borderColor: invalid ? t.danger : t.border,
          borderWidth: 1,
          borderRadius: radius.field,
          paddingHorizontal: space[4],
          justifyContent: 'center',
        },
        containerStyle,
      ]}
    >
      <RNTextInput
        {...rest}
        placeholderTextColor={t.textMuted}
        style={{
          color: t.textPrimary,
          fontSize: typography.body.fontSize,
          fontWeight: typography.body.fontWeight,
        }}
      />
    </View>
  );
}

function PasswordImpl({ invalid, containerStyle, ...rest }: InputProps) {
  const t = useTheme();
  const [hidden, setHidden] = useState(true);
  return (
    <View
      style={[
        {
          height: controlHeight.lg,
          backgroundColor: t.surfaceElevated,
          borderColor: invalid ? t.danger : t.border,
          borderWidth: 1,
          borderRadius: radius.field,
          paddingHorizontal: space[4],
          flexDirection: 'row',
          alignItems: 'center',
        },
        containerStyle,
      ]}
    >
      <RNTextInput
        {...rest}
        secureTextEntry={hidden}
        placeholderTextColor={t.textMuted}
        style={{
          flex: 1,
          color: t.textPrimary,
          fontSize: typography.body.fontSize,
          fontWeight: typography.body.fontWeight,
        }}
      />
      <Pressable.Touch
        onPress={() => setHidden((h) => !h)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons
          name={hidden ? 'eye-outline' : 'eye-off-outline'}
          size={20}
          color={t.textSecondary}
        />
      </Pressable.Touch>
    </View>
  );
}

// Single-line numeric code (verification, OTP). Centered, monospaced
// letter-spacing. Maxes at 6 chars by default.
function CodeImpl({
  invalid,
  containerStyle,
  maxLength = 6,
  ...rest
}: InputProps) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          height: 60,
          backgroundColor: t.surfaceElevated,
          borderColor: invalid ? t.danger : t.border,
          borderWidth: 1,
          borderRadius: radius.field,
          paddingHorizontal: space[4],
          justifyContent: 'center',
        },
        containerStyle,
      ]}
    >
      <RNTextInput
        {...rest}
        keyboardType="number-pad"
        maxLength={maxLength}
        style={{
          color: t.textPrimary,
          fontSize: 24,
          fontWeight: '700',
          textAlign: 'center',
          letterSpacing: 6,
        }}
        placeholderTextColor={t.textMuted}
      />
    </View>
  );
}

export const Input = Object.assign(TextInputImpl, {
  Text:     TextInputImpl,
  Password: PasswordImpl,
  Code:     CodeImpl,
});
