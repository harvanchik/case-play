import type { PageServerLoad } from './$types';
import { listCasePlays } from '$lib/server/db/repositories/case-plays';
import { parseDifficultyFilter } from '$lib/case-play-filter-state';

export const load = (async ({ url }) => {
	return {
		casePlays: await listCasePlays(),
		initialFilters: {
			searchTerm: url.searchParams.get('q') ?? '',
			difficulties: parseDifficultyFilter(url.searchParams.get('difficulty'))
		}
	};
}) satisfies PageServerLoad;
