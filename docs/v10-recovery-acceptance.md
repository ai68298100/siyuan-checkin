# 10.0 data safety and recovery acceptance

The automated 10.0 foundation is complete as of 2026-09-12. Real SiYuan desktop and mobile confirmation remains tracked separately as T-023.

| Acceptance area | Implementation | Evidence |
| --- | --- | --- |
| Old store migration | normalized source/target version report and repair warnings | `tests/backup.test.cjs`, `tests/model.test.cjs` |
| Preflight and destructive-change review | shared report, assessment, and consistency validation | `preflightJsonRecovery`, `validateJsonMigrationReport` |
| Failure rollback | primary-store failure restores memory; audit failure cannot reverse success | `tests/restore-audit.test.cjs` |
| Duplicate events | deterministic ID and external-reference deduplication | model merge/normalization tests |
| Concurrent writes | conflict detection, merge, tombstones, and audit | `tests/conflict.test.cjs`, model tests |
| Recovery points | three-entry versioned history with legacy compatibility | snapshot history model tests |
| Portable diagnostics | migration report, audit log, and snapshot bundle export | backup and restore-audit tests |
| Safe import | snapshot bundles update only restore-point history until explicit restore | model and settings wiring tests |

The release gate remains `pnpm run test:quality`. Package-size warnings are tracked as optimization work and are not recovery correctness failures.
