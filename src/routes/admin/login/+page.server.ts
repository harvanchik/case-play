import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserByEmail } from '$lib/server/db/repositories/auth';
import { verifyPassword } from '$lib/server/auth/password';
import { createUserSession, setSessionCookie } from '$lib/server/auth/session';
import { clearRateLimit, consumeRateLimit, rateLimitHeaders, rateLimitKey } from '$lib/server/request-security';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const DUMMY_PASSWORD_HASH =
	'scrypt:16384:8:1:7d6a926d76f116fcaa5f09e74b3ab81c:e8152f079cb24f6720065600bb93a9717dc29da7befa38da85e58d854d5c5519a73bcd5bd1b06a5112159286f8e8d3b50fe5d3c7dc1b559a1be74f005e6ee8df';

export const load = (async () => {
	return {};
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, cookies, getClientAddress, setHeaders }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const password = formData.get('password')?.toString() || '';

		if (!email || !password) {
			return fail(400, {
				error: 'Email and password are required.'
			});
		}

		const clientAddress = getClientAddress();
		const ipLimit = consumeRateLimit(rateLimitKey('admin-login-ip', clientAddress), 20, LOGIN_WINDOW_MS);
		const credentialKey = rateLimitKey('admin-login-credential', clientAddress, email);
		const credentialLimit = consumeRateLimit(credentialKey, 5, LOGIN_WINDOW_MS);
		if (!ipLimit.allowed || !credentialLimit.allowed) {
			const activeLimit = !credentialLimit.allowed ? credentialLimit : ipLimit;
			setHeaders(rateLimitHeaders(activeLimit));
			return fail(429, {
				error: 'Too many login attempts. Please try again later.'
			});
		}

		const fieldsWithinLimits = email.length <= 254 && password.length <= 256;
		const user = fieldsWithinLimits ? await getUserByEmail(email) : null;
		const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
		const passwordToVerify = password.length <= 256 ? password : 'invalid-overlong-password';
		const passwordMatches = await verifyPassword(passwordToVerify, passwordHash);

		if (!fieldsWithinLimits || !user || user.role !== 'admin' || !passwordMatches) {
			return fail(400, {
				error: 'Invalid email or password.'
			});
		}

		clearRateLimit(credentialKey);
		const session = await createUserSession(user.id);
		setSessionCookie(cookies, session.cookieValue, session.expiresAt);
		throw redirect(303, '/admin');
	}
} satisfies Actions;
