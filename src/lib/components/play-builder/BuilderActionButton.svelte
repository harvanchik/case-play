<script lang="ts">
	import type { Snippet } from 'svelte';
	import HoverTooltip from '../HoverTooltip.svelte';

	let {
		tooltip,
		shortcutKeys = [],
		ariaLabel,
		ariaKeyshortcuts,
		label,
		disabled = false,
		busy = false,
		expanded,
		pressed,
		tutorial,
		wrapperClass = 'flex h-9 w-10 shrink-0',
		buttonClass = '',
		disabledOpacity = '50',
		labelClass = 'text-[8px] leading-none font-semibold',
		labelStyle,
		onclick,
		onpointerdown,
		children
	}: {
		tooltip: string;
		shortcutKeys?: string[];
		ariaLabel: string;
		ariaKeyshortcuts?: string;
		label: string;
		disabled?: boolean;
		busy?: boolean;
		expanded?: boolean;
		pressed?: boolean;
		tutorial?: string;
		wrapperClass?: string;
		buttonClass?: string;
		disabledOpacity?: '35' | '40' | '50';
		labelClass?: string;
		labelStyle?: string;
		onclick?: (event: MouseEvent) => void;
		onpointerdown?: (event: PointerEvent) => void;
		children: Snippet;
	} = $props();
</script>

<HoverTooltip text={tooltip} {shortcutKeys} minWidthPx={0} {wrapperClass}>
	<button
		type="button"
		data-tutorial={tutorial}
		aria-label={ariaLabel}
		aria-keyshortcuts={ariaKeyshortcuts}
		aria-expanded={expanded}
		aria-pressed={pressed}
		aria-busy={busy}
		{disabled}
		{onclick}
		{onpointerdown}
		class={`flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white disabled:cursor-not-allowed ${buttonClass}`}
		class:disabled:opacity-35={disabledOpacity === '35'}
		class:disabled:opacity-40={disabledOpacity === '40'}
		class:disabled:opacity-50={disabledOpacity === '50'}
		class:!cursor-wait={busy}
	>
		{@render children()}
		<span class={labelClass} style={labelStyle}>{label || '\u00a0'}</span>
	</button>
</HoverTooltip>
