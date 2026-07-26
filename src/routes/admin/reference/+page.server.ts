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
import { FormInputError, readOptionalText, readRequiredText } from '$lib/server/forms';

const handleConstraintError = (error: unknown) => {
	if (error instanceof FormInputError) return fail(400, { error: error.message });
	console.error('Failed to save reference data.', error instanceof Error ? { name: error.name, message: error.message } : undefined);
	return fail(500, {
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
				id: readOptionalText(formData, 'id', 128) || undefined,
				firstName: readRequiredText(formData, 'firstName', 100),
				lastName: readRequiredText(formData, 'lastName', 100)
			});
		} catch (error) {
			return handleConstraintError(error);
		}

		throw redirect(303, '/admin/reference');
	},
	deleteAuthor: async ({ request }) => {
		const formData = await request.formData();
		const id = readRequiredText(formData, 'id', 128);
		await deleteAuthor(id);
		throw redirect(303, '/admin/reference');
	},
	saveRulebook: async ({ request }) => {
		const formData = await request.formData();

		try {
			await upsertRulebook({
				id: readOptionalText(formData, 'id', 128) || undefined,
				title: readRequiredText(formData, 'title', 160),
				slug: readOptionalText(formData, 'slug', 160),
				nickname: readOptionalText(formData, 'nickname', 160)
			});
		} catch (error) {
			return handleConstraintError(error);
		}

		throw redirect(303, '/admin/reference');
	},
	deleteRulebook: async ({ request }) => {
		const formData = await request.formData();
		const id = readRequiredText(formData, 'id', 128);
		await deleteRulebook(id);
		throw redirect(303, '/admin/reference');
	},
	saveSport: async ({ request }) => {
		const formData = await request.formData();

		try {
			await upsertSport({
				id: readOptionalText(formData, 'id', 128) || undefined,
				name: readRequiredText(formData, 'name', 100),
				slug: readOptionalText(formData, 'slug', 160)
			});
		} catch (error) {
			return handleConstraintError(error);
		}

		throw redirect(303, '/admin/reference');
	},
	deleteSport: async ({ request }) => {
		const formData = await request.formData();
		const id = readRequiredText(formData, 'id', 128);
		await deleteSport(id);
		throw redirect(303, '/admin/reference');
	}
} satisfies Actions;
