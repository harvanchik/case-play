import { and, eq } from 'drizzle-orm';
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
		.select({ id: playBuilderDiagrams.id, documentJson: playBuilderDiagrams.documentJson, updatedAt: playBuilderDiagrams.updatedAt })
		.from(playBuilderDiagrams)
		.where(eq(playBuilderDiagrams.id, id))
		.limit(1);
	return result[0] ?? null;
};

export const createPlayBuilderDiagram = async (documentJson: string, database?: Database) => {
	const db = resolveDb(database);
	const timestamp = new Date().toISOString();
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const id = randomBytes(9).toString('base64url');
		const editToken = randomBytes(32).toString('base64url');
		try {
			await db
				.insert(playBuilderDiagrams)
				.values({ id, documentJson, editTokenHash: hashToken(editToken), createdAt: timestamp, updatedAt: timestamp });
			return { id, editToken };
		} catch (error) {
			if (!isIdCollision(error) || attempt === 3) throw error;
		}
	}
	throw new Error('Unable to allocate a play builder ID.');
};

export const updatePlayBuilderDiagram = async (id: string, editToken: string, documentJson: string, database?: Database) => {
	const updated = await resolveDb(database)
		.update(playBuilderDiagrams)
		.set({ documentJson, updatedAt: new Date().toISOString() })
		.where(and(eq(playBuilderDiagrams.id, id), eq(playBuilderDiagrams.editTokenHash, hashToken(editToken))))
		.returning({ id: playBuilderDiagrams.id });
	return updated.length === 1;
};
