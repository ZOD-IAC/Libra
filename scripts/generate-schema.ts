import fs from 'node:fs';
import { z } from 'zod';
import { planSchema, validatePlan } from '../src/domain/schema';
const schema = z.toJSONSchema(planSchema, { target: 'draft-07', io: 'input', reused: 'ref' });
const compact = JSON.stringify(schema),
  pretty = JSON.stringify(schema, null, 2) + '\n';
const rules = `Semantic rules checked by the app in addition to JSON Schema:
- IDs use letters, digits, underscore or hyphen, max 80 characters. Each collection has unique IDs. Preserve existing IDs during updates.
- categoryId, sectionId, goalIds, activityIds, metricId and sum inputId must reference existing entities.
- Use real ISO dates (YYYY-MM-DD), 24-hour times (HH:mm), and an IANA time zone.
- Weekly schedules require weekdays (1=Monday through 7=Sunday). Monthly schedules require monthDays. A missing day, such as February 31, is skipped.
- interval is anchored to start; weekly intervals use the ISO Monday week containing start. End dates are inclusive. once runs on start only.
- times=[] produces one untimed instance per scheduled date; up to eight unique times produce separate occurrences.
- Every new personalized activity should have ordered steps with stable id, a concrete actionable title, personal instructions, and productIds. Avoid vague steps like “do grooming”; specify the exact actions the user chose. Do not invent personal products, quantities, medical treatments, limitations or facts. Ask for missing essentials.
- products is a separate plan-level array: id, name, brand, category, description, usageNotes, optional HTTPS url. Use exact products/resources the user already owns or explicitly selects; activities and steps reference productIds. Products are a list, not tasks and not shopping recommendations. No product is mandatory for a routine that needs none.
- Subtask ticks are saved per dated occurrence. Routines support partial progress; full completion requires all subtasks and required tracking fields. Reuse step IDs on unchanged steps. Keep edited/removed step history intact. Legacy plans without steps/products still import; new plans should be actionable.
- habit is optional on any activity: {direction:"do"|"avoid",cue:"...",alternative:"..."}. direction=do means a tick confirms doing it; avoid means a tick confirms successfully avoiding it that day. Avoidance support steps are optional strategies and do not automatically confirm avoidance. An unchecked past habit is unrecorded, not a moral failure. Reframe goals like “avoid not studying” as a positive, specific study habit when the user agrees. Do not label ordinary behavior as an addiction or medical problem without basis.
- inputs=[] means a checkbox when steps is empty; otherwise it is a checklist. Otherwise fields may be number, duration (minutes by default), repetitions (integers), rating (default 1–5), choice, text or timer (seconds). Multiple inputs support sets, repetitions and notes together.
- choice needs 2–12 choices. Numeric measurement fields may reference metricId; text/choice cannot. min cannot exceed max. Required defaults true.
- goals: completions counts linked completed occurrences; sum totals a numeric inputId shared by every activityIds entry; measurement uses the latest metricId value. Targets are positive and upward-facing (at/above), not decreasing weight targets. For a decreasing measurement, track behavior or a separate progress metric instead.
- Milestones use positive thresholds in the goal's units. Goal activityIds or an activity's goalIds link completion records.
- Paused activities create no new occurrences. Archived goals are hidden from the dashboard.
- Activity reminders require times and global notification permission. minutesBefore is 0–1440; quiet-hour reminders are omitted. No imported code, functions, expressions or HTML formatting.
- Configuration updates take effect on import day; past and tracked occurrences retain snapshots. Plan timezone is fixed for that ID. Increment version on every update. Dates before first import do not invent progress.
- Dashboard widgets are unique values from current, goals, metrics, reflection, reminders. Theme is system, light or dark. All optional defaults are supplied by the app.
- Configuration max 2 MB, 500 activities, 100 goals, 100 measurements, 8 fields per activity. Avoid overwhelming the user; prefer a realistic small plan.`;
const generate = `# Generate my Verdant plan

Copy this whole file into an AI assistant and fill in the personal brief below. No AI account is required to use Verdant; the app also has a manual editor and samples.

## My brief (replace these lines)
- What I want to make room for:
- What my ordinary day and week look like:
- My time zone and preferred start date:
- Existing routines and realistic available time:
- The exact steps I do now, what I want to change, and how much detail I need:
- Products, tools or learning resources I actually use (names and my established usage instructions):
- Habits I want to build and habits I want to avoid, with a concrete daily success definition:
- What I want to record (subtask ticks, completion, minutes, repetitions, ratings, notes or measurements):
- Reminder preferences, quiet hours, and any constraints:
- Optional name and theme preference:

## Instructions to the assistant
Help me create a realistic routine configuration for the offline native mobile app Verdant. Ask short questions when essential dates, time zone, schedule or goals are missing. Do not invent personal facts. Suggest a manageable plan before producing JSON. Do not prescribe medication, diagnoses or treatment; use the user's already-established routine for health reminders. No API calls or code execution belongs in the plan.

When details are settled, return one valid JSON object and a suggested filename plan.json, without comments or trailing commas. Explain how to save that object as a UTF-8 .json file and use Verdant → Import my plan → Validate & preview → Confirm. The app validates it independently. The same object must validate against the exact schema below. Use schemaVersion 1 and version 1 for a new plan. IDs should describe entities, not dates or array positions. A 90-day plan ends 89 days after its start.

${rules}

## Exact JSON Schema (generated from app validation; do not edit)
\`\`\`json
${compact}
\`\`\`
`;
const update = `# Update my Verdant plan

Export the current configuration from Verdant → Settings → Export active configuration. Paste it below, then describe changes. For small changes you can use the in-app editor instead.

CURRENT PLAN JSON:
[Paste exported JSON here]

CHANGES I WANT:
[Describe changes in ordinary language]

Instructions to the AI: Ask about missing essential details. Return a complete replacement JSON configuration, not a patch. Keep the plan id and timezone. Increment version by one above the exported version. Preserve unchanged entity IDs, field IDs, product IDs and subtask IDs. Expand generic activities into actionable personalized steps based on the brief; ask before inventing unknown details. Give new entities new unique IDs; never reuse removed IDs for unrelated activities. Briefly list additions, changes and removals before the final JSON. Do not fabricate user details or recorded progress. Imported plans describe schedules, not past completion data. The app previews the update and requires confirmation; recommend exporting a full backup first.

${rules}

## Exact JSON Schema
\`\`\`json
${compact}
\`\`\`
`;
const guide = `# Configuration guide

The app consumes versioned UTF-8 JSON, not scripts. Import configurations through the native picker, paste JSON in Import, or share a local JSON file to Verdant on Android. A full backup is a separate format; restore it in Settings.

${rules}

## Example
The repository contains lifestyle.json (90 days), learning.json and general.json. The same engine renders all three, including checkable subtasks, product references, and build/avoid habits. Example products are placeholders to replace, not personalized recommendations. Selecting a bundled sample rebases its dates to today in the device time zone; importing a file respects its dates verbatim. Examples use invented, nonpersonal routines.

The authoritative generated schema is schema/plan.schema.json; src/domain/schema.ts is its source. Run npm run schema after schema changes, commit the regenerated files, and run npm run check:schema in CI.

Local edits increment the active version. Keep definitions stable if you want to compare historical adherence. Reusing an ID for an unrelated activity combines its history and should be avoided. Reordering sections affects presentation only. A repeated activity has a separate record for each time slot.
`;
const outputs = {
  'schema/plan.schema.json': pretty,
  'prompts/GENERATE_MY_PLAN.md': generate,
  'prompts/UPDATE_MY_PLAN.md': update,
  'prompts/CONFIGURATION_GUIDE.md': guide,
};
for (const [path, text] of Object.entries(outputs)) {
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(path) || fs.readFileSync(path, 'utf8') !== text)
      throw new Error(`${path} is out of date; run npm run schema`);
  } else fs.writeFileSync(path, text);
}
for (const name of ['lifestyle', 'learning', 'general'])
  validatePlan(JSON.parse(fs.readFileSync(`examples/${name}.json`, 'utf8')));
console.log(
  process.argv.includes('--check')
    ? 'Schema, prompts and samples are synchronized.'
    : 'Generated schema and synchronized prompt templates.',
);
