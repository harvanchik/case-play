export async function handle({ event, resolve }) {
	return await resolve(event, {
		// replace the `lang` attribute
		// transformPageChunk: ({ html }) => html.replace('Team', 'TEAMTEAMTEAMTEAM')
	});
}
