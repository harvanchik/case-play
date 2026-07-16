import { json } from '@sveltejs/kit';
import { updatePlayBuilderDiagram } from '$lib/server/db/repositories/play-builder-diagrams';
import { serializeValidatedPlayBuilderDocument } from '$lib/server/play-builder-scenes';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request }) => {
	if (!/^[A-Za-z0-9_-]{12}$/.test(params.playId)) return json({ message: 'Invalid play ID.' }, { status: 404 });
	let body: { document?: unknown; editToken?: unknown };
	try {
		body = (await request.json()) as { document?: unknown; editToken?: unknown };
	} catch {
		return json({ message: 'Invalid JSON request.' }, { status: 400 });
	}
	if (typeof body.editToken !== 'string' || body.editToken.length < 40)
		return json({ message: 'This shared play must be saved as a new copy.' }, { status: 403 });

	let documentJson: string;
	try {
		documentJson = serializeValidatedPlayBuilderDocument(body.document);
	} catch (error) {
		return json({ message: error instanceof Error ? error.message : 'Invalid play builder collection.' }, { status: 400 });
	}

	try {
		const updated = await updatePlayBuilderDiagram(params.playId, body.editToken, documentJson);
		if (!updated) return json({ message: 'This shared play must be saved as a new copy.' }, { status: 403 });
		return json({ id: params.playId });
	} catch (error) {
		console.error(`Failed to update play builder diagram ${params.playId}:`, error);
		return json({ message: 'Unable to save play. Please try again.' }, { status: 500 });
	}
};
