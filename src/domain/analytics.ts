import { activitySchema, type Plan, type Activity, type Values } from './schema';
export interface Instance {
  id: string;
  plan_id: string;
  activity_id: string;
  origin_date: string;
  due_date: string;
  time: string;
  definition: string;
  status: 'pending' | 'completed' | 'skipped' | 'na';
  values_json: string;
  notes: string;
  completed_at: number | null;
  timer_start: number | null;
  timer_seconds: number;
  checked_steps?: string[];
}
export interface Measurement {
  id: string;
  plan_id: string;
  metric_id: string;
  date: string;
  value: number;
  instance_id: string | null;
  input_id: string | null;
  recorded_at: number;
}
export const definition = (row: Instance) => activitySchema.parse(JSON.parse(row.definition));
export const valuesOf = (row: Instance) => JSON.parse(row.values_json) as Values;
export function checklistProgress(row: Instance) {
  const a = definition(row),
    checked = new Set(row.checked_steps ?? []);
  return { done: a.steps.filter((s) => checked.has(s.id)).length, total: a.steps.length };
}
export function activityFraction(row: Instance) {
  if (row.status === 'completed') return 1;
  if (row.status !== 'pending') return 0;
  const a = definition(row),
    p = checklistProgress(row);
  if (a.habit?.direction === 'avoid' || !p.total) return 0;
  // Required measurement fields are one additional unit until the task is complete.
  const required = a.inputs.some((i) => i.required) ? 1 : 0;
  return p.done / (p.total + required);
}
export const displayStatus = (row: Instance, day: string) =>
  row.status === 'pending' && (row.checked_steps?.length ?? 0) > 0
    ? 'partial'
    : row.status === 'pending' && row.due_date < day
      ? definition(row).habit
        ? 'unrecorded'
        : 'missed'
      : row.status;
export function summary(rows: Instance[], day: string) {
  const eligible = rows.filter((r) => r.status !== 'na'),
    completed = eligible.filter((r) => r.status === 'completed').length;
  const partial = eligible.filter((r) => displayStatus(r, day) === 'partial').length;
  const skipped = eligible.filter((r) => r.status === 'skipped').length;
  const missed = eligible.filter((r) => displayStatus(r, day) === 'missed').length;
  const unrecorded = eligible.filter((r) => displayStatus(r, day) === 'unrecorded').length;
  return {
    total: eligible.length,
    completed,
    partial,
    skipped,
    missed,
    unrecorded,
    pending: eligible.length - completed - partial - skipped - missed - unrecorded,
    percent: eligible.length
      ? Math.round(
          (eligible.reduce((sum, r) => sum + activityFraction(r), 0) / eligible.length) * 100,
        )
      : 0,
  };
}
export function goalProgress(
  goal: Plan['goals'][number],
  rows: Instance[],
  measurements: Measurement[],
) {
  const relevant = rows.filter(
    (r) =>
      r.status === 'completed' &&
      r.due_date >= goal.start &&
      (!goal.end || r.due_date <= goal.end) &&
      (goal.activityIds.includes(r.activity_id) || definition(r).goalIds.includes(goal.id)),
  );
  let value = 0;
  if (goal.mode === 'completions') value = relevant.length;
  if (goal.mode === 'sum')
    value = relevant.reduce((sum, r) => sum + Number(valuesOf(r)[goal.inputId!] ?? 0), 0);
  if (goal.mode === 'measurement') {
    const points = measurements
      .filter(
        (m) =>
          m.metric_id === goal.metricId &&
          m.date >= goal.start &&
          (!goal.end || m.date <= goal.end),
      )
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || b.recorded_at - a.recorded_at || b.id.localeCompare(a.id),
      );
    value = points[0]?.value ?? 0;
  }
  return {
    value,
    percent: Math.max(0, Math.min(100, Math.round((value / goal.target) * 100))),
    reached: goal.milestones.filter((m) => value >= m.target),
  };
}
