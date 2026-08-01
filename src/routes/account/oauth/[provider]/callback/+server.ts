import { redirect, type RequestHandler } from '@sveltejs/kit';
import { consumeOAuthTransaction } from '$lib/server/db/repositories/accounts';
import { createAccountSessionCookie, setAccountSessionCookie } from '$lib/server/auth/account-session';
import { completeOAuth, isOAuthProvider, stateHash, statesMatch } from '$lib/server/auth/oauth';
import { findOrCreateAccountForOAuth } from '$lib/server/auth/oauth';
import { consumeRateLimit, rateLimitKey } from '$lib/server/request-security';

const STATE_COOKIE = 'caseplay_oauth_state';

export const GET: RequestHandler = async ({ params, url, cookies, getClientAddress }) => {
	const provider = params.provider;
	if (!provider || !isOAuthProvider(provider)) throw redirect(303, '/account/login?error=oauth');
	const rateLimit = consumeRateLimit(rateLimitKey('account-oauth-callback', getClientAddress(), provider), 20, 15 * 60 * 1000);
	if (!rateLimit.allowed) throw redirect(303, '/account/login?error=rate');
	const callbackState = url.searchParams.get('state');
	const cookieState = cookies.get(STATE_COOKIE);
	cookies.delete(STATE_COOKIE, { path: '/account/oauth', httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', priority: 'high' });
	if (!callbackState || !statesMatch(cookieState, callbackState)) throw redirect(303, '/account/login?error=oauth');
	const transaction = await consumeOAuthTransaction(stateHash(callbackState));
	if (!transaction || transaction.provider !== provider || new Date(transaction.expiresAt).getTime() <= Date.now())
		throw redirect(303, '/account/login?error=oauth');
	if (url.searchParams.get('error')) throw redirect(303, '/account/login?error=cancelled');
	const code = url.searchParams.get('code');
	if (!code) throw redirect(303, '/account/login?error=oauth');
	try {
		const profile = await completeOAuth(provider, url, transaction.codeVerifier, callbackState, transaction.nonce);
		if (transaction.accountId) throw new Error('Provider linking is disabled.');
		const account = await findOrCreateAccountForOAuth(profile);
		const session = await createAccountSessionCookie(account.id);
		setAccountSessionCookie(cookies, session.cookieValue, session.expiresAt);
		return new Response(null, { status: 303, headers: { Location: transaction.returnTo || '/account/profile' } });
	} catch (error) {
		console.error('Account sign-in failed.', error instanceof Error ? { name: error.name, message: error.message } : undefined);
		throw redirect(303, '/account/login?error=oauth');
	}
};
