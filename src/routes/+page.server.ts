import type { PageServerLoad } from './$types';
import { listCasePlays } from '$lib/server/db/repositories/case-plays';

export const load = (async () => {
	return {
		casePlays: await listCasePlays()
	};
}) satisfies PageServerLoad;
