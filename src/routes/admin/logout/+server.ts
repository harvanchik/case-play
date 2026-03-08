import { redirect } from '@sveltejs/kit';
import { clearSessionCookie, invalidateSession } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	await invalidateSession(cookies.get('caseplay_session'));
	clearSessionCookie(cookies);
	throw redirect(303, '/admin/login');
};
