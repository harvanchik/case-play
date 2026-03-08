import { redirect, type Handle } from '@sveltejs/kit';
import { authenticateRequest } from '$lib/server/auth/session';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await authenticateRequest(event.cookies.get('caseplay_session'));

	if (event.url.pathname.startsWith('/admin')) {
		const isLoginRoute = event.url.pathname === '/admin/login';

		if (!event.locals.user && !isLoginRoute) {
			throw redirect(303, '/admin/login');
		}

		if (event.locals.user?.role !== 'admin' && !isLoginRoute) {
			throw redirect(303, '/');
		}

		if (event.locals.user?.role === 'admin' && isLoginRoute) {
			throw redirect(303, '/admin');
		}
	}

	return resolve(event);
};
