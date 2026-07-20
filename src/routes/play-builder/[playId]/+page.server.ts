import { error } from '@sveltejs/kit';
import { getPlayBuilderDiagram } from '$lib/server/db/repositories/play-builder-diagrams';
import { parseStoredPlayBuilderDocument } from '$lib/server/play-builder-scenes';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	if (!/^[A-Za-z0-9_-]{12}$/.test(params.playId)) throw error(404, 'Saved play not found.');
	const saved = await getPlayBuilderDiagram(params.playId);
	if (!saved) throw error(404, 'Saved play not found.');
	const storedDocument = parseStoredPlayBuilderDocument(saved.documentJson);
	const requestedPlayNumber = Number(url.searchParams.get('play'));
	const requestedPlayIndex = Number.isInteger(requestedPlayNumber) ? requestedPlayNumber - 1 : -1;
	const activePlayIndex = requestedPlayIndex >= 0 && requestedPlayIndex < storedDocument.p.length ? requestedPlayIndex : storedDocument.a;
	const initialDocument = { ...storedDocument, a: activePlayIndex };
	const activePlayName = initialDocument.p[initialDocument.a]?.[0]?.trim() || 'Shared Play';
	return {
		playId: saved.id,
		initialDocument,
		activePlayName,
		activePlayNumber: activePlayIndex + 1,
		playCount: initialDocument.p.length,
		updatedAt: saved.updatedAt
	};
};
