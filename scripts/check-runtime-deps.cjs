const pkg = require('../package.json');
const required = [
  'expo-router',
  'expo-linking',
  'expo-constants',
  '@expo/metro-runtime',
  'react-native-safe-area-context',
  'react-native-screens',
  'expo-status-bar',
];
for (const name of required) {
  if (!pkg.dependencies[name]) {
    console.error(
      `Required runtime dependency ${name} must be declared directly. Run npx expo install ${name}.`,
    );
    process.exit(1);
  }
  try {
    require.resolve(name);
  } catch {
    console.error(`Required runtime dependency ${name} cannot be resolved. Run npm ci.`);
    process.exit(1);
  }
}
console.log('Router runtime dependencies are declared and resolve.');
