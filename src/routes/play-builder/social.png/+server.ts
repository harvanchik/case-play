import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = ({ url }) => {
	throw redirect(308, `/diagram/flag-football/social.png${url.search}`);
};
