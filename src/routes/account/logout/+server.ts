import { redirect, type RequestHandler } from '@sveltejs/kit';
import { clearAccountSessionCookie, invalidateAccountSession, isValidAccountCsrf } from '$lib/server/auth/account-session';
import { isAllowedMutationOrigin } from '$lib/server/request-security';

export const POST: RequestHandler = async ({ request, url, cookies }) => {
	let csrfToken = request.headers.get('x-caseplay-csrf');
	if (!csrfToken) {
		const form = await request.formData();
		csrfToken = String(form.get('csrf') ?? '');
	}
	if (!isAllowedMutationOrigin(request, url) || !isValidAccountCsrf(cookies.get('caseplay_account_session'), csrfToken)) throw redirect(303, '/');
	await invalidateAccountSession(cookies.get('caseplay_account_session'));
	clearAccountSessionCookie(cookies);
	throw redirect(303, '/');
};
