CREATE TABLE IF NOT EXISTS play_builder_diagrams (
	id TEXT PRIMARY KEY NOT NULL,
	scene_json TEXT NOT NULL,
	edit_token_hash TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS play_builder_diagrams_updated_at_idx ON play_builder_diagrams (updated_at);
