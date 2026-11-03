<script lang="ts">
 import HoverTooltip from '../HoverTooltip.svelte';
 export let value=.25;
 export let maximum:number;
 export let onchange:(value:number)=>void;
 let editing=false;let draft='';
 function commit(){if(!editing)return;editing=false;const number=Number(draft.trim().replace(/s$/i,''));if(Number.isFinite(number))onchange(Math.max(.01,Math.min(maximum,number)));}
 function key(event:KeyboardEvent){const input=event.currentTarget as HTMLInputElement;
  if(event.key==='Enter'){event.preventDefault();input.blur();}
  if(event.key==='Escape'){editing=false;input.blur();}
  if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();const parsed=Number(draft.replace(/s$/i,''));const next=Math.max(.01,Math.min(maximum,(Number.isFinite(parsed)?parsed:value)+(event.key==='ArrowUp'?1:-1)*(event.shiftKey?.01:.05)));draft=String(Math.round(next*1000)/1000);onchange(next);}
 }
</script>
<HoverTooltip text="Transition Time" minWidthPx={0} wrapperClass="transition-duration"><input aria-label="Transition time seconds" inputmode="decimal" type="text" value={editing?draft:`${value.toFixed(3).replace(/(\.\d{2})0$/, '$1')}s`} on:pointerdown={event=>{if(document.activeElement!==event.currentTarget){event.preventDefault();event.currentTarget.focus();}}} on:focus={event=>{editing=true;draft=String(Number(value.toFixed(3)));event.currentTarget.value=draft;event.currentTarget.select();}} on:input={event=>draft=event.currentTarget.value} on:blur={commit} on:keydown={key}/></HoverTooltip>
<style>
 :global(.transition-duration){display:flex;flex:0 0 58px;align-self:stretch;}
 input{width:100%;min-width:0;height:100%;background:#f5f5f4;border:1px solid #a8a29e;padding:4px;text-align:center;font-size:11px;font-weight:600;color:#292524;outline:none;}
</style>
