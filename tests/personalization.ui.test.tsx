import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import Today from '../app/(tabs)/index';
import Products from '../app/products';
import Habits from '../app/habits';
import { QuickMeasurement } from '../src/features/QuickMeasurement';
import { ActivityRow } from '../src/features/ActivityRow';
import { validatePlan } from '../src/domain/schema';
import { today } from '../src/domain/schedule';
import type { Instance } from '../src/domain/analytics';
import general from '../examples/general.json';
const mockPlan = validatePlan({
  ...general,
  goals: [],
  metrics: [{ id: 'hours', name: 'Sleep hours', unit: 'hours' }],
});
mockPlan.activities[0].steps = [
  {
    id: 'wash',
    title: 'Use my chosen face wash',
    instructions: 'Rinse according to my product label.',
    productIds: [mockPlan.products[0].id],
  },
  { id: 'dry', title: 'Pat dry with a clean towel', instructions: '', productIds: [] },
];
const mockDay = today(mockPlan.timezone);
let mockParams: Record<string, string> = {};
let mockRows: Instance[] = [];
const mockApp = {
  plan: mockPlan,
  tick: 1,
  notifyError: null,
  repo: {
    active: () => mockPlan,
    rows: () => mockRows,
    allRows: () => mockRows,
    measurements: () => [],
    journal: () => '',
    settings: () => ({ enabled: 0 }),
    setStep: jest.fn(),
    record: jest.fn(),
    measure: jest.fn(),
    ensure: jest.fn(),
    product: jest.fn(),
  },
  refresh: jest.fn(),
};
jest.mock('../src/state/app', () => ({
  useApp: () => mockApp,
  attempt: (fn: () => unknown) => fn(),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Redirect: () => null,
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: require('react-native').View },
  useReducedMotion: () => true,
  FadeIn: { duration: () => undefined },
}));
jest.mock('expo-haptics', () => ({ selectionAsync: () => Promise.resolve() }));
function makeRow(): Instance {
  const a = mockPlan.activities[0];
  return {
    id: 'test-task',
    plan_id: mockPlan.id,
    activity_id: a.id,
    origin_date: mockDay,
    due_date: mockDay,
    time: '08:00',
    definition: JSON.stringify(a),
    status: 'pending',
    values_json: '{}',
    notes: '',
    completed_at: null,
    timer_start: null,
    timer_seconds: 0,
    checked_steps: [],
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockRows = [makeRow()];
});
test('Today renders the actual QuickMeasurement DateField without the text invariant', async () => {
  const ui = await render(<Today />);
  expect(ui.getByText('Recorded on')).toBeTruthy();
  expect(ui.getAllByText('Use my chosen face wash').length).toBeGreaterThan(0);
});
test('QuickMeasurement renders its date and can save a numeric value', async () => {
  const ui = await render(<QuickMeasurement />);
  await fireEvent.changeText(ui.getByLabelText('Measurement'), '7.5');
  await fireEvent.press(ui.getByText('Save measurement'));
  expect(mockApp.repo.measure).toHaveBeenCalledWith('hours', mockDay, 7.5);
});
test('Today activity exposes actual instructions and independent subtask ticks', async () => {
  const row = makeRow(),
    ui = await render(<ActivityRow row={row} day={mockDay} />);
  expect(ui.getByText('Rinse according to my product label.')).toBeTruthy();
  await fireEvent.press(
    ui.getByRole('checkbox', { name: 'Complete subtask: Use my chosen face wash' }),
  );
  expect(mockApp.repo.setStep).toHaveBeenCalledWith(row.id, 'wash', true);
  expect(mockApp.repo.record).not.toHaveBeenCalled();
  expect(mockApp.refresh).toHaveBeenCalled();
});
test('partially checked row displays the saved count and allows undoing that subtask', async () => {
  const row = { ...makeRow(), checked_steps: ['wash'] },
    ui = await render(<ActivityRow row={row} day={mockDay} />);
  expect(ui.getByText(/1\/2 steps/)).toBeTruthy();
  await fireEvent.press(
    ui.getByRole('checkbox', { name: 'Undo subtask: Use my chosen face wash' }),
  );
  expect(mockApp.repo.setStep).toHaveBeenCalledWith(row.id, 'wash', false);
});
test('product references open the separate products screen', async () => {
  const row = makeRow(),
    ui = await render(<ActivityRow row={row} day={mockDay} />);
  await fireEvent.press(ui.getByRole('button', { name: `Product: ${mockPlan.products[0].name}` }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/products',
    params: { id: mockPlan.products[0].id },
  });
});
test('separate product details show imported name and usage instructions', async () => {
  mockParams = { id: mockPlan.products[0].id };
  const ui = await render(<Products />);
  expect(ui.getAllByText(mockPlan.products[0].name).length).toBeGreaterThan(0);
  expect(ui.getByText(mockPlan.products[0].usageNotes)).toBeTruthy();
});
test('avoidance success uses a separate explicit confirmation', async () => {
  const row = makeRow(),
    a = JSON.parse(row.definition);
  a.habit = { direction: 'avoid', cue: 'Evening phone use', alternative: 'Read instead' };
  row.definition = JSON.stringify(a);
  const ui = await render(<ActivityRow row={row} day={mockDay} />);
  await fireEvent.press(ui.getByText('I avoided this today'));
  expect(mockApp.repo.record).toHaveBeenCalledWith(row.id, 'completed', {}, '');
});
test('habits screen provides both directions and an unrecorded-day explanation', async () => {
  const ui = await render(<Habits />);
  expect(ui.getByText('Add a habit to build')).toBeTruthy();
  expect(ui.getByText('Add a habit to avoid')).toBeTruthy();
  expect(ui.getByText(/An unchecked day is unrecorded/)).toBeTruthy();
});
