import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ url }) => {
	const canonicalPage = url.searchParams.get('page');
	const canonicalUrl = `https://caseplay.org${url.pathname}${
		canonicalPage && Number(canonicalPage) > 1 ? `?page=${encodeURIComponent(canonicalPage)}` : ''
	}`;

	return { canonicalUrl };
};
