import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getPublicCasePlayById, listPublicCasePlaySummaries } from '$lib/server/db/repositories/case-plays';
import { rankSimilarCasePlays } from '$lib/server/case-play-similarity';

export const load = (async ({ params, url, setHeaders }) => {
	const id = params.casePlayId;
	const [casePlay, casePlays] = await Promise.all([getPublicCasePlayById(id), listPublicCasePlaySummaries()]);

	if (!casePlay) {
		throw error(404, 'Case play not found');
	}

	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
	});

	return {
		casePlay,
		similarCasePlays: rankSimilarCasePlays(casePlay, casePlays, 5),
		backHref: `/${url.search}`,
		detailQuery: url.search
	};
}) satisfies PageServerLoad;
