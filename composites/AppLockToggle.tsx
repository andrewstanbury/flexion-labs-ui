import { View, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../UIProvider';
import { Icon } from '../primitives/Icon';
import { ToggleRow } from './ToggleRow';

export type AppLockCopy = {
  title: string;
  subtitle: string;
  cannotEnableTitle: string;
  cannotEnableBody: string;
  prompt: string;
  fallbackLabel: string;
  verifyFailedTitle: string;
  verifyFailedBody: string;
};

// The App Lock setting row. Turning it ON first verifies the device can
// actually authenticate (hardware present + a biometric/passcode enrolled)
// and then requires one successful check — so this never enables a gate the
// viewer can't get past. Turning it OFF is immediate.
//
// Takes `enabled`/`setEnabled` (not a specific store) and `copy` (not
// hardcoded strings) so it stays decoupled from any one app: the store's
// default differs per app (see createAppLockStore), and the client app
// needs these strings to go through i18n while practitioner has none —
// keeping copy out of the design system is the same principle OfflineBanner
// already follows.
export function AppLockToggle({
  enabled,
  setEnabled,
  copy,
}: {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  copy: AppLockCopy;
}) {
  const t = useTheme();

  async function handleToggle(next: boolean) {
    if (!next) {
      setEnabled(false);
      return;
    }
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        Alert.alert(copy.cannotEnableTitle, copy.cannotEnableBody);
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: copy.prompt,
        fallbackLabel: copy.fallbackLabel,
        disableDeviceFallback: false,
      });
      if (res.success) setEnabled(true);
    } catch {
      Alert.alert(copy.verifyFailedTitle, copy.verifyFailedBody);
    }
  }

  return (
    <ToggleRow
      leftIcon={
        <View
          style={{ width: 36, height: 36, borderRadius: 18 }}
          className="bg-blossom-50 dark:bg-sand-700 items-center justify-center"
        >
          <Icon name="lock-closed-outline" size="md" color={t.accentStrong} />
        </View>
      }
      title={copy.title}
      subtitle={copy.subtitle}
      value={enabled}
      onValueChange={handleToggle}
    />
  );
}
