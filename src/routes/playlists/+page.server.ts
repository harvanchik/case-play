import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listPlaylists } from '$lib/server/db/repositories/playlists';

export const load = (async () => {
	const playlists = await listPlaylists();
	if (playlists.length === 0) throw error(404, 'No public playlists are available.');

	return {
		playlists
	};
}) satisfies PageServerLoad;
