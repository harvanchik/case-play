<script lang="ts">
 import ClockRunButton from './ClockRunButton.svelte';
 export let x: number;
 export let y: number;
 export let seconds: number;
 export let editable = false;
 export let running = true;
 export let ontoggle: (()=>void)|undefined = undefined;
 export let onchange: ((seconds: number) => void) | undefined = undefined;
 let input: HTMLInputElement;
 let editing = false;
 let value = '';
 $: if(!editing) value = String(seconds);
 function commit() { const parsed=Number(value);if(value.trim()&&Number.isFinite(parsed))onchange?.(Math.max(0,Math.min(99,Math.round(parsed))));editing=false;value=String(seconds); }
</script>
{#if editable&&editing&&ontoggle}<ClockRunButton x={x-45} y={y-27} {running} clock="Play" {ontoggle}/>{/if}
<g data-play-clock aria-label={`Play clock: ${seconds} seconds`}>
 <rect x={x-46} y={y-9} width="18" height="18" fill="#3f3f46" stroke="#111827" stroke-width="1.5"/>
 {#if editable}
 <foreignObject data-export-exclude x={x-46} y={y-9} width="18" height="18">
 <input style:opacity={editing?1:0} bind:this={input} aria-label="Play clock seconds" inputmode="numeric" maxlength="2" bind:value on:input={()=>value=value.replace(/\D/g,'')} on:pointerdown|stopPropagation on:click|stopPropagation on:dblclick|stopPropagation on:contextmenu|preventDefault|stopPropagation on:focus={()=>{editing=true;input.select();}} on:blur={commit} on:keydown|stopPropagation={event=>{if(event.key==='Enter'){event.preventDefault();input.blur();}else if(event.key==='Escape'){value=String(seconds);input.blur();}else if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();value=String(Math.max(0,Math.min(99,(Number(value)||0)+(event.key==='ArrowUp'?1:-1))));}}}/>
 </foreignObject>
 {/if}<text opacity={editing?0:1} x={x-37} {y} dominant-baseline="central" text-anchor="middle" style="fill:#ff1744" font-size="10" font-weight="900" pointer-events="none">{seconds}</text>
</g>
<style>
 input {display:block;box-sizing:border-box;width:18px;height:18px;padding:0;border:0;border-radius:0;background:transparent;color:#ff1744;font-family:inherit;font-size:10px;font-weight:900;line-height:18px;text-align:center;outline:none!important;box-shadow:none!important;}
</style>
