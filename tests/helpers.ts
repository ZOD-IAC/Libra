import { DatabaseSync } from 'node:sqlite';
import type { Database, Bind } from '../src/data/migrations';
import { Repository } from '../src/data/repository';
import { validatePlan, type Plan } from '../src/domain/schema';
import general from '../examples/general.json';
export function database(): Database {
  const db = new DatabaseSync(':memory:');
  return {
    execSync: (s) => db.exec(s),
    runSync: (s, ...p) => db.prepare(s).run(...p),
    getFirstSync: <T>(s: string, ...p: Bind[]) => (db.prepare(s).get(...p) as T) ?? null,
    getAllSync: <T>(s: string, ...p: Bind[]) => db.prepare(s).all(...p) as T[],
    withTransactionSync: (fn) => {
      db.exec('BEGIN');
      try {
        fn();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
export const NOW = Date.parse('2026-11-07T06:00:00Z'),
  DAY = '2026-11-07';
export function plan(patch: Partial<Plan> = {}): Plan {
  const base = validatePlan(general);
  return validatePlan({
    ...base,
    id: 'test',
    timezone: 'Asia/Kolkata',
    activities: base.activities
      .filter((a) => a.id !== 'avoid-unplanned-scroll')
      .map((a) => ({ ...a, steps: [], productIds: [], habit: undefined })),
    ...patch,
  });
}
export function setup(p = plan()) {
  const repo = new Repository(database());
  repo.apply(p, NOW);
  return repo;
}
