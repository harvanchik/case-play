<script lang="ts">
	import HoverTooltip from '../HoverTooltip.svelte';
	import type { Motion } from '$lib/play-builder-animation';
	export let motion: Motion;
	export let duration: number;
	export let label: string;
	export let showLabel = true;
	export let onchange: (motion: Motion) => void;
	let pending: Motion | null = null;
	let railWidth = 0;
	let speedLabelWidth = 0;
	$: visualBarWidth = Math.min(railWidth,Math.max(20,(displayed.end-displayed.start)*railWidth));
	$: barLeft = Math.max(0,Math.min(displayed.start*railWidth,railWidth-visualBarWidth));
	$: barRight = barLeft+visualBarWidth;
	$: speedOutside = barRight - barLeft < speedLabelWidth + 24;
	$: labelOnLeft = barLeft >= speedLabelWidth + 4 || barLeft > railWidth - barRight;
	$: speedLabelLeft = speedOutside
		? labelOnLeft ? Math.max(0, barLeft - speedLabelWidth - 4) : Math.min(railWidth - speedLabelWidth, barRight + 4)
		: (barLeft + barRight - speedLabelWidth) / 2;
	let drag: { x: number; width: number; mode: 'start' | 'end' | 'move'; original: Motion; moved: boolean } | null = null;
	// Legacy documents may store speed separately; present the actual arrival window.
	$: windowMotion = motion.path === 'jump' ? motion : { ...motion, end: Math.min(1, motion.start + (motion.end - motion.start) / (motion.speed ?? 1)), speed: 1 };
	$: displayed = pending ?? windowMotion;
	const speedOf = (value: Motion) => value.path === 'jump' ? value.speed ?? 1 : 1 / (value.end - value.start);
 let editingTime: 'start' | 'end' | null = null;
 let timeDraft = '';
 function commitTime(mode: 'start' | 'end') {
  if (editingTime !== mode) return;
  const text = timeDraft.trim().replace(/s$/i, '').trim();
  const seconds = /^\d*\.?\d+$/.test(text) ? Number(text) : NaN;
  editingTime = null;
  if (!Number.isFinite(seconds)) return;
  const next = { ...windowMotion };
  const minimum = .01 / duration;
  if (mode === 'start') next.start = Math.max(0, Math.min(next.end - minimum, 1 - minimum, seconds / duration));
  else next.end = Math.max(next.start + minimum, minimum, Math.min(1, seconds / duration));
  onchange(next);
 }
 function timeKey(event: KeyboardEvent, mode: 'start' | 'end') {
  if(event.key==='ArrowUp'||event.key==='ArrowDown'){
   event.preventDefault();
   const parsed=Number(timeDraft.trim().replace(/s$/i,''));
   const seconds=(Number.isFinite(parsed)?parsed:windowMotion[mode]*duration)+(event.key==='ArrowUp'?1:-1)*(event.shiftKey?.01:.05);
   const next={...windowMotion};
   const adjusted=mode==='start'?Math.max(0,Math.min(windowMotion.end*duration-.01,duration-.01,seconds)):Math.max(windowMotion.start*duration+.01,.01,Math.min(duration,seconds));
   const rounded=Math.round(adjusted*1000)/1000;
   next[mode]=rounded/duration;timeDraft=String(rounded);onchange(next);
  }

  if (event.key === 'Enter') { event.preventDefault(); event.currentTarget instanceof HTMLInputElement && event.currentTarget.blur(); }
  if (event.key === 'Escape') { editingTime = null; (event.currentTarget as HTMLInputElement).blur(); }
 }

	function cycle(reverse = false) {
        if(motion.path==='jump')return;
		const speeds = [1, 1.25, 1.5, 1.75, 2];
		const next = reverse ? [...speeds].reverse().find(speed => speed < speedOf(windowMotion) - .00001) ?? speeds[speeds.length-1] : speeds.find(speed => speed > speedOf(windowMotion) + .00001) ?? speeds[0];
		{
			const width = 1 / next;
			const start = Math.min(windowMotion.start, 1 - width);
			onchange({ ...windowMotion, start, end: start + width, speed: 1 });
		}
	}
	function begin(event: PointerEvent, mode: 'start' | 'end' | 'move') {
		event.preventDefault();
		event.stopPropagation();
		if (motion.path === 'jump' && mode === 'end') return;
		const target = event.currentTarget as HTMLElement;
		const rail = target.closest('[data-timing-rail]')!;
		drag = { x: event.clientX, width: rail.getBoundingClientRect().width, mode, original: { ...windowMotion }, moved: false };
		target.setPointerCapture(event.pointerId);
	}
	function move(event: PointerEvent) {
		if (!drag) return;
		if (Math.abs(event.clientX - drag.x) < 3 && !drag.moved) return;
		drag.moved = true;
		if (motion.path === 'jump' && drag.mode === 'move') return;
		const increment = event.shiftKey ? 0.01 : 0.05;
		const delta = (Math.round((((event.clientX - drag.x) / drag.width) * duration) / increment) * increment) / duration;
		const { original, mode } = drag;
		pending = { ...original };
		const minimum = Math.min(increment / duration, 0.5);
		if (mode === 'start') pending.start = Math.max(0, Math.min(original.end - minimum, original.start + delta));
		else if (mode === 'end') pending.end = Math.min(1, Math.max(original.start + minimum, original.end + delta));
		else {
			const offset = Math.max(-original.start, Math.min(1 - original.end, delta));
			pending.start += offset;
			pending.end += offset;
		}
	}
	function end(event: PointerEvent) {
		if (drag?.mode === 'move' && !drag.moved) cycle(event.shiftKey);
		else if (pending) onchange(pending);
		drag = null;
		pending = null;
	}
	function keyboard(event: KeyboardEvent, mode: 'start' | 'end' | 'move') {
		const motion = windowMotion;
		if ((event.key === 'Enter' || event.key === ' ') && mode === 'move') {
			event.preventDefault();
			cycle(event.shiftKey);
			return;
		}
		if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || (motion.path === 'jump' && mode === 'end')) return;
		event.preventDefault();
		const step = (event.shiftKey ? 0.01 : 0.05) / duration;
		const delta = event.key === 'ArrowLeft' ? -step : step;
		if (mode === 'start') onchange({ ...motion, start: Math.max(0, Math.min(motion.end - step, motion.start + delta)) });
		else if (mode === 'end') onchange({ ...motion, end: Math.min(1, Math.max(motion.start + step, motion.end + delta)) });
		else if (motion.path !== 'jump') {
			const shift = Math.max(-motion.start, Math.min(1 - motion.end, delta));
			onchange({ ...motion, start: motion.start + shift, end: motion.end + shift });
		}
	}
