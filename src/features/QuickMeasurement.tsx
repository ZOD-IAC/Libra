import React, { useState } from 'react';
import { View } from 'react-native';
import { useApp, attempt } from '../state/app';
import { Copy, Field, Chips, Button, Row } from '../ui/primitives';
import { DateField } from '../ui/DateField';
import { today } from '../domain/schedule';
export function QuickMeasurement() {
  const { repo, refresh } = useApp(),
    p = repo.active()!,
    [metric, setMetric] = useState(p.metrics[0]?.id ?? ''),
    [value, setValue] = useState(''),
    [day, setDay] = useState(today(p.timezone)),
    [message, setMessage] = useState('');
  if (!p.metrics.length)
    return <Copy muted>Define measurements in Settings to start recording.</Copy>;
  return (
    <View style={{ gap: 12 }}>
      <Chips
        values={p.metrics.map((m) => ({ id: m.id, name: `${m.name} (${m.unit})` }))}
        value={metric}
        onChange={setMetric}
      />
      <Field label="Measurement" value={value} onChangeText={setValue} numeric />
      <DateField label="Recorded on" value={day} onChange={setDay} />
      <Button
        title="Save measurement"
        kind="soft"
        onPress={() =>
          attempt(() => {
            if (!value.trim()) throw new Error('Enter a measurement');
            repo.measure(metric, day, Number(value));
            setValue('');
            setMessage('Measurement saved');
            refresh();
          })
        }
      />
      {!!message && <Copy muted>{message}</Copy>}
    </View>
  );
}
