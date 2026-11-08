import { z } from 'zod';
import { migrate, type Database, type Bind } from './migrations';
import {
  validatePlan,
  planSchema,
  validateValues,
  activitySchema,
  productSchema,
  dateSchema,
  timeSchema,
  type Plan,
  type Values,
} from '../domain/schema';
import { today, datesBetween, slots, instanceId } from '../domain/schedule';
import { definition, goalProgress, type Instance, type Measurement } from '../domain/analytics';
export interface Version {
  id: number;
  plan_id: string;
  version: number;
  effective_on: string;
  config: string;
  created_at: number;
}
export interface NotificationSettings {
  id: number;
  enabled: number;
  quiet_start: string;
  quiet_end: string;
}
const tables = [
  'profiles',
  'plans',
  'versions',
  'preferences',
  'goals',
  'activities',
  'products',
  'instances',
  'instance_step_checks',
  'measurements',
  'journals',
  'notification_settings',
  'milestone_events',
] as const;
const rowSchemas = {
  products: z
    .object({ plan_id: z.string(), id: z.string(), definition: z.string().max(100000) })
    .strict(),
  instance_step_checks: z
    .object({ instance_id: z.string(), step_id: z.string(), completed_at: z.number().int() })
    .strict(),
  profiles: z
    .object({ id: z.literal(1), name: z.string().max(80), bio: z.string().max(500) })
    .strict(),
  plans: z
    .object({ id: z.string().max(80), name: z.string().max(200), activated_on: dateSchema })
    .strict(),
  versions: z
    .object({
      id: z.number().int().positive(),
      plan_id: z.string(),
      version: z.number().int().positive(),
      effective_on: dateSchema,
      config: z.string().max(2_000_000),
      created_at: z.number().int(),
    })
    .strict(),
  preferences: z
    .object({ key: z.enum(['activePlan', 'theme']), value: z.string().max(100) })
    .strict(),
  goals: z
    .object({ plan_id: z.string(), id: z.string(), definition: z.string().max(100000) })
    .strict(),
  activities: z
    .object({ plan_id: z.string(), id: z.string(), definition: z.string().max(100000) })
    .strict(),
  instances: z
    .object({
      id: z.string().max(300),
      plan_id: z.string(),
      activity_id: z.string(),
      origin_date: dateSchema,
      due_date: dateSchema,
      time: z.union([timeSchema, z.literal('')]),
      definition: z.string().max(100000),
      status: z.enum(['pending', 'completed', 'skipped', 'na']),
      values_json: z.string().max(50000),
      notes: z.string().max(4000),
      completed_at: z.number().int().nullable(),
      timer_start: z.number().int().nullable(),
      timer_seconds: z.number().finite().nonnegative(),
    })
    .strict(),
  measurements: z
    .object({
      id: z.string().max(350),
      plan_id: z.string(),
      metric_id: z.string(),
      date: dateSchema,
      value: z.number().finite(),
      instance_id: z.string().nullable(),
      input_id: z.string().nullable(),
      recorded_at: z.number().int().default(0),
    })
    .strict(),
  journals: z
    .object({ plan_id: z.string(), date: dateSchema, text: z.string().max(10000) })
    .strict(),
  notification_settings: z
    .object({
      id: z.literal(1),
      enabled: z.union([z.literal(0), z.literal(1)]),
      quiet_start: timeSchema,
      quiet_end: timeSchema,
    })
    .strict(),
  milestone_events: z
    .object({
      plan_id: z.string(),
      goal_id: z.string(),
      milestone_id: z.string(),
      reached_on: dateSchema,
    })
    .strict(),
};
export type Backup = {
  format: 'verdant-backup';
  version: 1 | 2;
  createdAt: string;
  tables: Record<(typeof tables)[number], Record<string, Bind>[]>;
};
export function validateBackup(raw: unknown): Backup {
  const legacy = typeof raw === 'object' && raw !== null && 'version' in raw && raw.version === 1;
  const parsed = z
    .object({
      format: z.literal('verdant-backup'),
      version: z.union([z.literal(1), z.literal(2)]),
      createdAt: z.string().datetime(),
      tables: z
        .object(
          Object.fromEntries(
            tables.map((t) => [
              t,
              legacy && ['products', 'instance_step_checks'].includes(t)
                ? z.array(rowSchemas[t]).max(100000).default([])
                : z.array(rowSchemas[t]).max(100000),
            ]),
          ) as unknown as Record<(typeof tables)[number], z.ZodType>,
        )
        .strict(),
    })
    .strict()
    .parse(raw) as Backup;
  const knownPlans = new Set(parsed.tables.plans.map((p) => p.id));
  const snapshots = new Set<string>(),
    knownMetrics = new Set<string>(),
    knownGoals = new Set<string>(),
    knownProducts = new Set<string>();
  const key = (...parts: unknown[]) => JSON.stringify(parts);
  for (const v of parsed.tables.versions) {
    const p = validatePlan(JSON.parse(String(v.config)));
    if (p.id !== v.plan_id || p.version !== v.version)
      throw new Error('Configuration version identity mismatch');
    for (const a of p.activities) snapshots.add(key(p.id, a.id, JSON.stringify(a)));
    for (const product of p.products)
      knownProducts.add(key(p.id, product.id, JSON.stringify(product)));
    for (const m of p.metrics) knownMetrics.add(key(p.id, m.id));
    for (const g of p.goals) knownGoals.add(key(p.id, g.id, JSON.stringify(g)));
  }
  for (const t of tables)
    for (const r of parsed.tables[t])
      if ('plan_id' in r && !knownPlans.has(r.plan_id))
        throw new Error(`Backup ${t} refers to an unknown plan`);
  for (const p of parsed.tables.plans)
    if (!parsed.tables.versions.some((v) => v.plan_id === p.id))
      throw new Error('Plan has no configuration version');
  for (const table of ['activities', 'goals'] as const)
    for (const row of parsed.tables[table]) {
      const raw = JSON.parse(String(row.definition));
      const entity =
        table === 'activities'
          ? activitySchema.parse(raw)
          : planSchema.shape.goals.unwrap().element.parse(raw);
      if (
        !(table === 'activities' ? snapshots : knownGoals).has(
          key(row.plan_id, row.id, JSON.stringify(entity)),
        )
      )
        throw new Error('Definition has no source configuration');
    }
  for (const row of parsed.tables.products) {
    const product = productSchema.parse(JSON.parse(String(row.definition)));
    if (!knownProducts.has(key(row.plan_id, row.id, JSON.stringify(product))))
      throw new Error('Product has no source configuration');
  }
  const instanceMap = new Map(parsed.tables.instances.map((row) => [row.id, row]));
  for (const check of parsed.tables.instance_step_checks) {
    const instance = instanceMap.get(check.instance_id);
    if (
      !instance ||
      !activitySchema
        .parse(JSON.parse(String(instance.definition)))
        .steps.some((s) => s.id === check.step_id)
    )
      throw new Error('Unknown subtask check in backup');
  }
  const instancePlans = new Map(parsed.tables.instances.map((r) => [r.id, r.plan_id]));
  for (const m of parsed.tables.measurements) {
    if (!knownMetrics.has(key(m.plan_id, m.metric_id)))
      throw new Error('Measurement references an unknown metric');
    if (m.instance_id && instancePlans.get(m.instance_id) !== m.plan_id)
      throw new Error('Measurement references an unknown activity record');
  }
  const active = parsed.tables.preferences.find((p) => p.key === 'activePlan');
  if (active && !knownPlans.has(active.value)) throw new Error('Active plan missing');
  for (const row of parsed.tables.instances) {
    const a = activitySchema.parse(JSON.parse(String(row.definition)));
    if (a.id !== row.activity_id || !snapshots.has(key(row.plan_id, a.id, JSON.stringify(a))))
      throw new Error('Activity snapshot has no source');
    const values = z
      .record(z.string(), z.union([z.string().max(4000), z.number().finite()]))
      .parse(JSON.parse(String(row.values_json)));
    const checked = parsed.tables.instance_step_checks
      .filter((c) => c.instance_id === row.id)
      .map((c) => c.step_id);
    if (
      row.status === 'completed' &&
      a.habit?.direction !== 'avoid' &&
      a.steps.some((s) => !checked.includes(s.id))
    )
      throw new Error('Completed activity has incomplete subtasks');
    validateValues(
      row.status === 'completed'
        ? a
        : { ...a, inputs: a.inputs.map((i) => ({ ...i, required: false })) },
      values,
    );
  }
  if (parsed.tables.notification_settings.length !== 1)
    throw new Error('Backup must contain notification settings');
  return parsed;
}
export class Repository {
  constructor(public db: Database) {
    migrate(db);
  }
  pref(key: string) {
    return (
      this.db.getFirstSync<{ value: string }>('SELECT value FROM preferences WHERE key=?', key)
        ?.value ?? null
    );
  }
  setPref(key: string, value: string) {
    this.db.runSync(
      'INSERT INTO preferences(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      key,
      value,
    );
  }
  active() {
    const id = this.pref('activePlan');
    if (!id) return null;
    const v = this.db.getFirstSync<Version>(
      'SELECT * FROM versions WHERE plan_id=? ORDER BY version DESC LIMIT 1',
      id,
    );
    return v ? validatePlan(JSON.parse(v.config)) : null;
  }
  plans() {
    return this.db.getAllSync<{ id: string; name: string }>(
      'SELECT id,name FROM plans ORDER BY name',
    );
  }
  activate(id: string) {
    if (!this.db.getFirstSync('SELECT id FROM plans WHERE id=?', id))
      throw new Error('Plan not found');
    this.setPref('activePlan', id);
  }
  versions(id: string) {
    return this.db.getAllSync<Version>(
      'SELECT * FROM versions WHERE plan_id=? ORDER BY version DESC',
      id,
    );
  }
  apply(raw: unknown, now = Date.now()) {
    const p = validatePlan(raw),
      day = today(p.timezone, now),
      old = this.versions(p.id)[0];
    if (old && p.version <= old.version)
      throw new Error(`Use version ${old.version + 1} or higher for this plan.`);
    if (old && validatePlan(JSON.parse(old.config)).timezone !== p.timezone)
      throw new Error(
        'Time zone changes require a new plan ID. This preserves day boundaries in history.',
      );
    this.db.withTransactionSync(() => {
      this.db.runSync(
        'INSERT INTO plans(id,name,activated_on) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name',
        p.id,
        p.name,
        day,
      );
      this.db.runSync(
        'INSERT INTO versions(plan_id,version,effective_on,config,created_at) VALUES(?,?,?,?,?)',
        p.id,
        p.version,
        day,
        JSON.stringify(p),
        now,
      );
      this.db.runSync(
        'INSERT INTO profiles(id,name,bio) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,bio=excluded.bio',
        p.profile.name,
        p.profile.bio,
      );
      for (const [table, entities] of [
        ['activities', p.activities],
        ['goals', p.goals],
        ['products', p.products],
      ] as const)
        for (const e of entities)
          this.db.runSync(
            `INSERT INTO ${table}(plan_id,id,definition) VALUES(?,?,?) ON CONFLICT(plan_id,id) DO UPDATE SET definition=excluded.definition`,
            p.id,
            e.id,
            JSON.stringify(e),
          );
      // Only replace untouched occurrences from today onward. Never erase tracked or past work.
      this.db.runSync(
        "DELETE FROM instances WHERE plan_id=? AND origin_date>=? AND due_date=origin_date AND status='pending' AND values_json='{}' AND notes='' AND timer_start IS NULL AND timer_seconds=0 AND NOT EXISTS(SELECT 1 FROM instance_step_checks c WHERE c.instance_id=instances.id)",
        p.id,
        day,
      );
      this.setPref('activePlan', p.id);
    });
    this.ensure(day, day, p.id);
  }
  ensure(start: string, end: string, planId = this.pref('activePlan')) {
    if (!planId) return;
    const versions = this.versions(planId);
    if (!versions.length) return;
    const activated = this.db.getFirstSync<{ activated_on: string }>(
      'SELECT activated_on FROM plans WHERE id=?',
      planId,
    )!.activated_on;
    const parsed = versions.map((v) => ({
      day: v.effective_on,
      version: v.version,
      plan: validatePlan(JSON.parse(v.config)),
    }));
    this.db.withTransactionSync(() => {
      for (const day of datesBetween(start < activated ? activated : start, end)) {
        const p = parsed.find((v) => v.day <= day)?.plan;
        if (!p) continue;
        for (const a of p.activities)
          for (const time of slots(a, day))
            this.db.runSync(
              'INSERT OR IGNORE INTO instances(id,plan_id,activity_id,origin_date,due_date,time,definition,status) VALUES(?,?,?,?,?,?,?,?)',
              instanceId(p.id, a.id, day, time),
              p.id,
              a.id,
              day,
              day,
              time,
              JSON.stringify(a),
              'pending',
            );
      }
    });
  }
  rows(start: string, end = start, planId = this.pref('activePlan')) {
    return planId
      ? this.attachChecks(
          this.db.getAllSync<Instance>(
            'SELECT * FROM instances WHERE plan_id=? AND due_date BETWEEN ? AND ? ORDER BY due_date,time,id',
            planId,
            start,
            end,
          ),
        )
      : [];
  }
  allRows(planId: string) {
    return this.attachChecks(
      this.db.getAllSync<Instance>(
        'SELECT * FROM instances WHERE plan_id=? ORDER BY due_date,time',
        planId,
      ),
    );
  }
  get(id: string) {
    const row = this.db.getFirstSync<Instance>('SELECT * FROM instances WHERE id=?', id);
    if (!row) throw new Error('Activity no longer exists');
    return this.attachChecks([row])[0];
  }
  private attachChecks(rows: Instance[]) {
    const map = new Map<string, string[]>();
    for (let offset = 0; offset < rows.length; offset += 400) {
      const ids = rows.slice(offset, offset + 400).map((r) => r.id);
      for (const c of this.db.getAllSync<{ instance_id: string; step_id: string }>(
        `SELECT instance_id,step_id FROM instance_step_checks WHERE instance_id IN (${ids.map(() => '?').join(',')})`,
        ...ids,
      )) {
        const list = map.get(c.instance_id) ?? [];
        list.push(c.step_id);
        map.set(c.instance_id, list);
      }
    }
    return rows.map((r) => ({ ...r, checked_steps: map.get(r.id) ?? [] }));
  }
  setStep(id: string, stepId: string, checked: boolean, now = Date.now()) {
    const row = this.get(id),
      a = definition(row);
    if (!a.steps.some((s) => s.id === stepId))
      throw new Error('This subtask is not part of this activity snapshot.');
    if (row.status === 'skipped' || row.status === 'na')
      throw new Error('Reopen the activity before changing its checklist.');
    this.db.withTransactionSync(() => {
      if (checked)
        this.db.runSync(
          'INSERT INTO instance_step_checks(instance_id,step_id,completed_at) VALUES(?,?,?) ON CONFLICT(instance_id,step_id) DO NOTHING',
          id,
          stepId,
          now,
        );
      else
        this.db.runSync(
          'DELETE FROM instance_step_checks WHERE instance_id=? AND step_id=?',
          id,
          stepId,
        );
      const updated = this.get(id);
      let complete =
        a.habit?.direction === 'avoid'
          ? row.status === 'completed'
          : a.steps.every((s) => updated.checked_steps!.includes(s.id));
      if (complete)
        try {
          validateValues(a, JSON.parse(row.values_json));
        } catch {
          complete = false;
        }
      this.writeRecord(
        row,
        complete ? 'completed' : 'pending',
        JSON.parse(row.values_json),
        row.notes,
        now,
      );
    });
    this.syncMilestones(row.plan_id);
  }
  private writeRecord(
    row: Instance,
    status: Instance['status'],
    values: Values,
    notes: string,
    now: number,
  ) {
    this.db.runSync(
      'UPDATE instances SET status=?,values_json=?,notes=?,completed_at=?,timer_start=?,timer_seconds=? WHERE id=?',
      status,
      JSON.stringify(values),
      notes,
      status === 'completed' ? (row.completed_at ?? now) : null,
      status === 'pending' ? row.timer_start : null,
      status === 'pending' ? row.timer_seconds : 0,
      row.id,
    );
    this.db.runSync('DELETE FROM measurements WHERE instance_id=?', row.id);
    if (status === 'completed')
      for (const input of definition(row).inputs) {
        const v = values[input.id];
        if (input.metricId && typeof v === 'number')
          this.db.runSync(
            'INSERT INTO measurements(id,plan_id,metric_id,date,value,instance_id,input_id,recorded_at) VALUES(?,?,?,?,?,?,?,?)',
            `${row.id}/${input.id}`,
            row.plan_id,
            input.metricId,
            row.due_date,
            v,
            row.id,
            input.id,
            now,
          );
      }
  }
  record(
    id: string,
    status: Instance['status'],
    values: Values = {},
    notes = '',
    now = Date.now(),
  ) {
    const row = this.get(id),
      a = definition(row);
    validateValues(
      status === 'completed'
        ? a
        : { ...a, inputs: a.inputs.map((i) => ({ ...i, required: false })) },
      values,
    );
    if (notes.length > 4000) throw new Error('Notes: maximum 4000 characters');
    if (
      status === 'completed' &&
      a.habit?.direction !== 'avoid' &&
      a.steps.some((s) => !row.checked_steps?.includes(s.id))
    )
      throw new Error('Tick each subtask to finish, or save partial progress.');
    this.db.withTransactionSync(() => {
      if (status === 'pending' && row.status === 'completed')
        this.db.runSync('DELETE FROM instance_step_checks WHERE instance_id=?', id);
      this.writeRecord(row, status, values, notes, now);
    });
    this.syncMilestones(row.plan_id);
  }
  reschedule(id: string, day: string, time: string, now = Date.now()) {
    dateSchema.parse(day);
    if (time) timeSchema.parse(time);
    const row = this.get(id);
    if (row.status !== 'pending') throw new Error('Undo or reopen this activity before moving it.');
    const p = this.active();
    if (!p || row.plan_id !== p.id) throw new Error('Select this plan first');
    if (day < today(p.timezone, now)) throw new Error('Reschedule to today or later');
    this.db.runSync('UPDATE instances SET due_date=?,time=? WHERE id=?', day, time, id);
  }
  timer(id: string, running: boolean, now = Date.now()) {
    const r = this.get(id);
    if (r.status !== 'pending') throw new Error('Reopen the activity to use its timer.');
    const seconds =
      r.timer_seconds + (r.timer_start ? Math.max(0, (now - r.timer_start) / 1000) : 0);
    this.db.runSync(
      'UPDATE instances SET timer_start=?,timer_seconds=? WHERE id=?',
      running ? now : null,
      seconds,
      id,
    );
  }
  product(planId: string, id: string) {
    const raw = this.db.getFirstSync<{ definition: string }>(
      'SELECT definition FROM products WHERE plan_id=? AND id=?',
      planId,
      id,
    );
    return raw ? productSchema.parse(JSON.parse(raw.definition)) : null;
  }
  measurements(id: string) {
    return this.db.getAllSync<Measurement>(
      'SELECT * FROM measurements WHERE plan_id=? ORDER BY date,recorded_at,id',
      id,
    );
  }
  measure(metricId: string, date: string, value: number) {
    const p = this.active();
    if (!p || !p.metrics.some((m) => m.id === metricId) || !Number.isFinite(value))
      throw new Error('Select a metric and enter a finite number');
    dateSchema.parse(date);
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.db.runSync(
      'INSERT INTO measurements(id,plan_id,metric_id,date,value,recorded_at) VALUES(?,?,?,?,?,?)',
      id,
      p.id,
      metricId,
      date,
      value,
      Date.now(),
    );
    this.syncMilestones(p.id);
  }
  updateMeasurement(id: string, date: string, value: number) {
    dateSchema.parse(date);
    if (!Number.isFinite(value)) throw new Error('Enter a finite measurement');
    const m = this.db.getFirstSync<Measurement>('SELECT * FROM measurements WHERE id=?', id);
    if (!m) throw new Error('Measurement not found');
    if (m.instance_id) throw new Error('Edit the linked activity to update this measurement.');
    this.db.runSync(
      'UPDATE measurements SET date=?,value=?,recorded_at=? WHERE id=?',
      date,
      value,
      Date.now(),
      id,
    );
    this.syncMilestones(m.plan_id);
  }
  removeMeasurement(id: string) {
    const m = this.db.getFirstSync<Measurement>('SELECT * FROM measurements WHERE id=?', id);
    if (!m) return;
    if (m.instance_id) throw new Error('Edit the linked activity to change this measurement.');
    this.db.runSync('DELETE FROM measurements WHERE id=?', id);
    this.syncMilestones(m.plan_id);
  }
  journal(day: string) {
    return (
      this.db.getFirstSync<{ text: string }>(
        'SELECT text FROM journals WHERE plan_id=? AND date=?',
        this.pref('activePlan'),
        day,
      )?.text ?? ''
    );
  }
  saveJournal(day: string, text: string) {
    dateSchema.parse(day);
    if (text.length > 10000) throw new Error('Reflection is too long');
    this.db.runSync(
      'INSERT INTO journals(plan_id,date,text) VALUES(?,?,?) ON CONFLICT(plan_id,date) DO UPDATE SET text=excluded.text',
      this.pref('activePlan'),
      day,
      text,
    );
  }
  settings() {
    return this.db.getFirstSync<NotificationSettings>(
      'SELECT * FROM notification_settings WHERE id=1',
    )!;
  }
  notifications(enabled: boolean, start: string, end: string) {
    timeSchema.parse(start);
    timeSchema.parse(end);
    this.db.runSync(
      'UPDATE notification_settings SET enabled=?,quiet_start=?,quiet_end=? WHERE id=1',
      Number(enabled),
      start,
      end,
    );
  }
  syncMilestones(planId: string) {
    const p = this.active();
    if (!p || p.id !== planId) return;
    const rows = this.allRows(p.id),
      measure = this.measurements(p.id);
    this.db.withTransactionSync(() => {
      for (const g of p.goals) {
        const progress = goalProgress(g, rows, measure);
        for (const m of g.milestones) {
          if (progress.reached.some((r) => r.id === m.id))
            this.db.runSync(
              'INSERT OR IGNORE INTO milestone_events VALUES(?,?,?,?)',
              p.id,
              g.id,
              m.id,
              today(p.timezone),
            );
          else
            this.db.runSync(
              'DELETE FROM milestone_events WHERE plan_id=? AND goal_id=? AND milestone_id=?',
              p.id,
              g.id,
              m.id,
            );
        }
      }
    });
  }
  milestones(planId: string) {
    return this.db.getAllSync<{ goal_id: string; milestone_id: string; reached_on: string }>(
      'SELECT * FROM milestone_events WHERE plan_id=?',
      planId,
    );
  }
  backup(): Backup {
    const data = {} as Backup['tables'];
    this.db.withTransactionSync(() => {
      for (const t of tables) data[t] = this.db.getAllSync(`SELECT * FROM ${t}`);
    });
    return {
      format: 'verdant-backup',
      version: 2,
      createdAt: new Date().toISOString(),
      tables: data,
    };
  }
  restore(raw: unknown) {
    const b = validateBackup(raw);
    this.db.withTransactionSync(() => {
      for (const t of [...tables].reverse()) this.db.runSync(`DELETE FROM ${t}`);
      for (const t of tables)
        for (const row of b.tables[t]) {
          const keys = Object.keys(row);
          this.db.runSync(
            `INSERT INTO ${t}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`,
            ...keys.map((k) => row[k]),
          );
        }
      if (this.db.getFirstSync('PRAGMA foreign_key_check'))
        throw new Error('Backup has broken references');
    });
  }
  deleteAll() {
    this.db.withTransactionSync(() => {
      for (const t of [...tables].reverse()) this.db.runSync(`DELETE FROM ${t}`);
      this.db.runSync('INSERT INTO notification_settings(id) VALUES(1)');
    });
    this.db.execSync('PRAGMA wal_checkpoint(TRUNCATE); VACUUM;');
  }
}
