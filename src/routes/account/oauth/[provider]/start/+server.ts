import { redirect, type RequestHandler } from '@sveltejs/kit';
import { createOAuthTransaction, cleanupExpiredOAuthTransactions } from '$lib/server/db/repositories/accounts';
import { beginOAuth, isOAuthProvider, stateHash } from '$lib/server/auth/oauth';
import { consumeRateLimit, rateLimitKey } from '$lib/server/request-security';

const STATE_COOKIE = 'caseplay_oauth_state';
const maxAge = 60 * 10;

const safeReturnTo = (value: string | null) => {
	if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value) || value.length > 200)
		return '/account/profile';
	return value;
};

export const GET: RequestHandler = async ({ params, url, cookies, getClientAddress }) => {
	const provider = params.provider;
	if (!provider || !isOAuthProvider(provider)) throw redirect(303, '/account/login?error=oauth');
	if (url.searchParams.get('link') === '1') throw redirect(303, '/account/profile');
	const rateLimit = consumeRateLimit(rateLimitKey('account-oauth-start', getClientAddress(), provider), 12, 15 * 60 * 1000);
	if (!rateLimit.allowed) throw redirect(303, '/account/login?error=rate');
	try {
		await cleanupExpiredOAuthTransactions();
		const transaction = await beginOAuth(provider);
		const returnTo = safeReturnTo(url.searchParams.get('returnTo'));
		await createOAuthTransaction({
			id: crypto.randomUUID(),
			provider,
			accountId: null,
			stateHash: stateHash(transaction.state),
			codeVerifier: transaction.codeVerifier,
			nonce: transaction.nonce,
			returnTo,
			expiresAt: new Date(Date.now() + maxAge * 1000).toISOString(),
			createdAt: new Date().toISOString()
		});
		cookies.set(STATE_COOKIE, transaction.state, {
			httpOnly: true,
			secure: url.protocol === 'https:',
			sameSite: 'lax',
			path: '/account/oauth',
			maxAge,
			priority: 'high'
		});
		return new Response(null, { status: 303, headers: { Location: transaction.authorizationUrl.toString() } });
	} catch (error) {
		console.error('Unable to start account sign-in.', error instanceof Error ? { name: error.name, message: error.message } : undefined);
		throw redirect(303, '/account/login?error=oauth');
	}
};
