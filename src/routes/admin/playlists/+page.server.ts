import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listCasePlayOptions } from '$lib/server/db/repositories/case-plays';
import {
	createPlaylist,
	deletePlaylist,
	listPlaylistsForAdmin,
	savePlaylist
} from '$lib/server/db/repositories/playlists';
import { readOptionalText, readRequiredText } from '$lib/server/forms';

export const load = (async () => {
	return {
		playlists: await listPlaylistsForAdmin(),
		casePlayOptions: await listCasePlayOptions()
	};
}) satisfies PageServerLoad;

export const actions = {
	create: async ({ request }) => {
		const formData = await request.formData();

		try {
			await createPlaylist(readRequiredText(formData, 'title'));
			throw redirect(303, '/admin/playlists');
		} catch (error) {
			if (error instanceof Error) {
				return fail(400, { error: error.message });
			}

			throw error;
		}
	},
	save: async ({ request }) => {
		const formData = await request.formData();

		try {
			const playlistId = readRequiredText(formData, 'playlistId');
			const selectedCasePlayIds = formData.getAll('selectedCasePlayIds').map((entry) => entry.toString());
			const entries = selectedCasePlayIds
				.map((casePlayId) => ({
					casePlayId,
					position: Number(formData.get(`position:${casePlayId}`)?.toString() || '999')
				}))
				.sort((left, right) => left.position - right.position);

			await savePlaylist({
				id: playlistId,
				title: readRequiredText(formData, 'title'),
				sourceKey: readOptionalText(formData, 'sourceKey'),
				entries
			});

			throw redirect(303, '/admin/playlists');
		} catch (error) {
			if (error instanceof Error) {
				return fail(400, { error: error.message });
			}

			throw error;
		}
	},
	delete: async ({ request }) => {
		const formData = await request.formData();

		try {
			await deletePlaylist(readRequiredText(formData, 'playlistId'));
			throw redirect(303, '/admin/playlists');
		} catch (error) {
			if (error instanceof Error) {
				return fail(400, { error: error.message });
			}

			throw error;
		}
	}
} satisfies Actions;
