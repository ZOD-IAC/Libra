# Architecture and behavior contracts

## Four systems

| System                 | Implementation                                            | Contract                                                                                 |
| ---------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Configuration          | `src/domain/schema.ts`, import route, repository versions | Strict declarative validation, semantic checks, monotonic versions, preview/confirmation |
| Routine and scheduling | `src/domain/schedule.ts`, repository `ensure`             | Deterministic calendar occurrences with stable keys; no executed expressions             |
| Progress               | `src/domain/analytics.ts`, relational records             | Actual completion, measurement, journal and milestone data; no invented outcomes         |
| Presentation           | Expo Router routes, `src/features`, `src/ui`              | Native components compose reusable domain/services; common rendering for all samples     |

The React context owns the repository and refresh signal. Theme resolves system/user/plan preference without repeatedly parsing the configuration for each text node. Zustand is omitted because there is no separate global ephemeral state requiring it. SQLite is the source of truth. Screen-local drafts use React state. Services own platform notifications and file access. Gesture Handler and Reanimated power native interactions and respect system animation settings where available.

## SQLite

Migrations use `PRAGMA user_version`; each runs in a transaction. Foreign keys and WAL are enabled. Migration 1 creates normalized tables and indexes; migration 2 adds measurement recorded timestamps; migration 3 adds products and per-occurrence subtask checks without replacing existing records. Tests use Node's real SQLite engine behind the same database port, while the installed app uses Expo SQLite.

| Table                 | Stored data                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| profiles              | Optional local display name and bio                                                                              |
| plans                 | Plan identity, latest name, first activation date                                                                |
| versions              | Immutable validated configuration snapshots, effective date, version, import timestamp                           |
| goals / activities    | Last known definition for each stable plan-scoped entity, retained when removed                                  |
| products              | Last known plan-scoped product/resource definitions, retained for historical references                          |
| instance_step_checks  | Independent step completion timestamps keyed by occurrence and stable step ID                                    |
| instances             | One occurrence with origin/due dates, definition snapshot, state, values, notes, completion time and timer state |
| measurements          | Individual finite numeric samples, input/instance link or manual ID, date and recorded timestamp                 |
| journals              | Per-plan daily reflection                                                                                        |
| preferences           | Active plan and explicit theme override                                                                          |
| notification_settings | Device-wide enablement and quiet hours                                                                           |
| milestone_events      | Current attained milestones with first observed reach date; undo can invalidate attainment                       |

JSON is used for immutable configuration/definition snapshots and one occurrence's dynamic field values, not for one giant progress object. Day and metric lookups are indexed. Parameter bindings handle user data; dynamic SQL identifiers come only from fixed internal table/column lists validated during restoration.

## Dates and recurrence

Temporal's polyfill uses real calendar arithmetic and IANA time zones. Each plan has a fixed zone. Device locale controls picker presentation; the chosen date/time is stored as a plan wall date/time. Changing a plan zone requires a new plan ID, preventing silent historical date shifts. The Today screen refreshes at foreground and checks for plan-zone midnight every 15 seconds.

- Daily interval: days elapsed since start modulo interval.
- Weekly interval: ISO Monday week containing start is week zero, selected weekdays are 1–7. Dates before start are excluded.
- Monthly interval: calendar months elapsed since start, selected day numbers. Nonexistent dates are skipped.
- Once: start date only.
- Start and end are inclusive. Paused activities produce no new occurrences.
- Empty times creates one untimed occurrence; otherwise each unique time is independent.
- Identity: `planId/activityId/originDate/timeOrAny`. Inserts use `OR IGNORE` to prevent duplicates.
- Rescheduling moves due date/time on the existing ID; origin remains fixed, so generation cannot recreate the original occurrence. The target day can also have its normal occurrence; these are separate obligations.
- Untouched pending routines before the plan's current date display as missed. Habits display as unrecorded, and any checked steps display partial progress. Completed, skipped and N/A are explicitly recorded. No streak reset is used.

Daily generation is lazy: recent/near-future dates on app refresh and requested dates in calendar/progress. Dates before activation are never materialized. Missed periods use the newest configuration whose effective date is no later than the historical date. Same-day versions use the highest version for untouched records.

