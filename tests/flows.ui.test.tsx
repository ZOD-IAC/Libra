import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ImportScreen from '../app/import';
import { Onboarding } from '../src/features/Onboarding';
import { ActivityRow } from '../src/features/ActivityRow';
import general from '../examples/general.json';
import { validatePlan } from '../src/domain/schema';
const mockApp = {
  repo: { versions: jest.fn(() => []), apply: jest.fn(), record: jest.fn() },
  refresh: jest.fn(),
};
jest.mock('../src/state/app', () => ({
  useApp: () => mockApp,
  attempt: (fn: () => unknown) => fn(),
}));
jest.mock('../src/services/files', () => ({ pickText: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: require('react-native').View },
  useReducedMotion: () => true,
  FadeIn: { duration: () => undefined },
}));
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-haptics', () => ({ selectionAsync: () => Promise.resolve() }));
beforeEach(() => jest.clearAllMocks());
test('import preview validates without applying until the confirmation action', async () => {
  const ui = await render(<ImportScreen />);
  await fireEvent.changeText(
    ui.getByLabelText('Or paste configuration JSON'),
    JSON.stringify(general),
  );
  await fireEvent.press(ui.getByText('Validate & preview'));
  expect(ui.getByText(general.name)).toBeTruthy();
  expect(mockApp.repo.apply).not.toHaveBeenCalled();
  await fireEvent.press(ui.getByText('Confirm & activate plan'));
  expect(mockApp.repo.apply).toHaveBeenCalledWith(expect.objectContaining({ id: general.id }));
  expect(mockApp.refresh).toHaveBeenCalled();
});
test('invalid config explains error and never exposes activation', async () => {
  const ui = await render(<ImportScreen />);
  await fireEvent.changeText(ui.getByLabelText('Or paste configuration JSON'), '{bad');
  await fireEvent.press(ui.getByText('Validate & preview'));
  expect(ui.getByText('Check the configuration')).toBeTruthy();
  expect(ui.queryByText('Confirm & activate plan')).toBeNull();
  expect(mockApp.repo.apply).not.toHaveBeenCalled();
});
test('manual onboarding creates a plan without requiring AI', async () => {
  const ui = await render(<Onboarding />);
  await fireEvent.press(ui.getByText('Create a basic routine'));
  await fireEvent.changeText(ui.getByLabelText('Plan name'), 'My own rhythm');
  await fireEvent.press(ui.getByText('Create my plan'));
  expect(mockApp.repo.apply).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'My own rhythm', activities: [] }),
  );
});
test('checkbox row records completion with one quick action', async () => {
  const a = { ...validatePlan(general).activities[0], steps: [], inputs: [] },
    row = {
      id: 'p/a/2026-11-07/08:00',
      plan_id: 'p',
      activity_id: a.id,
      origin_date: '2026-11-07',
      due_date: '2026-11-07',
      time: '08:00',
      definition: JSON.stringify(a),
      status: 'pending' as const,
      values_json: '{}',
      notes: '',
      completed_at: null,
      timer_start: null,
      timer_seconds: 0,
    };
  const ui = await render(<ActivityRow row={row} day="2026-11-07" />);
  await fireEvent.press(ui.getByRole('checkbox'));
  expect(mockApp.repo.record).toHaveBeenCalledWith(row.id, 'completed', {}, '');
  expect(mockApp.refresh).toHaveBeenCalled();
});
