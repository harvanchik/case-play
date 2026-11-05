<script lang="ts">
 import BuilderActionBar from './BuilderActionBar.svelte';import BuilderActionButton from './BuilderActionButton.svelte';import AnimationIcon from './AnimationIcon.svelte';
 export let presentation=false;export let open=false;export let hasAnimation=false;export let duration=0;
 export let time=0;export let playing=false;export let rate=1;export let loop=false;export let ready=false;
 export let ontimeline:()=>void;export let onstart:()=>void;export let onplay:()=>void;
 export let onspeed:(event:MouseEvent)=>void;export let onloop:()=>void;
</script>
 <BuilderActionBar position="bottom-right" label="Shared playback controls" {presentation} hidden={presentation&&open}>
 {#if presentation}<div class="mr-2"><BuilderActionButton tooltip="Open Animation Editor" shortcutKeys={['Alt','A']} ariaLabel="Open presentation timeline" label="Animate" disabled={!hasAnimation} pressed={open} onclick={ontimeline}><AnimationIcon name="play"/></BuilderActionButton></div>{/if}
  <BuilderActionButton tooltip="Go to Start" shortcutKeys={['HOME']} ariaLabel="Go to animation start" label="Start" disabled={!ready || !hasAnimation || time <= 0} onclick={() => onstart()}><AnimationIcon name="start" /></BuilderActionButton>
  <BuilderActionButton tooltip={playing ? 'Pause' : duration > 0 && time >= duration ? 'Restart' : 'Play'} shortcutKeys={['K / Space']} ariaLabel={playing ? 'Pause animation' : duration > 0 && time >= duration ? 'Restart animation' : 'Play animation'} label={playing ? 'Pause' : duration > 0 && time >= duration ? 'Restart' : 'Play'} disabled={!ready || !duration} onclick={onplay}><AnimationIcon name={playing ? 'pause' : duration > 0 && time >= duration ? 'reset' : 'play'} /></BuilderActionButton>
  <BuilderActionButton tooltip="Playback Speed" shortcutKeys={['Alt', '↑ / ↓']} ariaLabel="Cycle playback speed" label="Speed" disabled={!ready || !duration} onclick={onspeed}><span class="text-xs font-black leading-4">{rate.toFixed(rate % .5 === 0 ? 1 : 2)}×</span></BuilderActionButton>
  <BuilderActionButton tooltip="Loop Playback" ariaLabel="Loop playback" label="Loop" pressed={loop} disabled={!ready || !duration} onclick={onloop}><span class:text-blue-500={loop}><AnimationIcon name="repeat" /></span></BuilderActionButton>
 </BuilderActionBar>