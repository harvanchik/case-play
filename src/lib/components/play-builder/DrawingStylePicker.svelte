<script lang="ts">
 import HoverTooltip from '../HoverTooltip.svelte';
 import type { GuideColor } from '$lib/play-builder-scene';
 export let x:number; export let y:number;
 export let colors:{id:GuideColor;label:string;value:string}[];
 export let selected:GuideColor;
 export let onchange:(color:GuideColor)=>void;
 export let onclose:()=>void;
 let root:HTMLDivElement;
 function portal(node:HTMLElement){document.body.appendChild(node);return {destroy:()=>node.remove()};}
</script>
<svelte:window on:pointerdown|capture={event=>{const target=event.target as Element;if(!root?.contains(target)&&!target.closest('[data-drawing-id],[data-drawing-actions]'))onclose();}} on:keydown={event=>{if(event.key==='Escape')onclose();}} />
<div bind:this={root} use:portal data-drawing-style-picker role="dialog" aria-label="Drawing color" tabindex="-1" style:left={`${Math.max(8,Math.min(window.innerWidth-300,x))}px`} style:top={`${Math.max(8,Math.min(window.innerHeight-40,y))}px`} on:pointerdown|stopPropagation>
 {#each colors as color}<HoverTooltip text={color.label} minWidthPx={0}><button aria-label={color.label} aria-pressed={selected===color.id} on:click={()=>onchange(color.id)}><span style:background={color.value}></span></button></HoverTooltip>{/each}
</div>
<style>
 [data-drawing-style-picker]{position:fixed;z-index:1000000001;display:flex;gap:3px;padding:4px;background:white;border:2px solid #292524;}
 button{display:flex;align-items:center;justify-content:center;width:20px;height:20px;padding:2px;border:1px solid #a8a29e;cursor:pointer;} button[aria-pressed=true]{outline:1px solid #292524;} span{width:100%;height:100%;}
</style>
