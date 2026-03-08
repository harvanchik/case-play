# Legacy Xata History

This folder preserves the old Xata schema history for recovery reference after the Turso migration.

- The original migration JSON files are copied into [`docs/legacy/xata/migrations`](/Users/jh6/Documents/GitHub/case-play/docs/legacy/xata/migrations).
- They are not used by the live app anymore.
- The active database schema now lives in [`src/lib/server/db/schema.ts`](/Users/jh6/Documents/GitHub/case-play/src/lib/server/db/schema.ts) and [`drizzle/0000_initial.sql`](/Users/jh6/Documents/GitHub/case-play/drizzle/0000_initial.sql).
