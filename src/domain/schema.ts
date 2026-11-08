import { z } from 'zod';
import { Temporal } from '@js-temporal/polyfill';
const id = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{1,80}$/, 'Use 1–80 letters, numbers, underscores or hyphens');
const label = z.string().trim().min(1).max(200);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    try {
      Temporal.PlainDate.from(v);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid calendar date');
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const zone = z.string().refine((v) => {
  try {
    Temporal.Now.zonedDateTimeISO(v);
    return true;
  } catch {
    return false;
  }
}, 'Use an IANA time zone, e.g. Asia/Kolkata');
export const inputSchema = z
  .object({
    id,
    label,
    type: z.enum(['number', 'duration', 'repetitions', 'rating', 'choice', 'text', 'timer']),
    unit: z.string().max(30).optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    target: z.number().finite().optional(),
    required: z.boolean().default(true),
    choices: z.array(label).min(2).max(12).optional(),
    metricId: id.optional(),
  })
  .strict();
export const scheduleSchema = z
  .object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'once']),
    start: dateSchema,
    end: dateSchema.optional(),
    interval: z.number().int().min(1).max(365).default(1),
    weekdays: z.array(z.number().int().min(1).max(7)).max(7).optional(),
    monthDays: z.array(z.number().int().min(1).max(31)).max(31).optional(),
    times: z.array(timeSchema).max(8).default([]),
  })
  .strict();
export const productSchema = z
  .object({
    id,
    name: label,
    brand: z.string().max(200).default(''),
    category: z.string().max(100).default(''),
    description: z.string().max(4000).default(''),
    usageNotes: z.string().max(4000).default(''),
    url: z
      .string()
      .url()
      .refine((v) => v.startsWith('https://'), 'Product links must use HTTPS')
      .optional(),
  })
  .strict();
export const stepSchema = z
  .object({
    id,
    title: label,
    instructions: z.string().max(4000).default(''),
    productIds: z.array(id).max(30).default([]),
  })
  .strict();
export const activitySchema = z
  .object({
    id,
    title: label,
    description: z.string().max(4000).default(''),
    categoryId: id,
    sectionId: id,
    goalIds: z.array(id).max(20).default([]),
    priority: z.enum(['normal', 'high']).default('normal'),
    paused: z.boolean().default(false),
    schedule: scheduleSchema,
    inputs: z.array(inputSchema).max(8).default([]),
    steps: z.array(stepSchema).max(40).default([]),
    productIds: z.array(id).max(30).default([]),
    habit: z
      .object({
        direction: z.enum(['do', 'avoid']),
        cue: z.string().max(2000).default(''),
        alternative: z.string().max(2000).default(''),
      })
      .strict()
      .optional(),
    reminder: z
      .object({ enabled: z.boolean(), minutesBefore: z.number().int().min(0).max(1440).default(0) })
      .strict()
      .default({ enabled: false, minutesBefore: 0 }),
  })
  .strict();
