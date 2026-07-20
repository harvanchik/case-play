import { Resvg } from '@resvg/resvg-js';
import {
	defaultSocialPlayBuilderDocument,
	playBuilderSocialRenderOptions,
	renderPlayBuilderSocialSvg
} from '$lib/server/play-builder-social-image';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const image = new Resvg(renderPlayBuilderSocialSvg(defaultSocialPlayBuilderDocument()), playBuilderSocialRenderOptions())
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
