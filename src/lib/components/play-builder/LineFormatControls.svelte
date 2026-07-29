<script lang="ts">
	import type { GuideColor, GuideStyle } from '$lib/play-builder-scene';
	import HoverTooltip from '../HoverTooltip.svelte';

	let {
		colorOptions,
		selectedColor,
		colorLabel = 'Line color',
		styleOptions = [],
		selectedStyle = null,
		styleLabel = 'Line type',
		showReset = false,
		onColor,
		onStyle,
		onReset
	}: {
		colorOptions: readonly { id: GuideColor; label: string; value: string }[];
		selectedColor: GuideColor;
		colorLabel?: string;
		styleOptions?: readonly GuideStyle[];
		selectedStyle?: GuideStyle | null;
		styleLabel?: string;
		showReset?: boolean;
		onColor: (color: GuideColor) => void;
		onStyle?: (style: GuideStyle) => void;
		onReset?: () => void;
	} = $props();
</script>

<div class="flex gap-1" aria-label={colorLabel}>
	{#each colorOptions as option}
		<HoverTooltip text={option.label} placement="above" minWidthPx={0} wrapperClass="flex h-5 w-5 shrink-0">
			<button
				type="button"
				aria-label={option.label}
				aria-pressed={selectedColor === option.id}
				onclick={() => onColor(option.id)}
				class="h-5 w-5 cursor-pointer border-2 border-white shadow-sm ring-1 ring-stone-400"
				class:!ring-2={selectedColor === option.id}
				class:!ring-stone-950={selectedColor === option.id}
				style:background-color={option.value}
			></button>
		</HoverTooltip>
	{/each}
</div>

{#if selectedStyle && onStyle}
	<div class="flex gap-px bg-stone-400 p-px" aria-label={styleLabel}>
		{#each styleOptions as styleOption}
			<HoverTooltip
				text={styleOption.charAt(0).toUpperCase() + styleOption.slice(1)}
				placement="above"
				minWidthPx={0}
				wrapperClass="flex h-5 w-8 shrink-0"
			>
				<button
					type="button"
					aria-label={`${styleOption} line`}
					aria-pressed={selectedStyle === styleOption}
					onclick={() => onStyle?.(styleOption)}
					class="flex h-5 w-8 cursor-pointer items-center justify-center bg-stone-100 text-stone-700 hover:bg-white"
					class:!bg-stone-900={selectedStyle === styleOption}
					class:!text-white={selectedStyle === styleOption}
				>
					<svg viewBox="0 0 24 6" class="h-2 w-6" aria-hidden="true">
						<line
							x1="1"
							y1="3"
							x2="23"
							y2="3"
							stroke="currentColor"
							stroke-width="2"
							stroke-dasharray={styleOption === 'dashed' ? '6 3' : styleOption === 'dotted' ? '0.01 4' : undefined}
							stroke-linecap={styleOption === 'dotted' ? 'round' : 'square'}
						/>
					</svg>
				</button>
			</HoverTooltip>
		{/each}
	</div>
{/if}

{#if showReset && onReset}
	<HoverTooltip text="Reset to Default" placement="above" minWidthPx={0} wrapperClass="flex h-5 w-6 shrink-0">
		<button
			type="button"
			aria-label="Reset to Default"
			onclick={onReset}
			class="flex h-5 w-6 cursor-pointer items-center justify-center border border-stone-400 bg-stone-100 p-0.5 text-stone-800 hover:border-stone-900 hover:bg-stone-900 hover:text-white"
		>
			<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" aria-hidden="true">
				<path
					d="M21 12a9 9 0 1 1-2.64-6.36L21 8M21 3v5h-5"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	</HoverTooltip>
{/if}
