import type { LayoutServerLoad } from './$types';
import { getAccountCsrfToken } from '$lib/server/auth/account-session';

const GOOGLE_CMP_COUNTRIES = new Set([
	'AT',
	'BE',
	'BG',
	'CH',
	'CY',
	'CZ',
	'DE',
	'DK',
	'EE',
	'ES',
	'FI',
	'FR',
	'GB',
	'GR',
	'HR',
	'HU',
	'IE',
	'IS',
	'IT',
	'LI',
	'LT',
	'LU',
	'LV',
	'MT',
	'NL',
	'NO',
	'PL',
	'PT',
	'RO',
	'SE',
	'SI',
	'SK'
]);

const GOOGLE_CMP_US_STATES = new Set([
	'CA',
	'CO',
	'CT',
	'DE',
	'FL',
	'IA',
	'IN',
	'KY',
	'MD',
	'MN',
	'MT',
	'NE',
	'NH',
	'NJ',
	'OR',
	'RI',
	'TN',
	'TX',
	'UT',
	'VA'
]);

export const load: LayoutServerLoad = ({ request, url, locals, cookies }) => {
	const canonicalPage = url.searchParams.get('page');
	const canonicalUrl = `https://caseplay.org${url.pathname}${
		canonicalPage && Number(canonicalPage) > 1 ? `?page=${encodeURIComponent(canonicalPage)}` : ''
	}`;
	const country = request.headers.get('x-vercel-ip-country')?.toUpperCase() ?? null;
	const countryRegion = request.headers.get('x-vercel-ip-country-region')?.toUpperCase() ?? null;
	const googleCmpRequired =
		(country ? GOOGLE_CMP_COUNTRIES.has(country) : false) || (country === 'US' && countryRegion ? GOOGLE_CMP_US_STATES.has(countryRegion) : false);

	const isFilteredCaseLibrary = url.pathname === '/' && (url.searchParams.has('q') || url.searchParams.has('difficulty'));
	const isUtilityOrSharedRoute =
		url.pathname === '/privacy' ||
		url.pathname === '/cookie-policy' ||
		url.pathname.startsWith('/api/') ||
		url.pathname === '/upload' ||
		(url.pathname.startsWith('/diagram/flag-football/') && url.pathname !== '/diagram/flag-football');

	return {
		canonicalUrl,
		googleCmpRequired,
		robots: isFilteredCaseLibrary || isUtilityOrSharedRoute ? 'noindex, follow' : 'index, follow',
		accountUser: locals.accountUser ? { signedIn: true as const } : null,
		accountCsrfToken: locals.accountUser ? getAccountCsrfToken(cookies.get('caseplay_account_session')) : null
	};
};
