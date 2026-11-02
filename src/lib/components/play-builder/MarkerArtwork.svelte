<script lang="ts">
 import type { FieldMarker, PlayerKind, OfficialKind, GuideColor } from '$lib/play-builder-scene';
 import { playBuilderGuideColor as guideColor } from '$lib/play-builder-rendering';
 import { playBuilderEventTagLines as eventTagLines, playBuilderEventTagLayout, PLAY_BUILDER_EVENT_TAG_LINE_HEIGHT as eventTagLineHeight } from '$lib/play-builder-event-tag';
 export let marker: FieldMarker;
 const playerRadius = 14.025, playerStrokeWidth = 2.55, officialSize = playerRadius * 3.3;
 const footballSize = 30, deflagSize = 33.75, foulFlagSize = 31.5, beanBagSize = 31.5;
 const isTeamMarker = (m: FieldMarker): m is FieldMarker & {kind: PlayerKind} => m.kind.startsWith('team-');
 const isOfficialMarker = (m: FieldMarker): m is FieldMarker & {kind: OfficialKind} => m.kind.startsWith('official-');
 const officialImages = { 'official-r': '/images/official-referee.webp', 'official-l': '/images/official-line-judge.webp', 'official-b': '/images/official-back-judge.webp', 'official-f': '/images/official-field-judge.webp' };
 const playerMarkerColor = (m: FieldMarker & {kind: PlayerKind}): GuideColor => m.color ?? (m.kind === 'team-a' || m.kind === 'team-k' ? 'black' : 'white');
 const playerTextColor = (c: GuideColor) => ['white', 'yellow', 'green'].includes(c) ? '#1c1917' : '#fff';
 const deflagImage = (c?: GuideColor) => c && !['red', 'white', 'gray', 'black'].includes(c) ? `/images/flag-belt-${c}.webp` : '/images/flag-belt.webp';
 const beanBagImage = (c?: GuideColor) => `/images/bean-bag-${c && ['white', 'black', 'pink'].includes(c) ? c : 'blue'}.webp`;
 const eventWidth = (label = 'EVENT') => playBuilderEventTagLayout(label).width;
 const eventHeight = (label = 'EVENT') => playBuilderEventTagLayout(label).height;
	const penaltyLabelLines = (label = '') => {
		const maxCharacters = 12;
		const lines: string[] = [];
		let currentLine = '';
		for (const originalWord of label.trim().split(/\s+/).filter(Boolean)) {
			let word = originalWord;
			if (currentLine && `${currentLine} ${word}`.length <= maxCharacters) {
				currentLine = `${currentLine} ${word}`;
				continue;
			}
			if (currentLine) {
				lines.push(currentLine);
				currentLine = '';
			}
			while (word.length > maxCharacters) {
				lines.push(word.slice(0, maxCharacters));
				word = word.slice(maxCharacters);
			}
			currentLine = word;
		}
		if (currentLine) lines.push(currentLine);
		return lines;
	};
	const markerDescriptionY = (marker: FieldMarker) =>
		marker.y +
		(marker.kind === 'ball'
			? footballSize
			: marker.kind === 'bean-bag'
				? beanBagSize
				: marker.kind === 'deflag'
					? deflagSize
					: isOfficialMarker(marker)
						? officialSize
						: foulFlagSize) /
			2 +
		9;

</script>

{#if isTeamMarker(marker)}
									{@const markerColor = playerMarkerColor(marker)}
									<circle
										cx={marker.x}
										cy={marker.y}
										r={playerRadius}
										fill={guideColor(markerColor)}
										stroke={playerTextColor(markerColor)}
										stroke-width={playerStrokeWidth}
									/>
									<text
										x={marker.x}
										y={marker.y + 3.4}
										text-anchor="middle"
										fill={playerTextColor(markerColor)}
										font-size={marker.label && marker.label.length >= 4 ? 7.65 : 8.925}
										font-weight="900"
										pointer-events="none">{marker.label}</text
									>
								{:else if isOfficialMarker(marker)}
									<image
										href={officialImages[marker.kind]}
										x={marker.x - officialSize / 2}
										y={marker.y - officialSize / 2}
										width={officialSize}
										height={officialSize}
										pointer-events="none"
									/>
								{:else if marker.kind === 'ball'}
									<image
										href="/images/football.webp"
										x={marker.x - footballSize / 2}
										y={marker.y - footballSize / 2}
										width={footballSize}
										height={footballSize}
										pointer-events="none"
									/>
								{:else if marker.kind === 'deflag'}
									<image
										href={deflagImage(marker.color)}
										x={marker.x - deflagSize / 2}
										y={marker.y - deflagSize / 2}
										width={deflagSize}
										height={deflagSize}
										pointer-events="none"
									/>
								{:else if marker.kind === 'bean-bag'}
									<image
										href={beanBagImage(marker.color)}
										x={marker.x - beanBagSize / 2}
										y={marker.y - beanBagSize / 2}
										width={beanBagSize}
										height={beanBagSize}
										pointer-events="none"
									/>
								{:else if marker.kind === 'event'}
									{@const eventLines = eventTagLines(marker.label)}
									<rect
										x={marker.x - eventWidth(marker.label) / 2}
										y={marker.y - eventHeight(marker.label) / 2}
										width={eventWidth(marker.label)}
										height={eventHeight(marker.label)}
										fill="#fff"
										stroke="#1c1917"
										stroke-width="2.25"
										pointer-events="none"
									/>
									<text x={marker.x} text-anchor="middle" fill="#1c1917" font-size="8.5" font-weight="900" pointer-events="none">
										{#each eventLines as line, lineIndex}
											<tspan x={marker.x} y={marker.y - ((eventLines.length - 1) * eventTagLineHeight) / 2 + 3.5 + lineIndex * eventTagLineHeight}
												>{line}</tspan
											>
										{/each}
									</text>
								{:else}
									<image
										href="/images/penalty-flag.webp"
										x={marker.x - foulFlagSize / 2}
										y={marker.y - foulFlagSize / 2}
										width={foulFlagSize}
										height={foulFlagSize}
										pointer-events="none"
									/>
								{/if}
								{#if marker.label && (isOfficialMarker(marker) || ['ball', 'flag', 'bean-bag', 'deflag'].includes(marker.kind))}
									{@const labelLines = penaltyLabelLines(marker.label)}
									<text
										x={marker.x}
										y={markerDescriptionY(marker)}
										text-anchor="middle"
										fill="#fff"
										stroke="#1c1917"
										stroke-width="2"
										paint-order="stroke"
										font-size="8"
										font-weight="900"
										pointer-events="none"
									>
										{#each labelLines as line, lineIndex}
											<tspan x={marker.x} dy={lineIndex === 0 ? 0 : 9}>{line}</tspan>
										{/each}
									</text>
								{/if}
