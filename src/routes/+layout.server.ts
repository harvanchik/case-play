import type { LayoutServerLoad } from './$types';

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

export const load: LayoutServerLoad = ({ request, url }) => {
	const canonicalPage = url.searchParams.get('page');
	const canonicalUrl = `https://caseplay.org${url.pathname}${
		canonicalPage && Number(canonicalPage) > 1 ? `?page=${encodeURIComponent(canonicalPage)}` : ''
	}`;
	const country = request.headers.get('x-vercel-ip-country')?.toUpperCase() ?? null;

	return { canonicalUrl, googleCmpRequired: country ? GOOGLE_CMP_COUNTRIES.has(country) : false };
};
