import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteCasePlay, getCasePlayById, updateCasePlay } from '$lib/server/db/repositories/case-plays';
import { listReferenceData } from '$lib/server/db/repositories/reference-data';
import {
	readDifficulty,
	readOptionalHttpsUrl,
	readOptionalId,
	readOptionalPositiveInteger,
	readOptionalText,
	readRequiredText,
	FormInputError
} from '$lib/server/forms';

const getCasePlayInput = (formData: FormData) => ({
	title: readRequiredText(formData, 'title', 160),
	prompt: readRequiredText(formData, 'prompt'),
	answer: readRequiredText(formData, 'answer'),
	edition: readOptionalText(formData, 'edition', 64),
	ruleReference: readOptionalText(formData, 'ruleReference', 32),
	pageNumber: readOptionalPositiveInteger(formData, 'pageNumber'),
	difficulty: readDifficulty(formData),
	filmUrl: readOptionalHttpsUrl(formData, 'filmUrl'),
	authorId: readOptionalId(formData, 'authorId'),
	rulebookId: readOptionalId(formData, 'rulebookId'),
	sportId: readOptionalId(formData, 'sportId'),
	sourceKey: readOptionalText(formData, 'sourceKey', 160),
	isHidden: formData.get('isHidden') === 'on'
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
		} catch (error) {
			if (error instanceof FormInputError) return fail(400, { error: error.message });
			console.error(`Failed to update case play ${params.id}.`, error instanceof Error ? { name: error.name, message: error.message } : undefined);
			return fail(500, { error: 'Unable to save the case play. Please try again.' });
		}

		throw redirect(303, `/admin/case-plays/${params.id}`);
	},
	delete: async ({ params }) => {
		await deleteCasePlay(params.id);
		throw redirect(303, '/admin/case-plays');
	}
} satisfies Actions;
