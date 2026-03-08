import type { PageServerLoad } from './$types';
import { listPlaylists } from '$lib/server/db/repositories/playlists';

export const load = (async () => {
	return {
		playlists: await listPlaylists()
	};
}) satisfies PageServerLoad;
