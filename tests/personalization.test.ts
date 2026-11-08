import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Repository, validateBackup } from '../src/data/repository';
import { validatePlan, parsePlan, type Plan } from '../src/domain/schema';
import { definition, displayStatus, summary, activityFraction } from '../src/domain/analytics';
import { plan, setup, database, NOW, DAY } from './helpers';
function personalized() {
  const p = plan({ products: [] });
  p.goals = [];
  p.activities = [
    {
      ...p.activities[0],
      id: 'groom',
      title: 'Morning care',
      schedule: { frequency: 'daily', start: DAY, interval: 1, times: ['08:00'] },
      inputs: [],
      steps: [
        {
          id: 'wash',
          title: 'Wash face',
          instructions: 'Use my cleanser as directed.',
          productIds: ['cleanser'],
        },
        { id: 'dry', title: 'Pat dry', instructions: 'Use a clean towel.', productIds: [] },
        {
          id: 'moisturize',
          title: 'Apply moisturizer',
          instructions: 'Follow my usual routine.',
          productIds: [],
        },
      ],
      productIds: ['cleanser'],
    },
  ];
  p.products = [
    {
      id: 'cleanser',
      name: 'My cleanser',
      brand: 'My brand',
      category: 'Grooming',
      description: 'Product from my brief',
      usageNotes: 'Use according to its label',
    },
  ];
  return validatePlan(p);
}
const rowId = (repo: Repository) => repo.rows(DAY)[0].id;
test('subtasks and exact products parse from one portable configuration', () => {
  const p = parsePlan(JSON.stringify(personalized()));
  assert.equal(p.activities[0].steps[0].instructions, 'Use my cleanser as directed.');
  assert.equal(p.products[0].name, 'My cleanser');
});
test('duplicate subtask IDs and missing product references fail validation', () => {
  const p = personalized();
  assert.throws(
    () =>
      validatePlan({
        ...p,
        activities: [
          { ...p.activities[0], steps: [p.activities[0].steps[0], p.activities[0].steps[0]] },
        ],
      }),
    /duplicate/,
  );
  assert.throws(() => validatePlan({ ...p, products: [] }), /unknown productId/);
});
test('legacy plan without new properties still validates', () => {
  const original = plan(),
    { products, ...raw } = original;
  const activities = raw.activities.map(({ steps, productIds, habit, ...old }) => old);
  const parsed = validatePlan({ ...raw, activities });
  assert.deepEqual(parsed.products, []);
  assert.deepEqual(parsed.activities[0].steps, []);
});
test('one subtask persists independently and contributes partial daily credit', () => {
  const repo = setup(personalized()),
    id = rowId(repo);
  repo.setStep(id, 'wash', true, NOW);
  const reopened = new Repository(repo.db),
    row = reopened.get(id);
  assert.deepEqual(row.checked_steps, ['wash']);
  assert.equal(row.status, 'pending');
  assert.equal(displayStatus(row, DAY), 'partial');
  assert.equal(summary(reopened.rows(DAY), DAY).percent, 33);
  assert.equal(summary(reopened.rows(DAY), DAY).completed, 0);
  assert.equal(summary(reopened.rows(DAY), DAY).partial, 1);
});
test('full checklist completes and unchecking one preserves the other ticks', () => {
  const repo = setup(personalized()),
    id = rowId(repo);
  for (const step of ['wash', 'dry', 'moisturize']) repo.setStep(id, step, true, NOW);
  assert.equal(repo.get(id).status, 'completed');
  repo.setStep(id, 'dry', false, NOW + 100);
  assert.equal(repo.get(id).status, 'pending');
  assert.deepEqual(new Set(repo.get(id).checked_steps), new Set(['wash', 'moisturize']));
  assert.equal(summary(repo.rows(DAY), DAY).percent, 67);
});
test('toggling repeatedly is idempotent and each date has independent subtask records', () => {
  const repo = setup(personalized()),
    id = rowId(repo);
  repo.setStep(id, 'wash', true);
  repo.setStep(id, 'wash', true);
  repo.ensure('2026-11-08', '2026-11-08');
  assert.equal(repo.get(id).checked_steps?.length, 1);
  assert.deepEqual(repo.rows('2026-11-08')[0].checked_steps, []);
});
test('unknown subtask and skipped checklist cannot be changed silently', () => {
  const repo = setup(personalized()),
    id = rowId(repo);
  assert.throws(() => repo.setStep(id, 'unknown', true), /not part/);
  repo.record(id, 'skipped');
  assert.throws(() => repo.setStep(id, 'wash', true), /Reopen/);
});
test('full-completion shortcut cannot bypass required subtasks', () => {
  const repo = setup(personalized());
  assert.throws(() => repo.record(rowId(repo), 'completed'), /Tick each/);
});
test('undo full completion clears checklist but a partial save keeps existing ticks', () => {
  const repo = setup(personalized()),
    id = rowId(repo);
  repo.setStep(id, 'wash', true);
  repo.record(id, 'pending', {}, 'Only had time for the first step');
  assert.deepEqual(repo.get(id).checked_steps, ['wash']);
  repo.setStep(id, 'dry', true);
  repo.setStep(id, 'moisturize', true);
  repo.record(id, 'pending');
  assert.deepEqual(repo.get(id).checked_steps, []);
});
test('required tracking field must be recorded as well as checking all steps', () => {
  const p = personalized();
  p.activities[0].inputs = [{ id: 'minutes', label: 'Minutes', type: 'duration', required: true }];
  const repo = setup(p),
    id = rowId(repo);
  for (const s of p.activities[0].steps) repo.setStep(id, s.id, true);
  assert.equal(repo.get(id).status, 'pending');
  assert.equal(activityFraction(repo.get(id)), 0.75);
  assert.throws(() => repo.record(id, 'completed', {}), /Enter Minutes/);
  repo.record(id, 'completed', { minutes: 5 });
  assert.equal(repo.get(id).status, 'completed');
});
test('plan update preserves partial snapshot, checks and archived product details', () => {
  const p = personalized(),
    repo = setup(p),
    id = rowId(repo);
  repo.setStep(id, 'wash', true, NOW);
  const updated = {
    ...p,
    version: 2,
    products: [],
    activities: [
      {
        ...p.activities[0],
        productIds: [],
        steps: [{ id: 'new', title: 'New routine', instructions: 'New sequence', productIds: [] }],
      },
    ],
  };
  repo.apply(updated, NOW + 1000);
  assert.equal(definition(repo.get(id)).steps[0].id, 'wash');
  assert.deepEqual(repo.get(id).checked_steps, ['wash']);
  assert.equal(repo.product(p.id, 'cleanser')?.name, 'My cleanser');
  repo.ensure('2026-11-08', '2026-11-08');
  assert.equal(definition(repo.rows('2026-11-08')[0]).steps[0].id, 'new');
});
test('moving a partial activity preserves its subtasks and does not regenerate source', () => {
  const repo = setup(personalized()),
    id = rowId(repo);
  repo.setStep(id, 'wash', true);
  repo.reschedule(id, '2026-11-09', '09:00', NOW);
  repo.ensure(DAY, '2026-11-09');
  assert.equal(
    repo.rows(DAY).some((r) => r.id === id),
    false,
  );
  assert.deepEqual(repo.get(id).checked_steps, ['wash']);
});
test('avoidance support steps never assert avoidance; user confirms outcome explicitly', () => {
  const p = personalized();
  p.activities[0].habit = {
    direction: 'avoid',
    cue: 'When I reach for short videos',
    alternative: 'Return to my planned task',
  };
  const repo = setup(p),
    id = rowId(repo);
  for (const s of p.activities[0].steps) repo.setStep(id, s.id, true);
  assert.equal(repo.get(id).status, 'pending');
  assert.equal(activityFraction(repo.get(id)), 0);
  repo.record(id, 'completed');
  assert.equal(activityFraction(repo.get(id)), 1);
  repo.record(id, 'pending');
  assert.equal(repo.get(id).status, 'pending');
});
test('positive habit follows normal step completion and missing days are unrecorded', () => {
  const p = personalized();
  p.activities[0].habit = { direction: 'do', cue: 'After breakfast', alternative: '' };
  const repo = setup(p),
    id = rowId(repo);
  assert.equal(displayStatus(repo.get(id), '2026-11-08'), 'unrecorded');
  assert.equal(summary(repo.rows(DAY), '2026-11-08').missed, 0);
  for (const s of p.activities[0].steps) repo.setStep(id, s.id, true);
  assert.equal(repo.get(id).status, 'completed');
});
test('new backup preserves products, partial checks, and habit direction', () => {
  const p = personalized();
  p.activities[0].habit = { direction: 'avoid', cue: 'Cue', alternative: 'Alternative' };
  const repo = setup(p),
    id = rowId(repo);
  repo.setStep(id, 'wash', true, NOW);
  const b = repo.backup();
  assert.equal(b.version, 2);
  const restored = new Repository(database());
  restored.restore(JSON.parse(JSON.stringify(b)));
  assert.deepEqual(restored.get(id).checked_steps, ['wash']);
  assert.equal(restored.product(p.id, 'cleanser')?.usageNotes, 'Use according to its label');
  assert.equal(definition(restored.get(id)).habit?.direction, 'avoid');
});
test('legacy v1 backup with no checklist/product tables can restore', () => {
  const repo = setup(plan({ products: [] })),
    old = repo.backup(),
    { products, instance_step_checks, ...tables } = old.tables;
  const restored = new Repository(database());
  restored.restore({ ...old, version: 1, tables });
  assert.equal(restored.active()?.id, 'test');
  assert.ok(restored.rows(DAY).length);
  assert.deepEqual(restored.get(restored.rows(DAY)[0].id).checked_steps, []);
});
test('v2 backup with missing new tables or forged subtask references is rejected', () => {
  const repo = setup(personalized()),
    b = repo.backup(),
    { instance_step_checks, ...tables } = b.tables;
  assert.throws(() => validateBackup({ ...b, tables }));
  const forged = structuredClone(b);
  forged.tables.instance_step_checks.push({
    instance_id: rowId(repo),
    step_id: 'missing',
    completed_at: NOW,
  });
  assert.throws(() => repo.restore(forged), /Unknown subtask/);
  assert.equal(repo.active()?.id, 'test');
});
test('migration from schema 2 preserves prior records', () => {
  const p = plan({ products: [] }),
    repo = setup(p),
    id = rowId(repo);
  repo.record(id, 'completed');
  repo.db.execSync('DROP TABLE instance_step_checks; DROP TABLE products; PRAGMA user_version=2;');
  const upgraded = new Repository(repo.db);
  assert.equal(upgraded.get(id).status, 'completed');
  assert.deepEqual(upgraded.get(id).checked_steps, []);
  assert.equal(
    upgraded.db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version,
    3,
  );
});
