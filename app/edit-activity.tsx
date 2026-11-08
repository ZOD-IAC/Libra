import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { router, useLocalSearchParams, Redirect } from 'expo-router';
import { useApp, attempt } from '../src/state/app';
import {
  Screen,
  Heading,
  Copy,
  Field,
  Panel,
  Button,
  Chips,
  Toggle,
  Row,
  SectionTitle,
} from '../src/ui/primitives';
import { DateField } from '../src/ui/DateField';
import { today } from '../src/domain/schedule';
import { NumericField } from '../src/ui/NumericField';
import { DelimitedField } from '../src/ui/DelimitedField';
import { ProductSelector } from '../src/features/ProductSelector';
import type { Activity, Input } from '../src/domain/schema';
const uid = () => `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const inputTypes: Input['type'][] = [
  'number',
  'duration',
  'repetitions',
  'rating',
  'choice',
  'text',
  'timer',
];
export default function EditActivity() {
  const { id, habit } = useLocalSearchParams<{ id?: string; habit?: string }>(),
    { repo, refresh } = useApp(),
    p = repo.active();
  const initial = p?.activities.find((a) => a.id === id);
  const [a, setA] = useState<Activity>(
    initial ?? {
      id: uid(),
      title: '',
      description: '',
      categoryId: p?.categories[0].id ?? '',
      sectionId: p?.sections[0].id ?? '',
      goalIds: [],
      priority: 'normal',
      paused: false,
      schedule: { frequency: 'daily', start: today(p?.timezone ?? 'UTC'), interval: 1, times: [] },
      habit:
        habit === 'do' || habit === 'avoid'
          ? { direction: habit, cue: '', alternative: '' }
          : undefined,
      steps: [],
      productIds: [],
      inputs: [],
      reminder: { enabled: false, minutesBefore: 0 },
    },
  );
  const [interval, setIntervalValue] = useState(String(a.schedule.interval)),
    [before, setBefore] = useState(String(a.reminder.minutesBefore));
  if (!p) return <Redirect href="/" />;
  const patch = (v: Partial<Activity>) => setA((s) => ({ ...s, ...v })),
    schedule = (v: Partial<Activity['schedule']>) =>
      setA((s) => ({ ...s, schedule: { ...s.schedule, ...v } }));
  const input = (index: number, v: Partial<Input>) =>
    setA((s) => ({ ...s, inputs: s.inputs.map((i, n) => (n === index ? { ...i, ...v } : i)) }));
  const save = () =>
    attempt(() => {
      const next = {
        ...a,
        schedule: { ...a.schedule, interval: Number(interval) },
        reminder: { ...a.reminder, minutesBefore: Number(before) },
      };
      repo.apply({
        ...p,
        version: p.version + 1,
        activities: initial
          ? p.activities.map((x) => (x.id === a.id ? next : x))
          : [...p.activities, next],
      });
      refresh();
      router.back();
    });
  return (
    <Screen>
      <Heading
        eyebrow={initial ? 'REFINE YOUR RHYTHM' : 'MAKE ROOM FOR ONE THING'}
        title={initial ? 'Edit activity' : 'New activity'}
      />
      <Field label="Activity title" value={a.title} onChangeText={(v) => patch({ title: v })} />
      <Field
        label="Description"
        value={a.description}
        onChangeText={(v) => patch({ description: v })}
        multiline
      />
      <Panel>
        <Copy heading size={23}>
          Habit tracking
        </Copy>
        <Toggle
          label="Track as a habit"
          value={!!a.habit}
          onChange={(enabled) =>
            patch({ habit: enabled ? { direction: 'do', cue: '', alternative: '' } : undefined })
          }
        />
        {a.habit ? (
          <>
            <Chips
              values={[
                { id: 'do', name: 'Build / do this' },
                { id: 'avoid', name: 'Avoid this' },
              ]}
              value={a.habit.direction}
              onChange={(direction) => patch({ habit: { ...a.habit!, direction } })}
            />
            <Field
              label="When or what triggers it (optional)"
              value={a.habit.cue}
              onChangeText={(cue) => patch({ habit: { ...a.habit!, cue } })}
              multiline
            />
            <Field
              label="Alternative action (optional)"
              value={a.habit.alternative}
              onChangeText={(alternative) => patch({ habit: { ...a.habit!, alternative } })}
              multiline
            />
            <Copy muted size={12}>
              A tick means performed or successfully avoided, according to this direction. Unticked
              days are unrecorded.
            </Copy>
          </>
        ) : null}
      </Panel>
      <SectionTitle title="Your exact subtasks" />
      <Copy muted size={13}>
        Describe what to do, in order. Each subtask has its own saved tick. Partial progress remains
        visible.
      </Copy>
      {a.steps.map((step, index) => (
        <Panel key={step.id}>
          <Field
            label={`Subtask ${index + 1}`}
            value={step.title}
            onChangeText={(title) =>
              patch({ steps: a.steps.map((s, i) => (i === index ? { ...s, title } : s)) })
            }
          />
          <Field
            label="Personal instructions"
            value={step.instructions}
            onChangeText={(instructions) =>
              patch({ steps: a.steps.map((s, i) => (i === index ? { ...s, instructions } : s)) })
            }
            multiline
          />
          <Copy muted size={13}>
            Products for this step
          </Copy>
          <ProductSelector
            products={p.products}
            value={step.productIds}
            onChange={(productIds) =>
              patch({ steps: a.steps.map((s, i) => (i === index ? { ...s, productIds } : s)) })
            }
          />
          <Row>
            <Button
              title="Move up"
              kind="ghost"
              disabled={index === 0}
              onPress={() => {
                const steps = [...a.steps];
                [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
                patch({ steps });
              }}
            />
            <Button
              title="Move down"
              kind="ghost"
              disabled={index === a.steps.length - 1}
              onPress={() => {
                const steps = [...a.steps];
                [steps[index + 1], steps[index]] = [steps[index], steps[index + 1]];
                patch({ steps });
              }}
            />
          </Row>
          <Button
            title="Remove subtask"
            kind="danger"
            onPress={() => patch({ steps: a.steps.filter((_, i) => i !== index) })}
          />
        </Panel>
      ))}
      <Button
        title="Add subtask"
        kind="soft"
        disabled={a.steps.length >= 40}
        onPress={() =>
          patch({ steps: [...a.steps, { id: uid(), title: '', instructions: '', productIds: [] }] })
        }
      />
      <Panel>
        <Copy heading size={23}>
          Products for the activity
        </Copy>
        <ProductSelector
          products={p.products}
          value={a.productIds}
          onChange={(productIds) => patch({ productIds })}
        />
        <Button title="Manage products" kind="ghost" onPress={() => router.push('/products')} />
      </Panel>
      <Copy size={13} muted>
        Section
      </Copy>
      <Chips values={p.sections} value={a.sectionId} onChange={(v) => patch({ sectionId: v })} />
      <Copy size={13} muted>
        Category
      </Copy>
      <Chips
        values={p.categories}
        value={a.categoryId}
        onChange={(v) => patch({ categoryId: v })}
      />
      <Toggle
        label="High priority"
        value={a.priority === 'high'}
        onChange={(v) => patch({ priority: v ? 'high' : 'normal' })}
      />
      <Toggle label="Pause activity" value={a.paused} onChange={(v) => patch({ paused: v })} />
      <Panel>
        <Copy heading size={23}>
          Schedule
        </Copy>
        <Chips
          values={(['daily', 'weekly', 'monthly', 'once'] as const).map((f) => ({
            id: f,
            name: f,
          }))}
          value={a.schedule.frequency}
          onChange={(v) =>
            schedule({
              frequency: v,
              weekdays: v === 'weekly' ? (a.schedule.weekdays ?? [1]) : undefined,
              monthDays: v === 'monthly' ? (a.schedule.monthDays ?? [1]) : undefined,
            })
          }
        />
        <DateField
          label="Starts on"
          value={a.schedule.start}
          onChange={(v) => schedule({ start: v })}
        />
        <DateField
          label="Ends on (optional)"
          value={a.schedule.end ?? ''}
          onChange={(v) => schedule({ end: v || undefined })}
          allowEmpty
        />
        {a.schedule.frequency !== 'once' && (
          <Field
            label={`Every N ${a.schedule.frequency === 'daily' ? 'days' : a.schedule.frequency === 'weekly' ? 'weeks' : 'months'}`}
            value={interval}
            onChangeText={setIntervalValue}
            numeric
          />
        )}
        {a.schedule.frequency === 'weekly' && (
          <View style={{ gap: 5 }}>
            <Copy muted size={13}>
              Choose weekdays
            </Copy>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, n) => (
                <Button
                  key={d}
                  title={`${a.schedule.weekdays?.includes(n + 1) ? '✓ ' : ''}${d}`}
                  kind="ghost"
                  onPress={() =>
                    schedule({
                      weekdays: a.schedule.weekdays?.includes(n + 1)
                        ? a.schedule.weekdays.filter((x) => x !== n + 1)
                        : [...(a.schedule.weekdays ?? []), n + 1],
                    })
                  }
                />
              ))}
            </View>
          </View>
        )}
        {a.schedule.frequency === 'monthly' && (
          <DelimitedField
            label="Days of month (comma separated; nonexistent days are skipped)"
            value={a.schedule.monthDays ?? []}
            parse={Number}
            onChange={(monthDays) => schedule({ monthDays })}
          />
        )}
        <Copy muted size={13}>
          Times · leave empty for one untimed activity
        </Copy>
        {a.schedule.times.map((time, n) => (
          <View key={n}>
            <DateField
              label={`Occurrence ${n + 1}`}
              value={time}
              mode="time"
              onChange={(v) =>
                schedule({ times: a.schedule.times.map((x, i) => (i === n ? v : x)) })
              }
            />
            <Button
              title="Remove time"
              kind="ghost"
              onPress={() => schedule({ times: a.schedule.times.filter((_, i) => i !== n) })}
            />
          </View>
        ))}
        <Button
          title="Add occurrence time"
          kind="soft"
          disabled={a.schedule.times.length >= 8}
          onPress={() => schedule({ times: [...a.schedule.times, '08:00'] })}
        />
        <Toggle
          label="Activity reminders"
          value={a.reminder.enabled}
          onChange={(v) => patch({ reminder: { ...a.reminder, enabled: v } })}
        />
        {a.reminder.enabled && (
          <>
            <Field
              label="Minutes before activity"
              value={before}
              onChangeText={setBefore}
              numeric
            />
            <Copy muted size={12}>
              Requires a timed occurrence and notifications enabled in Settings.
            </Copy>
          </>
        )}
      </Panel>
      <SectionTitle title="What to record" />
      <Copy muted size={13}>
        Subtasks are separate checkboxes. Add optional tracking fields here for measurements,
        repetitions, timers or notes.
      </Copy>
      {a.inputs.map((i, n) => (
        <Panel key={i.id}>
          <Field label="Field label" value={i.label} onChangeText={(v) => input(n, { label: v })} />
          <Chips
            values={inputTypes.map((type) => ({ id: type, name: type }))}
            value={i.type}
            onChange={(v) =>
              input(n, {
                type: v,
                choices: v === 'choice' ? ['Option A', 'Option B'] : undefined,
                metricId: ['text', 'choice'].includes(v) ? undefined : i.metricId,
              })
            }
          />
          <Toggle label="Required" value={i.required} onChange={(v) => input(n, { required: v })} />
          {i.type === 'choice' ? (
            <DelimitedField
              label="Choices (comma separated)"
              value={i.choices ?? []}
              parse={(s) => s}
              onChange={(choices) => input(n, { choices })}
            />
          ) : (
            i.type !== 'text' && (
              <>
                <Field
                  label="Unit (timers always use seconds)"
                  value={i.unit ?? ''}
                  onChangeText={(v) => input(n, { unit: v })}
                />
                <NumericField
                  label="Target (optional)"
                  value={i.target ?? ''}
                  onChange={(v) => input(n, { target: v === '' ? undefined : Number(v) })}
                />
                <NumericField
                  label="Minimum (optional)"
                  value={i.min ?? ''}
                  onChange={(v) => input(n, { min: v === '' ? undefined : Number(v) })}
                />
                <NumericField
                  label="Maximum (optional)"
                  value={i.max ?? ''}
                  onChange={(v) => input(n, { max: v === '' ? undefined : Number(v) })}
                />
                <Copy muted size={13}>
                  Also record as a measurement
                </Copy>
                <Chips
                  values={[{ id: '', name: 'None' }, ...p.metrics]}
                  value={i.metricId ?? ''}
                  onChange={(v) => input(n, { metricId: v || undefined })}
                />
              </>
            )
          )}
          <Copy muted size={11}>
            Stable field ID: {i.id}
          </Copy>
          <Button
            title="Remove field"
            kind="danger"
            onPress={() => patch({ inputs: a.inputs.filter((_, x) => x !== n) })}
          />
        </Panel>
      ))}
      <Button
        title="Add tracking field"
        kind="soft"
        disabled={a.inputs.length >= 8}
        onPress={() =>
          patch({ inputs: [...a.inputs, { id: uid(), label: '', type: 'number', required: true }] })
        }
      />
      <Button title="Save activity" icon="check" onPress={save} />
      <Button title="Cancel" kind="ghost" onPress={() => router.back()} />
      {initial && (
        <Button
          title="Remove activity from plan"
          kind="danger"
          onPress={() =>
            Alert.alert(
              'Remove this activity?',
              'Past and tracked activity records remain. Goal links to this activity will be removed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () =>
                    attempt(() => {
                      repo.apply({
                        ...p,
                        version: p.version + 1,
                        activities: p.activities.filter((x) => x.id !== a.id),
                        goals: p.goals.map((g) => ({
                          ...g,
                          activityIds: g.activityIds.filter((id) => id !== a.id),
                          mode:
                            g.mode === 'sum' &&
                            g.activityIds.length === 1 &&
                            g.activityIds[0] === a.id
                              ? 'completions'
                              : g.mode,
                        })),
                      });
                      refresh();
                      router.back();
                    }),
                },
              ],
            )
          }
        />
      )}
      <Copy muted size={11}>
        Stable activity ID: {a.id}
      </Copy>
    </Screen>
  );
}
