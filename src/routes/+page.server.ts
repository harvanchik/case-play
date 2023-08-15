import type { Actions, PageServerLoad } from './$types';
import { xata } from '$lib/xata';

export const load = (async () => {
	const page = await xata.db.case_play.getPaginated({
		pagination: {
			size: 10
		}
	});
	return { records: page.records };
}) satisfies PageServerLoad;

export const actions = {
	// search query for case plays from case_play table
	search: async ({ request }) => {
		// get form data from request
		const formData = await request.formData();
		// print data from request
		const query: string = formData.get('query')?.toString() || '';
		// search query by table
		const result = await xata.search.byTable(query, {
			tables: [
				{
					table: 'case_play',
					target: [
						{ column: 'title', weight: 3 },
						{ column: 'prompt', weight: 2 },
						{ column: 'answer' },
						{ column: 'author', weight: 1 },
						{ column: 'rulebook' },
						{ column: 'edition' }
					]
				},
				{
					table: 'user',
					target: [
						{ column: 'first_name', weight: 1 },
						{ column: 'last_name', weight: 2 }
					]
				},
				{
					table: 'rulebook',
					target: [{ column: 'title' }, { column: 'slug' }]
				}
			],
			fuzziness: 1,
			prefix: 'phrase'
		});
		// return all queried records from case_play table
		return { casePlays: result.case_play };
	}
} satisfies Actions;
