<script lang="ts">
	let {
		label,
		description,
		checked,
		disabled = false,
		onToggle
	}: {
		label: string;
		description: string;
		checked: boolean;
		disabled?: boolean;
		onToggle: () => void;
	} = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	{disabled}
	onclick={onToggle}
	class="flex h-full cursor-pointer items-start gap-3 border border-stone-400 bg-white/75 p-3 text-left hover:border-stone-900 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
>
	<span class="relative mt-0.5 h-5 w-9 shrink-0 border-2 border-stone-700 bg-stone-300 transition-colors" class:!bg-green-600={checked}>
		<span class="absolute top-0.5 h-3 w-3 bg-white transition-[left]" class:left-0.5={!checked} class:left-[18px]={checked}></span>
	</span>
	<span class="min-w-0">
		<strong class="block text-xs font-black">{label}</strong>
		<span class="mt-0.5 block text-[11px] leading-snug text-stone-600">{description}</span>
	</span>
</button>
