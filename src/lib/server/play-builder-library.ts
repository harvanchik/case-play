import { decodePlayBuilderDocument, encodePlayBuilderDocument, PLAY_BUILDER_PLAY_NAME_MAX_LENGTH } from '$lib/play-builder-scene';

export type PlayBuilderLibraryDiagram = {
	id: string;
	documentJson: string;
	updatedAt: string;
};

export const normalizePlayBuilderLibraryTitle = (value: unknown) => {
	if (typeof value !== 'string') return null;
	const title = value.trim().replace(/\s+/g, ' ');
	return title.length >= 1 && title.length <= PLAY_BUILDER_PLAY_NAME_MAX_LENGTH ? title : null;
};

export const renameFirstPlayInDocument = (documentJson: string, title: string) => {
	const document = decodePlayBuilderDocument(JSON.parse(documentJson) as unknown);
	if (!document.plays[0]) throw new Error('Saved play is missing its first diagram.');
	document.plays[0].name = title;
	return JSON.stringify(encodePlayBuilderDocument(document));
};

export const copiedPlayBuilderTitle = (title: string) => `${title.slice(0, PLAY_BUILDER_PLAY_NAME_MAX_LENGTH - 5)} Copy`;

export const summarizePlayBuilderLibraryDiagram = (diagram: PlayBuilderLibraryDiagram) => {
	let title = 'Untitled play';
	try {
		const parsed = JSON.parse(diagram.documentJson) as { p?: unknown };
		const firstPlay = Array.isArray(parsed.p) ? parsed.p[0] : null;
		if (Array.isArray(firstPlay) && typeof firstPlay[0] === 'string' && firstPlay[0].trim()) title = firstPlay[0].trim().slice(0, 120);
	} catch {
		// Keep the library usable if an older document is malformed.
	}
	return {
		id: diagram.id,
		title,
		updatedAt: diagram.updatedAt,
		previewUrl: `/diagram/flag-football/${diagram.id}/social.png?play=1&format=diagram&v=${encodeURIComponent(diagram.updatedAt)}`
	};
};
