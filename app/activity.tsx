import React, { useState, useEffect } from 'react';
import { Modal, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp, attempt } from '../src/state/app';
import { useTheme } from '../src/ui/theme';
import { Copy, Button, Row, Field, Heading, s } from '../src/ui/primitives';
import { DateField } from '../src/ui/DateField';
import { definition, valuesOf } from '../src/domain/analytics';
import { today } from '../src/domain/schedule';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Values } from '../src/domain/schema';
import { Checklist } from '../src/features/Checklist';
import { displayStatus, checklistProgress } from '../src/domain/analytics';
import { InputControl } from '../src/features/InputControl';
export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { repo, refresh, tick } = useApp(),
    t = useTheme();
  void tick;
  const reduced = useReducedMotion(),
    insets = useSafeAreaInsets();
  const row = repo.get(id),
    a = definition(row),
    [values, setValues] = useState<Values>(valuesOf(row)),
    [notes, setNotes] = useState(row.notes),
    [day, setDay] = useState(row.due_date),
    [time, setTime] = useState(row.time),
    [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const checkProgress = checklistProgress(row);
  const seconds = Math.floor(
    row.timer_seconds + (row.timer_start ? Math.max(0, (clock - row.timer_start) / 1000) : 0),
  );
  const save = (status: 'pending' | 'completed' | 'skipped' | 'na') =>
    attempt(() => {
      const v = { ...values };
      for (const i of a.inputs)
        if (i.type === 'timer' && v[i.id] === undefined && seconds) v[i.id] = seconds;
      repo.record(id, status, v, notes);
      refresh();
      router.back();
    });
  return (
    <Modal
      visible
      transparent
      animationType={reduced ? 'none' : 'slide'}
      onRequestClose={() => router.back()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' }}
      >
        <View
          style={{
            maxHeight: '94%',
            backgroundColor: t.bg,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            paddingTop: 10,
          }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              backgroundColor: t.line,
              alignSelf: 'center',
              borderRadius: 3,
            }}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24, paddingBottom: 24 + insets.bottom, gap: 20 }}
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <Copy muted size={12}>
                {row.due_date} · {row.time || 'ANY TIME'}
              </Copy>
              <Button title="Close" kind="ghost" onPress={() => router.back()} />
            </Row>
            <Heading title={a.title} />
            {!!a.description && <Copy muted>{a.description}</Copy>}
            <Copy size={12} muted>
              Status: {displayStatus(row, today(repo.active()!.timezone))} · {checkProgress.done}/
              {checkProgress.total} subtasks
            </Copy>
            {a.habit ? (
              <View style={s.small}>
                <Copy muted>
                  {a.habit.direction === 'avoid'
                    ? 'Track a day you successfully avoided this habit. Unchecked is unrecorded, not a claimed failure.'
                    : 'Track a day you performed this habit.'}
                </Copy>
                {a.habit.cue !== '' ? <Copy muted>When: {a.habit.cue}</Copy> : null}
                {a.habit.alternative !== '' ? (
                  <Copy muted>Instead: {a.habit.alternative}</Copy>
                ) : null}
              </View>
            ) : null}
            {a.steps.length > 0 ? (
              <Checklist
                activity={a}
                checked={row.checked_steps ?? []}
                products={[
                  ...repo.active()!.products,
                  ...a.steps
                    .flatMap((s) => s.productIds)
                    .filter((id) => !repo.active()!.products.some((p) => p.id === id))
                    .map((id) => repo.product(row.plan_id, id))
                    .filter((p): p is NonNullable<typeof p> => !!p),
                ]}
                onProduct={(id) => {
                  router.back();
                  router.push({ pathname: '/products', params: { id } });
                }}
                disabled={row.status === 'skipped' || row.status === 'na'}
                onToggle={(stepId, checked) =>
                  attempt(() => {
                    repo.setStep(id, stepId, checked);
                    refresh();
                  })
                }
              />
            ) : null}
            {a.productIds.length > 0 ? (
              <View style={s.small}>
                <Copy heading size={22}>
                  Products for this activity
                </Copy>
                {a.productIds.map((productId) => (
                  <Button
                    key={productId}
                    title={repo.product(row.plan_id, productId)?.name ?? productId}
                    kind="soft"
                    onPress={() => {
                      router.back();
                      router.push({ pathname: '/products', params: { id: productId } });
                    }}
                  />
                ))}
              </View>
            ) : null}
            {a.inputs.map((i) => (
              <View key={i.id} style={s.small}>
                {i.type === 'timer' && (
                  <View style={s.small}>
                    <Copy heading size={36}>
                      {String(Math.floor(seconds / 60)).padStart(2, '0')}:
                      {String(seconds % 60).padStart(2, '0')}
                    </Copy>
                    <Copy muted size={12}>
                      Timer keeps elapsed time when the app is closed.
                    </Copy>
                    <Button
                      title={row.timer_start ? 'Pause timer' : 'Start timer'}
                      kind="soft"
                      disabled={row.status !== 'pending'}
                      onPress={() =>
                        attempt(() => {
                          repo.timer(id, !row.timer_start);
                          refresh();
                        })
                      }
                    />
                    <Button
                      title="Use elapsed seconds"
                      kind="ghost"
                      onPress={() => setValues((v) => ({ ...v, [i.id]: seconds }))}
                    />
                  </View>
                )}
                <InputControl
                  input={i}
                  value={values[i.id]}
                  onChange={(value) => setValues((v) => ({ ...v, [i.id]: value }))}
                />
              </View>
            ))}
            <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
            <Button
              title={
                row.status === 'completed'
                  ? 'Save changes'
                  : a.habit?.direction === 'avoid'
                    ? 'I avoided this today'
                    : 'Finish activity'
              }
              icon="check"
              onPress={() => save('completed')}
            />
            {row.status !== 'completed' ? (
              <Button title="Save partial progress" kind="soft" onPress={() => save('pending')} />
            ) : null}
            <Row>
              <View style={{ flex: 1 }}>
                <Button title="Reopen / undo" kind="soft" onPress={() => save('pending')} />
              </View>
              <Button title="Skip" kind="ghost" onPress={() => save('skipped')} />
              <Button title="N/A" kind="ghost" onPress={() => save('na')} />
            </Row>
            <Copy heading size={22}>
              Move to another time
            </Copy>
            <DateField label="Date" value={day} onChange={setDay} />
            <DateField
              label="Time (optional)"
              value={time}
              onChange={setTime}
              mode="time"
              allowEmpty
            />
            <Button
              title="Reschedule"
              kind="soft"
              disabled={row.status !== 'pending'}
              onPress={() =>
                attempt(() => {
                  repo.reschedule(id, day, time);
                  refresh();
                  router.back();
                })
              }
            />
            {row.status !== 'pending' && (
              <Copy size={12} muted>
                Reopen this activity before rescheduling.
              </Copy>
            )}
            <Button
              title="Edit activity definition"
              kind="ghost"
              onPress={() => {
                router.back();
                router.push({ pathname: '/edit-activity', params: { id: a.id } });
              }}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
