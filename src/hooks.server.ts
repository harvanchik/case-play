import { minify, type Options } from 'html-minifier-terser';

const MINIFY_OPTIONS: Options = {
	collapseWhitespace: true,
	conservativeCollapse: true,
	collapseBooleanAttributes: true,
	minifyCSS: true,
	minifyJS: true,
	minifyURLs: true,
	quoteCharacter: "'",
	removeAttributeQuotes: true
};

export async function handle({ event, resolve }: any) {
	const response = await resolve(event, {
		transformPageChunk: ({ html }: any) => minify(html, MINIFY_OPTIONS)
	});
	return response;
}
