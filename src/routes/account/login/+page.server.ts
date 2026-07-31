import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.accountUser) throw redirect(303, '/account/profile');
	const errorKey = url.searchParams.get('error');
	const message =
		errorKey === 'signedout'
			? 'You have been signed out of all devices.'
			: errorKey === 'cancelled'
				? 'Sign-in was cancelled.'
				: errorKey === 'rate'
					? 'Please wait a moment before trying again.'
					: errorKey
						? 'We could not complete sign-in. Please try again.'
						: null;
	return { message, returnTo: url.searchParams.get('returnTo')?.startsWith('/') ? url.searchParams.get('returnTo') : '/account/profile' };
};
