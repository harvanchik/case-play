import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../src/lib/server/db/connection';
import { authors, casePlays, playlistCasePlays, playlists, rulebooks, sports } from '../src/lib/server/db/schema';
import { normalizeSlug } from '../src/lib/server/db/repositories/reference-data';

type ImportAuthor = {
	firstName: string;
	lastName: string;
};

type ImportRulebook = {
	title: string;
	slug: string;
	nickname?: string | null;
};

type ImportSport = {
	name: string;
	slug: string;
};

type ImportCasePlay = {
	sourceKey: string;
	title: string;
	prompt: string;
	answer: string;
	edition?: string | null;
	ruleReference?: string | null;
	pageNumber?: number | null;
	difficulty: 1 | 2 | 3;
	filmUrl?: string | null;
	author?: ImportAuthor | null;
	rulebook?: ImportRulebook | null;
	sport?: ImportSport | null;
};

type ImportPlaylist = {
	sourceKey: string;
	title: string;
	casePlaySourceKeys: string[];
};

type ImportPayload = {
	casePlays?: ImportCasePlay[];
	playlists?: ImportPlaylist[];
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const importPathArg = process.argv[2];
const databaseUrl = process.env.TURSO_DATABASE_URL;

if (!databaseUrl) {
	throw new Error('Missing TURSO_DATABASE_URL.');
}

if (!importPathArg) {
	throw new Error('Usage: pnpm import:caseplays <path-to-import.json>');
}

const absoluteImportPath = path.isAbsolute(importPathArg) ? importPathArg : path.join(projectRoot, importPathArg);

const payload = JSON.parse(await readFile(absoluteImportPath, 'utf8')) as ImportPayload;
const { db, client } = createDatabase({
	url: databaseUrl,
	authToken: process.env.TURSO_AUTH_TOKEN
});

const now = () => new Date().toISOString();

const getOrCreateAuthorId = async (author: ImportAuthor | null | undefined) => {
	if (!author) {
		return null;
	}

	const firstName = author.firstName.trim();
	const lastName = author.lastName.trim();
	const existing = await db
		.select({ id: authors.id })
		.from(authors)
		.where(and(eq(authors.firstName, firstName), eq(authors.lastName, lastName)))
		.limit(1);

	if (existing[0]) {
		return existing[0].id;
	}

	const id = randomUUID();
	const timestamp = now();
	await db.insert(authors).values({
		id,
		firstName,
		lastName,
		createdAt: timestamp,
		updatedAt: timestamp
	});
	return id;
};

const getOrCreateRulebookId = async (rulebook: ImportRulebook | null | undefined) => {
	if (!rulebook) {
		return null;
	}

	const slug = normalizeSlug(rulebook.slug || rulebook.title);
	const existing = await db.select({ id: rulebooks.id }).from(rulebooks).where(eq(rulebooks.slug, slug)).limit(1);

	if (existing[0]) {
		await db
			.update(rulebooks)
			.set({
				title: rulebook.title.trim(),
				nickname: rulebook.nickname?.trim() || null,
				updatedAt: now()
			})
			.where(eq(rulebooks.id, existing[0].id));
		return existing[0].id;
	}

	const id = randomUUID();
	const timestamp = now();
	await db.insert(rulebooks).values({
		id,
		title: rulebook.title.trim(),
		slug,
		nickname: rulebook.nickname?.trim() || null,
		createdAt: timestamp,
		updatedAt: timestamp
	});
	return id;
};

const getOrCreateSportId = async (sport: ImportSport | null | undefined) => {
	if (!sport) {
		return null;
	}

	const slug = normalizeSlug(sport.slug || sport.name);
	const existing = await db.select({ id: sports.id }).from(sports).where(eq(sports.slug, slug)).limit(1);

	if (existing[0]) {
		await db
			.update(sports)
			.set({
				name: sport.name.trim(),
				updatedAt: now()
			})
			.where(eq(sports.id, existing[0].id));
		return existing[0].id;
	}

	const id = randomUUID();
	const timestamp = now();
	await db.insert(sports).values({
		id,
		name: sport.name.trim(),
		slug,
		createdAt: timestamp,
		updatedAt: timestamp
	});
	return id;
};

for (const entry of payload.casePlays ?? []) {
	const authorId = await getOrCreateAuthorId(entry.author);
	const rulebookId = await getOrCreateRulebookId(entry.rulebook);
	const sportId = await getOrCreateSportId(entry.sport);
	const existing = await db.select({ id: casePlays.id }).from(casePlays).where(eq(casePlays.sourceKey, entry.sourceKey)).limit(1);

	if (existing[0]) {
		await db
			.update(casePlays)
			.set({
				title: entry.title.trim(),
				prompt: entry.prompt.trim(),
				answer: entry.answer.trim(),
				edition: entry.edition?.trim() || null,
				ruleReference: entry.ruleReference?.trim() || null,
				pageNumber: entry.pageNumber ?? null,
				difficulty: entry.difficulty,
				filmUrl: entry.filmUrl?.trim() || null,
				authorId,
				rulebookId,
				sportId,
				updatedAt: now()
			})
			.where(eq(casePlays.id, existing[0].id));
		continue;
	}

	const timestamp = now();
	await db.insert(casePlays).values({
		id: randomUUID(),
		sourceKey: entry.sourceKey.trim(),
		title: entry.title.trim(),
		prompt: entry.prompt.trim(),
		answer: entry.answer.trim(),
		edition: entry.edition?.trim() || null,
		ruleReference: entry.ruleReference?.trim() || null,
		pageNumber: entry.pageNumber ?? null,
		difficulty: entry.difficulty,
		filmUrl: entry.filmUrl?.trim() || null,
		authorId,
		rulebookId,
		sportId,
		createdAt: timestamp,
		updatedAt: timestamp
	});
}

for (const playlist of payload.playlists ?? []) {
	const existingPlaylist = await db.select({ id: playlists.id }).from(playlists).where(eq(playlists.sourceKey, playlist.sourceKey)).limit(1);

	const playlistId = existingPlaylist[0]?.id ?? randomUUID();
	const timestamp = now();

	if (existingPlaylist[0]) {
		await db
			.update(playlists)
			.set({
				title: playlist.title.trim(),
				updatedAt: timestamp
			})
			.where(eq(playlists.id, playlistId));
		await db.delete(playlistCasePlays).where(eq(playlistCasePlays.playlistId, playlistId));
	} else {
		await db.insert(playlists).values({
			id: playlistId,
			sourceKey: playlist.sourceKey.trim(),
			title: playlist.title.trim(),
			createdAt: timestamp,
			updatedAt: timestamp
		});
	}

	for (const [index, sourceKey] of playlist.casePlaySourceKeys.entries()) {
		const linkedCasePlay = await db.select({ id: casePlays.id }).from(casePlays).where(eq(casePlays.sourceKey, sourceKey)).limit(1);

		if (!linkedCasePlay[0]) {
			console.warn(`Skipping missing case play sourceKey ${sourceKey} for playlist ${playlist.title}`);
			continue;
		}

		await db.insert(playlistCasePlays).values({
			playlistId,
			casePlayId: linkedCasePlay[0].id,
			position: index + 1,
			createdAt: now()
		});
	}
}

console.log('Import complete.');
await client.close();
