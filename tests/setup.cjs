global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('../src/ui/theme', () => ({
  useTheme: () => ({
    bg: '#F5F3EB',
    surface: '#FFFFFF',
    ink: '#203C31',
    muted: '#738077',
    primary: '#235C45',
    sage: '#DCE7D9',
    line: '#E0E3D9',
    danger: '#A34D3A',
    soft: '#ECEEE4',
    onPrimary: '#FFFFFF',
    isDark: false,
  }),
  serif: 'serif',
}));
jest.mock('@expo/vector-icons/Feather', () => ({ __esModule: true, default: () => null }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
