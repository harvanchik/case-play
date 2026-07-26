import { redirect, type Handle } from '@sveltejs/kit';
import { authenticateRequest } from '$lib/server/auth/session';

const setSecurityHeaders = (response: Response, pathname: string) => {
	response.headers.set('Content-Security-Policy', "base-uri 'self'; frame-ancestors 'none'; object-src 'none'");
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');

	if (pathname.startsWith('/admin')) {
		response.headers.set('Cache-Control', 'no-store');
		response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	}
};

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

	const response = await resolve(event);
	setSecurityHeaders(response, event.url.pathname);
	return response;
};
