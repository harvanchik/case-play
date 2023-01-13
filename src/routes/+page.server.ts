import { casePlays } from '$db/case-play';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async function () {
	const data = await casePlays.find({}).toArray();
	return {
		casePlays: JSON.parse(JSON.stringify(data))
	};
};
