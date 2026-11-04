<script lang="ts">
 import type {SetupVariant} from '$lib/play-builder-setups';
 import BuilderActionButton from './BuilderActionButton.svelte';import HoverTooltip from '../HoverTooltip.svelte';import DropdownChevron from './DropdownChevron.svelte';
 export let onvariant:(variant:SetupVariant)=>void=()=>{};
 export let disabled=false;export let onsetup:()=>void;export let modifier='Ctrl';
 let open=false,anchor:HTMLDivElement,menu:HTMLDivElement,left=0,bottom=0;
 $: if(disabled)open=false;
 function toggle(){if(disabled)return;const box=anchor.getBoundingClientRect();left=box.left;bottom=innerHeight-box.top+6;open=!open;}
 function portal(node:HTMLElement){(document.fullscreenElement??document.body).append(node);return{destroy:()=>node.remove()};}
</script>
<svelte:window on:pointerdown={event=>{if(!anchor?.contains(event.target as Node)&&!menu?.contains(event.target as Node))open=false;}} on:keydown={event=>{if(event.key==='Escape')open=false;}} on:resize={()=>open=false}/>
<div bind:this={anchor} class="flex gap-px">
 <BuilderActionButton tooltip="Default Setup" shortcutKeys={[modifier,'Shift','S']} ariaLabel="Set up default play" label="Setup" buttonClass="relative" tutorial="setup-button" {disabled} onclick={onsetup}><span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 px-1 text-[8px] leading-3 font-black text-white">NEW</span><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5h16v14H4zM8 5v14M13 5v14M18 5v14"/><circle cx="10.5" cy="12" r="1.5" fill="currentColor"/></svg></BuilderActionButton>
 <HoverTooltip text="More Setup Options" minWidthPx={0}><button type="button" data-focus-button {disabled} aria-label="More setup options" aria-expanded={open} on:click={toggle} class="flex h-9 w-3 cursor-pointer items-center justify-center bg-stone-100 text-stone-900 hover:bg-white"><DropdownChevron open={!open} size={9}/></button></HoverTooltip>
</div>
{#if open}<div bind:this={menu} use:portal role="group" aria-label="Setup options" class="setup-menu" style:left={`${left}px`} style:bottom={`${bottom}px`}>
 {#each [{label:'3rd/4th',variant:'short-yardage'},{label:'Goal Line',variant:'goal-line'},{label:'Reverse GL',variant:'reverse-goal-line'},{label:'Punt',variant:'punt'}] as option}<BuilderActionButton tooltip={`${option.label} Setup`} ariaLabel={`${option.label} setup`} label={option.label} {disabled} onclick={()=>{open=false;onvariant(option.variant as SetupVariant);}}><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5h16v14H4zM8 5v14M16 5v14"/></svg></BuilderActionButton>{/each}
</div>{/if}
<style>.setup-menu{position:fixed;z-index:1000000002;display:flex;flex-direction:column;gap:6px;}</style>
