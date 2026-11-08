import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Heading, Copy, Field, Button } from '../src/ui/primitives';
import { DateField } from '../src/ui/DateField';
import { useApp, attempt } from '../src/state/app';
export default function Measurement() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { repo, refresh } = useApp(),
    p = repo.active()!,
    m = repo.measurements(p.id).find((m) => m.id === id);
  const [value, setValue] = useState(String(m?.value ?? '')),
    [date, setDate] = useState(m?.date ?? '2026-01-01');
  if (!m)
    return (
      <Screen>
        <Copy>Measurement no longer exists.</Copy>
        <Button title="Back" onPress={() => router.back()} />
      </Screen>
    );
  return (
    <Screen>
      <Heading title="Edit measurement" />
      <Copy>{p.metrics.find((x) => x.id === m.metric_id)?.name ?? m.metric_id}</Copy>
      <Field label="Value" value={value} onChangeText={setValue} numeric />
      <DateField label="Recorded on" value={date} onChange={setDate} />
      <Button
        title="Save measurement"
        onPress={() =>
          attempt(() => {
            if (!value.trim()) throw new Error('Enter a measurement');
            repo.updateMeasurement(id, date, Number(value));
            refresh();
            router.back();
          })
        }
      />
      <Button title="Cancel" kind="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
