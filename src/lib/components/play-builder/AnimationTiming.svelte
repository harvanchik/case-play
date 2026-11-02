<script lang="ts">
	import type { Motion } from '$lib/play-builder-animation';
	export let motion: Motion;
	export let duration: number;
	export let label: string;
 export let showLabel = true;
	export let onchange: (motion: Motion) => void;
	let pending: Motion | null = null;
	let drag: { x: number; width: number; mode: 'start' | 'end' | 'move'; original: Motion } | null = null;
	$: displayed = pending ?? motion;
	function begin(event: PointerEvent, mode: 'start' | 'end' | 'move') {
		event.preventDefault();
        if (motion.path === 'jump' && mode !== 'start') return;
		const target = event.currentTarget as HTMLElement;
		const rail = target.closest('[data-timing-rail]') as HTMLElement;
		drag = { x: event.clientX, width: rail.getBoundingClientRect().width, mode, original: { ...motion } };
		pending = { ...motion };
		target.setPointerCapture(event.pointerId);
	}
	function move(event: PointerEvent) {
		if (!drag) return;
		const increment = event.shiftKey ? 0.01 : 0.05;
        const delta = (Math.round((((event.clientX - drag.x) / drag.width) * duration) / increment) * increment) / duration;
		const { original, mode } = drag;
		const minimum = increment / duration;
		pending = { ...original };
		if (mode === 'start') pending.start = Math.max(0, Math.min(original.end - minimum, original.start + delta));
		else if (mode === 'end') pending.end = Math.min(1, Math.max(original.start + minimum, original.end + delta));
		else {
			const offset = Math.max(-original.start, Math.min(1 - original.end, delta));
			pending.start += offset;
			pending.end += offset;
		}
	}
	function end() {
		if (pending) onchange(pending);
		pending = null;
		drag = null;
	}
</script>

<div class="timing-row" class:without-label={!showLabel}>
	{#if showLabel}<span class="truncate">{label}</span>{/if}
	<div data-timing-rail class="rail">
		<div class="bar" style:left={`${displayed.start * 100}%`} style:width={`${(displayed.end - displayed.start) * 100}%`}>
			<button
				type="button"
				class="handle"
				aria-label={`${label} start time`}
				on:pointerdown={(e) => begin(e, 'start')}
				on:pointermove={move}
				on:pointerup={end}
				on:pointercancel={() => {
					pending = null;
					drag = null;
				}}
				on:keydown={(e) => {
					if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
						e.preventDefault();
						onchange({
							...motion,
							start: Math.max(0, Math.min(motion.end - (e.shiftKey ? 0.01 : 0.05) / duration, motion.start + (e.key === 'ArrowLeft' ? -(e.shiftKey ? 0.01 : 0.05) / duration : (e.shiftKey ? 0.01 : 0.05) / duration)))
						});
					}
				}}>│</button
			>
			<button
				type="button"
				class="middle"
				aria-label={`Shift ${label} movement`}
                disabled={motion.path === 'jump'}
				on:pointerdown={(e) => begin(e, 'move')}
				on:pointermove={move}
				on:pointerup={end}
				on:pointercancel={() => {
					pending = null;
					drag = null;
				}}
				on:keydown={(e) => {
					if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
						e.preventDefault();
						const delta = Math.max(-motion.start, Math.min(1 - motion.end, e.key === 'ArrowLeft' ? -(e.shiftKey ? 0.01 : 0.05) / duration : (e.shiftKey ? 0.01 : 0.05) / duration));
						onchange({ ...motion, start: motion.start + delta, end: motion.end + delta });
					}
				}}
			></button>
			<button
				type="button"
				class="handle"
				aria-label={`${label} arrival time`}
                disabled={motion.path === 'jump'}
				on:pointerdown={(e) => begin(e, 'end')}
				on:pointermove={move}
				on:pointerup={end}
				on:pointercancel={() => {
					pending = null;
					drag = null;
				}}
				on:keydown={(e) => {
					if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
						e.preventDefault();
						onchange({
							...motion,
							end: Math.min(1, Math.max(motion.start + (e.shiftKey ? 0.01 : 0.05) / duration, motion.end + (e.key === 'ArrowLeft' ? -(e.shiftKey ? 0.01 : 0.05) / duration : (e.shiftKey ? 0.01 : 0.05) / duration)))
						});
					}
				}}>│</button
			>
		</div>
	</div>
	<span class="tabular-nums">{(displayed.start * duration).toFixed(2)}–{(displayed.end * duration).toFixed(2)}s</span>
</div>

<style>
	.timing-row {
		display: grid;
		grid-template-columns: 3rem minmax(4rem, 1fr) 6rem;
		gap: 0.5rem;
		align-items: center;
		font-size: 11px;
	}
	.timing-row.without-label {
		grid-template-columns: minmax(4rem, 1fr) auto;
	}
	.rail {
		height: 24px;
		position: relative;
		background: #e7e5e4;
		border: 1px solid #78716c;
	}
	.bar {
		position: absolute;
		inset-block: 2px;
		display: flex;
		background: #1e90ff;
		min-width: 12px;
	}
	button {
		color: white;
		touch-action: none;
	}
	.handle {
		cursor: ew-resize;
		width: 10px;
		flex-shrink: 0;
		font-size: 11px;
	}
	button:disabled { cursor: default; }
	.middle {
		flex: 1;
		cursor: grab;
	}
	button:focus-visible {
		outline: 2px solid #1e90ff;
		outline-offset: 2px;
	}
</style>
