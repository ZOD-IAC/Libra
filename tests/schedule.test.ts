import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  occurs,
  slots,
  today,
  addDays,
  wallEpoch,
  quiet,
  instanceId,
} from '../src/domain/schedule';
import { plan } from './helpers';
const base = { frequency: 'daily' as const, start: '2026-01-01', interval: 1, times: [] };
test('daily interval is anchored to start with inclusive end boundaries', () => {
  const s = { ...base, interval: 2, end: '2026-01-05' };
  assert.equal(occurs(s, '2025-12-31'), false);
  assert.equal(occurs(s, '2026-01-01'), true);
  assert.equal(occurs(s, '2026-01-02'), false);
  assert.equal(occurs(s, '2026-01-05'), true);
  assert.equal(occurs(s, '2026-01-07'), false);
});
test('weekly recurrence aligns to ISO weeks', () => {
  const s = { ...base, frequency: 'weekly' as const, interval: 2, weekdays: [1, 4] };
  assert.equal(occurs(s, '2026-01-01'), true);
  assert.equal(occurs(s, '2026-01-05'), false);
  assert.equal(occurs(s, '2026-01-12'), true);
});
test('monthly 31st skips short months without spilling', () => {
  const s = { ...base, frequency: 'monthly' as const, monthDays: [31] };
  assert.equal(occurs(s, '2026-01-31'), true);
  assert.equal(occurs(s, '2026-02-28'), false);
  assert.equal(occurs(s, '2026-03-31'), true);
});
test('once and paused activities', () => {
  assert.equal(occurs({ ...base, frequency: 'once' }, '2026-01-02'), false);
  assert.equal(slots({ ...plan().activities[0], paused: true }, '2026-11-07').length, 0);
});
test('multiple occurrences have deterministic independent keys', () => {
  const a = { ...plan().activities[0], schedule: { ...base, times: ['08:00', '20:00'] } };
  assert.equal(slots(a, '2026-11-07').length, 2);
  assert.notEqual(
    instanceId('p', 'a', '2026-11-07', '08:00'),
    instanceId('p', 'a', '2026-11-07', '20:00'),
  );
});
test('midnight uses plan time zone rather than host zone', () => {
  const epoch = Date.parse('2026-01-01T20:00:00Z');
  assert.equal(today('Asia/Kolkata', epoch), '2026-01-02');
  assert.equal(today('America/New_York', epoch), '2026-01-01');
});
test('leap year and year boundary arithmetic', () => {
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});
test('DST nonexistent time is skipped and fall-back picks first occurrence', () => {
  assert.equal(wallEpoch('2026-03-08', '02:30', 'America/New_York'), null);
  assert.equal(
    wallEpoch('2026-11-01', '01:30', 'America/New_York'),
    Date.parse('2026-11-01T05:30:00Z'),
  );
});
test('quiet hours across midnight and daytime; equal values disable quiet period', () => {
  assert.equal(quiet('23:00', '22:00', '07:00'), true);
  assert.equal(quiet('06:59', '22:00', '07:00'), true);
  assert.equal(quiet('07:00', '22:00', '07:00'), false);
  assert.equal(quiet('13:00', '12:00', '14:00'), true);
  assert.equal(quiet('12:00', '12:00', '12:00'), false);
});
