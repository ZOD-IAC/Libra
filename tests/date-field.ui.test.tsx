import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DateField } from '../src/ui/DateField';

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

test('date field renders its label and value without raw text under View', async () => {
  const ui = await render(<DateField label="Starts on" value="2026-11-08" onChange={jest.fn()} />);
  expect(ui.getByText('Starts on')).toBeTruthy();
  expect(ui.getByRole('button', { name: '2026-11-08' })).toBeTruthy();
});

test('optional empty date renders no Clear button or raw empty text', async () => {
  const ui = await render(<DateField label="Ends on" value="" onChange={jest.fn()} allowEmpty />);
  expect(ui.getByRole('button', { name: 'Not set' })).toBeTruthy();
  expect(ui.queryByRole('button', { name: 'Clear' })).toBeNull();
});

test('optional time can be cleared through its action', async () => {
  const change = jest.fn();
  const ui = await render(
    <DateField label="Time" value="08:30" onChange={change} mode="time" allowEmpty />,
  );
  await fireEvent.press(ui.getByRole('button', { name: 'Clear' }));
  expect(change).toHaveBeenCalledWith('');
});
