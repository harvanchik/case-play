<script lang="ts">
	import HoverTooltip from '../HoverTooltip.svelte';

	type Variant = 'compact' | 'los-marker' | 'ltg-marker';

	let {
		element = $bindable(),
		value,
		label,
		tooltip,
		min,
		max,
		step = 0.5,
		type = 'number',
		pattern,
		disabled = false,
		variant = 'compact',
		onValueInput,
		onMoveYard,
		onCommit,
		onEscape,
		onStep
	}: {
		element?: HTMLInputElement;
		value: number | string;
		label: string;
		tooltip: string;
		min: number;
		max: number;
		step?: number;
		type?: 'number' | 'text';
		pattern?: string;
		disabled?: boolean;
		variant?: Variant;
		onValueInput: (input: HTMLInputElement) => void;
		onMoveYard: (direction: -1 | 1) => void;
		onCommit: (input: HTMLInputElement) => void;
		onEscape: () => void;
		onStep?: (input: HTMLInputElement, direction: -1 | 1) => void;
	} = $props();

	const handleKeydown = (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => {
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			event.preventDefault();
			onMoveYard(event.key === 'ArrowLeft' ? -1 : 1);
			return;
		}
		if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			event.preventDefault();
			const direction = event.key === 'ArrowUp' ? 1 : -1;
			if (onStep) onStep(event.currentTarget, direction);
			else {
				if (direction === 1) event.currentTarget.stepUp();
				else event.currentTarget.stepDown();
				onValueInput(event.currentTarget);
			}
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			onCommit(event.currentTarget);
			return;
		}
		if (event.key !== 'Escape') return;
		event.preventDefault();
		onEscape();
	};
</script>

<HoverTooltip
	text={tooltip}
	placement="above"
	minWidthPx={0}
	wrapperClass={variant === 'compact' ? 'flex h-5 w-8 shrink-0' : 'flex h-7 w-9 shrink-0'}
>
	<input
		bind:this={element}
		{type}
		{min}
		{max}
		{step}
		inputmode="decimal"
		{pattern}
		{value}
		{disabled}
		aria-label={label}
		class="yardage-input px-1 text-center text-[10px] font-black outline-none"
		class:h-5={variant === 'compact'}
		class:w-8={variant === 'compact'}
		class:leading-none={variant === 'compact'}
		class:border={variant === 'compact'}
		class:border-stone-900={variant === 'compact'}
		class:bg-stone-100={variant === 'compact' || variant === 'ltg-marker'}
		class:text-stone-800={variant === 'compact' || variant === 'ltg-marker'}
		class:hover:bg-stone-200={variant === 'compact'}
		class:focus:bg-white={variant === 'compact' || variant === 'ltg-marker'}
		class:focus:ring-1={variant === 'compact'}
		class:focus:ring-stone-700={variant === 'compact'}
		class:h-7={variant !== 'compact'}
		class:w-9={variant !== 'compact'}
		class:border-0={variant !== 'compact'}
		class:bg-white={variant === 'los-marker'}
		class:text-stone-950={variant === 'los-marker'}
		class:hover:bg-green-100={variant === 'los-marker'}
		class:focus:ring-2={variant !== 'compact'}
		class:focus:ring-green-600={variant === 'los-marker'}
		class:hover:bg-orange-100={variant === 'ltg-marker'}
		class:focus:ring-[#ff5a1f]={variant === 'ltg-marker'}
		class:focus:ring-inset={true}
		class:opacity-40={disabled}
		onfocus={(event) => event.currentTarget.select()}
		oninput={(event) => onValueInput(event.currentTarget)}
		onkeydown={handleKeydown}
	/>
</HoverTooltip>

<style>
	.yardage-input {
		appearance: textfield;
		-moz-appearance: textfield;
	}
	.yardage-input::-webkit-inner-spin-button,
	.yardage-input::-webkit-outer-spin-button {
		margin: 0;
		appearance: none;
		-webkit-appearance: none;
	}
</style>
