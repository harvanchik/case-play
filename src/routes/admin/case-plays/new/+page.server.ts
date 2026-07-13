import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createCasePlay } from '$lib/server/db/repositories/case-plays';
import { listReferenceData } from '$lib/server/db/repositories/reference-data';
import { readDifficulty, readOptionalId, readOptionalPositiveInteger, readOptionalText, readRequiredText } from '$lib/server/forms';

const getCasePlayInput = (formData: FormData) => ({
	title: readRequiredText(formData, 'title'),
	prompt: readRequiredText(formData, 'prompt'),
	answer: readRequiredText(formData, 'answer'),
	edition: readOptionalText(formData, 'edition'),
	ruleReference: readOptionalText(formData, 'ruleReference'),
	pageNumber: readOptionalPositiveInteger(formData, 'pageNumber'),
	difficulty: readDifficulty(formData),
	filmUrl: readOptionalText(formData, 'filmUrl'),
	authorId: readOptionalId(formData, 'authorId'),
	rulebookId: readOptionalId(formData, 'rulebookId'),
	sportId: readOptionalId(formData, 'sportId'),
	sourceKey: readOptionalText(formData, 'sourceKey')
});

export const load = (async () => {
	return {
		references: await listReferenceData()
	};
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();

		try {
			const id = await createCasePlay(getCasePlayInput(formData));
			throw redirect(303, `/admin/case-plays/${id}`);
		} catch (error) {
			if (error instanceof Error) {
				return fail(400, {
					error: error.message
				});
			}

			throw error;
		}
	}
} satisfies Actions;
