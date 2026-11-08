import { Temporal } from '@js-temporal/polyfill';
import { validatePlan, type Plan } from './schema';
import lifestyle from '../../examples/lifestyle.json';
import learning from '../../examples/learning.json';
import general from '../../examples/general.json';
import { today, addDays } from './schedule';
export const samples = [
  {
    id: 'lifestyle',
    title: 'A little more balanced',
    subtitle: 'Movement, care & a 90-day rhythm',
    data: lifestyle,
  },
  {
    id: 'learning',
    title: 'Practice with intention',
    subtitle: 'Learning, coding & weekly reflection',
    data: learning,
  },
  {
    id: 'general',
    title: 'Room for the everyday',
    subtitle: 'Simple routines & a calmer home',
    data: general,
  },
];
export function samplePlan(data: unknown): Plan {
  const p = validatePlan(data),
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    day = today(zone),
    start = p.activities.map((a) => a.schedule.start).sort()[0] ?? day,
    delta = Temporal.PlainDate.from(start).until(Temporal.PlainDate.from(day)).days;
  const shift = (d: string | undefined) => (d ? addDays(d, delta) : undefined);
  return validatePlan({
    ...p,
    timezone: zone,
    activities: p.activities.map((a) => ({
      ...a,
      schedule: { ...a.schedule, start: shift(a.schedule.start), end: shift(a.schedule.end) },
    })),
    goals: p.goals.map((g) => ({ ...g, start: shift(g.start), end: shift(g.end) })),
  });
}
export function basicPlan(name: string): Plan {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return validatePlan({
    schemaVersion: 1,
    id: `personal-${Date.now()}`,
    version: 1,
    name: name.trim() || 'My daily rhythm',
    timezone: zone,
    categories: [{ id: 'personal', name: 'Personal', color: '#587861' }],
    sections: [
      { id: 'morning', name: 'Morning' },
      { id: 'day', name: 'During the day' },
      { id: 'evening', name: 'Evening' },
    ],
    activities: [],
  });
}
