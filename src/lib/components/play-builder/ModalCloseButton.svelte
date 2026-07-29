<script lang="ts">
	let {
		element = $bindable(),
		ariaLabel,
		disabled = false,
		onClose
	}: {
		element?: HTMLButtonElement;
		ariaLabel: string;
		disabled?: boolean;
		onClose: () => void;
	} = $props();
</script>

<button
	bind:this={element}
	type="button"
	aria-label={ariaLabel}
	{disabled}
	onclick={onClose}
	class="grid h-8 w-8 shrink-0 cursor-pointer place-items-center bg-white p-0 leading-none text-stone-900 hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50"
>
	<svg viewBox="0 0 24 24" class="block h-4 w-4" aria-hidden="true">
		<path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" />
	</svg>
</button>
