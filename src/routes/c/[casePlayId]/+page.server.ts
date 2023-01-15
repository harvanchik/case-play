import { casePlaysCol } from '$db/case-play';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// get case play from case plays collection
	const data = await casePlaysCol.findOne({ id: params.casePlayId });
	// return case play as json
	return { casePlay: JSON.parse(JSON.stringify(data)) };
};
