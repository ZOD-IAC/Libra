# Updating the existing Windows app to 1.1

1. Export a **full backup** from Settings before updating. Keep it outside the source folder. Do not uninstall the app or clear its storage.
2. Stop Metro with Ctrl+C. Extract `verdant-source.zip` separately. Copy the **contents of the inner `verdant` folder** into your existing `C:\v` folder and merge/replace the source files. Do not create `C:\v\verdant`. Preserve your existing `android`, `node_modules`, personal configuration files and signing files. The archive excludes generated folders.
3. Open PowerShell in `C:\v` and run:

```powershell
npm run check
npx expo start --clear
```

Press `a` to open the existing Android development app, or reopen it on the emulator. This release changes JavaScript and SQLite migrations; it adds no native dependencies, so an existing development APK does not need rebuilding. A standalone release APK does need a normal rebuild to embed the new code.

4. In Settings, confirm the footer says **VERDANT 1.1.0 · PERSONALIZED CHECKLISTS**. If it does not, the app is loading another source folder or an old bundle. Check the terminal is running from `C:\v`. The supplied `src\ui\DateField.tsx` contains no literal space child under its View; copy that file fully. Restarting Metro alone cannot repair old source files. Test Quick Measurement and Edit Goal date fields.
5. Your existing plan remains unchanged. To add your actual personalized steps/products/habits, export its configuration and use `prompts/UPDATE_MY_PLAN.md`. Supply your real routines and product details, keep the plan/activity IDs, and increase its version. Import and review the change preview. The app cannot infer missing personal details from a generic task name.
6. To see the functionality first, open Settings → **Preview detailed sample plans**. Preview/import uses a separate demo plan ID. Activate only after reviewing; your original plan and records remain switchable in Settings. Example products are placeholders.

## What to expect

- Today shows ordered instructions and independent subtask ticks. Each tick saves immediately. Partial work survives restart and counts proportionally toward daily adherence. Required measurements must also be recorded before full completion.
- Completing all action steps automatically completes a routine/build habit when required fields are valid. Undo a step to reopen; explicit undo of a completed parent clears its step checks.
- Avoidance habits have a separate daily success confirmation. Support steps never automatically claim you avoided the habit. Unchecked means unrecorded.
- Plan → **Products I use** has the separate product/resource list and editing. Step links open the matching details. Plan → **Build & avoid habits** has the daily habit view.
- Existing SQLite data migrates in place from version 2 to 3. Full backups now use format version 2; version 1 backups can still be restored. Avoid importing new backups into older app versions.
- No system folders, drive configuration or Android SDK changes are needed for this update.
