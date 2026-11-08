export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes('expo-sharing')) return '/';
    return '/';
  } catch {
    return '/';
  }
}
