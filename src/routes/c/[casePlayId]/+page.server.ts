import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getPublicCasePlayById, listCasePlays } from '$lib/server/db/repositories/case-plays';
import { rankSimilarCasePlays } from '$lib/server/case-play-similarity';

export const load = (async ({ params, url }) => {
	const id = params.casePlayId;
	const [casePlay, casePlays] = await Promise.all([getPublicCasePlayById(id), listCasePlays()]);

	if (!casePlay) {
		throw error(404, 'Case play not found');
	}

	return {
		casePlay,
		similarCasePlays: rankSimilarCasePlays(casePlay, casePlays, 5),
		backHref: `/${url.search}`,
		detailQuery: url.search
	};
}) satisfies PageServerLoad;
