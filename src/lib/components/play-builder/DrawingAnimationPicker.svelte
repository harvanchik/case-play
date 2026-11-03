<script lang="ts">
 import DropdownChevron from './DropdownChevron.svelte';
	import AnimationTiming from './AnimationTiming.svelte';
 import TransitionDuration from './TransitionDuration.svelte';
	import HoverTooltip from '../HoverTooltip.svelte';
	import { defaultMotion, type Motion } from '$lib/play-builder-animation';
	import type { DrawingAnimation } from '$lib/play-builder-drawing-animation';
	export let value: DrawingAnimation;
	export let duration: number;
	export let x: number;
	export let y: number;
	export let count = 1;
 export let existingDrawing = false;
 $: activeMode=existingDrawing?(value.mode==='jump'||value.mode==='instant'?'jump':'linear'):value.mode;
	export let onchange: (value: DrawingAnimation) => void;
	export let onclose: () => void;
	let easingOpen = false;
	let root: HTMLDivElement;
	let motion: Motion;
	$: motion = { ...defaultMotion({ type: 'marker', id: value.id }), start: value.start, end: value.end, easing: value.easing, speed: value.speed, path:activeMode==='jump'?'jump':'straight',jumpEffect:value.jumpEffect??'cut' };
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}
	function outside(event: PointerEvent) {
		const target = event.target as Element;
		if (!root?.contains(target) && !target.closest('[data-drawing-id],.driver-popover')) onclose();
	}
</script>

<svelte:window
	on:pointerdown|capture={outside}
	on:keydown={(event) => {
		if (event.key === 'Escape') onclose();
	}}
/>
<div
	bind:this={root}
	use:portal
	data-drawing-animation-picker
	data-animation-ui
	role="dialog"
	tabindex="-1"
	aria-label={count > 1 ? 'Drawing animation options for selected drawings' : 'Drawing animation options'}
	class="drawing-picker"
	style:left={`${Math.max(8, Math.min(x, window.innerWidth - 256))}px`}
	style:top={`${Math.max(8, Math.min(y, window.innerHeight - 240))}px`}
	on:pointerdown|stopPropagation
>
	<div class="types">
		{#each (existingDrawing?['linear','jump']:['draw','instant']) as mode}<HoverTooltip
				text={mode==='linear'?'Move and Blend Colors':mode==='jump'?'Change Position Instantly':mode === 'draw' ? 'Draw Along Stroke' : 'Appear All Together'}
				minWidthPx={0}
				wrapperClass="flex flex-1"
				><button
					class:active={activeMode === mode}
					aria-pressed={activeMode === mode}
					on:click={() => onchange({ ...value, mode: mode as DrawingAnimation['mode'] })}>{mode==='linear'?'Linear':mode==='jump'?'Jump':mode === 'draw' ? 'Draw' : 'Instant'}</button
				></HoverTooltip
			>{/each}
	</div>
	<AnimationTiming
		{motion}
		{duration}
		label={count > 1 ? 'Selected drawings' : 'Drawing'}
		showLabel={false}
		onchange={(next) => onchange({ ...value, start: next.start, end: next.end, speed: next.speed })}
	/>
	<div class="effect-row"><div class="easing-select">
		<button
			class="easing-trigger"
			aria-label="Drawing easing"

			aria-haspopup="listbox"
			aria-expanded={easingOpen}
			on:click={() => (easingOpen = !easingOpen)}
			>{activeMode==='jump'?(value.jumpEffect==='fade'?'Fade':'Hard Cut'):{ linear: 'Steady', in: 'Ease In', out: 'Ease Out', 'in-out': 'Ease In/Out' }[value.easing]}<DropdownChevron open={easingOpen}/></button
		>
		{#if easingOpen}<div class="easing-menu" role="listbox" aria-label="Drawing easing">
				{#each (activeMode==='jump'?[['cut','Hard Cut'],['fade','Fade']]:[['linear', 'Steady'], ['in', 'Ease In'], ['out', 'Ease Out'], ['in-out', 'Ease In/Out']]) as [easing, label]}<button
						role="option"
						aria-selected={(activeMode==='jump'?(value.jumpEffect??'cut'):value.easing) === easing}
						on:click={() => {
							onchange({ ...value, ...(activeMode==='jump'?{jumpEffect:easing as 'cut'|'fade'}:{easing:easing as Motion['easing']}) });
							easingOpen = false;
						}}>{label}</button
					>{/each}
			</div>{/if}
	</div>
 {#if activeMode==='jump'&&value.jumpEffect==='fade'}<TransitionDuration value={Math.min(value.jumpDuration??.25,duration)} maximum={duration} onchange={seconds=>onchange({...value,jumpDuration:seconds})}/>{/if}
 </div>
</div>

<style>
	.drawing-picker {
		position: fixed;
		z-index: 1000000001;
		width: 240px;
		padding: 4px;
		background: white;
		box-shadow:
			0 0 0 2px #1c1917,
			0 20px 25px -5px #0002;
		color: #1c1917;
		font:
			700 12px Inter,
			sans-serif;
		user-select: none;
	}
	.types {
		display: flex;
		gap: 1px;
		padding: 1px;
		background: #a8a29e;
		margin-bottom: 4px;
	}
	button {
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		height: 28px;
		padding: 0 6px;
		background: #f5f5f4;
		color: #44403c;
		font: inherit;
		width: 100%;
	}
	button:hover {
		background: #e7e5e4;
	}
	button.active {
		background: #1c1917;
		color: white;
	}
 .effect-row { display:flex; gap:4px; align-items:stretch; margin-top:4px; }
	.easing-select {
        flex:1; min-width:0;
		position: relative;
		margin-top: 0;
	}
	.easing-trigger {
		justify-content: space-between;
	}
	.easing-menu {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 2;
		background: white;
		box-shadow:
			0 0 0 1px #a8a29e,
			0 4px 8px #0002;
		padding: 2px;
	}
	.easing-menu button {
		justify-content: flex-start;
		background: white;
	}
	.easing-menu button:hover,
	.easing-menu button[aria-selected='true'] {
		background: #e7e5e4;
	}
</style>
