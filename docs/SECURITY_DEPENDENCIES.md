# Dependency audit assessment — 7 November 2026

The missing test-renderer module is a test dependency resolution issue, separate from audit/deprecation output. Both it and the moved React Native Jest preset are now explicit development dependencies. npm 12 install-script approvals are pinned to the two reviewed build-package versions; the policy does not allow arbitrary scripts.

The audit examined before the npm 12 repair reported 24 dependency findings (one low, 23 moderate), caused by three underlying advisories and their dependent packages. The user's npm 12 install reported 22; counts vary with the resolved tree and audit database. This update does not claim a clean security audit.

| Root dependency | Advisory                                                          | Disposition                                                                                                               |
| --------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| glob            | GHSA-3g3m-2fjr-6pw4, traversal after cancellation                 | Patched in 14.0.2+, but current Expo/Jest packages constrain older major versions. No untested major override is applied. |
| minimatch       | GHSA-g3hv-75wg-m249, resource amplification with certain patterns | Patched in 11.0.1. Expo fingerprint retains the older API because of breaking changes. Await compatible upstream update.  |
| deepmerge       | GHSA-gcqx-w48m-w2h4, returned-object prototype poisoning          | The advisory lists no patched version. Do not downgrade the SDK to follow an automatic force-fix suggestion.              |

Expo's SDK 58 maintainer assessment says the glob/minimatch issues concern development/build tooling and do not create an app vulnerability through their Expo usage. This is an upstream assessment, not a blanket claim that all dependencies or all inputs are safe. Imported plans are parsed using the application's strict Zod schema; the app does not pass plan text to glob or minimatch.

Deprecation messages for inflight, old glob copies and whatwg-encoding come from the toolchain dependency tree. They are not missing-module errors and cannot all be removed safely by replacing direct app packages. Keep tracking compatible upstream releases and rerun checks/native QA when upgrading.

Do not run npm audit fix --force: the observed audit suggested older Expo/Jest major versions that conflict with SDK 58. Any future overrides must be narrowly justified and tested, including fingerprint/config generation, Metro bundling and coverage, not merely chosen to suppress warnings.

Sources:

- https://github.com/expo/expo/issues/52735
- https://github.com/advisories/GHSA-3g3m-2fjr-6pw4
- https://github.com/advisories/GHSA-g3hv-75wg-m249
- https://github.com/advisories/GHSA-gcqx-w48m-w2h4
