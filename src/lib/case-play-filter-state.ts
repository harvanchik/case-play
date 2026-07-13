const VALID_DIFFICULTIES = new Set([1, 2, 3]);

export const parseDifficultyFilter = (value: string | null) => {
	if (!value) return [];

	return [
		...new Set(
			value
				.split(',')
				.map(Number)
				.filter((difficulty) => VALID_DIFFICULTIES.has(difficulty))
		)
	].sort();
};

export const serializeDifficultyFilter = (difficulties: number[]) =>
	[...new Set(difficulties.filter((difficulty) => VALID_DIFFICULTIES.has(difficulty)))].sort().join(',');

export const updateFilterSearchParams = (current: URLSearchParams, searchTerm: string, difficulties: number[]) => {
	const params = new URLSearchParams(current);

	if (searchTerm) params.set('q', searchTerm);
	else params.delete('q');

	const difficulty = serializeDifficultyFilter(difficulties);
	if (difficulty) params.set('difficulty', difficulty);
	else params.delete('difficulty');

	return params;
};
