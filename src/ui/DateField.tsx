import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Copy } from './primitives';
export function DateField({
  label,
  value,
  onChange,
  mode = 'date',
  allowEmpty = false,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  mode?: 'date' | 'time';
  allowEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const date =
    mode === 'date'
      ? new Date(`${value || '2026-01-01'}T12:00:00`)
      : new Date(`2026-01-01T${value || '08:00'}:00`);
  const clearControl =
    allowEmpty && value !== '' ? (
      <Button title="Clear" kind="ghost" onPress={() => onChange('')} />
    ) : null;
  return (
    <View style={{ gap: 4 }}>
      <Copy size={13} muted>
        {label}
      </Copy>
      <Button
        title={value || 'Not set'}
        kind="soft"
        icon={mode === 'date' ? 'calendar' : 'clock'}
        onPress={() => setOpen(true)}
      />
      {clearControl}
      {open ? (
        <DateTimePicker
          value={date}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, d) => {
            setOpen(Platform.OS === 'ios' && event.type !== 'dismissed');
            if (!d || event.type === 'dismissed') return;
            onChange(
              mode === 'date'
                ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
            );
          }}
        />
      ) : null}
      {open && Platform.OS === 'ios' ? (
        <Button title="Done" onPress={() => setOpen(false)} />
      ) : null}
    </View>
  );
}
