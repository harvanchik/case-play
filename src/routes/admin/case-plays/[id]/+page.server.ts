import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteCasePlay, getCasePlayById, updateCasePlay } from '$lib/server/db/repositories/case-plays';
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

export const load = (async ({ params }) => {
	const [casePlay, references] = await Promise.all([getCasePlayById(params.id), listReferenceData()]);

	if (!casePlay) {
		throw error(404, 'Case play not found');
	}

	return {
		casePlay,
		references
	};
}) satisfies PageServerLoad;

export const actions = {
	save: async ({ request, params }) => {
		const formData = await request.formData();

		try {
			await updateCasePlay(params.id, getCasePlayInput(formData));
			throw redirect(303, `/admin/case-plays/${params.id}`);
		} catch (error) {
			if (error instanceof Error) {
				return fail(400, {
					error: error.message
				});
			}

			throw error;
		}
	},
	delete: async ({ params }) => {
		await deleteCasePlay(params.id);
		throw redirect(303, '/admin/case-plays');
	}
} satisfies Actions;
