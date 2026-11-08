# Privacy

Verdant stores configuration, activities, goals, measurements and reflections locally in its SQLite database in the Android app sandbox. It requires no account and has no backend, advertisements, telemetry, AI integration or remote notification registration. Imported JSON is validated on-device; embedded text is displayed as text and no scripts or expressions are executed.

Local notifications can expose activity titles on your lock screen. Use Android notification privacy settings, disable reminders for sensitive activities, or disable reminders entirely.

SQLite and exported JSON are **not encrypted by Verdant**. Normal Android device encryption, app isolation and screen lock offer protection, but this app cannot protect records on a rooted/compromised device or an unlocked phone used by another person. Use a device lock. Do not treat this as a clinical record or a critical medication alarm.

Android automatic backup is disabled with `allowBackup=false` and `fullBackupContent=false`. OEM device-transfer tools can behave differently; verify your device settings. iOS backup exclusion has not been separately implemented/tested; future iOS distribution must assess platform backup policy before promising identical behavior.

Uninstalling the app, clearing its storage, losing the phone or database corruption can remove all records. Export full backups periodically, protect them and test restoration. Progress-only export is not a full restore format. Restoring a backup replaces all app records after explicit confirmation; it is not a merge.

The operating system share sheet lets you deliberately send exports to an application you select. That receiving application's privacy behavior is outside Verdant. Cached export copies are removed after the share flow and at next launch; copies saved elsewhere remain under your control. Delete-all clears this app's relational data, checkpoints the WAL and vacuums SQLite. It is not a forensic secure-erasure guarantee, and it cannot remove exported copies, system notifications already shown or external device backups.

Development builds contact the local Metro server for code. Expo tooling may have its own development-time behavior; use a signed release to test the offline product. Android's default Internet permission is retained for development compatibility, but application code contains no networking or remote content loader. The app does not call Expo push-token APIs.

Public sample plans contain generic, invented activities. Do not commit your personal configuration, backups, journal, screenshots containing personal information, keys or passwords to a public repository.
