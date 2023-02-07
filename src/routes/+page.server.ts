import { casePlaysCol } from '$db/case-play';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// get all case plays from case plays collection
	const data = await casePlaysCol.find({}).toArray();
	// sort by dateCreated
	data.sort((a, b) => b.dateCreated - a.dateCreated);
	// return case plays as json
	return { casePlays: JSON.parse(JSON.stringify(data)) };
};
