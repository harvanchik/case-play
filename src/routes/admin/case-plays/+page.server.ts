import type { PageServerLoad } from './$types';
import { listCasePlaysForAdmin } from '$lib/server/db/repositories/case-plays';

export const load = (async () => {
	return {
		casePlays: await listCasePlaysForAdmin()
	};
}) satisfies PageServerLoad;
