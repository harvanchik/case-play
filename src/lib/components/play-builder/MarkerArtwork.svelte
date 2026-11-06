<script lang="ts">
 import {fabricTintMatrix,perceptualColorTransition} from '$lib/play-builder-color';
 import type { FieldMarker, PlayerKind, OfficialKind, GuideColor } from '$lib/play-builder-scene';
 import { playBuilderPlayerInk, playBuilderGuideColor as guideColor } from '$lib/play-builder-rendering';
 import { playBuilderEventTagLines as eventTagLines, playBuilderEventTagLayout, PLAY_BUILDER_EVENT_TAG_LINE_HEIGHT as eventTagLineHeight } from '$lib/play-builder-event-tag';
 export let marker: FieldMarker;
 let artworkReady = false;
 function imageReadiness(node: SVGImageElement, source: string) {
  let current = source;
  artworkReady = false;
  const loaded = () => { artworkReady = true; };
  node.addEventListener('load', loaded);
  return {
   update(next: string) { if(next !== current) { current = next; artworkReady = false; } },
   destroy() { node.removeEventListener('load', loaded); }
  };
 }
 const playerRadius = 14.025, playerStrokeWidth = 2.55, officialSize = playerRadius * 3.3;
 const footballSize = 30, deflagSize = 33.75, foulFlagSize = 31.5, beanBagSize = 31.5;
 const isTeamMarker = (m: FieldMarker): m is FieldMarker & {kind: PlayerKind} => m.kind.startsWith('team-');
 const isOfficialMarker = (m: FieldMarker): m is FieldMarker & {kind: OfficialKind} => m.kind.startsWith('official-');
 const officialImages = { 'official-r': '/images/official-referee.webp', 'official-l': '/images/official-line-judge.webp', 'official-b': '/images/official-back-judge.webp', 'official-f': '/images/official-field-judge.webp' };
 const playerMarkerColor = (m: FieldMarker & {kind: PlayerKind}): GuideColor => m.color ?? (m.kind === 'team-a' || m.kind === 'team-k' ? 'black' : 'white');
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

{#if marker.colorFrom && marker.colorMix!==undefined && (marker.kind==='deflag'||marker.kind==='bean-bag')}
 {@const reference=marker.kind==='deflag'?'red':'blue'}
 {@const tint=marker.animationColor??perceptualColorTransition(guideColor(marker.colorFrom),guideColor(marker.color??reference),marker.colorMix)}
 <defs><filter id={`marker-color-${marker.id}`} color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values={fabricTintMatrix(guideColor(reference),tint)}/></filter></defs>
 <g filter={`url(#marker-color-${marker.id})`}><svelte:self marker={{...marker,color:reference,colorFrom:undefined,colorMix:undefined}}/></g>
{:else if isTeamMarker(marker)}
									{@const markerColor = playerMarkerColor(marker)}
									<circle
										cx={marker.x}
										cy={marker.y}
										r={playerRadius}
										fill={marker.animationColor ?? guideColor(markerColor)}
										stroke={playBuilderPlayerInk(marker,markerColor)}
										stroke-width={playerStrokeWidth}
									/>
									<text opacity={marker.animationLabelOpacity ?? 1}
										x={marker.x}
										y={marker.y + 3.4}
										text-anchor="middle"
										fill={playBuilderPlayerInk(marker,markerColor)}
										font-size={marker.label && marker.label.length >= 4 ? 7.65 : 8.925}
										font-weight="900"
										pointer-events="none">{marker.label}</text
									>
								{:else if isOfficialMarker(marker)}
									<image
										href={officialImages[marker.kind]} use:imageReadiness={officialImages[marker.kind]}
										x={marker.x - officialSize / 2}
										y={marker.y - officialSize / 2}
										width={officialSize}
										height={officialSize}
										pointer-events="none"
									/>
								{:else if marker.kind === 'ball'}
									<image
										href="/images/football.webp" use:imageReadiness={'/images/football.webp'}
										x={marker.x - footballSize / 2}
										y={marker.y - footballSize / 2}
										width={footballSize}
										height={footballSize}
										pointer-events="none"
									/>
								{:else if marker.kind === 'deflag'}
									<image
										href={deflagImage(marker.color)} use:imageReadiness={deflagImage(marker.color)}
										x={marker.x - deflagSize / 2}
										y={marker.y - deflagSize / 2}
										width={deflagSize}
										height={deflagSize}
										pointer-events="none"
									/>
								{:else if marker.kind === 'bean-bag'}
									<image
										href={beanBagImage(marker.color)} use:imageReadiness={beanBagImage(marker.color)}
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
										href="/images/penalty-flag.webp" use:imageReadiness={'/images/penalty-flag.webp'}
										x={marker.x - foulFlagSize / 2}
										y={marker.y - foulFlagSize / 2}
										width={foulFlagSize}
										height={foulFlagSize}
										pointer-events="none"
									/>
								{/if}
								{#if artworkReady && marker.label && (isOfficialMarker(marker) || ['ball', 'flag', 'bean-bag', 'deflag'].includes(marker.kind))}
									{@const labelLines = penaltyLabelLines(marker.label)}
									<text opacity={marker.animationLabelOpacity ?? 1}
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
