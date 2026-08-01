import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAccountCsrfToken } from '$lib/server/auth/account-session';
import { listOwnedPlayBuilderDiagrams } from '$lib/server/db/repositories/accounts';
import { summarizePlayBuilderLibraryDiagram } from '$lib/server/play-builder-library';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (!locals.accountUser) throw redirect(303, '/account/login?returnTo=/account/plays');
	const diagrams = await listOwnedPlayBuilderDiagrams(locals.accountUser.id);
	return {
		account: locals.accountUser,
		csrfToken: getAccountCsrfToken(cookies.get('caseplay_account_session')),
		plays: diagrams.map(summarizePlayBuilderLibraryDiagram)
	};
};
