import { start_mongo } from '$db/mongo';
import { minify } from 'html-minifier-terser';

start_mongo()
	.then(() => {
		console.info('MongoDB connected!');
	})
	.catch(error => {
		console.error(error);
	});

const minification_options = {
	collapseWhitespace: true,
	collapseInlineTagWhitespace: true,
	removeComments: true,
	ignoreCustomComments: [/^#/],
	minifyCSS: true,
	minifyJS: true,
	sortAttributes: true,
	sortClassName: true
};

export async function handle({ event, resolve }: any) {
	const response = await resolve(event, {
		transformPageChunk: ({ html }: any) => minify(html, minification_options)
	});

	return response;
}
