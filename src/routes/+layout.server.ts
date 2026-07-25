import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ request, url }) => {
	const country = request.headers.get('x-vercel-ip-country')?.trim().toUpperCase() ?? '';
	const canonicalPage = url.searchParams.get('page');
	const canonicalUrl = `https://caseplay.org${url.pathname}${
		canonicalPage && Number(canonicalPage) > 1 ? `?page=${encodeURIComponent(canonicalPage)}` : ''
	}`;

	return {
		// Advanced Consent Mode is intentionally limited to the United States.
		// Unknown and non-US locations use Basic Consent Mode (no Google tag before consent).
		analyticsConsentMode: country === 'US' ? ('advanced' as const) : ('basic' as const),
		canonicalUrl
	};
};
