import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidAccountCsrf } from '$lib/server/auth/account-session';
import {
	createPlayBuilderDiagram,
	deleteOwnedPlayBuilderDiagram,
	getOwnedPlayBuilderDiagram,
	updatePlayBuilderDiagram
} from '$lib/server/db/repositories/play-builder-diagrams';
import {
	copiedPlayBuilderTitle,
	normalizePlayBuilderLibraryTitle,
	renameFirstPlayInDocument,
	summarizePlayBuilderLibraryDiagram
} from '$lib/server/play-builder-library';
import {
	consumeRateLimit,
	isAllowedMutationOrigin,
	rateLimitHeaders,
	rateLimitKey,
	readJsonRequest,
	RequestInputError
} from '$lib/server/request-security';

const playIdPattern = /^[A-Za-z0-9_-]{12}$/;
const noStoreHeaders = { 'Cache-Control': 'no-store' };
const mutationAllowed = (request: Request, url: URL, sessionCookie: string | undefined) =>
	isAllowedMutationOrigin(request, url) && isValidAccountCsrf(sessionCookie, request.headers.get('x-caseplay-csrf'));

export const PATCH: RequestHandler = async ({ params, request, url, locals, cookies, getClientAddress }) => {
	if (!locals.accountUser) return json({ message: 'Sign in is required.' }, { status: 401, headers: noStoreHeaders });
	if (!playIdPattern.test(params.playId)) return json({ message: 'Saved play not found.' }, { status: 404, headers: noStoreHeaders });
	if (!mutationAllowed(request, url, cookies.get('caseplay_account_session')))
		return json({ message: 'Request could not be verified.' }, { status: 403, headers: noStoreHeaders });

	const limit = consumeRateLimit(rateLimitKey('account-rename-play', getClientAddress(), locals.accountUser.id), 30, 15 * 60 * 1000);
	const headers = { ...noStoreHeaders, ...rateLimitHeaders(limit) };
	if (!limit.allowed) return json({ message: 'Please wait before trying again.' }, { status: 429, headers });

	let body: { title?: unknown };
	try {
		body = await readJsonRequest<{ title?: unknown }>(request, 2_000);
	} catch (error) {
		if (error instanceof RequestInputError) return json({ message: error.message }, { status: error.status, headers });
		return json({ message: 'Invalid request.' }, { status: 400, headers });
	}
	const title = normalizePlayBuilderLibraryTitle(body.title);
	if (!title) return json({ message: 'Enter a play name between 1 and 64 characters.' }, { status: 400, headers });

	const diagram = await getOwnedPlayBuilderDiagram(params.playId, locals.accountUser.id);
	if (!diagram) return json({ message: 'Saved play not found.' }, { status: 404, headers });
	try {
		const updated = await updatePlayBuilderDiagram(params.playId, renameFirstPlayInDocument(diagram.documentJson, title), {
			ownerAccountId: locals.accountUser.id
		});
		if (!updated) return json({ message: 'Saved play not found.' }, { status: 404, headers });
		const saved = await getOwnedPlayBuilderDiagram(params.playId, locals.accountUser.id);
		if (!saved) return json({ message: 'Saved play not found.' }, { status: 404, headers });
		return json({ play: summarizePlayBuilderLibraryDiagram(saved) }, { headers });
	} catch {
		return json({ message: 'Unable to rename this play.' }, { status: 400, headers });
	}
};

export const POST: RequestHandler = async ({ params, request, url, locals, cookies, getClientAddress }) => {
	if (!locals.accountUser) return json({ message: 'Sign in is required.' }, { status: 401, headers: noStoreHeaders });
	if (!playIdPattern.test(params.playId)) return json({ message: 'Saved play not found.' }, { status: 404, headers: noStoreHeaders });
	if (!mutationAllowed(request, url, cookies.get('caseplay_account_session')))
		return json({ message: 'Request could not be verified.' }, { status: 403, headers: noStoreHeaders });

	const limit = consumeRateLimit(rateLimitKey('account-duplicate-play', getClientAddress(), locals.accountUser.id), 20, 15 * 60 * 1000);
	const headers = { ...noStoreHeaders, ...rateLimitHeaders(limit) };
	if (!limit.allowed) return json({ message: 'Please wait before trying again.' }, { status: 429, headers });

	const diagram = await getOwnedPlayBuilderDiagram(params.playId, locals.accountUser.id);
	if (!diagram) return json({ message: 'Saved play not found.' }, { status: 404, headers });
	try {
		const source = summarizePlayBuilderLibraryDiagram(diagram);
		const documentJson = renameFirstPlayInDocument(diagram.documentJson, copiedPlayBuilderTitle(source.title));
		const created = await createPlayBuilderDiagram(documentJson, locals.accountUser.id);
		const saved = await getOwnedPlayBuilderDiagram(created.id, locals.accountUser.id);
		if (!saved) throw new Error('Created play was not found.');
		return json({ play: summarizePlayBuilderLibraryDiagram(saved) }, { status: 201, headers });
	} catch {
		return json({ message: 'Unable to duplicate this play.' }, { status: 400, headers });
	}
};

export const DELETE: RequestHandler = async ({ params, request, url, locals, cookies, getClientAddress }) => {
	if (!locals.accountUser) return json({ message: 'Sign in is required.' }, { status: 401, headers: noStoreHeaders });
	if (!playIdPattern.test(params.playId)) return json({ message: 'Saved play not found.' }, { status: 404, headers: noStoreHeaders });
	if (!mutationAllowed(request, url, cookies.get('caseplay_account_session')))
		return json({ message: 'Request could not be verified.' }, { status: 403, headers: noStoreHeaders });

	const limit = consumeRateLimit(rateLimitKey('account-delete-play', getClientAddress(), locals.accountUser.id), 30, 15 * 60 * 1000);
	const headers = { ...noStoreHeaders, ...rateLimitHeaders(limit) };
	if (!limit.allowed) return json({ message: 'Please wait before trying again.' }, { status: 429, headers });

	const deleted = await deleteOwnedPlayBuilderDiagram(params.playId, locals.accountUser.id);
	if (!deleted) return json({ message: 'Saved play not found.' }, { status: 404, headers });
	return json({ deleted: true }, { headers });
};
