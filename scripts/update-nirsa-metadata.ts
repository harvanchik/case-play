import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';

type NirsaMetadata = {
	sourceKey: string;
	title: string;
	ruleReference: string;
	pageNumber: number;
	edition: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const metadataPath = path.resolve(__dirname, '../data/nirsa-flag-football-22e-metadata.json');
const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as NirsaMetadata[];

if (metadata.length !== 110) {
	throw new Error(`Expected 110 NIRSA metadata records, found ${metadata.length}.`);
}

const uniqueSourceKeys = new Set(metadata.map((entry) => entry.sourceKey));
const uniqueTitles = new Set(metadata.map((entry) => entry.title.toLocaleLowerCase()));
if (uniqueSourceKeys.size !== metadata.length || uniqueTitles.size !== metadata.length) {
	throw new Error('NIRSA metadata must contain unique source keys and titles.');
}

for (const entry of metadata) {
	if (!/^nirsa-flag-football-22e-\d{3}$/.test(entry.sourceKey)) {
		throw new Error(`Invalid source key: ${entry.sourceKey}`);
	}
	if (!/^\d+(?:-\d+){1,2}[A-Z]?$/.test(entry.ruleReference)) {
		throw new Error(`Invalid rule reference for ${entry.sourceKey}: ${entry.ruleReference}`);
	}
	if (!Number.isInteger(entry.pageNumber) || entry.pageNumber < 1) {
		throw new Error(`Invalid page number for ${entry.sourceKey}: ${entry.pageNumber}`);
	}
}

const databaseUrl = process.env.TURSO_DATABASE_URL;
if (!databaseUrl) {
	throw new Error('Missing TURSO_DATABASE_URL.');
}

const client = createClient({
	url: databaseUrl,
	authToken: process.env.TURSO_AUTH_TOKEN
});

const existing = await client.execute(`
	SELECT source_key
	FROM case_plays
	WHERE source_key LIKE 'nirsa-flag-football-22e-%'
`);
const existingSourceKeys = new Set(existing.rows.map((row) => String(row.source_key)));
const missingSourceKeys = metadata.map((entry) => entry.sourceKey).filter((sourceKey) => !existingSourceKeys.has(sourceKey));

if (existing.rows.length !== 110 || missingSourceKeys.length > 0) {
	await client.close();
	throw new Error(`Expected all 110 NIRSA case plays in the database. Missing: ${missingSourceKeys.join(', ') || 'none'}.`);
}

const updatedAt = new Date().toISOString();
const results = await client.batch(
	metadata.map((entry) => ({
		sql: `
			UPDATE case_plays
			SET title = ?, rule_reference = ?, page_number = ?, edition = ?, updated_at = ?
			WHERE source_key = ?
		`,
		args: [entry.title, entry.ruleReference, entry.pageNumber, entry.edition, updatedAt, entry.sourceKey]
	})),
	'write'
);

const rowsAffected = results.reduce((total, result) => total + result.rowsAffected, 0);
if (rowsAffected !== 110) {
	await client.close();
	throw new Error(`Expected to update 110 case plays, updated ${rowsAffected}.`);
}

const verification = await client.execute(`
	SELECT
		count(*) AS total,
		count(DISTINCT title) AS unique_titles,
		sum(CASE WHEN title LIKE 'NIRSA Rule % Case Play %' THEN 1 ELSE 0 END) AS generic_titles,
		count(rule_reference) AS rule_references,
		count(page_number) AS page_numbers,
		count(edition) AS editions,
		min(page_number) AS first_page,
		max(page_number) AS last_page
	FROM case_plays
	WHERE source_key LIKE 'nirsa-flag-football-22e-%'
`);

console.log(JSON.stringify(verification.rows[0], null, 2));
await client.close();
