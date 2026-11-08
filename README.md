# Verdant · Libra

**A little, every day.** An Android-first, offline routine tracker whose experience is driven by a personal JSON configuration. Built with React Native, Expo 58, Expo Router, TypeScript, SQLite and Zod. No backend, accounts, AI API, subscription, ads or telemetry.

Repository: https://github.com/ZOD-IAC/Libra . Libra is the repository name; Verdant remains the app name.

## Start

Use Node **26.13 LTS**, **npm 12.2.2** and Android Studio. Install dependencies with `npm ci`. Then:

```sh
npm run check
npm run android
```

Both test-renderer@1.3.1 and the React Native Jest preset are explicit development dependencies. The preset is pinned (`@react-native/jest-preset@0.88.1`), matched to React Native 0.88.1. Always use the committed lockfile with `npm ci`.

`npm run android` generates and builds a native development app; an emulator or USB-connected Android device and Android SDK are required. `npm start` starts Metro for development. A release APK embeds its JavaScript and does not need Metro, an Expo account or internet at runtime.

**Local release instructions, including Windows PowerShell and signing:** [docs/ANDROID_BUILD.md](docs/ANDROID_BUILD.md).

## Version 1.1 update

For an existing Windows development app, follow [UPDATING_WINDOWS.md](UPDATING_WINDOWS.md). This update needs no new native dependencies. Existing plans remain valid; use the updated generation/update prompt to add your actual steps and products, or preview a separate detailed sample from Settings.

## What is implemented

- Native Today, Plan, Progress and Settings tabs; ivory/forest/sage styling, dark mode, native input sheets, date/time pickers, haptics, swipe-to-skip and long-press actions.
- File-picker, pasted JSON and Android local-file share import; runtime validation, difference preview and explicit activation.
- Personalized ordered subtasks with independent persistent ticks, partial progress, instructions and product references.
- Separate products/resources list with brand, details, usage notes and optional HTTPS link; add/edit inside the app or import from JSON.
- Build and avoidance habits with daily confirmations, cues and alternatives. Unchecked habits remain unrecorded.
- One common activity engine: checkbox, number, duration, repetitions, rating, choice, text and persistent elapsed timer. Multiple fields support sets, reps and notes together.
- Daily, ISO-weekly, monthly and one-time schedules, intervals, date ranges, up to eight occurrences per day, priority, pause, skip, N/A, undo and reschedule.
- Persistent SQLite records with historical activity snapshots, relational measurements, journals, configuration versions, migrations and transactional restore.
- Completion, adherence, missed/skip patterns, 7/30-day charts, dated history, goals and milestones calculated from records.
- In-app activity, target, goal, milestone, schedule, reminder, section order, profile, category and measurement editing.
- Permission-aware local reminders, quiet hours, daily reminders and weekly review reminders.
- Plan export, readable progress archive, full backup/restore, configuration rollback and complete local deletion.
- Three sample plans and schema-synchronized prompts for generating/updating plans with an external assistant. AI is optional and never called by the app.

## First use

1. Select a sample, import a JSON file, or create a basic routine manually.
2. Open Today to record actions. Expand a routine to tick its specific steps; ticks save immediately. Completing all steps finishes action routines unless required tracking fields remain. Avoidance habits require a separate confirmation.
3. Use Plan to inspect a date/week, edit activities, or add goals. Historical unrecorded activities display as missed, not as an erased streak.
4. Enable reminders in Settings if desired. The phone will request notification permission.
5. Export a full backup periodically and before major plan updates.

Sample selection shifts example dates to today in your device time zone. File import uses the dates/time zone in the file. The first import activates a plan today; it never invents earlier completion history.

## Configuration workflow

Fill out [prompts/GENERATE_MY_PLAN.md](prompts/GENERATE_MY_PLAN.md), give it to an assistant, and save the returned object as UTF-8 `plan.json`. Import and validate it in Verdant. The app rejects invalid JSON, unsupported versions, missing references, duplicate IDs and invalid schedules. Review changes before activation.

For updates, export the current configuration and use [prompts/UPDATE_MY_PLAN.md](prompts/UPDATE_MY_PLAN.md). Keep IDs stable and increase `version`. Everyday changes can be made inside the app.

See [configuration guide](prompts/CONFIGURATION_GUIDE.md) and [JSON Schema](schema/plan.schema.json). JSON Schema handles structure; the app additionally checks date validity, cross-references and schedule semantics.

## Repository map

| Path                               | Purpose                                                            |
| ---------------------------------- | ------------------------------------------------------------------ |
| `app/`                             | Expo Router routes and native screen composition                   |
| `src/domain/`                      | Validation, scheduling, analytics, sample rebasing                 |
| `src/data/`                        | Database port, migrations, repository and validated backup format  |
| `src/services/`                    | Local notifications and native file import/export                  |
| `src/state/`                       | Application provider and refresh/midnight/foreground coordination  |
| `src/ui/`, `src/features/`         | Theme, accessible controls and reusable feature components         |
| `plugins/`                         | Repeatable local release signing and Android privacy configuration |
| `prompts/`, `schema/`, `examples/` | Portable plan format and tooling                                   |
| `tests/`                           | Domain, real SQLite integration and native component flow tests    |

## Checks and current delivery status

`npm run check` runs strict TypeScript, core/SQLite integration tests, component tests, and schema/prompt synchronization checks. `npm run bundle:android` emits an Android Hermes bundle. Native generation is checked with `npx expo prebuild --platform android --no-install`.

See [docs/VALIDATION.md](docs/VALIDATION.md) for observed results and the remaining device acceptance checklist. **No APK is included in this source delivery.** Android compilation could not complete in the authoring environment because the Gradle download was blocked and no Android SDK/emulator was installed. Notification delivery, Android sharing, rendering, accessibility and installed-app restart behavior still need testing on a real device/emulator before treating this as a production release.

## Deliberate limits

- Local reminders cover the next 14 days, capped at 60 pending notifications. Open the app at least every two weeks to replenish them. Android may delay notifications; force-stop can suppress them until the next app launch. No background service or exact-alarm permission is used.
- A plan's time zone is fixed for its ID. Traveling does not shift plan dates to the device zone. Export under a new ID to intentionally establish a different time zone.
- Goal targets are upward-facing thresholds. A raw decreasing measurement (for example a weight-loss target) is displayed as data, but should not use the current goal percentage formula directly. Track completed actions or an explicit amount-of-progress metric instead.
- Timers track elapsed wall-clock time across closure; they are not alarms and follow device clock adjustments. A timer field stores seconds. Duration fields default to minutes unless configured otherwise.
- Calendar history is created lazily from versioned schedules. Opening the app materializes the last 30 days and the next 14 days; visiting another date materializes that date using its historical configuration.
- Exported JSON backups are unencrypted. Storage is SQLite in the app sandbox, with Android automatic backup disabled. Uninstall/clear-storage removes data. Some OEM device-transfer behavior may vary; see [privacy](docs/PRIVACY.md).
- iOS business logic is shared, but signing, share-in and runtime QA on iOS are not included. Manual file import/export remains platform-based.

## Documentation

[Dependency policy](docs/DEPENDENCIES.md) · [Architecture](docs/ARCHITECTURE.md) · [Android build & install](docs/ANDROID_BUILD.md) · [Testing](docs/TESTING.md) · [Privacy](docs/PRIVACY.md) · [Troubleshooting](docs/TROUBLESHOOTING.md) · [Contributing](CONTRIBUTING.md)

MIT licensed. No real personal data is included in examples.
