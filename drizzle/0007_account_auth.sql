CREATE TABLE IF NOT EXISTS caseplay_accounts (
	id TEXT PRIMARY KEY NOT NULL,
	email TEXT NOT NULL,
	first_name TEXT NOT NULL DEFAULT '',
	last_name TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS caseplay_accounts_email_unique ON caseplay_accounts (email);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS caseplay_accounts_email_idx ON caseplay_accounts (email);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS caseplay_account_identities (
	id TEXT PRIMARY KEY NOT NULL,
	account_id TEXT NOT NULL REFERENCES caseplay_accounts(id) ON DELETE CASCADE,
	provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
	provider_subject TEXT NOT NULL,
	provider_email TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS caseplay_account_identities_provider_subject_unique ON caseplay_account_identities (provider, provider_subject);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS caseplay_account_identities_account_idx ON caseplay_account_identities (account_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS caseplay_account_sessions (
	id TEXT PRIMARY KEY NOT NULL,
	account_id TEXT NOT NULL REFERENCES caseplay_accounts(id) ON DELETE CASCADE,
	session_hash TEXT NOT NULL,
	expires_at TEXT NOT NULL,
	created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS caseplay_account_sessions_hash_unique ON caseplay_account_sessions (session_hash);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS caseplay_account_sessions_account_idx ON caseplay_account_sessions (account_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS caseplay_account_sessions_expiry_idx ON caseplay_account_sessions (expires_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS caseplay_oauth_transactions (
	id TEXT PRIMARY KEY NOT NULL,
	provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
	account_id TEXT REFERENCES caseplay_accounts(id) ON DELETE CASCADE,
	state_hash TEXT NOT NULL,
	code_verifier TEXT NOT NULL,
	nonce TEXT NOT NULL,
	return_to TEXT NOT NULL,
	expires_at TEXT NOT NULL,
	created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS caseplay_oauth_transactions_state_unique ON caseplay_oauth_transactions (state_hash);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS caseplay_oauth_transactions_expiry_idx ON caseplay_oauth_transactions (expires_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS caseplay_oauth_transactions_account_idx ON caseplay_oauth_transactions (account_id);
--> statement-breakpoint
ALTER TABLE play_builder_diagrams ADD COLUMN owner_account_id TEXT;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS play_builder_diagrams_owner_account_id_idx ON play_builder_diagrams (owner_account_id);
