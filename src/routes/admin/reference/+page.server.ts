import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	deleteAuthor,
	deleteRulebook,
	deleteSport,
	listReferenceData,
	upsertAuthor,
	upsertRulebook,
	upsertSport
} from '$lib/server/db/repositories/reference-data';
import { readOptionalText, readRequiredText } from '$lib/server/forms';

const handleConstraintError = (error: unknown) => {
	if (error instanceof Error) {
		return fail(400, {
			error: error.message
		});
	}

	return fail(400, {
		error: 'Unable to save the record.'
	});
};

export const load = (async () => {
	return {
		references: await listReferenceData()
	};
}) satisfies PageServerLoad;

export const actions = {
	saveAuthor: async ({ request }) => {
		const formData = await request.formData();

		try {
			await upsertAuthor({
				id: readOptionalText(formData, 'id') || undefined,
				firstName: readRequiredText(formData, 'firstName'),
				lastName: readRequiredText(formData, 'lastName')
			});
		} catch (error) {
			return handleConstraintError(error);
		}

		throw redirect(303, '/admin/reference');
	},
	deleteAuthor: async ({ request }) => {
		const formData = await request.formData();
		const id = readRequiredText(formData, 'id');
		await deleteAuthor(id);
		throw redirect(303, '/admin/reference');
	},
	saveRulebook: async ({ request }) => {
		const formData = await request.formData();

		try {
			await upsertRulebook({
				id: readOptionalText(formData, 'id') || undefined,
				title: readRequiredText(formData, 'title'),
				slug: readOptionalText(formData, 'slug'),
				nickname: readOptionalText(formData, 'nickname')
			});
		} catch (error) {
			return handleConstraintError(error);
		}

		throw redirect(303, '/admin/reference');
	},
	deleteRulebook: async ({ request }) => {
		const formData = await request.formData();
		const id = readRequiredText(formData, 'id');
		await deleteRulebook(id);
		throw redirect(303, '/admin/reference');
	},
	saveSport: async ({ request }) => {
		const formData = await request.formData();

		try {
			await upsertSport({
				id: readOptionalText(formData, 'id') || undefined,
				name: readRequiredText(formData, 'name'),
				slug: readOptionalText(formData, 'slug')
			});
		} catch (error) {
			return handleConstraintError(error);
		}

		throw redirect(303, '/admin/reference');
	},
	deleteSport: async ({ request }) => {
		const formData = await request.formData();
		const id = readRequiredText(formData, 'id');
		await deleteSport(id);
		throw redirect(303, '/admin/reference');
	}
} satisfies Actions;
