import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearAccountSessionCookie, isValidAccountCsrf } from '$lib/server/auth/account-session';
import { deleteAccount, updateAccountProfile } from '$lib/server/db/repositories/accounts';
import {
	consumeRateLimit,
	isAllowedMutationOrigin,
	rateLimitHeaders,
	rateLimitKey,
	readJsonRequest,
	RequestInputError
} from '$lib/server/request-security';

const noStoreHeaders = { 'Cache-Control': 'no-store' };
const validName = (value: string) => value.length <= 80 && /^[\p{L}\p{M} .'-]*$/u.test(value);
const mutationAllowed = (request: Request, url: URL, sessionCookie: string | undefined) =>
	isAllowedMutationOrigin(request, url) && isValidAccountCsrf(sessionCookie, request.headers.get('x-caseplay-csrf'));

export const PATCH: RequestHandler = async ({ request, url, locals, cookies, getClientAddress }) => {
	if (!locals.accountUser) return json({ message: 'Sign in is required.' }, { status: 401, headers: noStoreHeaders });
	if (!mutationAllowed(request, url, cookies.get('caseplay_account_session')))
		return json({ message: 'Request could not be verified.' }, { status: 403, headers: noStoreHeaders });
	const limit = consumeRateLimit(rateLimitKey('account-profile-update', getClientAddress(), locals.accountUser.id), 20, 15 * 60 * 1000);
	const headers = { ...noStoreHeaders, ...rateLimitHeaders(limit) };
	if (!limit.allowed) return json({ message: 'Please wait before updating your profile again.' }, { status: 429, headers });

	let body: { firstName?: unknown; lastName?: unknown };
	try {
		body = await readJsonRequest<{ firstName?: unknown; lastName?: unknown }>(request, 2_000);
	} catch (error) {
		if (error instanceof RequestInputError) return json({ message: error.message }, { status: error.status, headers });
		return json({ message: 'Invalid request.' }, { status: 400, headers });
	}
	const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
	const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
	if (!validName(firstName) || !validName(lastName))
		return json({ message: 'Please use a name with 80 characters or fewer.' }, { status: 400, headers });
	const account = await updateAccountProfile(locals.accountUser.id, firstName, lastName);
	return json({ account: account ? { firstName: account.firstName, lastName: account.lastName } : null }, { headers });
};

export const DELETE: RequestHandler = async ({ request, url, locals, cookies, getClientAddress }) => {
	if (!locals.accountUser) return json({ message: 'Sign in is required.' }, { status: 401, headers: noStoreHeaders });
	if (!mutationAllowed(request, url, cookies.get('caseplay_account_session')))
		return json({ message: 'Request could not be verified.' }, { status: 403, headers: noStoreHeaders });
	const limit = consumeRateLimit(rateLimitKey('account-delete', getClientAddress(), locals.accountUser.id), 3, 60 * 60 * 1000);
	const headers = { ...noStoreHeaders, ...rateLimitHeaders(limit) };
	if (!limit.allowed) return json({ message: 'Please wait before trying again.' }, { status: 429, headers });

	let body: { deleteAuthoredContent?: unknown };
	try {
		body = await readJsonRequest<{ deleteAuthoredContent?: unknown }>(request, 1_000);
	} catch (error) {
		if (error instanceof RequestInputError) return json({ message: error.message }, { status: error.status, headers });
		return json({ message: 'Invalid request.' }, { status: 400, headers });
	}
	await deleteAccount(locals.accountUser.id, { deleteAuthoredContent: body.deleteAuthoredContent === true });
	clearAccountSessionCookie(cookies);
	return json({ deleted: true }, { headers });
};
