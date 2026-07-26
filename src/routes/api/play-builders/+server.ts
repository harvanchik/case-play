import { json } from '@sveltejs/kit';
import { createPlayBuilderDiagram } from '$lib/server/db/repositories/play-builder-diagrams';
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
const CREATE_WINDOW_MS = 60 * 60 * 1000;
const noStoreHeaders = { 'Cache-Control': 'no-store' };

export const POST: RequestHandler = async ({ request, url, getClientAddress }) => {
	if (!isAllowedMutationOrigin(request, url)) {
		return json({ message: 'Request origin is not allowed.' }, { status: 403, headers: noStoreHeaders });
	}

	const rateLimit = consumeRateLimit(rateLimitKey('play-builder-create', getClientAddress()), 20, CREATE_WINDOW_MS);
	const responseHeaders = { ...noStoreHeaders, ...rateLimitHeaders(rateLimit) };
	if (!rateLimit.allowed) {
		return json({ message: 'Too many saved plays. Please try again later.' }, { status: 429, headers: responseHeaders });
	}

	let body: { document?: unknown };
	try {
		body = await readJsonRequest<{ document?: unknown }>(request, MAXIMUM_REQUEST_BYTES);
	} catch (error) {
		if (error instanceof RequestInputError) return json({ message: error.message }, { status: error.status, headers: responseHeaders });
		return json({ message: 'Invalid JSON request.' }, { status: 400, headers: responseHeaders });
	}

	let documentJson: string;
	try {
		documentJson = serializeValidatedPlayBuilderDocument(body.document);
	} catch (error) {
		return json({ message: error instanceof Error ? error.message : 'Invalid play builder collection.' }, { status: 400, headers: responseHeaders });
	}

	try {
		const saved = await createPlayBuilderDiagram(documentJson);
		return json(saved, { status: 201, headers: responseHeaders });
	} catch (error) {
		console.error('Failed to save play builder diagram.', error instanceof Error ? { name: error.name, message: error.message } : undefined);
		return json({ message: 'Unable to save play. Please try again.' }, { status: 500, headers: responseHeaders });
	}
};
