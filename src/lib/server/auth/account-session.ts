import 'dotenv/config';
import { dev } from '$app/environment';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import {
	cleanupExpiredAccountSessions,
	cleanupExpiredOAuthTransactions,
	createAccountSession,
	deleteAccountSessionByHash,
	deleteAllAccountSessions,
	getAccountBySessionHash
} from '$lib/server/db/repositories/accounts';

export const ACCOUNT_SESSION_COOKIE = 'caseplay_account_session';
export const ACCOUNT_CSRF_HEADER = 'x-caseplay-csrf';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const readEnv = (key: string) => process.env[key] || viteEnv?.[key];

const getSecret = () => {
	const secret = readEnv('ACCOUNT_SESSION_SECRET');
	if (!secret || secret.length < 32) throw new Error('Missing or weak ACCOUNT_SESSION_SECRET.');
	return secret;
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const signToken = (token: string) => createHmac('sha256', getSecret()).update(token).digest('hex');
const csrfForToken = (token: string) => createHmac('sha256', getSecret()).update(`csrf\0${token}`).digest('hex');

const safeEquals = (left: string, right: string) => {
	const a = Buffer.from(left, 'utf8');
	const b = Buffer.from(right, 'utf8');
	return a.length === b.length && timingSafeEqual(a, b);
};

export const readAccountSessionToken = (cookieValue: string | undefined | null) => {
	if (!cookieValue) return null;
	const separator = cookieValue.lastIndexOf('.');
	if (separator <= 0) return null;
	const token = cookieValue.slice(0, separator);
	const signature = cookieValue.slice(separator + 1);
	if (!/^[A-Za-z0-9_-]{40,}$/.test(token) || !/^[a-f0-9]{64}$/.test(signature)) return null;
	try {
		return safeEquals(signature, signToken(token)) ? token : null;
	} catch {
		return null;
	}
};

export const getAccountCsrfToken = (cookieValue: string | undefined | null) => {
	const token = readAccountSessionToken(cookieValue);
	return token ? csrfForToken(token) : null;
};

export const isValidAccountCsrf = (cookieValue: string | undefined | null, supplied: string | null | undefined) => {
	const expected = getAccountCsrfToken(cookieValue);
	return Boolean(expected && supplied && safeEquals(expected, supplied));
};

export const createAccountSessionCookie = async (accountId: string) => {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
	await createAccountSession({
		id: randomUUID(),
		accountId,
		sessionHash: hashToken(token),
		expiresAt: expiresAt.toISOString(),
		createdAt: new Date().toISOString()
	});
	return { cookieValue: `${token}.${signToken(token)}`, expiresAt };
};

export const setAccountSessionCookie = (cookies: Cookies, cookieValue: string, expiresAt: Date) => {
	cookies.set(ACCOUNT_SESSION_COOKIE, cookieValue, {
		httpOnly: true,
		path: '/',
		sameSite: 'lax',
		secure: !dev,
		priority: 'high',
		expires: expiresAt
	});
};

export const clearAccountSessionCookie = (cookies: Cookies) => {
	cookies.delete(ACCOUNT_SESSION_COOKIE, { httpOnly: true, path: '/', sameSite: 'lax', secure: !dev, priority: 'high' });
};

export const authenticateAccountRequest = async (cookieValue: string | undefined) => {
	const token = readAccountSessionToken(cookieValue);
	if (!token) return null;
	const session = await getAccountBySessionHash(hashToken(token));
	if (!session) return null;
	if (new Date(session.session.expiresAt).getTime() <= Date.now()) {
		await deleteAccountSessionByHash(session.session.sessionHash);
		return null;
	}
	return {
		id: session.account.id,
		email: session.account.email,
		firstName: session.account.firstName,
		lastName: session.account.lastName
	};
};

export const invalidateAccountSession = async (cookieValue: string | undefined) => {
	const token = readAccountSessionToken(cookieValue);
	if (token) await deleteAccountSessionByHash(hashToken(token));
};

export const invalidateAllAccountSessions = (accountId: string) => deleteAllAccountSessions(accountId);
export const cleanupAccountAuth = () => Promise.all([cleanupExpiredAccountSessions(), cleanupExpiredOAuthTransactions()]);
