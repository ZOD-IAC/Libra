import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { InputControl } from '../src/features/InputControl';
import { Button } from '../src/ui/primitives';
test('numeric input emits a numeric measurement', async () => {
  const change = jest.fn();
  const ui = await render(
    <InputControl
      input={{ id: 'sleep', label: 'Sleep', type: 'number', unit: 'hours', required: true }}
      value={undefined}
      onChange={change}
    />,
  );
  await fireEvent.changeText(ui.getByLabelText('Sleep (hours) *'), '7.5');
  expect(change).toHaveBeenCalledWith(7.5);
});
test('choice control exposes choices and selected state', async () => {
  const change = jest.fn();
  const ui = await render(
    <InputControl
      input={{
        id: 'mood',
        label: 'Mood',
        type: 'choice',
        required: true,
        choices: ['Calm', 'Busy'],
      }}
      value="Calm"
      onChange={change}
    />,
  );
  await fireEvent.press(ui.getByText('Busy'));
  expect(change).toHaveBeenCalledWith('Busy');
  expect(ui.getByRole('button', { name: 'Calm' }).props.accessibilityState.selected).toBe(true);
});
test('text reflection remains text', async () => {
  const change = jest.fn();
  const ui = await render(
    <InputControl
      input={{ id: 'note', label: 'Reflection', type: 'text', required: false }}
      value=""
      onChange={change}
    />,
  );
  await fireEvent.changeText(ui.getByLabelText('Reflection'), 'One useful thing');
  expect(change).toHaveBeenCalledWith('One useful thing');
});
test('disabled actions do not fire', async () => {
  const action = jest.fn();
  const ui = await render(<Button title="Save" onPress={action} disabled />);
  await fireEvent.press(ui.getByRole('button', { name: 'Save' }));
  expect(action).not.toHaveBeenCalled();
});

test('numeric entry preserves intermediate decimal text while typing', async () => {
  function Harness() {
    const [value, setValue] = React.useState<string | number>('');
    return (
      <InputControl
        input={{ id: 'x', label: 'Value', type: 'number', required: true }}
        value={value}
        onChange={setValue}
      />
    );
  }
  const ui = await render(<Harness />);
  const field = ui.getByLabelText('Value *');
  await fireEvent.changeText(field, '7');
  await fireEvent.changeText(field, '7.');
  expect(ui.getByDisplayValue('7.')).toBeTruthy();
  await fireEvent.changeText(field, '7.5');
  expect(ui.getByDisplayValue('7.5')).toBeTruthy();
});
