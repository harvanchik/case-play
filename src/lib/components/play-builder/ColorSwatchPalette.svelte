<script lang="ts" generics="T extends string">
	import HoverTooltip from '../HoverTooltip.svelte';

	let {
		options,
		selected,
		groupLabel,
		itemLabel,
		columns,
		placement = 'above',
		onSelect
	}: {
		options: readonly { id: T; label: string; value: string }[];
		selected: T;
		groupLabel: string;
		itemLabel: (option: { id: T; label: string; value: string }) => string;
		columns?: number;
		placement?: 'right' | 'above';
		onSelect: (id: T) => void;
	} = $props();
</script>

<div
	class="mt-1 justify-center gap-1"
	class:flex={!columns}
	class:grid={Boolean(columns)}
	style:grid-template-columns={columns ? `repeat(${columns}, 1.5rem)` : undefined}
	role="group"
	aria-label={groupLabel}
>
	{#each options as option}
		<HoverTooltip text={option.label} {placement} minWidthPx={0} wrapperClass="flex h-6 w-6 shrink-0">
			<button
				type="button"
				aria-label={itemLabel(option)}
				aria-pressed={selected === option.id}
				onclick={() => onSelect(option.id)}
				class="h-6 w-6 cursor-pointer border border-stone-600 ring-offset-1 ring-offset-white hover:ring-1 hover:ring-stone-500"
				class:ring-2={selected === option.id}
				class:ring-stone-950={selected === option.id}
				style:background={option.value}
			></button>
		</HoverTooltip>
	{/each}
</div>
