import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserByEmail } from '$lib/server/db/repositories/auth';
import { verifyPassword } from '$lib/server/auth/password';
import { createUserSession, setSessionCookie } from '$lib/server/auth/session';

export const load = (async () => {
	return {};
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const password = formData.get('password')?.toString() || '';

		if (!email || !password) {
			return fail(400, {
				error: 'Email and password are required.'
			});
		}

		const user = await getUserByEmail(email);

		if (!user || user.role !== 'admin' || !(await verifyPassword(password, user.passwordHash))) {
			return fail(400, {
				error: 'Invalid email or password.'
			});
		}

		const session = await createUserSession(user.id);
		setSessionCookie(cookies, session.cookieValue, session.expiresAt);
		throw redirect(303, '/admin');
	}
} satisfies Actions;
