const deps = [
  '@react-native/jest-preset',
  'test-renderer',
  'jest-expo',
  '@testing-library/react-native',
];
for (const dependency of deps) {
  try {
    require.resolve(dependency);
  } catch {
    console.error(
      `Missing test dependency: ${dependency}. Use the updated package.json and package-lock.json, then run npm ci. For a local repair: npm install -D @react-native/jest-preset@0.88.1 test-renderer@1.3.1`,
    );
    process.exit(1);
  }
}
console.log('Native UI test dependencies resolved.');
