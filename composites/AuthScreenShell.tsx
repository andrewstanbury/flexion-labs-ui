import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { layout, radius, space } from '../tokens';
import { useTheme } from '../UIProvider';
import { Screen } from '../primitives/Screen';
import { Icon, type IconProps } from '../primitives/Icon';
import { Text } from '../primitives/Text';

// AuthScreenShell — Welcome / Sign-In / Sign-Up share the same vertical
// layout: scrollable center-justified column, a round icon "hero," title,
// subtitle, then the form body. Use this as the outermost wrapper of any
// auth route and pass form rows as children.

export type AuthScreenShellProps = {
  iconName?: IconProps['name'];
  iconLabel?: string;     // single character for the F logo case
  title: string;
  subtitle?: string;
  topAccessory?: React.ReactNode; // back chevron, error banner, etc.
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthScreenShell({
  iconName,
  iconLabel,
  title,
  subtitle,
  topAccessory,
  children,
  footer,
}: AuthScreenShellProps) {
  const t = useTheme();
  return (
    <Screen padded={false}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: layout.screenX,
          paddingVertical: layout.screenY,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
          {topAccessory ? <View style={{ marginBottom: space[6] }}>{topAccessory}</View> : null}

          <View style={{ alignItems: 'center', marginBottom: space[8] }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: radius.pill,
                backgroundColor: t.accent,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: space[5],
              }}
            >
              {iconLabel ? (
                <Text variant="display" style={{ color: '#FFFFFF' }}>{iconLabel}</Text>
              ) : iconName ? (
                <Icon name={iconName} size="xl" color="inverse" />
              ) : null}
            </View>
            <Text variant="h1" color="primary" style={{ textAlign: 'center' }}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                variant="body"
                color="secondary"
                style={{ marginTop: space[2], textAlign: 'center', paddingHorizontal: space[4] }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View style={{ gap: layout.gapMd }}>{children}</View>

          {footer ? <View style={{ marginTop: layout.gapXl }}>{footer}</View> : null}
      </KeyboardAwareScrollView>
    </Screen>
  );
}
