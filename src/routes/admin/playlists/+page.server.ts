import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listCasePlayOptions } from '$lib/server/db/repositories/case-plays';
import { createPlaylist, deletePlaylist, listPlaylistsForAdmin, savePlaylist } from '$lib/server/db/repositories/playlists';
import { FormInputError, readOptionalText, readRequiredText } from '$lib/server/forms';

const handleSaveError = (operation: string, error: unknown) => {
	if (error instanceof FormInputError) return fail(400, { error: error.message });
	console.error(operation, error instanceof Error ? { name: error.name, message: error.message } : undefined);
	return fail(500, { error: 'Unable to save the playlist. Please try again.' });
};

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
			await createPlaylist(readRequiredText(formData, 'title', 160));
		} catch (error) {
			return handleSaveError('Failed to create playlist.', error);
		}

		throw redirect(303, '/admin/playlists');
	},
	save: async ({ request }) => {
		const formData = await request.formData();

		try {
			const playlistId = readRequiredText(formData, 'playlistId', 128);
			const selectedCasePlayIds = formData.getAll('selectedCasePlayIds').map((entry) => entry.toString());
			if (selectedCasePlayIds.length > 1_000) throw new FormInputError('A playlist cannot contain more than 1,000 case plays.');
			const entries = selectedCasePlayIds
				.map((casePlayId) => {
					const normalizedId = casePlayId.trim();
					if (!normalizedId || normalizedId.length > 128) throw new FormInputError('A selected case play ID is invalid.');
					const position = Number(formData.get(`position:${casePlayId}`)?.toString() || '999');
					if (!Number.isInteger(position) || position < 0 || position > 100_000)
						throw new FormInputError('Playlist positions must be whole numbers.');
					return { casePlayId: normalizedId, position };
				})
				.sort((left, right) => left.position - right.position);

			await savePlaylist({
				id: playlistId,
				title: readRequiredText(formData, 'title', 160),
				sourceKey: readOptionalText(formData, 'sourceKey', 160),
				entries
			});
		} catch (error) {
			return handleSaveError('Failed to update playlist.', error);
		}

		throw redirect(303, '/admin/playlists');
	},
	delete: async ({ request }) => {
		const formData = await request.formData();

		try {
			await deletePlaylist(readRequiredText(formData, 'playlistId', 128));
		} catch (error) {
			if (error instanceof FormInputError) return fail(400, { error: error.message });
			console.error('Failed to delete playlist.', error instanceof Error ? { name: error.name, message: error.message } : undefined);
			return fail(500, { error: 'Unable to delete the playlist. Please try again.' });
		}

		throw redirect(303, '/admin/playlists');
	}
} satisfies Actions;
