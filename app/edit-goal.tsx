import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams, Redirect } from 'expo-router';
import { useApp, attempt } from '../src/state/app';
import { Screen, Heading, Copy, Field, Panel, Button, Chips, Toggle } from '../src/ui/primitives';
import { DateField } from '../src/ui/DateField';
import { today } from '../src/domain/schedule';
import { NumericField } from '../src/ui/NumericField';
import type { Plan } from '../src/domain/schema';
export default function EditGoal() {
  const { id } = useLocalSearchParams<{ id?: string }>(),
    { repo, refresh } = useApp(),
    p = repo.active(),
    initial = p?.goals.find((g) => g.id === id);
  const [g, setG] = useState<Plan['goals'][number]>(
    initial ?? {
      id: `goal-${Date.now()}`,
      name: '',
      description: '',
      archived: false,
      mode: 'completions',
      target: 10,
      activityIds: [],
      start: today(p?.timezone ?? 'UTC'),
      milestones: [],
    },
  );
  const [target, setTarget] = useState(String(g.target));
  if (!p) return <Redirect href="/" />;
  const patch = (v: Partial<typeof g>) => setG((s) => ({ ...s, ...v }));
  return (
    <Screen>
      <Heading title={initial ? 'Edit goal' : 'New goal'} />
      <Field label="Goal name" value={g.name} onChangeText={(v) => patch({ name: v })} />
      <Field
        label="Description"
        value={g.description}
        onChangeText={(v) => patch({ description: v })}
        multiline
      />
      <Copy muted size={13}>
        Progress calculation
      </Copy>
      <Chips
        values={[
          { id: 'completions', name: 'Count completions' },
          { id: 'sum', name: 'Sum field values' },
          { id: 'measurement', name: 'Latest measurement' },
        ]}
        value={g.mode}
        onChange={(v) => patch({ mode: v as typeof g.mode })}
      />
      <Field
        label="Target (progress reaches 100% at or above this value)"
        value={target}
        onChangeText={setTarget}
        numeric
      />
      {g.mode === 'measurement' ? (
        <>
          <Copy muted>Measurement</Copy>
          <Chips
            values={p.metrics}
            value={g.metricId ?? ''}
            onChange={(v) => patch({ metricId: v })}
          />
        </>
      ) : (
        <>
          <Copy muted>Linked activities</Copy>
          {p.activities.map((a) => (
            <Toggle
              key={a.id}
              label={a.title}
              value={g.activityIds.includes(a.id)}
              onChange={(v) =>
                patch({
                  activityIds: v
                    ? [...g.activityIds, a.id]
                    : g.activityIds.filter((x) => x !== a.id),
                })
              }
            />
          ))}
        </>
      )}
      {g.mode === 'sum' && (
        <>
          <Copy muted size={12}>
            Choose a numeric field ID shared by every linked activity.
          </Copy>
          <Chips
            values={Array.from(
              new Map(
                p.activities
                  .filter((a) => g.activityIds.includes(a.id))
                  .flatMap((a) =>
                    a.inputs
                      .filter((i) => !['text', 'choice'].includes(i.type))
                      .map((i) => [i.id, { id: i.id, name: `${i.label} (${i.id})` }] as const),
                  ),
              ).values(),
            )}
            value={g.inputId ?? ''}
            onChange={(v) => patch({ inputId: v })}
          />
        </>
      )}
      <DateField label="Start date" value={g.start} onChange={(v) => patch({ start: v })} />
      <DateField
        label="End date (optional)"
        value={g.end ?? ''}
        onChange={(v) => patch({ end: v || undefined })}
        allowEmpty
      />
      <Copy heading size={23}>
        Milestones
      </Copy>
      {g.milestones.map((m, n) => (
        <Panel key={m.id}>
          <Field
            label="Milestone name"
            value={m.name}
            onChangeText={(v) =>
              patch({ milestones: g.milestones.map((x, i) => (n === i ? { ...x, name: v } : x)) })
            }
          />
          <NumericField
            label="Milestone target"
            value={m.target}
            onChange={(v) =>
              patch({
                milestones: g.milestones.map((x, i) => (n === i ? { ...x, target: Number(v) } : x)),
              })
            }
          />
          <Button
            title="Remove milestone"
            kind="danger"
            onPress={() => patch({ milestones: g.milestones.filter((_, i) => i !== n) })}
          />
        </Panel>
      ))}
      <Button
        title="Add milestone"
        kind="soft"
        onPress={() =>
          patch({
            milestones: [...g.milestones, { id: `milestone-${Date.now()}`, name: '', target: 5 }],
          })
        }
      />
      <Toggle label="Archive goal" value={g.archived} onChange={(v) => patch({ archived: v })} />
      <Button
        title="Save goal"
        onPress={() =>
          attempt(() => {
            const goal = { ...g, target: Number(target) };
            repo.apply({
              ...p,
              version: p.version + 1,
              goals: initial ? p.goals.map((x) => (x.id === g.id ? goal : x)) : [...p.goals, goal],
            });
            repo.syncMilestones(p.id);
            refresh();
            router.back();
          })
        }
      />
      <Button title="Cancel" kind="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
