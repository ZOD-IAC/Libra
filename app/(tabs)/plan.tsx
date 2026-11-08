import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Temporal } from '@js-temporal/polyfill';
import { useApp, attempt } from '../../src/state/app';
import {
  Screen,
  Copy,
  Row,
  Button,
  Heading,
  SectionTitle,
  IconButton,
  Panel,
  Empty,
  Chips,
} from '../../src/ui/primitives';
import { DateField } from '../../src/ui/DateField';
import { today, addDays, datesBetween, prettyDate } from '../../src/domain/schedule';
import { useTheme } from '../../src/ui/theme';
import { ActivityRow } from '../../src/features/ActivityRow';
import { Goals } from '../../src/features/Goals';
export default function PlanScreen() {
  const { repo, refresh } = useApp(),
    p = repo.active(),
    t = useTheme(),
    [selected, setSelected] = useState(p ? today(p.timezone) : '2026-01-01'),
    [view, setView] = useState('day');
  if (!p) return <Redirect href="/" />;
  const day = today(p.timezone),
    monday = addDays(selected, 1 - Temporal.PlainDate.from(selected).dayOfWeek),
    end = view === 'week' ? addDays(monday, 6) : selected,
    start = view === 'week' ? monday : selected;
  repo.ensure(start, end);
  const rows = repo.rows(start, end),
    journal = repo.journal(selected);
  const shift = (n: number) => setSelected(addDays(selected, n));
  return (
    <Screen onRefresh={refresh}>
      <Heading
        eyebrow="MAKE ROOM FOR WHAT MATTERS"
        title="Your plan"
        action={
          <IconButton
            name="plus"
            label="Add activity"
            onPress={() => router.push('/edit-activity')}
          />
        }
      />
      <Copy muted>{p.name}</Copy>
      <Row>
        <Button title="Products I use" kind="soft" onPress={() => router.push('/products')} />
        <Button title="Build & avoid habits" kind="soft" onPress={() => router.push('/habits')} />
      </Row>
      <Panel>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton name="chevron-left" label="Previous week" onPress={() => shift(-7)} />
          <Copy heading size={23}>
            {Temporal.PlainDate.from(selected).toLocaleString('en', {
              month: 'long',
              year: 'numeric',
            })}
          </Copy>
          <IconButton name="chevron-right" label="Next week" onPress={() => shift(7)} />
        </Row>
        <Row style={{ justifyContent: 'space-between', gap: 2 }}>
          {datesBetween(monday, addDays(monday, 6)).map((d) => (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityLabel={d}
              accessibilityState={{ selected: d === selected }}
              onPress={() => setSelected(d)}
              style={{
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 3,
                borderRadius: 18,
                backgroundColor: d === selected ? t.primary : 'transparent',
                gap: 8,
                minWidth: 0,
                flex: 1,
                minHeight: 48,
              }}
            >
              <Copy size={10} style={{ color: d === selected ? t.onPrimary : t.muted }}>
                {Temporal.PlainDate.from(d).toLocaleString('en', { weekday: 'narrow' })}
              </Copy>
              <Copy size={17} style={{ color: d === selected ? t.onPrimary : t.ink }}>
                {d.slice(-2)}
              </Copy>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor:
                    d === day ? t.primary : d === selected ? t.onPrimary : 'transparent',
                }}
              />
            </Pressable>
          ))}
        </Row>
        <DateField label="Jump to a date" value={selected} onChange={setSelected} />
        <Chips
          values={[
            { id: 'day', name: 'Daily' },
            { id: 'week', name: 'Weekly' },
          ]}
          value={view}
          onChange={setView}
        />
      </Panel>
      {datesBetween(start, end).map((d) => (
        <View key={d} style={{ gap: 8 }}>
          <SectionTitle title={prettyDate(d)} />
          {rows.filter((r) => r.due_date === d).length ? (
            rows
              .filter((r) => r.due_date === d)
              .map((r) => <ActivityRow key={r.id} row={r} day={day} />)
          ) : (
            <Copy muted>No scheduled activities.</Copy>
          )}
        </View>
      ))}
      {!!journal && (
        <Panel>
          <Copy heading size={22}>
            Reflection · {selected}
          </Copy>
          <Copy>{journal}</Copy>
        </Panel>
      )}
      <SectionTitle
        title="Goals & milestones"
        right={
          <IconButton name="plus" label="Add goal" onPress={() => router.push('/edit-goal')} />
        }
      />
      <Goals all />
      <SectionTitle title="Manage activities" />
      {p.activities.map((a) => (
        <Row key={a.id} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
          <View style={{ flex: 1 }}>
            <Copy>{a.title}</Copy>
            <Copy size={12} muted>
              {a.schedule.frequency} · {a.paused ? 'paused' : 'active'}
            </Copy>
          </View>
          <Button
            title="Edit"
            kind="ghost"
            onPress={() => router.push({ pathname: '/edit-activity', params: { id: a.id } })}
          />
        </Row>
      ))}
      {!p.activities.length && (
        <Empty
          title="Begin with one thing"
          body="Add a small activity you want to make room for."
        />
      )}
      <SectionTitle title="Archived goals" />
      {p.goals
        .filter((g) => g.archived)
        .map((g) => (
          <Button
            key={g.id}
            title={`Restore ${g.name}`}
            kind="soft"
            onPress={() =>
              attempt(() => {
                repo.apply({
                  ...p,
                  version: p.version + 1,
                  goals: p.goals.map((x) => (x.id === g.id ? { ...x, archived: false } : x)),
                });
                refresh();
              })
            }
          />
        ))}
      <Button
        title="Edit sections, categories & measurements"
        kind="soft"
        onPress={() => router.push('/plan-details')}
      />
    </Screen>
  );
}
