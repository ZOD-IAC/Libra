import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlan, validatePlan, validateValues, diffPlans } from '../src/domain/schema';
import { samples, samplePlan } from '../src/domain/samples';
import { plan } from './helpers';
test('all three supplied sample configurations validate and rebase dates', () => {
  for (const s of samples) {
    const p = validatePlan(s.data);
    assert.ok(p.activities.length);
    assert.ok(samplePlan(s.data).activities[0].schedule.start >= '2026-01-01');
  }
});
test('malformed JSON, unsupported schema, unknown fields and oversized imports fail', () => {
  assert.throws(() => parsePlan('{'));
  assert.throws(() => parsePlan(JSON.stringify({ ...plan(), schemaVersion: 2 })));
  assert.throws(() => validatePlan({ ...plan(), code: 'alert(1)' }));
  assert.throws(() => parsePlan(' '.repeat(2_000_001)));
});
test('duplicate stable identifiers rejected', () => {
  const p = plan();
  assert.throws(
    () => validatePlan({ ...p, activities: [p.activities[0], p.activities[0]] }),
    /duplicate/,
  );
});
test('unknown references and invalid calendar dates rejected', () => {
  const p = plan();
  assert.throws(
    () => validatePlan({ ...p, activities: [{ ...p.activities[0], categoryId: 'missing' }] }),
    /categoryId/,
  );
  assert.throws(() =>
    validatePlan({
      ...p,
      activities: [
        { ...p.activities[0], schedule: { ...p.activities[0].schedule, start: '2026-02-30' } },
      ],
    }),
  );
});
test('weekly schedules require weekdays; duplicate times rejected', () => {
  const p = plan(),
    a = p.activities[0];
  assert.throws(() =>
    validatePlan({
      ...p,
      activities: [{ ...a, schedule: { ...a.schedule, frequency: 'weekly' } }],
    }),
  );
  assert.throws(() =>
    validatePlan({
      ...p,
      activities: [{ ...a, schedule: { ...a.schedule, times: ['08:00', '08:00'] } }],
    }),
  );
});
test('choice, rating, repetitions and required fields enforce values', () => {
  const a = {
    ...plan().activities[0],
    inputs: [{ id: 'rating', label: 'Score', type: 'rating' as const, required: true }],
  };
  assert.throws(() => validateValues(a, {}));
  assert.throws(() => validateValues(a, { rating: 6 }));
  validateValues(a, { rating: 4 });
  assert.throws(() => validateValues(a, { rating: NaN }));
  assert.throws(() =>
    validateValues(
      { ...a, inputs: [{ ...a.inputs[0], type: 'choice', choices: ['A', 'B'] }] },
      { rating: 'C' },
    ),
  );
  assert.throws(() =>
    validateValues({ ...a, inputs: [{ ...a.inputs[0], type: 'repetitions' }] }, { rating: 1.5 }),
  );
});
test('safe declarative import treats script text as text only', () => {
  const p = plan({ description: '<script>alert(1)</script>' });
  assert.equal(p.description, '<script>alert(1)</script>');
});
test('diff identifies added changed and removed activity IDs', () => {
  const p = plan(),
    next = plan({
      goals: [],
      activities: [
        { ...p.activities[0], title: 'Changed' },
        { ...p.activities[1], id: 'new' },
      ],
    });
  const diff = diffPlans(p, next);
  assert.equal(diff.changed.length, 1);
  assert.equal(diff.added.length, 1);
  assert.equal(diff.removed.length, p.activities.length - 1);
});
