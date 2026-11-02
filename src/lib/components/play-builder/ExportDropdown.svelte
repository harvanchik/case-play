<script lang="ts">
	import { onMount } from 'svelte';
	import HoverTooltip from '../HoverTooltip.svelte';
	import BuilderActionButton from './BuilderActionButton.svelte';
	export let formats: string[];
	export let video = false;
	export let progress: number | null = null;
	export let oncancel: () => void = () => {};
	export let multiple = false;
	export let onall: (format: string) => void = () => {};
	export let disabled = false;
	export let allDisabled: boolean | undefined = undefined;
	export let tooltip = '';
	export let onselect: (format: string) => void;
	let open = false;
	let anchor: HTMLDivElement;
	let menu: HTMLDivElement;
	let left = 0,
		top = 0;
	function close(event: PointerEvent) {
		if (!anchor?.contains(event.target as Node) && !menu?.contains(event.target as Node)) open = false;
	}
	function toggle() {
		open = !open;
		const box = anchor.getBoundingClientRect();
		left = Math.max(4, Math.min(window.innerWidth - (multiple ? 58 : 44), box.left));
		top = box.bottom + 6;
		if (top + (formats.length - 1) * 42 > window.innerHeight) top = Math.max(4, box.top - (formats.length - 1) * 42);
	}
	function portal(node: HTMLElement) {
		document.body.append(node);
		return { destroy: () => node.remove() };
	}
	onMount(() => {
		document.addEventListener('pointerdown', close);
		return () => document.removeEventListener('pointerdown', close);
	});
</script>

<svelte:window
	on:keydown={(e) => {
		if (e.key === 'Escape') open = false;
	}}
	on:resize={() => (open = false)}
	on:scroll={() => (open = false)}
/>
{#snippet allButton(format: string)}
	<HoverTooltip text={`Export All Plays as ${format.toUpperCase()}`} minWidthPx={0} wrapperClass="flex">
		<button
			type="button"
			class="sliver all"
			disabled={allDisabled ?? disabled}
			aria-label={`Export All Plays as ${format.toUpperCase()}`}
			on:click={() => {
				open = false;
				onall(format);
			}}>A<br />L<br />L</button
		>
	</HoverTooltip>
{/snippet}
{#snippet icon()}
	<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
		{#if video}<path d="M3 5h18v14H3zM8 5v14M16 5v14M3 9h5M3 15h5M16 9h5M16 15h5" />{:else}<path d="M3 4h18v16H3zM5 18l5-5 3 3 2-2 4 4" /><circle
				cx="8"
				cy="9"
				r="1.5"
			/>{/if}
	</svg>
{/snippet}
<div bind:this={anchor} class="split">
 {#if progress !== null}
 <HoverTooltip text="Cancel Export" minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0"><button type="button" class="cancel-export" aria-label="Cancel export" on:click={oncancel} style:background={`linear-gradient(to right, #f5f5f4 ${progress}%, rgba(245,245,244,.4) ${progress}%)`}><span>{progress}%</span><span>Cancel</span></button></HoverTooltip>
 {:else}
	<BuilderActionButton
		ariaLabel={`Export ${formats[0].toUpperCase()}${video ? ' video' : ' image'}`}
		label={formats[0].toUpperCase()}
		tooltip={tooltip || `Export ${formats[0].toUpperCase()}`}
		{disabled}
		onclick={() => {
			open = false;
			onselect(formats[0]);
		}}>{@render icon()}</BuilderActionButton
	>
 {/if}
	<button
		type="button"
		class="sliver"
		disabled={open && multiple && (allDisabled ?? disabled)}
		aria-label={open && multiple ? `Export All Plays as ${formats[0].toUpperCase()}` : video ? 'More video formats' : 'More image formats'}
		aria-expanded={open}
		on:click={() => {
			if (open && multiple) {
				open = false;
				onall(formats[0]);
			} else toggle();
		}}
		>{#if open && multiple}<HoverTooltip text={`Export All Plays as ${formats[0].toUpperCase()}`} minWidthPx={0}
				><span class="all">A<br />L<br />L</span></HoverTooltip
			>{:else}<svg viewBox="0 0 12 12" width="9" height="9" aria-hidden="true"
				><path d="m2 4 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" /></svg
			>{/if}</button
	>
</div>
{#if open}<div
		bind:this={menu}
		use:portal
		class="format-menu"
		role="group"
		aria-label={video ? 'Video formats' : 'Image formats'}
		style:left={`${left}px`}
		style:top={`${top}px`}
	>
		{#each formats.slice(1) as format}<div class="split">
				<BuilderActionButton
					ariaLabel={`Export ${format.toUpperCase()}${video ? ' video' : ' image'}`}
					label={format.toUpperCase()}
					tooltip={tooltip || `Export ${format.toUpperCase()}`}
					{disabled}
					onclick={() => {
						open = false;
						onselect(format);
					}}>{@render icon()}</BuilderActionButton
				>{#if multiple}{@render allButton(format)}{/if}
			</div>{/each}
	</div>{/if}

<style>
	.cancel-export {pointer-events:auto;width:40px;height:36px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#292524;cursor:pointer;font-size:8px;font-weight:600;}
	.split {
		display: flex;
		gap: 1px;
	}
	.sliver {
		width: 12px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f5f5f4;
		color: #292524;
		cursor: pointer;
	}
	.all {
		font-size: 8px;
		line-height: 9px;
		font-weight: 700;
		text-align: center;
	}
	.sliver:hover {
		background: white;
	}
	.format-menu {
		position: fixed;
		z-index: 2147483646;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
</style>
