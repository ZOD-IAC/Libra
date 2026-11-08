# Contributing

Use Node 26.13 LTS and `npm ci`. Work on a branch. Before requesting review run `npm run check` and `npm run bundle:android`.

Keep domain logic platform independent. Add real behavioral tests for recurrence, persistence or analytics changes; use the SQLite adapter to test migrations/transactions. Keep screens compositional and common to all configurations. Do not add a backend, telemetry, mandatory account or paid dependency.

Configuration changes originate in `src/domain/schema.ts`. Run `npm run schema` and commit the regenerated JSON Schema and prompt templates together. Preserve stable entity IDs in examples. New incompatible configuration or backup formats require explicit versioning/migration, not silent acceptance.

`android/` and `ios/` are generated. Implement repeatable Android customizations as config plugins. Never commit keystores, secrets or personal user exports. MIT is the project license. No binary release should be described as tested until the device checklist has actually been completed.
