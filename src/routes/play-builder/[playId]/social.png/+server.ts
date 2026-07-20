import { Resvg } from '@resvg/resvg-js';
import { error } from '@sveltejs/kit';
import { decodePlayBuilderDocument } from '$lib/play-builder-scene';
import { getPlayBuilderDiagram } from '$lib/server/db/repositories/play-builder-diagrams';
import { renderPlayBuilderSocialSvg } from '$lib/server/play-builder-social-image';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	if (!/^[A-Za-z0-9_-]{12}$/.test(params.playId)) throw error(404, 'Saved play not found.');
	const saved = await getPlayBuilderDiagram(params.playId);
	if (!saved) throw error(404, 'Saved play not found.');
	const document = decodePlayBuilderDocument(JSON.parse(saved.documentJson) as unknown);
	const image = new Resvg(renderPlayBuilderSocialSvg(document), {
		fitTo: { mode: 'width', value: 1200 },
		font: { loadSystemFonts: true, defaultFontFamily: 'Arial' }
	})
		.render()
		.asPng();
	const body = image.buffer.slice(image.byteOffset, image.byteOffset + image.byteLength) as ArrayBuffer;
	return new Response(body, {
		headers: {
			'content-type': 'image/png',
			'cache-control': 'public, max-age=300, s-maxage=31536000, immutable'
		}
	});
};
