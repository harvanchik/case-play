import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearAccountSessionCookie, invalidateAllAccountSessions, isValidAccountCsrf } from '$lib/server/auth/account-session';
import { consumeRateLimit, isAllowedMutationOrigin, rateLimitHeaders, rateLimitKey } from '$lib/server/request-security';

const noStoreHeaders = { 'Cache-Control': 'no-store' };

export const DELETE: RequestHandler = async ({ request, url, locals, cookies, getClientAddress }) => {
	if (!locals.accountUser) return json({ message: 'Sign in is required.' }, { status: 401, headers: noStoreHeaders });
	const sessionCookie = cookies.get('caseplay_account_session');
	if (!isAllowedMutationOrigin(request, url) || !isValidAccountCsrf(sessionCookie, request.headers.get('x-caseplay-csrf')))
		return json({ message: 'Request could not be verified.' }, { status: 403, headers: noStoreHeaders });
	const limit = consumeRateLimit(rateLimitKey('account-signout-all', getClientAddress(), locals.accountUser.id), 10, 15 * 60 * 1000);
	const headers = { ...noStoreHeaders, ...rateLimitHeaders(limit) };
	if (!limit.allowed) return json({ message: 'Please wait before trying again.' }, { status: 429, headers });
	await invalidateAllAccountSessions(locals.accountUser.id);
	clearAccountSessionCookie(cookies);
	return json({ signedOut: true }, { headers });
};
