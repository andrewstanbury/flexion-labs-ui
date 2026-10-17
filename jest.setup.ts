/* eslint-disable @typescript-eslint/no-explicit-any */
// Minimal mocks so primitives render in jest-node (mirrors the apps' setup).
// KeyboardScreen renders KeyboardAwareScrollView; the library ships a jest mock
// that renders its components as plain Views (no native keyboard module).
jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest'),
);

// AsyncStorage has no native module under jest — use the package's official
// in-memory mock so anything touching useThemeStore (persisted preference) runs.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const stub = (label: string) => (props: any) =>
    React.createElement(Text, { ...props, testID: props.testID ?? `${label}-icon` }, props.name ?? null);
  return new Proxy({}, { get: (_t, prop) => (prop === '__esModule' ? true : stub(String(prop))) });
});

// No native speech engine under jest — PanelCarousel's narration is tested
// against these jest.fn() stubs (call args, call count), not real audio.
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn().mockResolvedValue(false),
  getAvailableVoicesAsync: jest.fn().mockResolvedValue([]),
  VoiceQuality: { Default: 'Default', Enhanced: 'Enhanced' },
}));

// No biometric hardware under jest — AppLockToggle's tests control these
// return values per-test via jest.spyOn/mockResolvedValue.
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('nativewind', () => ({
  styled: (C: any) => C,
  useColorScheme: () => ({ colorScheme: 'light', setColorScheme: jest.fn() }),
  cssInterop: () => undefined,
}));

// No native audio engine under jest — PanelCarousel's pre-generated narration
// is tested against this shared player stub (play/pause/replace calls), not
// real audio. One player object so tests can inspect it via createAudioPlayer.
jest.mock('expo-audio', () => {
  const player = {
    play: jest.fn(),
    pause: jest.fn(),
    replace: jest.fn(),
    remove: jest.fn(),
    setPlaybackRate: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  };
  return {
    createAudioPlayer: jest.fn(() => player),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  };
});
