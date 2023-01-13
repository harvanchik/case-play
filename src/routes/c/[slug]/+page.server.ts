import { casePlays } from '$db/case-play';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async function ({ params }) {
	// get case play from db
	const data = await casePlays.findOne({ id: params.slug });
	console.log(data);
	return {
		casePlay: JSON.parse(JSON.stringify(data))
	};
};
