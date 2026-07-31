import { redirect, type RequestHandler } from '@sveltejs/kit';
import { clearAccountSessionCookie, invalidateAccountSession, isValidAccountCsrf } from '$lib/server/auth/account-session';
import { isAllowedMutationOrigin } from '$lib/server/request-security';

export const POST: RequestHandler = async ({ request, url, cookies }) => {
	if (!isAllowedMutationOrigin(request, url) || !isValidAccountCsrf(cookies.get('caseplay_account_session'), request.headers.get('x-caseplay-csrf'))) throw redirect(303, '/');
	await invalidateAccountSession(cookies.get('caseplay_account_session'));
	clearAccountSessionCookie(cookies);
	throw redirect(303, '/');
};
