import { json, type RequestHandler } from '@sveltejs/kit';
import { claimAnonymousPlayBuilderDiagrams } from '$lib/server/db/repositories/play-builder-diagrams';
import { getAccountCsrfToken } from '$lib/server/auth/account-session';
import {
	consumeRateLimit,
	isAllowedMutationOrigin,
	rateLimitHeaders,
	rateLimitKey,
	readJsonRequest,
	RequestInputError
} from '$lib/server/request-security';

const noStoreHeaders = { 'Cache-Control': 'no-store' };

export const POST: RequestHandler = async ({ request, url, locals, cookies, getClientAddress }) => {
	if (!locals.accountUser) return json({ message: 'Sign in required.' }, { status: 401, headers: noStoreHeaders });
	if (
		!isAllowedMutationOrigin(request, url) ||
		request.headers.get('x-caseplay-csrf') !== getAccountCsrfToken(cookies.get('caseplay_account_session'))
	)
		return json({ message: 'Request could not be verified.' }, { status: 403, headers: noStoreHeaders });
	const limit = consumeRateLimit(rateLimitKey('account-claim-plays', getClientAddress(), locals.accountUser.id), 10, 15 * 60 * 1000);
	const headers = { ...noStoreHeaders, ...rateLimitHeaders(limit) };
	if (!limit.allowed) return json({ message: 'Please wait before trying again.' }, { status: 429, headers });
	let body: { plays?: unknown };
	try {
		body = await readJsonRequest<{ plays?: unknown }>(request, 80_000);
	} catch (error) {
		if (error instanceof RequestInputError) return json({ message: error.message }, { status: error.status, headers });
		return json({ message: 'Invalid request.' }, { status: 400, headers });
	}
	if (!body || typeof body !== 'object' || !Array.isArray(body.plays)) return json({ message: 'Invalid request.' }, { status: 400, headers });
	const plays = body.plays.slice(0, 50).filter((value): value is { id: string; editToken: string } => {
		if (!value || typeof value !== 'object') return false;
		const candidate = value as Record<string, unknown>;
		return typeof candidate.id === 'string' && typeof candidate.editToken === 'string';
	});
	const claimed = await claimAnonymousPlayBuilderDiagrams(locals.accountUser.id, plays);
	return json({ claimed }, { headers });
};
