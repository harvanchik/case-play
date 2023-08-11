import { XataClient } from '../xata';
import { XATA_API_KEY } from '$env/static/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {

	const xata = new XataClient({ apiKey: XATA_API_KEY });

	const records = await xata.db['case-play']
		.select([
			'id',
			'title',
			'prompt',
			'answer',
			'edition',
			'difficulty',
			'date_created',
			'date_updated',
			'author.id',
			'author.first_name',
			'author.last_name',
			'rulebook.id',
			'rulebook.title'
		])
		.getAll();

	console.log(records);
};
