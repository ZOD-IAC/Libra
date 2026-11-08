import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Repository, validateBackup } from '../src/data/repository';
import { migrate } from '../src/data/migrations';
import { validatePlan } from '../src/domain/schema';
import { displayStatus, summary, goalProgress } from '../src/domain/analytics';
import { setup, plan, database, NOW, DAY } from './helpers';
const nextDay = '2026-11-08';
test('SQLite migration is idempotent and rejects future database versions', () => {
  const db = database();
  migrate(db);
  migrate(db);
  assert.equal(db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version, 3);
  db.execSync('PRAGMA user_version=99');
  assert.throws(() => migrate(db), /newer/);
});
test('generation is deterministic and progress survives new repository instances', () => {
  const repo = setup();
  repo.ensure(DAY, DAY);
  const rows = repo.rows(DAY);
  repo.ensure(DAY, DAY);
  assert.equal(repo.rows(DAY).length, rows.length);
  repo.record(rows[0].id, 'completed');
  const reopened = new Repository(repo.db);
  assert.equal(reopened.get(rows[0].id).status, 'completed');
});
test('completion, skip, NA and undo persist separately', () => {
  const repo = setup(),
    r = repo.rows(DAY)[0];
  repo.record(r.id, 'completed');
  assert.equal(repo.get(r.id).status, 'completed');
  repo.record(r.id, 'pending');
  assert.equal(repo.get(r.id).completed_at, null);
  repo.record(r.id, 'skipped');
  assert.equal(repo.get(r.id).status, 'skipped');
  repo.record(r.id, 'na');
  assert.equal(summary(repo.rows(DAY), DAY).total, repo.rows(DAY).length - 1);
});
test('reschedule does not recreate original occurrence, and supports independently recurring day', () => {
  const repo = setup(),
    r = repo.rows(DAY)[0];
  repo.reschedule(r.id, nextDay, '10:00', NOW);
  repo.ensure(DAY, nextDay);
  assert.ok(!repo.rows(DAY).some((x) => x.id === r.id));
  assert.equal(repo.rows(nextDay).filter((x) => x.id === r.id).length, 1);
  assert.equal(repo.get(r.id).origin_date, DAY);
});
test('completed activity cannot be rescheduled until reopened', () => {
  const repo = setup(),
    r = repo.rows(DAY)[0];
  repo.record(r.id, 'completed');
  assert.throws(() => repo.reschedule(r.id, nextDay, '', NOW), /Undo/);
});
test('measurements are relational and undo removes measurements', () => {
  const p = plan();
  p.metrics = [{ id: 'metric', name: 'Value', unit: 'units' }];
  p.activities[0].inputs = [
    { id: 'value', type: 'number', label: 'Value', required: true, metricId: 'metric' },
  ];
  const repo = setup(validatePlan(p)),
    row = repo.rows(DAY).find((r) => r.activity_id === p.activities[0].id)!;
  repo.record(row.id, 'completed', { value: 3 });
  assert.equal(repo.measurements(p.id).length, 1);
  repo.record(row.id, 'completed', { value: 5 });
  assert.equal(repo.measurements(p.id).length, 1);
  assert.equal(repo.measurements(p.id)[0].value, 5);
  repo.record(row.id, 'pending');
  assert.equal(repo.measurements(p.id).length, 0);
});
test('invalid completion cannot partially update SQLite', () => {
  const p = plan();
  p.activities[0].inputs = [{ id: 'x', label: 'Number', type: 'number', required: true }];
  const repo = setup(p),
    row = repo.rows(DAY).find((r) => r.activity_id === p.activities[0].id)!;
  assert.throws(() => repo.record(row.id, 'completed', {}));
  assert.equal(repo.get(row.id).status, 'pending');
});
test('plan updates preserve tracked snapshots and replace untouched future definitions', () => {
  const p = plan(),
    repo = setup(p),
    row = repo.rows(DAY)[0];
  repo.record(row.id, 'completed');
  const next = {
    ...p,
    version: 2,
    activities: p.activities.map((a) => ({ ...a, title: `Updated ${a.title}` })),
  };
  repo.apply(next, NOW + 1000);
  assert.equal(repo.get(row.id).definition, row.definition);
  const pending = repo.rows(DAY).filter((r) => r.status === 'pending');
  assert.ok(pending.every((r) => JSON.parse(r.definition).title.startsWith('Updated')));
  assert.equal(repo.versions(p.id).length, 2);
});
test('missed history uses version effective at that date', () => {
  const p = plan(),
    repo = setup(p);
  repo.apply({ ...p, version: 2, activities: [], goals: [] }, NOW + 86400000);
  repo.ensure(DAY, '2026-11-09');
  assert.ok(repo.rows(DAY).length);
  assert.equal(repo.rows('2026-11-09').length, 0);
  assert.equal(displayStatus(repo.rows(DAY)[0], '2026-11-09'), 'missed');
});
test('same or lower versions and time zone mutations are rejected', () => {
  const repo = setup(),
    p = repo.active()!;
  assert.throws(() => repo.apply(p, NOW), /version/);
  assert.throws(() => repo.apply({ ...p, version: 2, timezone: 'UTC' }, NOW), /Time zone/);
});
test('different plans remain isolated and can be switched', () => {
  const repo = setup(),
    first = repo.rows(DAY)[0];
  repo.record(first.id, 'completed');
  repo.apply(plan({ id: 'second' }), NOW);
  assert.ok(repo.rows(DAY).every((r) => r.plan_id === 'second'));
  repo.activate('test');
  assert.equal(repo.get(first.id).status, 'completed');
});
test('backup round-trip preserves progress, journals, preferences and versions', () => {
  const repo = setup(),
    r = repo.rows(DAY)[0];
  repo.record(r.id, 'completed');
  repo.saveJournal(DAY, 'A useful day');
  repo.setPref('theme', 'dark');
  const b = repo.backup(),
    other = new Repository(database());
  other.restore(JSON.parse(JSON.stringify(b)));
  assert.equal(other.get(r.id).status, 'completed');
  assert.equal(other.journal(DAY), 'A useful day');
  assert.equal(other.pref('theme'), 'dark');
  assert.equal(other.versions('test').length, 1);
});
test('invalid backups fail validation without replacing existing data', () => {
  const repo = setup(),
    before = repo.backup(),
    broken = structuredClone(before);
  broken.version = 99 as 2;
  assert.throws(() => repo.restore(broken));
  assert.deepEqual(repo.backup().tables, before.tables);
});
test('constraint failure during restore rolls back the whole restore', () => {
  const repo = setup(),
    before = repo.backup(),
    broken = structuredClone(before);
  broken.tables.instances.push({ ...broken.tables.instances[0] });
  assert.throws(() => repo.restore(broken));
  assert.deepEqual(repo.backup().tables, before.tables);
});
test('backup rejects unsafe columns and mismatching version IDs', () => {
  const repo = setup(),
    bad = repo.backup();
  bad.tables.instances[0]['unsafe_column'] = 1;
  assert.throws(() => validateBackup(bad));
  const mismatch = repo.backup();
  mismatch.tables.versions[0].version = 99;
  assert.throws(() => validateBackup(mismatch));
});
test('persistent timer uses timestamps across closure and pauses', () => {
  const repo = setup(),
    r = repo.rows(DAY)[0];
  repo.timer(r.id, true, 10000);
  const reopened = new Repository(repo.db);
  reopened.timer(r.id, false, 40000);
  assert.equal(reopened.get(r.id).timer_seconds, 30);
  assert.equal(reopened.get(r.id).timer_start, null);
});
test('delete all clears all relational data but leaves a usable database', () => {
  const repo = setup();
  repo.deleteAll();
  assert.equal(repo.active(), null);
  assert.equal(repo.plans().length, 0);
  assert.equal(repo.settings().enabled, 0);
  repo.apply(plan(), NOW);
  assert.ok(repo.rows(DAY).length);
});
test('analytics calculate actual completion and exclude NA', () => {
  const repo = setup(),
    rows = repo.rows(DAY);
  repo.record(rows[0].id, 'completed');
  repo.record(rows[1].id, 'skipped');
  repo.record(rows[2].id, 'na');
  const s = summary(repo.rows(DAY), '2026-11-08');
  assert.equal(s.completed, 1);
  assert.equal(s.skipped, 1);
  assert.equal(s.percent, Math.round(100 / (rows.length - 1)));
  assert.equal(s.missed, rows.length - 3);
});
test('goal values and milestone events follow recorded values, including undo', () => {
  const p = plan();
  p.goals = [
    {
      id: 'g',
      name: 'Goal',
      description: '',
      archived: false,
      mode: 'completions',
      target: 2,
      activityIds: [p.activities[0].id],
      start: '2026-01-01',
      milestones: [{ id: 'm', name: 'First', target: 1 }],
    },
  ];
  const repo = setup(p),
    r = repo.rows(DAY).find((r) => r.activity_id === p.activities[0].id)!;
  repo.record(r.id, 'completed');
  assert.equal(goalProgress(p.goals[0], repo.allRows(p.id), []).value, 1);
  assert.equal(repo.milestones(p.id).length, 1);
  repo.record(r.id, 'pending');
  assert.equal(repo.milestones(p.id).length, 0);
});

