import type { PageServerLoad } from './$types';
import { xata } from '$lib/xata';

export const load = (async () => {
	const page = await xata.db.case_play.getPaginated({
		pagination: {
			size: 10
		}
	});

	// console.log(page);
	return { records: page.records };
}) satisfies PageServerLoad;