export const planSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    version: z.number().int().positive(),
    name: label,
    description: z.string().max(4000).default(''),
    timezone: zone,
    profile: z
      .object({ name: z.string().max(80).default(''), bio: z.string().max(500).default('') })
      .strict()
      .default({ name: '', bio: '' }),
    categories: z
      .array(z.object({ id, name: label, color: z.string().regex(/^#[0-9a-fA-F]{6}$/) }).strict())
      .min(1)
      .max(50),
    sections: z
      .array(z.object({ id, name: label }).strict())
      .min(1)
      .max(30),
    metrics: z
      .array(z.object({ id, name: label, unit: z.string().max(30) }).strict())
      .max(100)
      .default([]),
    products: z.array(productSchema).max(200).default([]),
    goals: z
      .array(
        z
          .object({
            id,
            name: label,
            description: z.string().max(2000).default(''),
            archived: z.boolean().default(false),
            mode: z.enum(['completions', 'sum', 'measurement']),
            target: z.number().finite().positive(),
            activityIds: z.array(id).max(100).default([]),
            metricId: id.optional(),
            inputId: id.optional(),
            start: dateSchema,
            end: dateSchema.optional(),
            milestones: z
              .array(z.object({ id, name: label, target: z.number().finite().positive() }).strict())
              .max(30)
              .default([]),
          })
          .strict(),
      )
      .max(100)
      .default([]),
    activities: z.array(activitySchema).max(500),
    dashboard: z
      .object({
        widgets: z
          .array(z.enum(['current', 'goals', 'metrics', 'reflection', 'reminders']))
          .max(5)
          .default(['current', 'goals', 'metrics', 'reflection', 'reminders']),
      })
      .strict()
      .default({ widgets: ['current', 'goals', 'metrics', 'reflection', 'reminders'] }),
    theme: z.enum(['system', 'light', 'dark']).default('system'),
    review: z
      .object({
        weekday: z.number().int().min(1).max(7).default(7),
        time: timeSchema.default('18:00'),
        enabled: z.boolean().default(false),
      })
      .strict()
      .default({ weekday: 7, time: '18:00', enabled: false }),
    dailyReminder: z
      .object({ enabled: z.boolean().default(false), time: timeSchema.default('08:00') })
      .strict()
      .default({ enabled: false, time: '08:00' }),
  })
  .strict();
export type Plan = z.infer<typeof planSchema>;
export type Activity = Plan['activities'][number];
export type Input = Activity['inputs'][number];
export type Product = Plan['products'][number];
export type Step = Activity['steps'][number];
export type Schedule = Activity['schedule'];
export type Value = string | number;
export type Values = Record<string, Value>;
export function validatePlan(raw: unknown): Plan {
  const plan = planSchema.parse(raw);
  const errors: string[] = [];
  const unique = (items: { id: string }[], path: string) => {
    const seen = new Set<string>();
    for (const x of items) {
      if (seen.has(x.id)) errors.push(`${path}: duplicate ID ${x.id}`);
      seen.add(x.id);
    }
    return seen;
  };
  const categories = unique(plan.categories, 'categories'),
    sections = unique(plan.sections, 'sections'),
    metrics = unique(plan.metrics, 'metrics'),
    goals = unique(plan.goals, 'goals'),
    activities = unique(plan.activities, 'activities'),
    products = unique(plan.products, 'products');
  if (new Set(plan.dashboard.widgets).size !== plan.dashboard.widgets.length)
    errors.push('dashboard.widgets: duplicate widget');
  for (const a of plan.activities) {
    if (!categories.has(a.categoryId)) errors.push(`${a.id}: categoryId not found`);
    if (!sections.has(a.sectionId)) errors.push(`${a.id}: sectionId not found`);
    if (a.goalIds.some((g) => !goals.has(g))) errors.push(`${a.id}: goalId not found`);
    unique(a.steps, `${a.id}.steps`);
    for (const productId of [...a.productIds, ...a.steps.flatMap((s) => s.productIds)])
      if (!products.has(productId)) errors.push(`${a.id}: unknown productId ${productId}`);
    const s = a.schedule;
    if (s.end && s.end < s.start) errors.push(`${a.id}: end precedes start`);
    if (s.frequency === 'weekly' && !s.weekdays?.length)
      errors.push(`${a.id}: weekly schedules need weekdays (1=Monday)`);
    if (s.frequency === 'monthly' && !s.monthDays?.length)
      errors.push(`${a.id}: monthly schedules need monthDays`);
    if (new Set(s.times).size !== s.times.length) errors.push(`${a.id}: duplicate times`);
    unique(a.inputs, `${a.id}.inputs`);
    for (const i of a.inputs) {
      if (i.type === 'choice' && !i.choices?.length)
        errors.push(`${a.id}.${i.id}: choices required`);
      if (i.metricId && !metrics.has(i.metricId)) errors.push(`${a.id}.${i.id}: unknown metric`);
      if (i.metricId && ['choice', 'text'].includes(i.type))
        errors.push(`${a.id}.${i.id}: measurements must be numeric`);
      if (i.min !== undefined && i.max !== undefined && i.min > i.max)
        errors.push(`${a.id}.${i.id}: min exceeds max`);
    }
  }
  for (const g of plan.goals) {
    unique(g.milestones, `${g.id}.milestones`);
    if (g.end && g.end < g.start) errors.push(`${g.id}: end precedes start`);
    if (g.activityIds.some((a) => !activities.has(a)))
      errors.push(`${g.id}: activity ID not found`);
    if (g.mode === 'measurement' && (!g.metricId || !metrics.has(g.metricId)))
      errors.push(`${g.id}: metricId required`);
    if (
      g.mode === 'sum' &&
      (!g.inputId ||
        !g.activityIds.length ||
        g.activityIds.some(
          (id) =>
            !plan.activities
              .find((a) => a.id === id)
              ?.inputs.some((i) => i.id === g.inputId && !['text', 'choice'].includes(i.type)),
        ))
    )
      errors.push(`${g.id}: sum needs numeric inputId present in all linked activities`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return plan;
}
export function parsePlan(text: string): Plan {
  if (text.length > 2_000_000) throw new Error('Plan is too large (maximum 2 MB).');
  try {
    return validatePlan(JSON.parse(text));
  } catch (e) {
    if (e instanceof z.ZodError)
      throw new Error(e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'));
    throw e;
  }
}
export function validateValues(activity: Activity, values: Values) {
  const allowed = new Set(activity.inputs.map((i) => i.id));
  for (const key of Object.keys(values))
    if (!allowed.has(key)) throw new Error(`Unknown input: ${key}`);
  for (const i of activity.inputs) {
    const v = values[i.id];
    if (v === undefined || v === '') {
      if (i.required) throw new Error(`Enter ${i.label}`);
      continue;
    }
    if (i.type === 'text') {
      if (typeof v !== 'string' || v.length > 4000)
        throw new Error(`${i.label}: maximum 4000 characters`);
    } else if (i.type === 'choice') {
      if (typeof v !== 'string' || !i.choices?.includes(v)) throw new Error(`Choose ${i.label}`);
    } else {
      if (typeof v !== 'number' || !Number.isFinite(v))
        throw new Error(`${i.label}: enter a number`);
      const min =
          i.min ??
          (['duration', 'repetitions', 'timer'].includes(i.type)
            ? 0
            : i.type === 'rating'
              ? 1
              : -Infinity),
        max = i.max ?? (i.type === 'rating' ? 5 : Infinity);
      if (v < min || v > max) throw new Error(`${i.label}: expected ${min} to ${max}`);
      if (i.type === 'repetitions' && !Number.isInteger(v))
        throw new Error(`${i.label}: enter a whole number`);
    }
  }
}
export function diffPlans(before: Plan | null, after: Plan) {
  const changes: string[] = [];
  for (const field of [
    'name',
    'description',
    'profile',
    'categories',
    'sections',
    'metrics',
    'goals',
    'products',
    'dashboard',
    'theme',
    'dailyReminder',
    'review',
  ] as const)
    if (before && JSON.stringify(before[field]) !== JSON.stringify(after[field]))
      changes.push(field);
  const old = new Map(before?.activities.map((a) => [a.id, a]) ?? []);
  return {
    otherChanges: changes,
    added: after.activities.filter((a) => !old.has(a.id)).map((a) => a.title),
    removed: (before?.activities ?? [])
      .filter((a) => !after.activities.some((b) => b.id === a.id))
      .map((a) => a.title),
    changed: after.activities
      .filter((a) => old.has(a.id) && JSON.stringify(a) !== JSON.stringify(old.get(a.id)))
      .map((a) => a.title),
  };
}
