/** @type {import('jest').Config} */
// Reuses the consuming app's installed toolchain (node_modules is symlinked to
// the client app for local dev/CI — the package itself ships only source).
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/**/__tests__/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|expo(nent)?|@expo|@expo-google-fonts|react-clone-referenced-element|@react-navigation|@unimodules|expo-modules-core|sentry-expo|native-base|react-native-svg|@aws-amplify|aws-amplify|@react-native-async-storage|nativewind)',
  ],
  testPathIgnorePatterns: ['/node_modules/'],
};
