import React from 'react';
import { router } from 'expo-router';
import { Screen, Heading, Copy, Panel, Button } from '../src/ui/primitives';
import { samples, samplePlan } from '../src/domain/samples';
import { receiveSharedText } from '../src/state/incoming';
import { attempt } from '../src/state/app';
export default function Samples() {
  return (
    <Screen>
      <Heading title="Try a detailed sample" />
      <Copy muted>
        Samples show how subtasks, products and habits work. They use example products rather than
        your personal details. Your current plan and records remain available in Settings.
      </Copy>
      {samples.map((sample) => (
        <Panel key={sample.id}>
          <Copy heading size={24}>
            {sample.title}
          </Copy>
          <Copy muted>{sample.subtitle}</Copy>
          <Button
            title="Preview sample"
            kind="soft"
            onPress={() =>
              attempt(() => {
                const p = samplePlan(sample.data);
                receiveSharedText(
                  JSON.stringify({ ...p, id: `${p.id}-demo-${Date.now()}`, version: 1 }),
                );
                router.push({ pathname: '/import', params: { incoming: String(Date.now()) } });
              })
            }
          />
        </Panel>
      ))}
      <Button title="Back" kind="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
