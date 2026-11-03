<script lang="ts">
	import type { FieldPath } from '$lib/play-builder-scene';
	import { playBuilderDrawArrow, playBuilderGuideColor, playBuilderGuideDash } from '$lib/play-builder-rendering';
	export let path: FieldPath;
	export let fieldTop: number;
	$: drawing = playBuilderDrawArrow(path, fieldTop);
	$: color = path.animationColor ?? playBuilderGuideColor(path.color);
	$: data = drawing.points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
	$: tip = drawing.points
		.slice(-2)
		.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`)
		.join(' ');
</script>

<g data-arrow-draw={path.id} pointer-events="none">
	{#if drawing.points.length > 1}
		{#if drawing.airborne}{#each drawing.segments as segment}<path
					d={segment.d}
					stroke={color}
					stroke-width={segment.width}
					stroke-linecap={segment.linecap}
					fill="none"
				/>{/each}{:else}<path d={data} stroke={color} stroke-width="5" stroke-dasharray={playBuilderGuideDash(path.style)} fill="none" />{/if}
		<path d={tip} stroke={color} stroke-width=".01" fill="none" marker-end="url(#builder-path-arrow)" />
	{/if}
</g>
