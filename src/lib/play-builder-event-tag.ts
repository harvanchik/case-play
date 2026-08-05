export const PLAY_BUILDER_EVENT_TAG_WIDTH = 46.5;
export const PLAY_BUILDER_EVENT_TAG_HEIGHT = 21;
export const PLAY_BUILDER_EVENT_TAG_LINE_HEIGHT = 10;

const MAX_LINE_CHARACTERS = 12;

export const playBuilderEventTagLines = (label = 'EVENT') => {
	const words = label.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return ['EVENT'];
	const lines: string[] = [];
	let currentLine = '';
	for (const originalWord of words) {
		let word = originalWord;
		if (currentLine && `${currentLine} ${word}`.length <= MAX_LINE_CHARACTERS) {
			currentLine = `${currentLine} ${word}`;
			continue;
		}
		if (currentLine) {
			lines.push(currentLine);
			currentLine = '';
		}
		while (word.length > MAX_LINE_CHARACTERS) {
			lines.push(word.slice(0, MAX_LINE_CHARACTERS));
			word = word.slice(MAX_LINE_CHARACTERS);
		}
		currentLine = word;
	}
	if (currentLine) lines.push(currentLine);
	return lines;
};

const eventTagTextWidth = (text: string) =>
	[...text].reduce((width, character) => {
		if (character === ' ') return width + 2.7;
		if (/[MW@#%&]/.test(character)) return width + 7.2;
		if (/[ilI1'.,:;]/.test(character)) return width + 3;
		if (/[A-Z0-9]/.test(character)) return width + 5.7;
		return width + 5.1;
	}, 0);

export const playBuilderEventTagLayout = (label = 'EVENT') => {
	const lines = playBuilderEventTagLines(label);
	return {
		lines,
		width: Math.max(PLAY_BUILDER_EVENT_TAG_WIDTH, Math.min(100, Math.max(...lines.map(eventTagTextWidth)) + 16)),
		height: PLAY_BUILDER_EVENT_TAG_HEIGHT + (lines.length - 1) * PLAY_BUILDER_EVENT_TAG_LINE_HEIGHT
	};
};
