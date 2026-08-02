import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearAccountSessionCookie, invalidateAccountSession, isValidAccountCsrf } from '$lib/server/auth/account-session';
import { isAllowedMutationOrigin } from '$lib/server/request-security';

const noStoreHeaders = { 'Cache-Control': 'no-store' };

export const DELETE: RequestHandler = async ({ request, url, cookies }) => {
	const sessionCookie = cookies.get('caseplay_account_session');
	if (!isAllowedMutationOrigin(request, url) || !isValidAccountCsrf(sessionCookie, request.headers.get('x-caseplay-csrf')))
		return json({ message: 'Request could not be verified.' }, { status: 403, headers: noStoreHeaders });
	await invalidateAccountSession(sessionCookie);
	clearAccountSessionCookie(cookies);
	return json({ signedOut: true }, { headers: noStoreHeaders });
};
