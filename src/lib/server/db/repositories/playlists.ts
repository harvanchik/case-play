import { and, asc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getDb } from '../index';
import { casePlays, playlistCasePlays, playlists } from '../schema';
import type { Database } from '../connection';

const resolveDb = (database?: Database) => database ?? getDb();

const listPlaylistsInternal = async (includeHidden: boolean, database?: Database) => {
	const db = resolveDb(database);
	const rows = await db
		.select({
			id: playlists.id,
			title: playlists.title,
			sourceKey: playlists.sourceKey,
			updatedAt: playlists.updatedAt,
			casePlayId: casePlays.id,
			casePlayTitle: casePlays.title,
			casePlayDifficulty: casePlays.difficulty,
			position: playlistCasePlays.position
		})
		.from(playlists)
		.leftJoin(playlistCasePlays, eq(playlists.id, playlistCasePlays.playlistId))
		.leftJoin(
			casePlays,
			includeHidden
				? eq(playlistCasePlays.casePlayId, casePlays.id)
				: and(eq(playlistCasePlays.casePlayId, casePlays.id), eq(casePlays.isHidden, false))
		)
		.orderBy(asc(playlists.title), asc(playlistCasePlays.position), asc(casePlays.title));

	const grouped = new Map<
		string,
		{
			id: string;
			title: string;
			sourceKey: string | null;
			updatedAt: string;
			casePlays: { id: string; title: string; difficulty: number; position: number }[];
		}
	>();

	for (const row of rows) {
		if (!grouped.has(row.id)) {
			grouped.set(row.id, {
				id: row.id,
				title: row.title,
				sourceKey: row.sourceKey,
				updatedAt: row.updatedAt,
				casePlays: []
			});
		}

		if (row.casePlayId && row.casePlayTitle && row.position !== null) {
			grouped.get(row.id)?.casePlays.push({
				id: row.casePlayId,
				title: row.casePlayTitle,
				difficulty: row.casePlayDifficulty ?? 1,
				position: row.position
			});
		}
	}

	return [...grouped.values()];
};

export const listPlaylists = (database?: Database) => listPlaylistsInternal(false, database);

export const listPlaylistsForAdmin = (database?: Database) => listPlaylistsInternal(true, database);

export const createPlaylist = async (title: string, database?: Database) => {
	const db = resolveDb(database);
	const timestamp = new Date().toISOString();
	const id = randomUUID();

	await db.insert(playlists).values({
		id,
		title: title.trim(),
		sourceKey: null,
		createdAt: timestamp,
		updatedAt: timestamp
	});

	return id;
};

export const savePlaylist = async (
	input: {
		id: string;
		title: string;
		sourceKey?: string | null;
		entries: { casePlayId: string; position: number }[];
	},
	database?: Database
) => {
	const db = resolveDb(database);
	const timestamp = new Date().toISOString();

	await db
		.update(playlists)
		.set({
			title: input.title.trim(),
			sourceKey: input.sourceKey?.trim() || null,
			updatedAt: timestamp
		})
		.where(eq(playlists.id, input.id));

	await db.delete(playlistCasePlays).where(eq(playlistCasePlays.playlistId, input.id));

	if (input.entries.length === 0) {
		return;
	}

	await db.insert(playlistCasePlays).values(
		input.entries.map((entry) => ({
			playlistId: input.id,
			casePlayId: entry.casePlayId,
			position: entry.position,
			createdAt: timestamp
		}))
	);
};

export const deletePlaylist = async (id: string, database?: Database) => {
	const db = resolveDb(database);
	await db.delete(playlists).where(eq(playlists.id, id));
};
