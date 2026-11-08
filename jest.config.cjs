module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/tests/**/*.ui.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.cjs'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-.*|@react-navigation/.*|react-native-svg)/)',
  ],
};
