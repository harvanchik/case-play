ALTER TABLE case_plays ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS case_plays_is_hidden_idx ON case_plays (is_hidden);
--> statement-breakpoint
UPDATE case_plays
SET is_hidden = 1
WHERE author_id IN (
	SELECT id
	FROM authors
	WHERE lower(trim(first_name || ' ' || last_name)) = 'nirsa'
);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS case_plays_hide_nirsa_after_insert
AFTER INSERT ON case_plays
WHEN EXISTS (
	SELECT 1
	FROM authors
	WHERE id = NEW.author_id
		AND lower(trim(first_name || ' ' || last_name)) = 'nirsa'
)
BEGIN
	UPDATE case_plays SET is_hidden = 1 WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS case_plays_hide_nirsa_after_update
AFTER UPDATE OF author_id, is_hidden ON case_plays
WHEN NEW.is_hidden = 0
	AND EXISTS (
		SELECT 1
		FROM authors
		WHERE id = NEW.author_id
			AND lower(trim(first_name || ' ' || last_name)) = 'nirsa'
	)
BEGIN
	UPDATE case_plays SET is_hidden = 1 WHERE id = NEW.id;
END;
