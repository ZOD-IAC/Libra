# Dependency policy

The supported development runtime is Node 26.13.0 LTS, pinned in `.nvmrc` and `.node-version`; the package engine and CI use the same version. Use npm 12.2.2 (pinned in packageManager and CI), then `npm ci` to reproduce the committed lockfile.

| Package family                    | Choice                                 | Reason                                                                                                      |
| --------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Expo                              | SDK 58, currently 58.0.23              | Current stable SDK checked for this update                                                                  |
| React Native                      | 0.88.1                                 | Expo 58-supported native runtime                                                                            |
| React / React DOM                 | 19.3.0                                 | Keep the SDK-supported React and renderer versions aligned                                                  |
| jest-expo                         | 58.0.14                                | Same SDK family as the app                                                                                  |
| Jest / @types/jest                | 30                                     | SDK 58 testing toolchain                                                                                    |
| @react-native/jest-preset         | 0.88.1, explicit dev dependency        | Required by jest-expo; match React Native, never depend on a stale/transitive installation                  |
| Zod                               | 4.6.7                                  | Current major; native JSON Schema export removes zod-to-json-schema                                         |
| Native Expo modules and libraries | Expo 58 bundled compatibility versions | Some have newer independent releases; do not bypass the SDK compatibility matrix just to clear npm outdated |

Run `npx expo install --check` after changing native packages, `npm run check` after any dependency change, and `npm run bundle:android` for app changes. Regenerate schema/prompts with `npm run schema` after changing Zod or validation. A native upgrade still needs installed-Android QA.

If a fresh checkout reports the preset migration error, confirm `npm ls @react-native/jest-preset jest-expo react-native`. Reinstall using `npm ci` with the committed lockfile; do not delete the lockfile or install an unrelated preset major.

References: https://nodejs.org/en/blog/release/v26.13.0 , https://docs.expo.dev/develop/unit-testing/ , https://docs.expo.dev/versions/v58.0.0/ , https://zod.dev/json-schema .

## Native testing peers and npm 12 scripts

React Native Testing Library 14 uses `test-renderer`, not the older `react-test-renderer`. Both `test-renderer@1.3.1` and `@react-native/jest-preset@0.88.1` are explicit development dependencies. The UI test command checks that they resolve before starting Jest. Do not rely on automatic peer installation or a nested copy under jest-expo.

npm 12 blocks unapproved dependency install scripts. The package allowScripts policy permits exactly esbuild@0.28.2 and @parcel/watcher@2.6.0, the reviewed registry versions in the lockfile. New versions require review and an updated approval. Do not enable every install script globally. If repairing an older working folder, run:

```powershell
npm install --save-dev --save-exact test-renderer@1.3.1
npm install-scripts approve esbuild @parcel/watcher
npm rebuild esbuild @parcel/watcher
npm run check
```

The corrected source was checked after a clean npm 12.2.2 installation on Linux with Node 26.13.0. Windows runtime/native builds remain unverified here. See SECURITY_DEPENDENCIES.md for remaining upstream audit findings.

## Router runtime dependencies

The official Router setup requires expo-linking and expo-constants alongside screens, safe-area-context and status-bar. They and @expo/metro-runtime are now declared directly. check:runtime verifies both declaration and resolution, preventing auto-installed peers from hiding missing app dependencies. Adding a previously absent native Expo module requires an incremental Android rebuild; restarting Metro alone may leave the installed APK without its native module.
