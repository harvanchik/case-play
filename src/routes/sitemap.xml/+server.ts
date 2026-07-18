import type { RequestHandler } from './$types';
import { listCasePlays } from '$lib/server/db/repositories/case-plays';

const SITE_ORIGIN = 'https://caseplay.org';
const escapeXml = (value: string) => value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character] ?? character);

export const GET: RequestHandler = async () => {
	const casePlays = await listCasePlays();
	const staticPaths = ['/', '/play-builder', '/playlists', '/about', '/contact', '/privacy', '/cookie-policy'];
	const staticUrls = staticPaths.map((path) => `<url><loc>${escapeXml(`${SITE_ORIGIN}${path}`)}</loc></url>`);
	const casePlayUrls = casePlays.map((casePlay) => {
		const updated = casePlay.date_updated ? new Date(casePlay.date_updated).toISOString() : null;
		return `<url><loc>${escapeXml(`${SITE_ORIGIN}/c/${casePlay.id}`)}</loc>${updated ? `<lastmod>${updated}</lastmod>` : ''}</url>`;
	});
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[
		...staticUrls,
		...casePlayUrls
	].join('\n')}\n</urlset>\n`;
	return new Response(body, {
		headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600, s-maxage=3600' }
	});
};
