# Architecture baselines

These files are migration debt registers, not permanent permissions.

**DO NOT ADD ENTRIES MANUALLY** unless an explicit architecture decision
approves the exception. New violations must normally be fixed. Existing
entries may disappear without updating the baseline; once the actual set is
empty, delete the baseline and replace the ratchet with an absolute rule.

`app-db-imports.json` records exact `(source file, import target)` edges from
`src/app` to the legacy `src/lib/db` surface. It intentionally includes DB
queries and persistence types in addition to direct Drizzle imports.
