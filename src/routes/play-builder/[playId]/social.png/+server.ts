import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, url }) => {
	throw redirect(308, `/diagram/flag-football/${params.playId}/social.png${url.search}`);
};
