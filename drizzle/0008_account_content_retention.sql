ALTER TABLE case_plays ADD COLUMN owner_account_id TEXT;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS case_plays_owner_account_id_idx ON case_plays (owner_account_id);
