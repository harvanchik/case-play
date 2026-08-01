import { createHash, timingSafeEqual } from 'node:crypto';
import {
	authorizationCodeGrant,
	buildAuthorizationUrl,
	calculatePKCECodeChallenge,
	discovery,
	fetchUserInfo,
	randomNonce,
	randomPKCECodeVerifier,
	randomState,
	type Configuration,
	type IDToken
} from 'openid-client';
import {
	createAccount,
	createAccountIdentity,
	deleteAccountAndOwnedData,
	getAccountByEmail,
	getAccountById,
	getAccountIdentity,
	newAccountId,
	updateAccountIdentity,
	updateAccountProfile
} from '$lib/server/db/repositories/accounts';
import { readServerEnv } from '$lib/server/env';

export type OAuthProvider = 'google' | 'microsoft';
export type OAuthProfile = {
	provider: OAuthProvider;
	subject: string;
	email: string;
	firstName: string;
	lastName: string;
};

const readEnv = readServerEnv;
const configs = new Map<OAuthProvider, Promise<Configuration>>();

const providerIssuer = (provider: OAuthProvider) =>
	provider === 'google' ? 'https://accounts.google.com' : readEnv('MICROSOFT_OIDC_ISSUER') || 'https://login.microsoftonline.com/common/v2.0';

const providerCredentials = (provider: OAuthProvider) => {
	const clientId = readEnv(provider === 'google' ? 'GOOGLE_OAUTH_CLIENT_ID' : 'MICROSOFT_OAUTH_CLIENT_ID');
	const clientSecret = readEnv(provider === 'google' ? 'GOOGLE_OAUTH_CLIENT_SECRET' : 'MICROSOFT_OAUTH_CLIENT_SECRET');
	if (!clientId || !clientSecret) throw new Error(`${provider} OAuth is not configured.`);
	return { clientId, clientSecret };
};

const getOrigin = () => {
	const configured = readEnv('PUBLIC_APP_ORIGIN') || 'http://localhost:5173';
	const origin = new URL(configured);
	if (!['http:', 'https:'].includes(origin.protocol) || origin.pathname !== '/' || origin.search || origin.hash)
		throw new Error('PUBLIC_APP_ORIGIN must be an origin URL.');
	return origin.origin;
};

export const getOAuthRedirectUri = (provider: OAuthProvider) => `${getOrigin()}/account/oauth/${provider}/callback`;

const getConfiguration = (provider: OAuthProvider) => {
	const cached = configs.get(provider);
	if (cached) return cached;
	const { clientId, clientSecret } = providerCredentials(provider);
	const issuer = providerIssuer(provider);
	if (provider === 'microsoft') {
		const issuerUrl = new URL(issuer);
		const allowedHost = issuerUrl.hostname === 'login.microsoftonline.com' || issuerUrl.hostname.endsWith('.ciamlogin.com');
		if (issuerUrl.protocol !== 'https:' || !allowedHost) throw new Error('Invalid Microsoft OAuth issuer.');
	}
	const pending = discovery(new URL(issuer), clientId, clientSecret);
	configs.set(provider, pending);
	return pending;
};

export const beginOAuth = async (provider: OAuthProvider) => {
	const codeVerifier = randomPKCECodeVerifier();
	const [codeChallenge, state, nonce, config] = await Promise.all([
		calculatePKCECodeChallenge(codeVerifier),
		Promise.resolve(randomState()),
		Promise.resolve(randomNonce()),
		getConfiguration(provider)
	]);
	const authorizationUrl = buildAuthorizationUrl(config, {
		redirect_uri: getOAuthRedirectUri(provider),
		scope: 'openid profile email',
		response_type: 'code',
		code_challenge: codeChallenge,
		code_challenge_method: 'S256',
		state,
		nonce
	});
	return { authorizationUrl, state, codeVerifier, nonce };
};

const hashState = (state: string) => createHash('sha256').update(state).digest('hex');
export const stateHash = hashState;
export const statesMatch = (left: string | null | undefined, right: string) => {
	if (!left) return false;
	const a = Buffer.from(left, 'utf8');
	const b = Buffer.from(right, 'utf8');
	return a.length === b.length && timingSafeEqual(a, b);
};

