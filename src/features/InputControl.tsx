import React from 'react';
import { View } from 'react-native';
import type { Input, Value } from '../domain/schema';
import { NumericField } from '../ui/NumericField';
import { Copy, Field, Chips } from '../ui/primitives';
export function InputControl({
  input,
  value,
  onChange,
}: {
  input: Input;
  value: Value | undefined;
  onChange: (v: Value) => void;
}) {
  if (input.type === 'choice')
    return (
      <View style={{ gap: 8 }}>
        <Copy>
          {input.label}
          {input.required ? ' *' : ''}
        </Copy>
        <Chips
          values={input.choices!.map((c) => ({ id: c, name: c }))}
          value={String(value ?? '')}
          onChange={onChange}
        />
      </View>
    );
  if (input.type === 'rating') {
    const min = input.min ?? 1,
      max = input.max ?? 5;
    if (max - min <= 10 && Number.isInteger(min) && Number.isInteger(max))
      return (
        <View style={{ gap: 8 }}>
          <Copy>
            {input.label}
            {input.required ? ' *' : ''}
          </Copy>
          <Chips
            values={Array.from({ length: max - min + 1 }, (_, n) => ({
              id: String(n + min),
              name: String(n + min),
            }))}
            value={String(value ?? '')}
            onChange={(v) => onChange(Number(v))}
          />
        </View>
      );
  }
  const label = `${input.label}${input.unit ? ` (${input.unit})` : input.type === 'timer' ? ' (seconds)' : input.type === 'duration' ? ' (minutes)' : ''}${input.required ? ' *' : ''}${input.target !== undefined ? ` · target ${input.target}` : ''}`;
  return input.type === 'text' ? (
    <Field label={label} value={String(value ?? '')} onChangeText={onChange} multiline />
  ) : (
    <NumericField label={label} value={value} onChange={onChange} />
  );
}
