<script lang="ts">
	export let element: HTMLInputElement | undefined = undefined;
	export let value = '';
	export let id: string;
	export let label: string;
	export let maxlength: number;
	export let placeholder: string | undefined = undefined;
	export let className: string;
</script>

<input bind:this={element} bind:value {id} {maxlength} {placeholder} aria-label={label} class={className} on:keydown />
