import { and, eq, isNull } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import type { Database } from '../connection';
import { getDb } from '../index';
import { playBuilderDiagrams } from '../schema';

const resolveDb = (database?: Database) => database ?? getDb();
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const isIdCollision = (error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	return message.includes('UNIQUE constraint failed: play_builder_diagrams.id') || message.includes('play_builder_diagrams.id is not unique');
};

export const getPlayBuilderDiagram = async (id: string, database?: Database) => {
	const result = await resolveDb(database)
		.select({
			id: playBuilderDiagrams.id,
			documentJson: playBuilderDiagrams.documentJson,
			ownerAccountId: playBuilderDiagrams.ownerAccountId,
			updatedAt: playBuilderDiagrams.updatedAt
		})
		.from(playBuilderDiagrams)
		.where(eq(playBuilderDiagrams.id, id))
		.limit(1);
	return result[0] ?? null;
};

/** Returns a diagram only when it belongs to the authenticated account. */
export const getOwnedPlayBuilderDiagram = async (id: string, ownerAccountId: string, database?: Database) => {
	const result = await resolveDb(database)
		.select({
			id: playBuilderDiagrams.id,
			documentJson: playBuilderDiagrams.documentJson,
			updatedAt: playBuilderDiagrams.updatedAt
		})
		.from(playBuilderDiagrams)
		.where(and(eq(playBuilderDiagrams.id, id), eq(playBuilderDiagrams.ownerAccountId, ownerAccountId)))
		.limit(1);
	return result[0] ?? null;
};

export const createPlayBuilderDiagram = async (documentJson: string, ownerAccountId?: string, database?: Database) => {
	const db = resolveDb(database);
	const timestamp = new Date().toISOString();
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const id = randomBytes(9).toString('base64url');
		const editToken = randomBytes(32).toString('base64url');
		try {
			await db
				.insert(playBuilderDiagrams)
				.values({
					id,
					documentJson,
					editTokenHash: hashToken(editToken),
					ownerAccountId: ownerAccountId ?? null,
					createdAt: timestamp,
					updatedAt: timestamp
				});
			return { id, editToken: ownerAccountId ? null : editToken };
		} catch (error) {
			if (!isIdCollision(error) || attempt === 3) throw error;
		}
	}
	throw new Error('Unable to allocate a play builder ID.');
};

export const updatePlayBuilderDiagram = async (
	id: string,
	documentJson: string,
	authorization: { editToken?: string | null; ownerAccountId?: string | null },
	database?: Database
) => {
	const ownership = authorization.ownerAccountId
		? eq(playBuilderDiagrams.ownerAccountId, authorization.ownerAccountId)
		: authorization.editToken
			? eq(playBuilderDiagrams.editTokenHash, hashToken(authorization.editToken))
			: undefined;
	if (!ownership) return false;
	const updated = await resolveDb(database)
		.update(playBuilderDiagrams)
		.set({ documentJson, updatedAt: new Date().toISOString() })
		.where(and(eq(playBuilderDiagrams.id, id), ownership))
		.returning({ id: playBuilderDiagrams.id });
	return updated.length === 1;
};

export const deleteOwnedPlayBuilderDiagram = async (id: string, ownerAccountId: string, database?: Database) => {
	const deleted = await resolveDb(database)
		.delete(playBuilderDiagrams)
		.where(and(eq(playBuilderDiagrams.id, id), eq(playBuilderDiagrams.ownerAccountId, ownerAccountId)))
		.returning({ id: playBuilderDiagrams.id });
	return deleted.length === 1;
};

export const claimAnonymousPlayBuilderDiagrams = async (
	ownerAccountId: string,
	plays: Array<{ id: string; editToken: string }>,
	database?: Database
) => {
	const db = resolveDb(database);
	const claimed: string[] = [];
	for (const play of plays.slice(0, 50)) {
		if (!/^[A-Za-z0-9_-]{12}$/.test(play.id) || !/^[A-Za-z0-9_-]{43}$/.test(play.editToken)) continue;
		const updated = await db
			.update(playBuilderDiagrams)
			.set({ ownerAccountId, updatedAt: new Date().toISOString() })
			.where(
				and(
					eq(playBuilderDiagrams.id, play.id),
					isNull(playBuilderDiagrams.ownerAccountId),
					eq(playBuilderDiagrams.editTokenHash, hashToken(play.editToken))
				)
			)
			.returning({ id: playBuilderDiagrams.id });
		if (updated.length === 1) claimed.push(play.id);
	}
	return claimed;
};
