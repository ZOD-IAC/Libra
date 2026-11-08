import React, { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Copy, Row, Button } from '../ui/primitives';
import { useTheme } from '../ui/theme';
import { useApp, attempt } from '../state/app';
import {
  definition,
  valuesOf,
  displayStatus,
  checklistProgress,
  type Instance,
} from '../domain/analytics';
import { Check, Checklist } from './Checklist';
export function ActivityRow({ row, day }: { row: Instance; day: string }) {
  const t = useTheme(),
    { repo, refresh, plan } = useApp(),
    a = definition(row),
    status = displayStatus(row, day),
    done = row.status === 'completed',
    progress = checklistProgress(row),
    [expanded, setExpanded] = useState(a.steps.length > 0 && !done),
    avoid = a.habit?.direction === 'avoid';
  const open = () => router.push({ pathname: '/activity', params: { id: row.id } });
  const update = (state: Instance['status']) =>
    attempt(() => {
      repo.record(row.id, state, valuesOf(row), row.notes);
      refresh();
      void Haptics.selectionAsync().catch(() => {});
    });
  const complete = () =>
    done
      ? update('pending')
      : a.inputs.length || (!avoid && a.steps.length)
        ? open()
        : update('completed');
  const actions = () =>
    Alert.alert(a.title, 'Activity actions', [
      { text: 'Open details', onPress: open },
      {
        text: done ? 'Undo completion' : 'Skip',
        onPress: () => update(done ? 'pending' : 'skipped'),
      },
      { text: 'Not applicable', onPress: () => update('na') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  const products = [
    ...(plan?.products ?? []),
    ...a.steps
      .flatMap((s) => s.productIds)
      .filter((id) => !plan?.products.some((p) => p.id === id))
      .map((id) => repo.product?.(row.plan_id, id))
      .filter((p): p is NonNullable<typeof p> => !!p),
  ];
  return (
    <ReanimatedSwipeable
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Skip ${a.title}`}
          onPress={() => update('skipped')}
          style={{
            width: 80,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.sage,
            borderRadius: 16,
          }}
        >
          <Copy>Skip</Copy>
        </Pressable>
      )}
    >
      <View
        style={{
          paddingVertical: 14,
          backgroundColor: t.bg,
          borderBottomWidth: 1,
          borderBottomColor: t.line,
          gap: 8,
        }}
      >
        <Row>
          <Check
            checked={done}
            label={`${done ? 'Undo' : avoid ? 'Confirm avoided' : 'Complete'} ${a.title}`}
            onPress={complete}
          />
          <Pressable
            onPress={() => (a.steps.length ? setExpanded(!expanded) : open())}
            onLongPress={actions}
            accessibilityRole="button"
            accessibilityLabel={`${a.title}, ${status}. ${a.steps.length ? 'Show or hide subtasks' : 'Open details'}.`}
            style={{ flex: 1, minHeight: 48, justifyContent: 'center', gap: 4 }}
          >
            <Copy style={{ fontWeight: '500', opacity: done ? 0.7 : 1 }}>{a.title}</Copy>
            <Copy muted size={12}>
              {row.time || 'Any time'}
              {a.habit ? ` · ${avoid ? 'Avoidance' : 'Build'} habit` : ''}
              {a.steps.length ? ` · ${progress.done}/${progress.total} steps` : ''}
              {status !== 'pending' ? ` · ${status === 'na' ? 'not applicable' : status}` : ''}
            </Copy>
          </Pressable>
          {a.priority === 'high' && !done ? (
            <Feather name="star" size={15} color={t.primary} />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open details: ${a.title}`}
            onPress={open}
            style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Feather name="chevron-right" size={18} color={t.muted} />
          </Pressable>
        </Row>
        {expanded && a.steps.length > 0 ? (
          <View style={{ paddingLeft: 10, gap: 8 }}>
            {a.description !== '' ? (
              <Copy muted size={13}>
                {a.description}
              </Copy>
            ) : null}
            {avoid ? (
              <Copy muted size={12}>
                These are support steps. Confirm “avoided” separately after reviewing the day.
              </Copy>
            ) : null}
            <Checklist
              activity={a}
              checked={row.checked_steps ?? []}
              products={products}
              onProduct={(id) => router.push({ pathname: '/products', params: { id } })}
              disabled={row.status === 'skipped' || row.status === 'na'}
              onToggle={(stepId, checked) =>
                attempt(() => {
                  repo.setStep(row.id, stepId, checked);
                  refresh();
                })
              }
            />
            {a.inputs.some((i) => i.required) && row.status !== 'completed' ? (
              <Button title="Record details & finish" kind="ghost" onPress={open} />
            ) : null}
            {avoid ? (
              <Button
                title={done ? 'Undo avoided confirmation' : 'I avoided this today'}
                kind="soft"
                onPress={complete}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </ReanimatedSwipeable>
  );
}