test('backup restores activity snapshots after adding measurements in a later version', () => {
  const p = plan(),
    repo = setup(p);
  const next = structuredClone(p);
  next.version = 2;
  next.metrics.push({ id: 'new-metric', name: 'New metric', unit: 'units' });
  next.activities[0].inputs = [
    { id: 'new-input', label: 'New input', type: 'number', required: true, metricId: 'new-metric' },
  ];
  repo.apply(next, NOW + 1000);
  const row = repo.rows(DAY).find((r) => r.activity_id === next.activities[0].id)!;
  repo.record(row.id, 'completed', { 'new-input': 8 }, '', NOW + 2000);
  const backup = repo.backup();
  const copy = new Repository(database());
  copy.restore(backup);
  assert.equal(copy.measurements(p.id)[0].value, 8);
});
test('manual measurements can be corrected in place while preserving identity', () => {
  const p = plan({ metrics: [{ id: 'm', name: 'Value', unit: 'units' }] }),
    repo = setup(p);
  repo.measure('m', DAY, 2);
  const m = repo.measurements(p.id)[0];
  repo.updateMeasurement(m.id, nextDay, 4);
  const changed = repo.measurements(p.id)[0];
  assert.equal(changed.id, m.id);
  assert.equal(changed.value, 4);
  assert.equal(changed.date, nextDay);
});
