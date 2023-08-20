import type { Actions, PageServerLoad } from './$types';
import { xata } from '$lib/xata';

// search phrases
const phrases = [
	'flag guarding',
	'roughing the passer',
	'touchdown',
	'fumble',
	'interception',
	'pass interference',
	'holding',
	'illegal forward pass',
	'illegal motion',
	'backward pass',
	'illegal shift',
	'illegal batting',
	'inadvertent whistle'
];
// case plays
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let casePlays: any;
let isQuerying = false;

export const load = (async ({ url }) => {
	// get search query from url query parameters
	const param = url.searchParams.get('q') || '';
	// get records from case play table (or undefined if no search query)
	// casePlays = param ? (await _search(param)).casePlays : undefined;
	// return data
	return { casePlays, phrases, searchQuery: param, isQuerying };
}) satisfies PageServerLoad;

export const actions = {
	// search query for case plays from case_play table
	search: async ({ request }) => {
		// begin query
		isQuerying = true;
		// get form data from request
		const formData = await request.formData();
		// // print data from request
		const query = formData.get('query')?.toString() || '';
		// // search query by table
		casePlays = (await _search(query)).casePlays;
		// end query
		isQuerying = false;
	}
} satisfies Actions;

/**
 * Search the case_play table for case plays given a search query.
 * @param query - the search query
 * @returns the case plays that match the search query.
 */
export const _search = async (query: string) => {
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
	console.log('searched');
	// return all queried records from case_play table
	return { casePlays: result.case_play };
};
