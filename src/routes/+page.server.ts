import type { PageServerLoad } from './$types';
import { xata } from '$lib/xata';

/**
 * Get all records from the case_play table.
 */
export const _getAll = async () => {
	const records = await xata.db.case_play
		.select(['title', 'prompt', 'answer', 'edition', 'difficulty', 'date_created', 'date_updated', 'film'])
		.getAll();

	return { casePlays: records };
};

export const load = (async () => {
	const result = await _getAll();
	return result;
}) satisfies PageServerLoad;
