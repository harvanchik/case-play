import type { RequestHandler } from './$types';

export const GET: RequestHandler = () =>
	new Response(
		['User-agent: *', 'Allow: /', 'Disallow: /admin/', 'Disallow: /api/', 'Disallow: /upload', 'Sitemap: https://caseplay.org/sitemap.xml', ''].join(
			'\n'
		),
		{ headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } }
	);
