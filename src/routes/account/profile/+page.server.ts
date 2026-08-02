import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAccountCsrfToken } from '$lib/server/auth/account-session';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (!locals.accountUser) throw redirect(303, '/account/login?returnTo=/account/profile');
	return {
		account: locals.accountUser,
		csrfToken: getAccountCsrfToken(cookies.get('caseplay_account_session'))
	};
};