const textClaim = (claims: IDToken, key: string) => {
	const value = (claims as Record<string, unknown>)[key];
	return typeof value === 'string' ? value.trim() : '';
};

const textValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const fillMissingNameFromDisplayName = (displayName: string, firstName: string, lastName: string) => {
	const parts = displayName.split(/\s+/).filter(Boolean);
	if (parts.length < 2) return { firstName, lastName };
	if (!firstName) firstName = parts[0];
	if (!lastName) {
		const firstPartMatches = parts[0].toLocaleLowerCase() === firstName.toLocaleLowerCase();
		lastName = (firstPartMatches ? parts.slice(1) : parts).join(' ');
	}
	return { firstName, lastName };
};

export const completeOAuth = async (
	provider: OAuthProvider,
	callbackUrl: URL,
	codeVerifier: string,
	expectedState: string,
	expectedNonce: string
) => {
	const config = await getConfiguration(provider);
	const tokens = await authorizationCodeGrant(config, callbackUrl, {
		pkceCodeVerifier: codeVerifier,
		expectedState,
		expectedNonce
	});
	const claims = tokens.claims();
	if (!claims) throw new Error('Identity claims were not returned.');
	const subject = textClaim(claims, 'sub');
	let email = textClaim(claims, 'email');
	if (provider === 'microsoft') email ||= textClaim(claims, 'preferred_username') || textClaim(claims, 'upn');
	let firstName = textClaim(claims, 'given_name');
	let lastName = textClaim(claims, 'family_name');
	({ firstName, lastName } = fillMissingNameFromDisplayName(textClaim(claims, 'name'), firstName, lastName));
	if (provider === 'google' && (claims as Record<string, unknown>).email_verified !== true) throw new Error('Provider email is not verified.');
	if (typeof tokens.access_token === 'string' && subject && (!email || !firstName || !lastName)) {
		try {
			const userInfo = await fetchUserInfo(config, tokens.access_token, subject);
			const userInfoRecord = userInfo as Record<string, unknown>;
			email ||= textValue(userInfoRecord.email);
			firstName ||= textValue(userInfoRecord.given_name);
			lastName ||= textValue(userInfoRecord.family_name);
			({ firstName, lastName } = fillMissingNameFromDisplayName(textValue(userInfoRecord.name), firstName, lastName));
		} catch {
			// Some providers omit userinfo. Keep the ID-token claims and continue
			// when the verified email is already available.
		}
	}
	if (!subject || !email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Provider identity is incomplete.');
	return { provider, subject, email: email.toLowerCase(), firstName, lastName } satisfies OAuthProfile;
};

export const findOrCreateAccountForOAuth = async (profile: OAuthProfile) => {
	const existingIdentity = await getAccountIdentity(profile.provider, profile.subject);
	if (existingIdentity) {
		const account = await getAccountById(existingIdentity.accountId);
		if (!account) throw new Error('Account is unavailable.');
		await updateAccountIdentity(existingIdentity.id, profile.email);
		const firstName = account.firstName || profile.firstName.slice(0, 80);
		const lastName = account.lastName || profile.lastName.slice(0, 80);
		if (firstName !== account.firstName || lastName !== account.lastName) {
			return (await updateAccountProfile(account.id, firstName, lastName)) ?? account;
		}
		return account;
	}
	const existingEmailAccount = await getAccountByEmail(profile.email);
	if (existingEmailAccount)
		throw new Error('An account already exists with this email. Sign in with the existing provider.');
	const now = new Date().toISOString();
	const accountId = newAccountId();
	const account = await createAccount({
		id: accountId,
		email: profile.email,
		firstName: profile.firstName.slice(0, 80),
		lastName: profile.lastName.slice(0, 80),
		createdAt: now,
		updatedAt: now
	});
	if (!account) throw new Error('Unable to create account.');
	try {
		await createAccountIdentity({
			id: newAccountId(),
			accountId,
			provider: profile.provider,
			providerSubject: profile.subject,
			providerEmail: profile.email,
			createdAt: now,
			updatedAt: now
		});
	} catch {
		await deleteAccountAndOwnedData(accountId);
		throw new Error('Unable to link provider identity.');
	}
	return account;
};

export const isOAuthProvider = (value: string): value is OAuthProvider => value === 'google' || value === 'microsoft';
