import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getCasePlayById } from '$lib/server/db/repositories/case-plays';

export const load = (async (url) => {
	const id = url.params.casePlayId;
	const casePlay = await getCasePlayById(id);

	if (!casePlay) {
		throw error(404, 'Case play not found');
	}

	return { casePlay };
}) satisfies PageServerLoad;
