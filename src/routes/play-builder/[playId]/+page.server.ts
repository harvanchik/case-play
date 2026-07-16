import { error } from '@sveltejs/kit';
import { getPlayBuilderDiagram } from '$lib/server/db/repositories/play-builder-diagrams';
import { parseStoredPlayBuilderDocument } from '$lib/server/play-builder-scenes';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	if (!/^[A-Za-z0-9_-]{12}$/.test(params.playId)) throw error(404, 'Saved play not found.');
	const saved = await getPlayBuilderDiagram(params.playId);
	if (!saved) throw error(404, 'Saved play not found.');
	return { playId: saved.id, initialDocument: parseStoredPlayBuilderDocument(saved.documentJson) };
};
