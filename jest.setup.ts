/* eslint-disable @typescript-eslint/no-explicit-any */
// Minimal mocks so primitives render in jest-node (mirrors the apps' setup).
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const stub = (label: string) => (props: any) =>
    React.createElement(Text, { ...props, testID: props.testID ?? `${label}-icon` }, props.name ?? null);
  return new Proxy({}, { get: (_t, prop) => (prop === '__esModule' ? true : stub(String(prop))) });
});

jest.mock('nativewind', () => ({
  styled: (C: any) => C,
  useColorScheme: () => ({ colorScheme: 'light', setColorScheme: jest.fn() }),
  cssInterop: () => undefined,
}));
