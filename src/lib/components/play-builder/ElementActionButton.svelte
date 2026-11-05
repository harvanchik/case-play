<script lang="ts">
	import HoverTooltip from '../HoverTooltip.svelte';
	export let kind: 'remove' | 'revert';
	export let label: string;
	export let tooltip: string;
	export let buttonClass = '';
	export let wrapperClass = '';
	export let element: HTMLElement | undefined = undefined;
	export let onactivate: (event: PointerEvent) => void;
</script>

<HoverTooltip text={tooltip} placement="below-left" minWidthPx={0} {wrapperClass}>
	<button bind:this={element} type="button" aria-label={label} on:pointerdown|preventDefault|stopPropagation={onactivate}
		class={(kind === 'revert' ? 'element-revert-button ' : '') + 'element-delete-button ' + buttonClass}><slot/></button>
</HoverTooltip>

<style>
	.element-delete-button:hover,.element-delete-button:focus-visible{background-color:#dc2626!important;}
	.element-revert-button:hover{background-color:#fff!important;color:#000!important;border-color:#000!important;}
</style>
