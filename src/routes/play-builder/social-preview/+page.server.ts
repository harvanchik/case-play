import { decodePlayBuilderDocument } from '$lib/play-builder-scene';
import { getPlayBuilderDiagram } from '$lib/server/db/repositories/play-builder-diagrams';
import { defaultSocialPlayBuilderDocument } from '$lib/server/play-builder-social-image';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const requestedId = url.searchParams.get('id')?.trim() ?? '';
	const requestedPlayNumber = Number(url.searchParams.get('play'));
	let document = defaultSocialPlayBuilderDocument();
	let playBuilderId = '';
	let message = '';

	if (requestedId) {
		if (!/^[A-Za-z0-9_-]{12}$/.test(requestedId)) {
			message = 'Enter a valid 12-character play builder ID.';
		} else {
			const saved = await getPlayBuilderDiagram(requestedId);
			if (!saved) message = 'That saved play builder could not be found.';
			else {
				document = decodePlayBuilderDocument(JSON.parse(saved.documentJson) as unknown);
				playBuilderId = saved.id;
			}
		}
	}

	const requestedPlayIndex = Number.isInteger(requestedPlayNumber) ? requestedPlayNumber - 1 : -1;
	if (requestedPlayIndex >= 0 && requestedPlayIndex < document.plays.length) document.activePlayIndex = requestedPlayIndex;
	const activePlayNumber = document.activePlayIndex + 1;
	const imageUrl = playBuilderId
		? `/play-builder/${playBuilderId}/social.png?play=${activePlayNumber}&studio=${Date.now()}`
		: `/play-builder/social.png?studio=${Date.now()}`;

	return {
		requestedId,
		playBuilderId,
		activePlayNumber,
		playCount: document.plays.length,
		imageUrl,
		message
	};
};
