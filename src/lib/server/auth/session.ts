import 'dotenv/config';
import { dev } from '$app/environment';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { createSession, deleteSessionByHash, getSessionUserByHash } from '$lib/server/db/repositories/auth';
import type { AuthenticatedUser } from '$lib/server/db/repositories/auth';
import type { Cookies } from '@sveltejs/kit';

const SESSION_COOKIE_NAME = 'caseplay_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const readEnv = (key: string) => process.env[key] || viteEnv?.[key];

const getSessionSecret = () => {
	const secret = readEnv('SESSION_COOKIE_SECRET');

	if (!secret) {
		throw new Error('Missing SESSION_COOKIE_SECRET.');
	}

	return secret;
};

const createSessionHash = (token: string) => createHash('sha256').update(token).digest('hex');

const signToken = (token: string) =>
	createHmac('sha256', getSessionSecret()).update(token).digest('hex');

const safeEquals = (left: string, right: string) => {
	const leftBuffer = Buffer.from(left, 'utf8');
	const rightBuffer = Buffer.from(right, 'utf8');

	return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const parseCookieValue = (cookieValue: string | undefined | null) => {
	if (!cookieValue) {
		return null;
	}

	const [token, signature] = cookieValue.split('.');

	if (!token || !signature) {
		return null;
	}

	return safeEquals(signature, signToken(token)) ? token : null;
};

export const createUserSession = async (userId: string) => {
	const token = randomBytes(32).toString('hex');
	const cookieValue = `${token}.${signToken(token)}`;
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

	await createSession({
		id: randomUUID(),
		userId,
		sessionHash: createSessionHash(token),
		expiresAt: expiresAt.toISOString(),
		createdAt: new Date().toISOString()
	});

	return {
		cookieValue,
		expiresAt
	};
};

export const setSessionCookie = (cookies: Cookies, cookieValue: string, expiresAt: Date) => {
	cookies.set(SESSION_COOKIE_NAME, cookieValue, {
		httpOnly: true,
		path: '/',
		sameSite: 'lax',
		secure: !dev,
		expires: expiresAt
	});
};

export const clearSessionCookie = (cookies: Cookies) => {
	cookies.delete(SESSION_COOKIE_NAME, {
		httpOnly: true,
		path: '/',
		sameSite: 'lax',
		secure: !dev
	});
};

export const authenticateRequest = async (
	cookieValue: string | undefined
): Promise<AuthenticatedUser | null> => {
	const token = parseCookieValue(cookieValue);

	if (!token) {
		return null;
	}

	const session = await getSessionUserByHash(createSessionHash(token));

	if (!session) {
		return null;
	}

	if (new Date(session.expiresAt).getTime() <= Date.now()) {
		await deleteSessionByHash(session.sessionHash);
		return null;
	}

	if (session.user.role !== 'admin' && session.user.role !== 'user') {
		return null;
	}

	return {
		...session.user,
		role: session.user.role
	};
};

export const invalidateSession = async (cookieValue: string | undefined) => {
	const token = parseCookieValue(cookieValue);

	if (!token) {
		return;
	}

	await deleteSessionByHash(createSessionHash(token));
};
