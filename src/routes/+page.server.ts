import type { PageServerLoad } from './$types';
import { listCasePlays } from '$lib/server/db/repositories/case-plays';
import { parseDifficultyFilter } from '$lib/case-play-filter-state';

export const load = (async ({ url }) => {
	const searchTerm = url.searchParams.get('q')?.trim() ?? '';
	const difficulties = parseDifficultyFilter(url.searchParams.get('difficulty'));
	const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
	const pageSize = 24;
	const allCasePlays = await listCasePlays();
	const normalizedSearch = searchTerm.toLocaleLowerCase();
	const filteredCasePlays = allCasePlays.filter((play) => {
		const matchesDifficulty = difficulties.length === 0 || difficulties.includes(play.difficulty);
		if (!matchesDifficulty) return false;
		if (!normalizedSearch) return true;
		const difficultyLabel = play.difficulty === 1 ? 'easy' : play.difficulty === 2 ? 'moderate' : 'hard';
		return [play.title, play.prompt, play.answer, play.ruleReference, play.edition, difficultyLabel]
			.filter(Boolean)
			.some((value) => String(value).toLocaleLowerCase().includes(normalizedSearch));
	});
	const pageCount = Math.max(1, Math.ceil(filteredCasePlays.length / pageSize));
	const currentPage = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), pageCount) : 1;
	const offset = (currentPage - 1) * pageSize;

	return {
		casePlays: filteredCasePlays.slice(offset, offset + pageSize),
		initialFilters: {
			searchTerm,
			difficulties
		},
		pagination: {
			currentPage,
			pageCount,
			pageSize,
			total: filteredCasePlays.length
		}
	};
}) satisfies PageServerLoad;
