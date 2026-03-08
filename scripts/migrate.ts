import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../src/lib/server/db/connection';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const migrationDirectory = path.join(projectRoot, 'drizzle');

const databaseUrl = process.env.TURSO_DATABASE_URL;

if (!databaseUrl) {
	throw new Error('Missing TURSO_DATABASE_URL.');
}

const { client } = createDatabase({
	url: databaseUrl,
	authToken: process.env.TURSO_AUTH_TOKEN
});

await client.execute(`
	CREATE TABLE IF NOT EXISTS __caseplay_migrations (
		id TEXT PRIMARY KEY NOT NULL,
		name TEXT NOT NULL UNIQUE,
		applied_at TEXT NOT NULL
	)
`);

const appliedResult = await client.execute('SELECT name FROM __caseplay_migrations ORDER BY name');
const applied = new Set(appliedResult.rows.map((row) => String(row.name)));
const migrationFiles = (await readdir(migrationDirectory))
	.filter((file) => file.endsWith('.sql'))
	.sort((left, right) => left.localeCompare(right));

for (const migrationFile of migrationFiles) {
	if (applied.has(migrationFile)) {
		continue;
	}

	const migrationPath = path.join(migrationDirectory, migrationFile);
	const source = await readFile(migrationPath, 'utf8');
	const statements = source
		.split('--> statement-breakpoint')
		.map((statement) => statement.trim())
		.filter(Boolean);

	for (const statement of statements) {
		await client.execute(statement);
	}

	await client.execute({
		sql: 'INSERT INTO __caseplay_migrations (id, name, applied_at) VALUES (?, ?, ?)',
		args: [randomUUID(), migrationFile, new Date().toISOString()]
	});

	console.log(`Applied migration ${migrationFile}`);
}

await client.close();
