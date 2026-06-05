import { useColorScheme } from 'react-native';
import { useThemeStore } from './useThemeStore';

// Resolves the effective dark-mode boolean from the user's theme preference and
// the OS color scheme. Shared by both apps.
export function useIsDark() {
  const preference = useThemeStore((s) => s.theme);
  const systemScheme = useColorScheme();
  return preference === 'dark' || (preference === 'system' && systemScheme === 'dark');
}
