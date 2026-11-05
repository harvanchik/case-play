<script lang="ts">
	import HoverTooltip from '../HoverTooltip.svelte';
	import DropdownChevron from './DropdownChevron.svelte';
	export let kind: 'remove' | 'revert';
	export let label: string;
	export let tooltip: string;
	export let buttonClass = '';
	export let wrapperClass = '';
	export let element: HTMLElement | undefined = undefined;
	export let onactivate: (event: PointerEvent) => void;
	export let onall: (() => void) | undefined = undefined;
	export let count=1;
	let open=false;
	let root:HTMLDivElement;
	let menu:HTMLDivElement;
	let left=0,top=0;
	const portal=(node:HTMLElement)=>{(document.fullscreenElement??document.body).appendChild(node);return{destroy:()=>node.remove()};};
	function toggle(event:MouseEvent){
		const bounds=(event.currentTarget as HTMLElement).getBoundingClientRect();
		left=Math.max(4,Math.min(innerWidth-206,bounds.right-202));top=Math.min(innerHeight-64,bounds.bottom+4);open=!open;
	}
</script>

<svelte:window on:pointerdown|capture={event=>{if(!root?.contains(event.target as Node)&&!menu?.contains(event.target as Node))open=false;}} on:keydown={event=>{if(event.key==='Escape')open=false;}}/>
<div bind:this={root} class:contents={!onall} class:action-split={!!onall}>
<HoverTooltip text={tooltip} shortcutKeys={[kind==='revert'?'BACKSPACE':'DELETE']} placement="below-left" minWidthPx={0} {wrapperClass}>
	<button bind:this={element} type="button" aria-label={label} on:pointerdown|preventDefault|stopPropagation={onactivate}
		class={(kind === 'revert' ? 'element-revert-button ' : '') + 'element-delete-button ' + buttonClass}><slot/></button>
</HoverTooltip>
{#if onall}<HoverTooltip dismissOnClick text={kind==='revert'?'Revert Options':'Delete Options'} placement="below-left" minWidthPx={0}><button type="button" class="action-chevron" aria-label={kind==='revert'?'Revert options':'Delete options'} aria-expanded={open} on:pointerdown|stopPropagation on:click|stopPropagation={toggle}><DropdownChevron {open}/></button></HoverTooltip>{/if}
</div>
{#if open&&onall}<div bind:this={menu} data-element-action-menu use:portal class="action-menu" role="menu" tabindex="-1" style:left={`${left}px`} style:top={`${top}px`} on:pointerdown|stopPropagation>
 <button role="menuitem" on:click={()=>{open=false;onactivate(new PointerEvent('pointerdown'));}}>{kind==='revert'?'Revert':'Delete'} {count>1?'These':'This'} Only</button>
 <button role="menuitem" on:click={()=>{open=false;onall?.();}}>{kind==='revert'?'Revert & Update All Future Steps':'Delete & Update All Future Steps'}</button>
</div>{/if}

<style>
	.element-delete-button:hover,.element-delete-button:focus-visible{background-color:#dc2626!important;}
	.element-revert-button:hover{background-color:#fff!important;color:#000!important;border-color:#000!important;}
	.action-split{display:inline-flex;align-items:stretch;}
	.action-chevron{display:flex;width:11px;height:28px;align-items:center;justify-content:center;border:2px solid white;border-left:0;background:#1c1917;color:white;cursor:pointer;}
	.action-chevron :global(svg){width:10px;height:10px;}
	.action-chevron:hover{background:#fff;color:#000;border-color:#000;}
	.action-menu{position:fixed;z-index:1000000003;display:flex;flex-direction:column;border:2px solid #fff;background:#1c1917;padding:2px;color:white;}
	.action-menu button{padding:5px 6px;text-align:left;font:600 9px/1.2 Inter,sans-serif;white-space:nowrap;color:white;cursor:pointer;}
	.action-menu button:hover{background:#44403c;}
</style>
