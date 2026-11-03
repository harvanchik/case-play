<script lang="ts">
	import type { FieldPath } from '$lib/play-builder-scene';
	import {
		playBuilderGuideColor,
		playBuilderGuideDash,
		playBuilderSmoothedPath,
		playBuilderAirborneSegments,
		playBuilderAirborneLift
	} from '$lib/play-builder-rendering';
	export let arrow: FieldPath;
	export let fieldTop = 54;
	$: color = arrow.animationColor ?? playBuilderGuideColor(arrow.color);
	$: airborne = arrow.kind === 'pass' || arrow.kind === 'kick';
	$: data = airborne
		? `M ${arrow.start.x} ${arrow.start.y} Q ${(arrow.start.x + arrow.end.x) / 2} ${(arrow.start.y + arrow.end.y) / 2 - playBuilderAirborneLift(arrow.kind as 'pass' | 'kick', arrow.start, arrow.end, fieldTop) * 2} ${arrow.end.x} ${arrow.end.y}`
		: playBuilderSmoothedPath(arrow.points ?? [arrow.start, arrow.end]);
</script>

{#if airborne}
	{#each playBuilderAirborneSegments(arrow.kind as 'pass' | 'kick', arrow.start, arrow.end, arrow.style, fieldTop, 5) as segment}<path
			d={segment.d}
			fill="none"
			stroke={color}
			stroke-width={segment.width}
			stroke-linecap={segment.linecap}
			pointer-events="none"
		/>{/each}
{/if}
<path
	d={data}
	fill="none"
	stroke={color}
	stroke-width={airborne ? 0.01 : 5}
	stroke-dasharray={airborne ? undefined : playBuilderGuideDash(arrow.style)}
	marker-end={arrow.kind === 'line' ? undefined : 'url(#builder-path-arrow)'}
	pointer-events="none"
/>
<path d={data} fill="none" stroke="transparent" stroke-width="18" pointer-events="stroke" />
