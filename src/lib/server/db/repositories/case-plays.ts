import { asc, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getDb } from '../index';
import { authors, casePlays, rulebooks, sports } from '../schema';
import type { Database } from '../connection';

export type CasePlayMutationInput = {
	title: string;
	prompt: string;
	answer: string;
	edition?: string | null;
	ruleReference?: string | null;
	pageNumber?: number | null;
	difficulty: 1 | 2 | 3;
	filmUrl?: string | null;
	authorId?: string | null;
	rulebookId?: string | null;
	sportId?: string | null;
	sourceKey?: string | null;
};

const resolveDb = (database?: Database) => database ?? getDb();

export const listCasePlays = async (database?: Database) => {
	const db = resolveDb(database);
	return db
		.select({
			id: casePlays.id,
			title: casePlays.title,
			prompt: casePlays.prompt,
			answer: casePlays.answer,
			edition: casePlays.edition,
			ruleReference: casePlays.ruleReference,
			pageNumber: casePlays.pageNumber,
			difficulty: casePlays.difficulty,
			date_created: casePlays.createdAt,
			date_updated: casePlays.updatedAt,
			film: casePlays.filmUrl
		})
		.from(casePlays)
		.orderBy(asc(casePlays.title));
};

export const listCasePlaysForAdmin = async (database?: Database) => {
	const db = resolveDb(database);
	return db
		.select({
			id: casePlays.id,
			title: casePlays.title,
			difficulty: casePlays.difficulty,
			edition: casePlays.edition,
			ruleReference: casePlays.ruleReference,
			pageNumber: casePlays.pageNumber,
			updatedAt: casePlays.updatedAt,
			sourceKey: casePlays.sourceKey,
			authorFirstName: authors.firstName,
			authorLastName: authors.lastName,
			rulebookTitle: rulebooks.title,
			sportName: sports.name
		})
		.from(casePlays)
		.leftJoin(authors, eq(casePlays.authorId, authors.id))
		.leftJoin(rulebooks, eq(casePlays.rulebookId, rulebooks.id))
		.leftJoin(sports, eq(casePlays.sportId, sports.id))
		.orderBy(desc(casePlays.updatedAt), asc(casePlays.title));
};

export const listCasePlayOptions = async (database?: Database) => {
	const db = resolveDb(database);
	return db
		.select({
			id: casePlays.id,
			title: casePlays.title,
			sourceKey: casePlays.sourceKey
		})
		.from(casePlays)
		.orderBy(asc(casePlays.title));
};

export const getCasePlayById = async (id: string, database?: Database) => {
	const db = resolveDb(database);
	const result = await db
		.select({
			id: casePlays.id,
			sourceKey: casePlays.sourceKey,
			title: casePlays.title,
			prompt: casePlays.prompt,
			answer: casePlays.answer,
			edition: casePlays.edition,
			ruleReference: casePlays.ruleReference,
			pageNumber: casePlays.pageNumber,
			difficulty: casePlays.difficulty,
			film: casePlays.filmUrl,
			filmUrl: casePlays.filmUrl,
			authorId: casePlays.authorId,
			rulebookId: casePlays.rulebookId,
			sportId: casePlays.sportId,
			createdAt: casePlays.createdAt,
			updatedAt: casePlays.updatedAt,
			author: {
				id: authors.id,
				first_name: authors.firstName,
				last_name: authors.lastName
			},
			rulebook: {
				id: rulebooks.id,
				title: rulebooks.title,
				slug: rulebooks.slug,
				nickname: rulebooks.nickname
			},
			sport: {
				id: sports.id,
				name: sports.name,
				slug: sports.slug
			}
		})
		.from(casePlays)
		.leftJoin(authors, eq(casePlays.authorId, authors.id))
		.leftJoin(rulebooks, eq(casePlays.rulebookId, rulebooks.id))
		.leftJoin(sports, eq(casePlays.sportId, sports.id))
		.where(eq(casePlays.id, id))
		.limit(1);

	return result[0] ?? null;
};

export const createCasePlay = async (input: CasePlayMutationInput, database?: Database) => {
	const db = resolveDb(database);
	const timestamp = new Date().toISOString();
	const id = randomUUID();

	await db.insert(casePlays).values({
		id,
		sourceKey: input.sourceKey?.trim() || null,
		title: input.title.trim(),
		prompt: input.prompt.trim(),
		answer: input.answer.trim(),
		edition: input.edition?.trim() || null,
		ruleReference: input.ruleReference?.trim() || null,
		pageNumber: input.pageNumber ?? null,
		difficulty: input.difficulty,
		filmUrl: input.filmUrl?.trim() || null,
		authorId: input.authorId || null,
		rulebookId: input.rulebookId || null,
		sportId: input.sportId || null,
		createdAt: timestamp,
		updatedAt: timestamp
	});

	return id;
};

export const updateCasePlay = async (id: string, input: CasePlayMutationInput, database?: Database) => {
	const db = resolveDb(database);

	await db
		.update(casePlays)
		.set({
			sourceKey: input.sourceKey?.trim() || null,
			title: input.title.trim(),
			prompt: input.prompt.trim(),
			answer: input.answer.trim(),
			edition: input.edition?.trim() || null,
			ruleReference: input.ruleReference?.trim() || null,
			pageNumber: input.pageNumber ?? null,
			difficulty: input.difficulty,
			filmUrl: input.filmUrl?.trim() || null,
			authorId: input.authorId || null,
			rulebookId: input.rulebookId || null,
			sportId: input.sportId || null,
			updatedAt: new Date().toISOString()
		})
		.where(eq(casePlays.id, id));
};

export const deleteCasePlay = async (id: string, database?: Database) => {
	const db = resolveDb(database);
	await db.delete(casePlays).where(eq(casePlays.id, id));
};
