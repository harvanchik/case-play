CREATE TABLE play_builder_exports (
	id TEXT PRIMARY KEY NOT NULL,
	account_id TEXT NOT NULL REFERENCES caseplay_accounts(id) ON DELETE CASCADE,
	snapshot_json TEXT NOT NULL,
	snapshot_hash TEXT NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('queued', 'rendering', 'completed', 'failed', 'expired')),
	progress INTEGER NOT NULL DEFAULT 0,
	output_path TEXT,
	sandbox_name TEXT,
	error TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	expires_at TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX play_builder_exports_one_active ON play_builder_exports(account_id) WHERE status IN ('queued', 'rendering');
--> statement-breakpoint
CREATE INDEX play_builder_exports_account_created ON play_builder_exports(account_id, created_at);
--> statement-breakpoint
CREATE INDEX play_builder_exports_snapshot ON play_builder_exports(account_id, snapshot_hash, status);
