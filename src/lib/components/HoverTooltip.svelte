<script module lang="ts">
	let nextTooltipId = 1;
</script>

<script lang="ts">
	import { onMount, tick, type Snippet } from 'svelte';
	import { cursorFloatingPosition } from './floating-position';

	let {
		text,
		shortcutKeys = [],
		cursorOffsetXPx = 24,
		cursorOffsetYPx = 18,
		paddingPx = 8,
		minWidthPx = 180,
		panelClass = '',
		maxWidthClass = 'max-w-72',
		wrapperClass = 'relative inline-flex shrink-0',
		children
	}: {
		text: string;
		shortcutKeys?: string[];
		cursorOffsetXPx?: number;
		cursorOffsetYPx?: number;
		paddingPx?: number;
		minWidthPx?: number;
		panelClass?: string;
		maxWidthClass?: string;
		wrapperClass?: string;
		children: Snippet;
	} = $props();

	let isOpen = $state(false);
	let panel = $state<HTMLDivElement>();
	let cursorX = $state(0);
	let cursorY = $state(0);
	let left = $state(0);
	let top = $state(0);
	const tooltipId = nextTooltipId++;

	const portal = (node: HTMLElement) => {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	};

	const positionPanel = async () => {
		await tick();
		if (!panel) return;
		const position = cursorFloatingPosition({
			cursorX,
			cursorY,
			panelWidth: panel.offsetWidth,
			panelHeight: panel.offsetHeight,
			offsetX: cursorOffsetXPx,
			offsetY: cursorOffsetYPx,
			padding: paddingPx
		});
		left = position.left;
		top = position.top;
	};

	const openAtPointer = (event: PointerEvent) => {
		window.dispatchEvent(new CustomEvent('case-play-tooltip-open', { detail: tooltipId }));
		cursorX = event.clientX;
		cursorY = event.clientY;
		isOpen = true;
		positionPanel();
	};
	const followPointer = (event: PointerEvent) => {
		if (!isOpen) return;
		cursorX = event.clientX;
		cursorY = event.clientY;
		positionPanel();
	};
	const openAtFocus = (event: FocusEvent) => {
		window.dispatchEvent(new CustomEvent('case-play-tooltip-open', { detail: tooltipId }));
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		cursorX = rect.right;
		cursorY = rect.top + rect.height / 2;
		isOpen = true;
		positionPanel();
	};

	onMount(() => {
		const closeForAnotherTooltip = (event: Event) => {
			if ((event as CustomEvent<number>).detail !== tooltipId) isOpen = false;
		};
		window.addEventListener('case-play-tooltip-open', closeForAnotherTooltip);
		return () => window.removeEventListener('case-play-tooltip-open', closeForAnotherTooltip);
	});
</script>

<span
	class={wrapperClass}
	onpointerenter={openAtPointer}
	onpointermove={followPointer}
	onpointerleave={() => (isOpen = false)}
	onfocusin={openAtFocus}
	onfocusout={() => (isOpen = false)}
>
	{@render children()}
</span>

{#if isOpen && text}
	<div
		bind:this={panel}
		use:portal
		class={`pointer-events-none fixed z-[2147483647] flex items-center gap-2 border border-stone-700 bg-stone-950 px-2 py-1 text-[0.68rem] font-semibold whitespace-nowrap text-white shadow-lg ${maxWidthClass} ${panelClass}`}
		style:left={`${left}px`}
		style:top={`${top}px`}
		style:min-width={`${minWidthPx}px`}
		role="tooltip"
	>
		<span>{text}</span>
		{#if shortcutKeys.length > 0}
			<span class="flex items-center gap-0.5" aria-label={`Shortcut ${shortcutKeys.join(' plus ')}`}>
				{#each shortcutKeys as key}
					<kbd class="border border-stone-500 bg-stone-800 px-1 py-0.5 font-mono text-[0.62rem] leading-none text-stone-100">{key}</kbd>
				{/each}
			</span>
		{/if}
	</div>
{/if}
