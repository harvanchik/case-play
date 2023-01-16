import { start_mongo } from '$db/mongo';
import { minify, type Options } from 'html-minifier-terser';

start_mongo()
	.then(() => {
		console.info('MongoDB connected!');
	})
	.catch(error => {
		console.error(error);
	});

const MINIFY_OPTIONS: Options = {
	collapseWhitespace: true,
	conservativeCollapse: true,
	collapseBooleanAttributes: true,
	removeComments: true,
	ignoreCustomComments: [/^#/],
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
