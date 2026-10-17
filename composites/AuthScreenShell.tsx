import { useContext } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { colors, layout, space } from '../tokens';
import { useTheme } from '../UIProvider';
import { Screen } from '../primitives/Screen';
import { Icon, type IconProps } from '../primitives/Icon';
import { Text } from '../primitives/Text';
import { HeroBanner } from './Website';

// AuthScreenShell — Welcome / Sign-In / Sign-Up share one layout, styled after
// the flexionlabs.com hero (v0.36.0): a photo hero under a deep-sage wash with
// the FlexionLabs mark, a big white heading and the subtitle, then the form on
// a cream sheet that overlaps the hero's rounded bottom. Use it as the
// outermost wrapper of any auth route and pass form rows as children.
export type AuthScreenShellProps = {
  iconName?: IconProps['name'];
  iconLabel?: string;     // single character for the F logo case
  title: string;
  subtitle?: string;
  topAccessory?: React.ReactNode; // back chevron, error banner, etc.
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Art direction for the hero's placeholder photo until real art lands. */
  heroBrief?: string;
};

function Mark({ iconLabel, iconName }: { iconLabel?: string; iconName?: IconProps['name'] }) {
  if (!iconLabel && !iconName) return null;
  return (
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: colors.sand[100],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {iconLabel ? (
        <Text variant="display" style={{ color: colors.sage[700], fontSize: 32, lineHeight: 38 }}>
          {iconLabel}
          <Text variant="display" style={{ color: colors.sage[500], fontSize: 32, lineHeight: 38 }}>.</Text>
        </Text>
      ) : iconName ? (
        <Icon name={iconName} size="xl" color={colors.sage[700]} />
      ) : null}
    </View>
  );
}

export function AuthScreenShell({
  iconName,
  iconLabel,
  title,
  subtitle,
  topAccessory,
  children,
  footer,
  heroBrief = 'Someone stretching at home, morning light, calm and unhurried',
}: AuthScreenShellProps) {
  const t = useTheme();
  // Context with a zero fallback: the hook throws outside a SafeAreaProvider.
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  return (
    <Screen padded={false} edges={[]}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + layout.screenY }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <HeroBanner title={title} subtitle={subtitle} imageBrief={heroBrief} topInset={insets.top} minHeight={300}>
          {topAccessory ? <View>{topAccessory}</View> : null}
        </HeroBanner>
        {/* The mark sits on the hero's edge, between the photo and the form. */}
        <View style={{ marginTop: -32, paddingHorizontal: layout.screenX, zIndex: 1 }}>
          <Mark iconLabel={iconLabel} iconName={iconName} />
        </View>
        <View
          style={{
            flexGrow: 1,
            paddingHorizontal: layout.screenX,
            paddingTop: space[5],
            gap: layout.gapMd,
            backgroundColor: t.surface,
          }}
        >
          {children}
          {footer ? <View style={{ marginTop: layout.gapXl }}>{footer}</View> : null}
        </View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}