</script>

<div class="timing-row" class:without-label={!showLabel}>
	{#if showLabel}<span class="truncate">{label}</span>{/if}
	<input class="timing-start tabular-nums time-input" aria-label={`${label} start seconds`} type="text" inputmode="decimal" autocomplete="off" spellcheck={false}
 value={editingTime === 'start' ? timeDraft : `${(displayed.start * duration).toFixed(2)}s`}
 style:width={`${Math.max(4, (displayed.start * duration).toFixed(2).length + 1)}ch`}

 on:pointerdown={event => { if (document.activeElement !== event.currentTarget) { event.preventDefault(); event.currentTarget.focus(); } }}
 on:focus={event => { editingTime = 'start'; timeDraft = (displayed.start * duration).toFixed(2); event.currentTarget.value = timeDraft; event.currentTarget.select(); }}
 on:input={event => timeDraft = event.currentTarget.value}
 on:blur={() => commitTime('start')} on:keydown={event => timeKey(event, 'start')} />
 <HoverTooltip text={motion.path==='jump'?'':'Element Speed Multiplier'} minWidthPx={0} wrapperClass="contents">
	<div
		data-timing-rail
        bind:clientWidth={railWidth}
		class="rail"
		role="button"
		tabindex="0"
		aria-label={`Cycle ${label} speed`}
		on:pointerdown={(event) => {
			if (event.target === event.currentTarget) {
				event.preventDefault();
				cycle(event.shiftKey);
			}
		}}
		on:keydown={(event) => {
			if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
				event.preventDefault();
				cycle(event.shiftKey);
			}
		}}
	>
		<div class="bar" style:left={`${barLeft}px`} style:width={`${visualBarWidth}px`}>
			{#each ['start', 'move', 'end'] as mode}
				<button
					type="button"
					class:handle={mode !== 'move'}
					class:middle={mode === 'move'}
					disabled={motion.path === 'jump' && mode === 'end'}
					aria-label={mode === 'start' ? `${label} start time` : mode === 'end' ? `${label} arrival time` : `Shift ${label} movement`}
					on:pointerdown={(event) => begin(event, mode as 'start' | 'end' | 'move')}
					on:pointermove={move}
					on:pointerup={end}
					on:pointercancel={() => {
						drag = null;
						pending = null;
					}}
					on:keydown={(event) => keyboard(event, mode as 'start' | 'end' | 'move')}
					>{#if mode==='move'}{#if motion.path!=='jump'}        <span class="speed-label" class:outside={speedOutside} data-speed-label data-outside={speedOutside} bind:clientWidth={speedLabelWidth} style:left={`${speedLabelLeft-barLeft}px`}>{`${speedOf(displayed).toFixed(2).replace(/0$/, '')}×`}</span>{/if}{:else}│{/if}</button
				>
			{/each}
		</div>

	</div>
 </HoverTooltip>
	<input class="timing-end tabular-nums time-input" aria-label={`${label} end seconds`} type="text" inputmode="decimal" autocomplete="off" spellcheck={false}
 value={editingTime === 'end' ? timeDraft : `${(displayed.end * duration).toFixed(2)}s`}
 style:width={`${Math.max(4, (displayed.end * duration).toFixed(2).length + 1)}ch`}
 disabled={motion.path === 'jump'}
 on:pointerdown={event => { if (document.activeElement !== event.currentTarget) { event.preventDefault(); event.currentTarget.focus(); } }}
 on:focus={event => { editingTime = 'end'; timeDraft = (displayed.end * duration).toFixed(2); event.currentTarget.value = timeDraft; event.currentTarget.select(); }}
 on:input={event => timeDraft = event.currentTarget.value}
 on:blur={() => commitTime('end')} on:keydown={event => timeKey(event, 'end')} />
</div>

<style>
	.timing-row {
		display: grid;
		grid-template-columns: 3rem auto minmax(4rem, 1fr) auto;
		gap: 0.4rem;
		align-items: center;
		font-size: 11px;
	}
	.timing-row.without-label {
		grid-template-columns: auto minmax(4rem, 1fr) auto;
	}
 .time-input { appearance: none; border: 0; border-radius: 0; background: transparent; padding: 0; margin: 0; min-width: 0; font: inherit; color: inherit; line-height: inherit; outline: none !important; box-shadow: none !important; text-align: left; }
 .time-input:disabled { opacity: 1; }
	.rail {
		height: 24px;
		position: relative;
		background: #e7e5e4;
		border: 1px solid #78716c;
		cursor: pointer;
	}
	.bar {
		position: absolute;
		inset-block: 2px;
		display: flex;
		background: #1e90ff;
		min-width: 20px;
	}
	.speed-label {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		font-size: 10px;
		font-weight: 700;
		white-space: nowrap;
		pointer-events: auto;
		color: white;
	}
	.speed-label.outside { color: #292524; }
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
	.middle {
		flex: 1;
		min-width: 0;
		overflow: visible;
		cursor: grab;
		font-size: 10px;
		font-weight: 700;
	}
	button:disabled {
		cursor: default;
		opacity: 0.4;
	}
	button:focus-visible {
		outline: 1px solid #1e90ff;
		outline-offset: 1px;
	}
</style>
