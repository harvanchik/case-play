import { json } from '@sveltejs/kit';
import { createPlayBuilderDiagram } from '$lib/server/db/repositories/play-builder-diagrams';
import { serializeValidatedPlayBuilderDocument } from '$lib/server/play-builder-scenes';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let body: { document?: unknown };
	try {
		body = (await request.json()) as { document?: unknown };
	} catch {
		return json({ message: 'Invalid JSON request.' }, { status: 400 });
	}

	let documentJson: string;
	try {
		documentJson = serializeValidatedPlayBuilderDocument(body.document);
	} catch (error) {
		return json({ message: error instanceof Error ? error.message : 'Invalid play builder collection.' }, { status: 400 });
	}

	try {
		const saved = await createPlayBuilderDiagram(documentJson);
		return json(saved, { status: 201 });
	} catch (error) {
		console.error('Failed to save play builder diagram:', error);
		return json({ message: 'Unable to save play. Please try again.' }, { status: 500 });
	}
};
