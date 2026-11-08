import { Temporal } from '@js-temporal/polyfill';
import type { Activity, Schedule } from './schema';
export const today = (zone: string, epoch = Date.now()) =>
  Temporal.Instant.fromEpochMilliseconds(epoch).toZonedDateTimeISO(zone).toPlainDate().toString();
export const addDays = (day: string, n: number) =>
  Temporal.PlainDate.from(day).add({ days: n }).toString();
export function datesBetween(start: string, end: string) {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (out.length >= 36600) throw new Error('Date range too large');
    out.push(d);
  }
  return out;
}
export function occurs(s: Schedule, day: string): boolean {
  if (day < s.start || (s.end && day > s.end)) return false;
  const date = Temporal.PlainDate.from(day),
    start = Temporal.PlainDate.from(s.start);
  const days = start.until(date).days;
  if (s.frequency === 'once') return day === s.start;
  if (s.frequency === 'daily') return days % s.interval === 0;
  if (s.frequency === 'weekly') {
    const startMonday = start.subtract({ days: start.dayOfWeek - 1 });
    const week = Math.floor(startMonday.until(date).days / 7);
    return week % s.interval === 0 && !!s.weekdays?.includes(date.dayOfWeek);
  }
  const months = (date.year - start.year) * 12 + date.month - start.month;
  return months % s.interval === 0 && !!s.monthDays?.includes(date.day);
}
export function slots(a: Activity, day: string) {
  return a.paused || !occurs(a.schedule, day)
    ? []
    : a.schedule.times.length
      ? a.schedule.times
      : [''];
}
export function instanceId(planId: string, activityId: string, date: string, time: string) {
  return `${planId}/${activityId}/${date}/${time || 'any'}`;
}
// Temporal's compatible disambiguation uses the first occurrence in a fall-back fold.
// Skip a nonexistent spring-forward wall time rather than silently shifting it.
export function wallEpoch(date: string, time: string, zone: string): number | null {
  const plain = Temporal.PlainDateTime.from(`${date}T${time}`);
  const zoned = plain.toZonedDateTime(zone, { disambiguation: 'compatible' });
  return zoned.toPlainDateTime().equals(plain) ? zoned.epochMilliseconds : null;
}
export function quiet(time: string, start: string, end: string) {
  return start === end
    ? false
    : start < end
      ? time >= start && time < end
      : time >= start || time < end;
}
export function prettyDate(day: string) {
  return Temporal.PlainDate.from(day).toLocaleString('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
