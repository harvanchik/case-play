import type { PageServerLoad } from './$types';
import { listCasePlaysForAdmin } from '$lib/server/db/repositories/case-plays';
import { listPlaylistsForAdmin } from '$lib/server/db/repositories/playlists';
import { listReferenceData } from '$lib/server/db/repositories/reference-data';

export const load = (async () => {
	const [casePlays, playlists, referenceData] = await Promise.all([
		listCasePlaysForAdmin(),
		listPlaylistsForAdmin(),
		listReferenceData()
	]);

	return {
		stats: {
			casePlays: casePlays.length,
			playlists: playlists.length,
			authors: referenceData.authors.length,
			rulebooks: referenceData.rulebooks.length,
			sports: referenceData.sports.length
		}
	};
}) satisfies PageServerLoad;
