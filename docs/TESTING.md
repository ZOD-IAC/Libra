# Testing

## Automated checks

```sh
npm ci
npm run check
npm run bundle:android
npx expo prebuild --platform android --no-install
```

Use Node 26.13 LTS: core integration tests use its built-in SQLite module. `npm run test:core` runs 56 domain/SQLite tests; `npm run test:ui` runs 20 React Native component tests under Jest/Expo. There are no fake SQLite assertions: the core adapter executes actual migrations, constraints, inserts, updates and rollback against in-memory SQLite. This verifies database logic but does not replace Expo SQLite testing on Android.

Covered behavior includes schema/semantic rejection, sample validity, duplicate IDs, malformed imports, date boundaries, leap days, recurrence intervals, monthly missing days, IANA day boundaries, DST gaps/folds, quiet hours, deterministic occurrence keys, completion/undo, skip/N/A, reschedule identity, timestamp timers, measured-value normalization, edited plan snapshots, isolated plans, configuration version restrictions, actual-data analytics, milestone invalidation, full-backup round trips, corrupt/constraint-failing restoration rollback and data deletion.

The personalization suite covers schema defaults/references, partial persistence, completion prerequisites, undo, per-day isolation, rescheduling, historical snapshots, do/avoid habit semantics, v1/v2 backup restoration, malformed checks and migration 2→3.

UI tests render Today with QuickMeasurement and DateField, check inline steps and partial counts, undo, product navigation/details, and both habit directions. They also cover numeric/choice/text inputs, safe decimal typing, disabled buttons, import preview without premature activation, invalid JSON errors, manual onboarding without AI and quick checkbox completion. Schema synchronization tests ensure the generated AI prompts and machine schema match `src/domain/schema.ts`.

`EXPO_OFFLINE=1 npx expo install --check` checks SDK-pinned dependency compatibility without remote metadata. `npm run doctor` runs Expo Doctor when network access permits; do not equate an offline dependency check with full Doctor/native runtime validation.

## Required Android release acceptance

These checks require an emulator or device and have **not been completed in the source-authoring environment**. Record device model, Android version, APK version, date and result for each release. Do not mark them passed without observing them.

1. Build and verify the signed release APK with the documented local toolchain. Install it on a mid-range device; launch in airplane mode without Metro.
2. Test first launch: sample, manual plan and file import. Verify cancellation, invalid JSON, unsupported schema, duplicate references, mismatched versions and update previews. Exercise Android share-to-Verdant with a local JSON file and text.
3. Complete, undo, skip and mark N/A. Record every field type, including decimal and negative measurements, ratings, choices, text, multiple fields and a timer. Confirm required/range validation.
4. Close, force-stop and restart the installed app. Records must persist; an active timer must show elapsed time. Reboot and confirm persistence. Android force-stop notification limitations are expected and documented.
5. Test midnight while the app is open, background/foreground, plan/device zone differences, spring-forward gap and fall-back fold. Calendar days must not duplicate scheduled instances.
6. Move an occurrence to another date/time, reopen source/target dates and refresh repeatedly. The original must not regenerate. Test recurring target-day coexistence.
7. Update a plan with stable IDs, changed descriptions/targets/times, new fields/metrics, removed/paused activities and reordered sections. Past and tracked snapshots remain. Test rollback as a new version.
8. Complete enough activities to verify daily/weekly/monthly percentages, adherence, goals and milestones by hand. Check same-day measurement ordering and edit/delete behavior; undo must remove linked measurement and invalidated milestone attainment.
9. Deny notification permission, grant it later, set quiet hours crossing midnight and configure lead times crossing dates. Complete/reschedule/pause activities and verify pending notifications refresh. Check actual delivery, OEM battery saver, reboot and long inactivity. Never promise exact delivery.
10. Export full backup through the share sheet. Restore on another test install. Verify plans, records, journals, measurements, settings and timers. Try corrupted, unknown-version, broken-reference and progress-only files; failure must leave existing data intact.
11. Switch plans and themes. Verify settings after restore. Check Android back behavior, keyboard overlap, TalkBack labels, large fonts, reduced motion, small-screen scrolling, gesture navigation inset and contrast in both themes.
12. Delete all local app data; restart and confirm onboarding. Existing exported files elsewhere must remain untouched. Test an APK upgrade with the same package/signing key and incremented versionCode without uninstalling.

Keep a redacted test plan/backup for reproducible QA, not personal health or journal data. Do not upload your own full backup in a bug report.

## Version 1.1 device checks

- Upgrade existing data without uninstalling. Confirm Settings shows 1.1.0 and existing history remains.
- Open Today → quick measurement and edit a goal; open, cancel and clear date pickers. No raw-text error should appear.
- Preview a detailed sample from Settings, cancel once, then activate it as a separate plan; switch back to the original.
- Tick one routine step, restart the app, and confirm partial progress. Tick remaining steps, undo one, and test a required measurement.
- Open linked product details, edit a product, export configuration, and validate the references after reimport.
- Confirm an avoidance habit only after reviewing the day; support steps must not auto-confirm success.
- Restore a v1 backup and a new v2 backup on test installs. Verify subtask checks in the v2 restore.
- Check charcoal dark surfaces, large fonts and TalkBack on the expanded Today list.
