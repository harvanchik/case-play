CREATE TABLE IF NOT EXISTS caseplay_users (
	id TEXT PRIMARY KEY NOT NULL,
	email TEXT NOT NULL,
	password_hash TEXT NOT NULL,
	role TEXT NOT NULL DEFAULT 'user',
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	CHECK (role IN ('admin', 'user'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS caseplay_users_email_unique ON caseplay_users (email);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS caseplay_users_role_idx ON caseplay_users (role);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS caseplay_sessions (
	id TEXT PRIMARY KEY NOT NULL,
	user_id TEXT NOT NULL,
	session_hash TEXT NOT NULL,
	expires_at TEXT NOT NULL,
	created_at TEXT NOT NULL,
	FOREIGN KEY (user_id) REFERENCES caseplay_users(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS caseplay_sessions_hash_unique ON caseplay_sessions (session_hash);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS caseplay_sessions_user_id_idx ON caseplay_sessions (user_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS authors (
	id TEXT PRIMARY KEY NOT NULL,
	first_name TEXT NOT NULL,
	last_name TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS authors_name_idx ON authors (last_name, first_name);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS rulebooks (
	id TEXT PRIMARY KEY NOT NULL,
	title TEXT NOT NULL,
	slug TEXT NOT NULL,
	nickname TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS rulebooks_slug_unique ON rulebooks (slug);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS sports (
	id TEXT PRIMARY KEY NOT NULL,
	name TEXT NOT NULL,
	slug TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS sports_slug_unique ON sports (slug);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS case_plays (
	id TEXT PRIMARY KEY NOT NULL,
	source_key TEXT,
	title TEXT NOT NULL,
	prompt TEXT NOT NULL,
	answer TEXT NOT NULL,
	edition TEXT,
	difficulty INTEGER NOT NULL,
	film_url TEXT,
	author_id TEXT,
	rulebook_id TEXT,
	sport_id TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL,
	FOREIGN KEY (rulebook_id) REFERENCES rulebooks(id) ON DELETE SET NULL,
	FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE SET NULL,
	CHECK (difficulty IN (1, 2, 3))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS case_plays_source_key_unique ON case_plays (source_key);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS case_plays_title_idx ON case_plays (title);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS case_plays_author_id_idx ON case_plays (author_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS case_plays_rulebook_id_idx ON case_plays (rulebook_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS case_plays_sport_id_idx ON case_plays (sport_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS playlists (
	id TEXT PRIMARY KEY NOT NULL,
	source_key TEXT,
	title TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS playlists_source_key_unique ON playlists (source_key);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS playlist_case_plays (
	playlist_id TEXT NOT NULL,
	case_play_id TEXT NOT NULL,
	position INTEGER NOT NULL,
	created_at TEXT NOT NULL,
	PRIMARY KEY (playlist_id, case_play_id),
	FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
	FOREIGN KEY (case_play_id) REFERENCES case_plays(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS playlist_case_plays_playlist_position_idx ON playlist_case_plays (playlist_id, position);
