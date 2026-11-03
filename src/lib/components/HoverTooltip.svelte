<script module lang="ts">
	let nextTooltipId = 1;
 let keyboardNavigating = false;
 let lastPointerX=-1,lastPointerY=-1;
</script>

<script lang="ts">
	import { onMount, tick, type Snippet } from 'svelte';
	import { cursorFloatingPosition } from './floating-position';

	let {
		text,
		reopenOnPointerMove = false,
		pointerPosition,
		shortcutKeys = [],
		cursorOffsetXPx = 24,
		cursorOffsetYPx = 18,
		paddingPx = 8,
		minWidthPx = 180,
		placement = 'right',
		panelClass = '',
		maxWidthClass = 'max-w-72',
		wrapperClass = 'relative inline-flex shrink-0',
		children
	}: {
		text: string;
		reopenOnPointerMove?: boolean;
		pointerPosition?: { x: number; y: number };
		shortcutKeys?: string[];
		cursorOffsetXPx?: number;
		cursorOffsetYPx?: number;
		paddingPx?: number;
		minWidthPx?: number;
		placement?: 'right' | 'above' | 'below-left';
		panelClass?: string;
		maxWidthClass?: string;
		wrapperClass?: string;
		children: Snippet;
	} = $props();

	let isOpen = $state(false);
 let anchorMode = $state<'pointer'|'focus'>('pointer');
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
		const anchorX = anchorMode==='pointer' ? pointerPosition?.x ?? cursorX : cursorX;
		const anchorY = anchorMode==='pointer' ? pointerPosition?.y ?? cursorY : cursorY;
		const position =
			placement === 'above'
				? {
						left: Math.max(paddingPx, Math.min(anchorX - panel.offsetWidth / 2, window.innerWidth - panel.offsetWidth - paddingPx)),
						top: Math.max(paddingPx, Math.min(anchorY - panel.offsetHeight - cursorOffsetYPx, window.innerHeight - panel.offsetHeight - paddingPx))
					}
                : placement==='below-left'
                 ? {left:Math.max(paddingPx,Math.min(anchorX-panel.offsetWidth-cursorOffsetXPx,window.innerWidth-panel.offsetWidth-paddingPx)),top:Math.max(paddingPx,Math.min(anchorY+cursorOffsetYPx,window.innerHeight-panel.offsetHeight-paddingPx))}
				: cursorFloatingPosition({
						cursorX: anchorX,
						cursorY: anchorY,
						panelWidth: panel.offsetWidth,
						panelHeight: panel.offsetHeight,
						offsetX: cursorOffsetXPx,
						offsetY: cursorOffsetYPx,
						padding: paddingPx
					});
		left = position.left;
		top = position.top;
	};

	// Delegated tooltips can change text without entering a new wrapper.
	$effect(() => {
		text;
		pointerPosition;
		if (isOpen) void positionPanel();
	});

	const openAtPointer = (event: PointerEvent) => {
        if(keyboardNavigating)return;
        anchorMode='pointer';
		window.dispatchEvent(new CustomEvent('case-play-tooltip-open', { detail: tooltipId }));
		cursorX = event.clientX;
		cursorY = event.clientY;
		isOpen = true;
		positionPanel();
	};
	const followPointer = (event: PointerEvent) => {
        if(keyboardNavigating && !event.movementX && !event.movementY)return;
        keyboardNavigating=false;
        anchorMode='pointer';
		if (!isOpen) {
			if (text && !keyboardNavigating) openAtPointer(event);
			return;
		}
		cursorX = event.clientX;
		cursorY = event.clientY;
		positionPanel();
	};
	const openAtFocus = (event: FocusEvent) => {
        anchorMode='focus';
		window.dispatchEvent(new CustomEvent('case-play-tooltip-open', { detail: tooltipId }));
		const focusTarget = event.target instanceof Element ? event.target : (event.currentTarget as Element);
		const rect = focusTarget.getBoundingClientRect();
		cursorX = placement === 'above' ? rect.left + rect.width / 2 : rect.right;
		cursorY = placement === 'above' ? rect.top : rect.top + rect.height / 2;
		isOpen = true;
		positionPanel();
	};

	onMount(() => {
		const closeForAnotherTooltip = (event: Event) => {
			if ((event as CustomEvent<number>).detail !== tooltipId) isOpen = false;
		};
		const resetForTab = (event: KeyboardEvent) => { if(event.key==='Tab'){keyboardNavigating=true;if(anchorMode==='pointer')isOpen=false;} };
        const pointerInput = () => {keyboardNavigating=false;};
        const pointerMoved = (event:PointerEvent) => {if(event.clientX!==lastPointerX||event.clientY!==lastPointerY)keyboardNavigating=false;lastPointerX=event.clientX;lastPointerY=event.clientY;};
        window.addEventListener('keydown',resetForTab,true);
        window.addEventListener('pointerdown',pointerInput,true);window.addEventListener('pointermove',pointerMoved,true);
        window.addEventListener('case-play-tooltip-open', closeForAnotherTooltip);
		return () => { window.removeEventListener('keydown',resetForTab,true);window.removeEventListener('pointerdown',pointerInput,true);window.removeEventListener('pointermove',pointerMoved,true); window.removeEventListener('case-play-tooltip-open', closeForAnotherTooltip); };
	});
</script>

<span
	class={wrapperClass}
    data-tooltip-owner={tooltipId}
	role="group"
	onpointerenter={openAtPointer}
	onpointerover={reopenOnPointerMove ? openAtPointer : undefined}
	onpointermove={followPointer}
	onpointerleave={(event) => { if (!(event.currentTarget as Element).contains(document.activeElement)) isOpen = false; }}
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
