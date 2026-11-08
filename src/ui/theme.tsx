import { useColorScheme, Platform } from 'react-native';
import { useApp } from '../state/app';
export const light = {
  bg: '#F5F3EB',
  surface: '#FFFEFA',
  ink: '#203C31',
  muted: '#738077',
  primary: '#235C45',
  sage: '#DCE7D9',
  line: '#E0E3D9',
  danger: '#A34D3A',
  soft: '#ECEEE4',
  onPrimary: '#FFFFFF',
};
export const dark = {
  bg: '#171A1C',
  surface: '#22272A',
  ink: '#F3F1E6',
  muted: '#ADB6B3',
  primary: '#A6D3AE',
  sage: '#2F3C35',
  line: '#3A4240',
  danger: '#F1AD94',
  soft: '#2B3032',
  onPrimary: '#14221D',
};
export function useTheme() {
  const { repo, plan } = useApp();
  const system = useColorScheme();
  const pref = repo.pref('theme') ?? plan?.theme ?? 'system';
  const isDark = pref === 'dark' || (pref === 'system' && system === 'dark');
  return { ...(isDark ? dark : light), isDark };
}
export const serif = Platform.OS === 'android' ? 'serif' : 'Georgia';
