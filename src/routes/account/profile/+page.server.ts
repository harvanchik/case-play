import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getAccountCsrfToken, clearAccountSessionCookie, invalidateAllAccountSessions, isValidAccountCsrf } from '$lib/server/auth/account-session';
import {
	deleteAccountAndOwnedData,
	listAccountIdentities,
	updateAccountProfile
} from '$lib/server/db/repositories/accounts';
import { isAllowedMutationOrigin, consumeRateLimit, rateLimitKey } from '$lib/server/request-security';

const validName = (value: string) => value.length <= 80 && /^[\p{L}\p{M} .'-]*$/u.test(value);
const requireMutation = (request: Request, url: URL, cookieValue: string | undefined, supplied: string | null) =>
	isAllowedMutationOrigin(request, url) && isValidAccountCsrf(cookieValue, supplied);

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (!locals.accountUser) throw redirect(303, '/account/login?returnTo=/account/profile');
	const identities = await listAccountIdentities(locals.accountUser.id);
	return {
		account: locals.accountUser,
		csrfToken: getAccountCsrfToken(cookies.get('caseplay_account_session')),
		providers: identities.map((identity) => ({ provider: identity.provider, email: identity.providerEmail }))
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, url, locals, cookies, getClientAddress }) => {
		if (!locals.accountUser) throw redirect(303, '/account/login');
		const form = await request.formData();
		if (!requireMutation(request, url, cookies.get('caseplay_account_session'), String(form.get('csrf') ?? '')))
			return fail(403, { message: 'Request could not be verified.' });
		const rateLimit = consumeRateLimit(rateLimitKey('account-profile-update', getClientAddress(), locals.accountUser.id), 20, 15 * 60 * 1000);
		if (!rateLimit.allowed) return fail(429, { message: 'Please wait before updating your profile again.' });
		const firstName = String(form.get('firstName') ?? '').trim();
		const lastName = String(form.get('lastName') ?? '').trim();
		if (!validName(firstName) || !validName(lastName)) return fail(400, { message: 'Please use a name with 80 characters or fewer.' });
		await updateAccountProfile(locals.accountUser.id, firstName, lastName);
		return { success: true, message: 'Profile saved.' };
	},
	signOutAll: async ({ request, url, locals, cookies, getClientAddress }) => {
		if (!locals.accountUser) throw redirect(303, '/account/login');
		const form = await request.formData();
		if (!requireMutation(request, url, cookies.get('caseplay_account_session'), String(form.get('csrf') ?? '')))
			return fail(403, { message: 'Request could not be verified.' });
		const rateLimit = consumeRateLimit(rateLimitKey('account-signout-all', getClientAddress(), locals.accountUser.id), 10, 15 * 60 * 1000);
		if (!rateLimit.allowed) return fail(429, { message: 'Please wait before trying again.' });
		await invalidateAllAccountSessions(locals.accountUser.id);
		clearAccountSessionCookie(cookies);
		throw redirect(303, '/account/login?error=signedout');
	},
	deleteAccount: async ({ request, url, locals, cookies, getClientAddress }) => {
		if (!locals.accountUser) throw redirect(303, '/account/login');
		const form = await request.formData();
		if (!requireMutation(request, url, cookies.get('caseplay_account_session'), String(form.get('csrf') ?? '')))
			return fail(403, { message: 'Request could not be verified.' });
		const rateLimit = consumeRateLimit(rateLimitKey('account-delete', getClientAddress(), locals.accountUser.id), 3, 60 * 60 * 1000);
		if (!rateLimit.allowed) return fail(429, { message: 'Please wait before trying again.' });
		if (form.get('confirm') !== 'delete') return fail(400, { message: 'Confirm account deletion to continue.' });
		await deleteAccountAndOwnedData(locals.accountUser.id);
		clearAccountSessionCookie(cookies);
		throw redirect(303, '/?account=deleted');
	}
};
