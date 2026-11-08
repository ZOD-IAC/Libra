# Observed validation — 7 November 2026

Router runtime correction: expo-linking, expo-constants and @expo/metro-runtime are direct SDK-matched dependencies. A clean npm 12 install, runtime dependency declaration/resolution check, strict TypeScript, all 47 tests and Android bundle export were rerun. The user supplied a Windows log confirming a debug APK built and installed on Pixel_9 after shortening the path; actual app startup remains unverified here.

npm 12 reproduction correction: test-renderer@1.3.1 is now explicit; the deprecated direct react-test-renderer was removed. Pinned allowScripts approvals cover esbuild and @parcel/watcher. Clean npm 12.2.2 ci completed without blocked-script notices, followed by all 47 tests, strict TypeScript and schema checks. This is a Linux check, not a Windows/device test.

Dependency correction: explicit React Native Jest preset 0.88.1, Node 26.13.0 LTS with a clean npm ci, Jest 30, and Zod 4.6.7 with native JSON Schema export. The checks below are rerun against the corrected project. See DEPENDENCIES.md for SDK compatibility choices.

| Check                                                                            | Observed result                                                                      |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Strict TypeScript                                                                | Passed (`npm run typecheck`)                                                         |
| Core/domain + real SQLite integration                                            | 56 tests passed                                                                      |
| Native component/interaction tests                                               | 20 tests passed                                                                      |
| Total automated tests                                                            | 76 passed, 0 failed                                                                  |
| Generated JSON Schema / AI prompts / sample synchronization                      | Passed                                                                               |
| Android Metro + Hermes bundle export                                             | Passed                                                                               |
| Android native project generation                                                | Passed; signing plugin and privacy/share manifest entries generated                  |
| SDK dependency compatibility, offline                                            | Passed; bundled Expo version data only                                               |
| Installed top-level dependency tree                                              | Resolved without invalid dependencies                                                |
| Full online compatibility metadata / Expo Doctor                                 | Not established; network/proxy restrictions prevented remote compatibility lookup    |
| Android Gradle APK compilation                                                   | Blocked at Gradle 9.4.1 download: `java.net.SocketException: Network is unreachable` |
| Android SDK / emulator / adb                                                     | Unavailable in this environment                                                      |
| Android installed-app runtime, notification delivery, UI visual/accessibility QA | Not performed                                                                        |
| Signed release APK / signature / upgrade test                                    | Not produced or tested here                                                          |
| iOS runtime                                                                      | Not performed                                                                        |

Core persistence tests reopen the repository over a real SQLite database; they are not installed-app force-stop tests. Component tests use React Native renderers and native-module mocks; they do not prove actual Android rendering or notification delivery. A Hermes bundle is not an installable APK.

The repository contains the source and reproducible build workflow. Complete the device acceptance checklist in `docs/TESTING.md` before describing an APK as production-ready.

8 November 2026 — DateField rendering regression: reproduced the exact raw-space-under-View invariant with three failing component tests. Removed the explicit JSX space and changed optional Clear rendering to a boolean/element condition. The three regressions now pass, as do all 38 core and 12 UI tests, runtime dependency checks, TypeScript and schema synchronization. This validates the fix in the React Native test renderer; installed-device verification remains with the user.

8 November 2026 — Version 1.1 personalization: strict TypeScript, 56 core/real SQLite tests and 20 React Native component tests pass. Android Metro/Hermes export passes. Coverage includes Today with QuickMeasurement and DateField, inline checklist persistence/partial progress, products, habits, migration 3, versioned snapshots and v1/v2 backup compatibility. No native dependencies changed. Installed-device rendering and native SQLite upgrade remain device acceptance checks.
