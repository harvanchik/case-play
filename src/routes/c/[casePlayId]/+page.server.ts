import type { PageServerLoad } from './$types';
import { xata } from '$lib/xata';

export const load = (async (url) => {
	// get url of page
	const id = url.params.casePlayId;
	// get case play by id
	const casePlay = await xata.db['case_play'].select(['*', 'author.*', 'rulebook.*']).filter({ id: id }).getFirst();
	console.log(casePlay);
	// return case play
	return { casePlay };
}) satisfies PageServerLoad;
