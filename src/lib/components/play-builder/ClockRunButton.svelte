<script lang="ts">
 import HoverTooltip from '../HoverTooltip.svelte';
 export let x: number;
 export let y: number;
 export let running: boolean;
 export let clock: 'Game'|'Play';
 export let ontoggle: () => void;
</script>
<foreignObject data-clock-control data-export-exclude {x} {y} width="16" height="16" overflow="visible">
 <HoverTooltip text={`${running?'Stop':'Start'} ${clock} Clock from This Step`} minWidthPx={0} wrapperClass="contents">
 <button type="button" aria-label={`${running?'Stop':'Start'} ${clock.toLowerCase()} clock from this step`} on:pointerdown|preventDefault|stopPropagation on:click|stopPropagation={ontoggle} on:keydown|stopPropagation>
 <svg viewBox="0 0 24 24" aria-hidden="true">{#if running}<path d="M6 6h12v12H6Z"/>{:else}<path d="m8 4 12 8-12 8Z"/>{/if}</svg>
 </button>
 </HoverTooltip>
</foreignObject>
<style>
 button{display:grid;place-items:center;width:16px;height:16px;padding:2px;border:1px solid #111827;border-radius:0;background:#3f3f46;color:white;cursor:pointer;}
 button:hover{background:white;color:#111827;}
 svg{display:block;width:10px;height:10px;fill:currentColor;}
</style>
