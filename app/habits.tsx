import React, { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { useApp } from '../src/state/app';
import { Screen, Heading, Copy, Chips, Button, SectionTitle, Panel } from '../src/ui/primitives';
import { DateField } from '../src/ui/DateField';
import { today, addDays } from '../src/domain/schedule';
import { definition } from '../src/domain/analytics';
import { ActivityRow } from '../src/features/ActivityRow';
export default function Habits() {
  const { repo, refresh } = useApp(),
    p = repo.active(),
    [day, setDay] = useState(p ? today(p.timezone) : '2026-01-01'),
    [direction, setDirection] = useState('all');
  if (!p) return <Redirect href="/" />;
  repo.ensure(day, day);
  const rows = repo.rows(day).filter((r) => {
      const habit = definition(r).habit;
      return habit && (direction === 'all' || habit.direction === direction);
    }),
    current = today(p.timezone);
  repo.ensure(addDays(day, -29), day);
  const history = repo.rows(addDays(day, -29), day);
  return (
    <Screen onRefresh={refresh}>
      <Heading eyebrow="BUILD OR AVOID" title="Your habits" />
      <Copy muted>
        Tick a habit only when you have done it, or successfully avoided it. An unchecked day is
        unrecorded; it is not automatically a failure.
      </Copy>
      <DateField label="Review date" value={day} onChange={setDay} />
      <Chips
        values={[
          { id: 'all', name: 'All' },
          { id: 'do', name: 'Build' },
          { id: 'avoid', name: 'Avoid' },
        ]}
        value={direction}
        onChange={setDirection}
      />
      {rows.map((row) => (
        <ActivityRow key={row.id} row={row} day={current} />
      ))}
      {!rows.length ? <Copy muted>No matching habits scheduled on this date.</Copy> : null}
      <Button
        title="Add a habit to build"
        kind="soft"
        onPress={() => router.push({ pathname: '/edit-activity', params: { habit: 'do' } })}
      />
      <Button
        title="Add a habit to avoid"
        kind="soft"
        onPress={() => router.push({ pathname: '/edit-activity', params: { habit: 'avoid' } })}
      />
      <SectionTitle title="Last 30 days · recorded success" />
      {p.activities
        .filter((a) => a.habit)
        .map((a) => {
          const list = history.filter((r) => r.activity_id === a.id && r.due_date <= current),
            eligible = list.filter((r) => r.status !== 'na');
          return (
            <Panel key={a.id}>
              <Copy>{a.title}</Copy>
              <Copy muted>
                {eligible.filter((r) => r.status === 'completed').length} successful /{' '}
                {eligible.length} scheduled check-ins
              </Copy>
              <Copy size={12} muted>
                Includes unrecorded and skipped check-ins in the denominator.
              </Copy>
              <Button
                title="Edit habit"
                kind="ghost"
                onPress={() => router.push({ pathname: '/edit-activity', params: { id: a.id } })}
              />
            </Panel>
          );
        })}
      <Button title="Back" kind="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
