import { asc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getDb } from '../index';
import { authors, rulebooks, sports } from '../schema';
import type { Database } from '../connection';

const resolveDb = (database?: Database) => database ?? getDb();

export const normalizeSlug = (value: string) =>
	value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'untitled';

export const listReferenceData = async (database?: Database) => {
	const db = resolveDb(database);
	const [allAuthors, allRulebooks, allSports] = await Promise.all([
		db.select().from(authors).orderBy(asc(authors.lastName), asc(authors.firstName)),
		db.select().from(rulebooks).orderBy(asc(rulebooks.title)),
		db.select().from(sports).orderBy(asc(sports.name))
	]);

	return {
		authors: allAuthors,
		rulebooks: allRulebooks,
		sports: allSports
	};
};

export const upsertAuthor = async (
	input: {
		id?: string;
		firstName: string;
		lastName: string;
	},
	database?: Database
) => {
	const db = resolveDb(database);
	const timestamp = new Date().toISOString();

	if (input.id) {
		await db
			.update(authors)
			.set({
				firstName: input.firstName.trim(),
				lastName: input.lastName.trim(),
				updatedAt: timestamp
			})
			.where(eq(authors.id, input.id));
		return input.id;
	}

	const id = randomUUID();
	await db.insert(authors).values({
		id,
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		createdAt: timestamp,
		updatedAt: timestamp
	});
	return id;
};

export const deleteAuthor = async (id: string, database?: Database) => {
	const db = resolveDb(database);
	await db.delete(authors).where(eq(authors.id, id));
};

export const upsertRulebook = async (
	input: {
		id?: string;
		title: string;
		slug?: string | null;
		nickname?: string | null;
	},
	database?: Database
) => {
	const db = resolveDb(database);
	const timestamp = new Date().toISOString();
	const slug = normalizeSlug(input.slug || input.title);

	if (input.id) {
		await db
			.update(rulebooks)
			.set({
				title: input.title.trim(),
				slug,
				nickname: input.nickname?.trim() || null,
				updatedAt: timestamp
			})
			.where(eq(rulebooks.id, input.id));
		return input.id;
	}

	const id = randomUUID();
	await db.insert(rulebooks).values({
		id,
		title: input.title.trim(),
		slug,
		nickname: input.nickname?.trim() || null,
		createdAt: timestamp,
		updatedAt: timestamp
	});
	return id;
};

export const deleteRulebook = async (id: string, database?: Database) => {
	const db = resolveDb(database);
	await db.delete(rulebooks).where(eq(rulebooks.id, id));
};

export const upsertSport = async (
	input: {
		id?: string;
		name: string;
		slug?: string | null;
	},
	database?: Database
) => {
	const db = resolveDb(database);
	const timestamp = new Date().toISOString();
	const slug = normalizeSlug(input.slug || input.name);

	if (input.id) {
		await db
			.update(sports)
			.set({
				name: input.name.trim(),
				slug,
				updatedAt: timestamp
			})
			.where(eq(sports.id, input.id));
		return input.id;
	}

	const id = randomUUID();
	await db.insert(sports).values({
		id,
		name: input.name.trim(),
		slug,
		createdAt: timestamp,
		updatedAt: timestamp
	});
	return id;
};

export const deleteSport = async (id: string, database?: Database) => {
	const db = resolveDb(database);
	await db.delete(sports).where(eq(sports.id, id));
};
