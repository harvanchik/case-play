import type { PageServerLoad } from './$types';
import { listPublicCasePlays } from '$lib/server/db/repositories/case-plays';
import { parseDifficultyFilter } from '$lib/case-play-filter-state';

export const load = (async ({ url, setHeaders }) => {
	const searchTerm = url.searchParams.get('q')?.trim() ?? '';
	const difficulties = parseDifficultyFilter(url.searchParams.get('difficulty'));
	const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
	const pageSize = 24;
	const requestedCurrentPage = Number.isFinite(requestedPage) ? Math.max(requestedPage, 1) : 1;
	const { items: requestedItems, total } = await listPublicCasePlays({
		searchTerm,
		difficulties,
		limit: pageSize,
		offset: (requestedCurrentPage - 1) * pageSize
	});
	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	const currentPage = Math.min(requestedCurrentPage, pageCount);
	const casePlays =
		currentPage === requestedCurrentPage
			? requestedItems
			: (await listPublicCasePlays({ searchTerm, difficulties, limit: pageSize, offset: (currentPage - 1) * pageSize })).items;

	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
	});

	return {
		casePlays,
		initialFilters: {
			searchTerm,
			difficulties
		},
		pagination: {
			currentPage,
			pageCount,
			pageSize,
			total
		}
	};
}) satisfies PageServerLoad;
