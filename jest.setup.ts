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
  // One mock player per createAudioPlayer() call, emitting status events the
  // way iOS does (synchronously, so tests stay simple): created loaded;
  // play() → playing; pause() → not playing. Every player's calls land on the
  // SHARED spies in __spies, with the player's uri, so a test can assert on
  // "the narrator" without tracking which player is which: play(uri, pos),
  // seekTo(sec, uri), pause(uri). __players lists them; each has __emit.
  const spies = {
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
    setPlaybackRate: jest.fn(),
    remove: jest.fn(),
  };
  const players: unknown[] = [];
  const createAudioPlayer = jest.fn((source?: { uri?: string } | null) => {
    const uri = source?.uri ?? null;
    const listeners: ((s: unknown) => void)[] = [];
    const emit = (s: { isLoaded?: boolean; [k: string]: unknown }) => {
      if (s.isLoaded) p.isLoaded = true;
      [...listeners].forEach((l) => l(s));
    };
    const p = {
      uri,
      pos: 0,
      isLoaded: true,
      currentTime: 0,
      play: () => {
        spies.play(uri, p.pos);
        // A player that has not loaded cannot play (iOS drops the press).
        if (p.isLoaded) emit({ isLoaded: true, playing: true });
      },
      pause: () => {
        spies.pause(uri);
        if (p.isLoaded) emit({ isLoaded: true, playing: false });
      },
      seekTo: (sec: number) => {
        p.pos = sec;
        spies.seekTo(sec, uri);
      },
      setPlaybackRate: (r: number) => spies.setPlaybackRate(r, uri),
      remove: () => spies.remove(uri),
      replace: jest.fn(),
      addListener: jest.fn((_event: string, fn: (s: unknown) => void) => {
        listeners.push(fn);
        return {
          remove: jest.fn(() => {
            const i = listeners.indexOf(fn);
            if (i >= 0) listeners.splice(i, 1);
          }),
        };
      }),
      __emit: emit,
    };
    players.push(p);
    return p;
  });
  return {
    createAudioPlayer,
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    __spies: spies,
    __players: players,
  };
});

// Narration files resolve to their URL synchronously in component tests (no
// download). lib/narrationFiles itself is tested with requireActual.
jest.mock('./lib/narrationFiles', () => ({
  resolveNarrationFile: (url: string) => url,
  narrationFileName: jest.requireActual('./lib/narrationFiles').narrationFileName,
}));
