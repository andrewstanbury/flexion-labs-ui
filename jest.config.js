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

  // The panel player is the most failure-prone surface in both apps (audio,
  // timing, gestures). `npm run test:player` runs with coverage and fails
  // below these floors — set just under where they stand — so a change to the
  // player cannot merge without tests that exercise it. See docs/player.md.
  coverageThreshold: {
    './lib/panelPlayback.ts': { lines: 95, branches: 88, functions: 80 },
    './lib/narrationDriver.ts': { lines: 95, branches: 90, functions: 80 },
    './lib/clipSequencer.ts': { lines: 95, branches: 90, functions: 90 },
    './lib/panelTiming.ts': { lines: 100, branches: 100, functions: 100 },
    './composites/PanelCarousel.tsx': { lines: 95, branches: 80, functions: 85 },
  },
};
