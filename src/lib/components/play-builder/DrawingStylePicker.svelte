<script lang="ts">
 import { useElementEditor } from '$lib/play-builder-element-editor';
 const elementEditor=useElementEditor();

 import HoverTooltip from '../HoverTooltip.svelte';
 import type { GuideColor } from '$lib/play-builder-scene';
 export let x:number; export let y:number;
 export let colors:{id:GuideColor;label:string;value:string}[];
 export let selected:GuideColor;
 export let onchange:(color:GuideColor)=>void;
 export let onclose:()=>void;
 let root:HTMLDivElement;
</script>
<div bind:this={root} use:elementEditor={{close:onclose,capabilities:{color:true},outside:true,ignore:'[data-drawing-id],[data-drawing-actions]'}} data-drawing-style-picker role="dialog" aria-label="Drawing color" tabindex="-1" style:left={`${Math.max(8,Math.min(window.innerWidth-300,x))}px`} style:top={`${Math.max(8,Math.min(window.innerHeight-80,y))}px`} on:pointerdown|stopPropagation>
 <div class="swatches">{#each colors as color}<HoverTooltip text={color.label} minWidthPx={0}><button aria-label={color.label} aria-pressed={selected===color.id} on:click={()=>onchange(color.id)}><span style:background={color.value}></span></button></HoverTooltip>{/each}</div>
</div>
<style>
 [data-drawing-style-picker]{position:fixed;z-index:1000000001;display:block;padding:4px;background:white;border:2px solid #292524;}
 .swatches{display:flex;gap:3px;}
 button{display:flex;align-items:center;justify-content:center;width:20px;height:20px;padding:2px;border:1px solid #a8a29e;cursor:pointer;} button[aria-pressed=true]{outline:1px solid #292524;} span{width:100%;height:100%;}
</style>
