<script lang="ts">
	import HoverTooltip from '../HoverTooltip.svelte';

	type FieldSide = 'a' | 'b';

	let {
		side,
		size = 'compact',
		onToggle
	}: {
		side: FieldSide;
		size?: 'compact' | 'marker';
		onToggle: () => void;
	} = $props();
</script>

<HoverTooltip
	text={`Flip to ${side === 'a' ? 'B' : 'A'}'s Side`}
	placement="above"
	minWidthPx={0}
	wrapperClass={size === 'compact' ? 'flex h-5 w-5 shrink-0' : 'flex h-7 w-7 shrink-0'}
>
	<button
		type="button"
		aria-label={`Field side ${side.toUpperCase()}; switch to ${side === 'a' ? 'B' : 'A'}`}
		onclick={onToggle}
		class="shrink-0 cursor-pointer leading-none font-black"
		class:h-5={size === 'compact'}
		class:w-5={size === 'compact'}
		class:border={size === 'compact'}
		class:border-stone-900={size === 'compact'}
		class:text-[10px]={size === 'compact'}
		class:h-7={size === 'marker'}
		class:w-7={size === 'marker'}
		class:text-[11px]={size === 'marker'}
		class:bg-stone-900={side === 'a'}
		class:text-white={side === 'a'}
		class:bg-white={side === 'b'}
		class:text-stone-950={side === 'b'}
	>
		{side.toUpperCase()}
	</button>
</HoverTooltip>
