import { json } from '@sveltejs/kit';
import { updatePlayBuilderDiagram } from '$lib/server/db/repositories/play-builder-diagrams';
import { serializeValidatedPlayBuilderDocument } from '$lib/server/play-builder-scenes';
import {
	consumeRateLimit,
	isAllowedMutationOrigin,
	rateLimitHeaders,
	rateLimitKey,
	readJsonRequest,
	RequestInputError
} from '$lib/server/request-security';
import type { RequestHandler } from './$types';

const MAXIMUM_REQUEST_BYTES = 1_600_000;
const UPDATE_WINDOW_MS = 10 * 60 * 1000;
const noStoreHeaders = { 'Cache-Control': 'no-store' };

export const PUT: RequestHandler = async ({ params, request, url, getClientAddress }) => {
	if (!/^[A-Za-z0-9_-]{12}$/.test(params.playId)) return json({ message: 'Invalid play ID.' }, { status: 404, headers: noStoreHeaders });
	if (!isAllowedMutationOrigin(request, url)) {
		return json({ message: 'Request origin is not allowed.' }, { status: 403, headers: noStoreHeaders });
	}

	const clientAddress = getClientAddress();
	const diagramLimit = consumeRateLimit(rateLimitKey('play-builder-update', clientAddress, params.playId), 120, UPDATE_WINDOW_MS);
	const clientLimit = consumeRateLimit(rateLimitKey('play-builder-update-client', clientAddress), 300, UPDATE_WINDOW_MS);
	const activeLimit = !diagramLimit.allowed ? diagramLimit : clientLimit;
	const responseHeaders = { ...noStoreHeaders, ...rateLimitHeaders(activeLimit) };
	if (!diagramLimit.allowed || !clientLimit.allowed) {
		return json({ message: 'Too many save attempts. Please try again later.' }, { status: 429, headers: responseHeaders });
	}

	let body: { document?: unknown; editToken?: unknown };
	try {
		body = await readJsonRequest<{ document?: unknown; editToken?: unknown }>(request, MAXIMUM_REQUEST_BYTES);
	} catch (error) {
		if (error instanceof RequestInputError) return json({ message: error.message }, { status: error.status, headers: responseHeaders });
		return json({ message: 'Invalid JSON request.' }, { status: 400, headers: responseHeaders });
	}
	if (typeof body.editToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.editToken))
		return json({ message: 'This shared play must be saved as a new copy.' }, { status: 403, headers: responseHeaders });

	let documentJson: string;
	try {
		documentJson = serializeValidatedPlayBuilderDocument(body.document);
	} catch (error) {
		return json({ message: error instanceof Error ? error.message : 'Invalid play builder collection.' }, { status: 400, headers: responseHeaders });
	}

	try {
		const updated = await updatePlayBuilderDiagram(params.playId, body.editToken, documentJson);
		if (!updated) return json({ message: 'This shared play must be saved as a new copy.' }, { status: 403, headers: responseHeaders });
		return json({ id: params.playId }, { headers: responseHeaders });
	} catch (error) {
		console.error(
			`Failed to update play builder diagram ${params.playId}.`,
			error instanceof Error ? { name: error.name, message: error.message } : undefined
		);
		return json({ message: 'Unable to save play. Please try again.' }, { status: 500, headers: responseHeaders });
	}
};
