import type { PageServerLoad } from './$types';
import { xata } from '$lib/xata';
import type { SearchXataRecord, SelectedPick } from '@xata.io/client';
import type { PlaylistRecord } from '../../xata';

// playlists
let playlists: SearchXataRecord<SelectedPick<PlaylistRecord, ['*']>>[] | undefined;
let isQuerying = false;

export const load = (async () => {
	// get all playlists
	(await _getPlaylists()).playlists;
	// return data
	return { playlists, isQuerying };
}) satisfies PageServerLoad;

/**
 * Get all playlists from the playlist table in the case play database.
 * @returns all playlists
 */
export const _getPlaylists = async () => {
	// search query by table
	const playlists = await xata.db.playlist.select(['case_plays', 'title']).getAll();
	const playlistsWithCasePlays = await xata.db.playlist.getPaginated({
		columns: ['*', 'case_plays.*']
	});
	console.log(playlistsWithCasePlays);
	console.log(playlists);
	// return all queried records from case_play table
	return { playlists };
};
