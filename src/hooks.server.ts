import { redirect, type Handle } from '@sveltejs/kit';
import { authenticateRequest } from '$lib/server/auth/session';
import { authenticateAccountRequest, cleanupAccountAuth } from '$lib/server/auth/account-session';

const setSecurityHeaders = (response: Response, pathname: string) => {
	response.headers.set('Content-Security-Policy', "base-uri 'self'; frame-ancestors 'none'; object-src 'none'");
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');

	if (pathname.startsWith('/admin') || pathname.startsWith('/account')) {
		response.headers.set('Cache-Control', 'no-store');
		response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	}
	if (pathname.startsWith('/api/account')) {
		response.headers.set('Cache-Control', 'no-store');
		response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	}
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await authenticateRequest(event.cookies.get('caseplay_session'));
	event.locals.accountUser = await authenticateAccountRequest(event.cookies.get('caseplay_account_session'));
	if (event.locals.accountUser && Math.random() < 0.01) void cleanupAccountAuth().catch(() => undefined);

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

	const isFilteredCaseLibrary = event.url.pathname === '/' && (event.url.searchParams.has('q') || event.url.searchParams.has('difficulty'));
	const isUtilityOrSharedRoute =
		event.url.pathname === '/privacy' ||
		event.url.pathname === '/cookie-policy' ||
		event.url.pathname.startsWith('/api/') ||
		event.url.pathname === '/upload' ||
		(event.url.pathname.startsWith('/play-builder/') && event.url.pathname !== '/play-builder');

	if (isFilteredCaseLibrary || isUtilityOrSharedRoute) {
		response.headers.set('X-Robots-Tag', 'noindex, follow');
	}

	return response;
};
