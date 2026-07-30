/** @type {import('jest').Config} */
// Reuses the consuming app's installed toolchain (node_modules is symlinked to
// the client app for local dev/CI — the package itself ships only source).
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],

  // Required from SDK 57 / reanimated 4.5. `react-native-reanimated/mock` now
  // pulls in react-native-worklets, whose NativeWorklets.native.ts tries to load
  // native unpackers and dies under node with:
  //
  //   TypeError: Cannot read properties of undefined (reading 'loadUnpackers')
  //
  // This resolver — shipped by worklets for exactly this — drops the `.native`
  // extensions when resolving that package, so the non-native implementation is
  // picked up instead. Without it every suite that touches an animated
  // component fails to even load.
  resolver: '<rootDir>/node_modules/react-native-worklets/jest/resolver.js',
  testMatch: ['<rootDir>/**/__tests__/*.test.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|expo(nent)?|@expo|@expo-google-fonts|react-clone-referenced-element|@react-navigation|@unimodules|expo-modules-core|sentry-expo|native-base|react-native-svg|@aws-amplify|aws-amplify|@react-native-async-storage|nativewind)',
  ],
  testPathIgnorePatterns: ['/node_modules/'],
};