## Updates and rollback

Validation completes before applying a plan. Version numbers must increase for an existing plan ID. Apply inserts an immutable version, upserts last known definitions, and switches the active plan in one transaction. Untouched pending instances originating today or later are removed and regenerated. Past records, any status that was explicitly tracked, moved records, notes, values, checked steps and active timers remain with their original snapshots. Removed activities can therefore still appear today if already tracked; that is intentional.

Rollback imports an older configuration as a new higher version, preserving records. Goal progress uses current goal definitions applied to matching historical activity IDs. Changing a goal target intentionally changes the displayed percentage; it does not rewrite source records.

## Analytics

Daily adherence = sum of occurrence fractions / (all scheduled minus N/A). Completed occurrences contribute 1; partially checked action routines contribute checked steps divided by total steps (plus one unit if required tracking fields exist). Avoidance support steps contribute no success credit until explicit confirmation. Skipped and untouched occurrences contribute 0. Each occurrence has equal aggregate weight. Partial work is shown separately, and never counted as a full completion. Skips and missed activities remain in the denominator. Empty periods show no observations, with a zero chart point and no contribution to the aggregate denominator. The period percentage is weighted across occurrences, not an average of daily percentages. Upcoming future dates are excluded from aggregate progress.

Count goals count completed linked occurrences. Sum goals total the configured numeric field. Measurement goals use the latest dated sample, breaking same-day ties by recorded timestamp. Goal windows are inclusive. Targets are at-or-above thresholds. Milestones reflect validated current progress, and undo removes a milestone if its threshold is no longer met; this prevents falsely displaying undone work as attained.

Timers persist start epoch and accumulated seconds; pausing computes elapsed time. Completion saves the configured timer value. Wall-clock changes affect elapsed time; timers are not background alarms.

## Notifications

Reconciliation is serialized to prevent racing asynchronous updates. It cancels stale pending notifications, checks permission/settings, generates the next 14 days, filters completed/skipped/N/A and untimed/disabled activities, subtracts lead time, omits quiet-hour/past candidates, adds daily/weekly reminders, then schedules the earliest 60. Each identifier is deterministic. The native DATE trigger intentionally does not request Android exact-alarm privileges.

Spring-forward nonexistent wall times are omitted; fall-back ambiguous times use the first occurrence. Reminder quiet-hour evaluation uses the actual notification time after lead-time subtraction. Queued reminders use absolute instants in the plan's zone.

No unattended indefinite schedule renewal or custom boot worker is claimed. OS retention across reboot is delegated to Expo/platform support and must be device-tested. Open the app after reboot, force-stop, a time-zone/system-clock change or long inactivity. A force-stopped Android app cannot promise delivery. These limits are visible in Settings.

## Backups and privacy boundaries

`verdant-backup` version 2 contains products and step checks as well as table rows and immutable configurations. Version 1 backups remain supported, with the two new tables defaulting to empty. Version 2 requires them. Restore validates envelope, table/column shapes, values, references and definition snapshots before replacing data, then restores all rows transactionally and checks foreign keys. Constraint failure rolls back everything. File size limit is 25 MB. Exported progress archives are for inspection; only a full backup is restorable.

Native file picker grants scoped access; no broad storage permission is requested. Incoming Android shares are read only as local files or text, with no remote URL resolution. Imported strings render as React Native text, never HTML. Exports use fixed app-generated filenames in cache and are cleaned up after sharing/next launch. The app makes no network calls or token registration requests.

## Personalization contract

Plan schemaVersion remains 1: products, activity steps and habit metadata are additive with defaults for old plans. Import validates stable step IDs within each activity and all product references. Steps describe concrete actions and may link products. Imported data supplies personalization; the app does not invent a user's routine or product choices. Sample products are explicitly illustrative.

Subtask checks save immediately to their own table and survive repository reopening, rescheduling and tracked-snapshot updates. Action routines and build habits complete when all steps and required input values are valid. Unchecking reopens them. Explicit undo of completed work clears checks; saving a partial draft retains them. Avoidance habits require explicit success confirmation independently of optional support steps. Goals based on completions count fully completed occurrences only.
