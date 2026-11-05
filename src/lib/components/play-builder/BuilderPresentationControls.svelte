<script lang="ts">
 import BuilderActionButton from './BuilderActionButton.svelte';import AnimationIcon from './AnimationIcon.svelte';
 export let laser=false;export let onlaser:()=>void;export let onclear:()=>void;export let onexit:()=>void;
</script>
<div class="presentation-actions absolute left-2 top-2 z-30 flex gap-1.5" aria-label="Presentation controls">
 <BuilderActionButton tooltip="Laser Pointer" shortcutKeys={['Shift','L']} ariaLabel="Toggle presentation laser pointer" label="Laser" pressed={laser} onclick={onlaser}><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m4 20 8-8M10 4l1 3M20 14l-3-1M17 3l-2 4M21 7l-4 2"/></svg></BuilderActionButton>
 <BuilderActionButton tooltip="Clear Laser Drawings" shortcutKeys={['C']} ariaLabel="Clear presentation laser drawings" label="Clear" onclick={onclear}><AnimationIcon name="trash"/></BuilderActionButton>
 </div><div class="absolute right-2 top-2 z-30">
 <BuilderActionButton tooltip="Exit Full Screen" shortcutKeys={['F11']} ariaKeyshortcuts="F11" ariaLabel="Exit full screen" label="Exit Full" onclick={onexit}><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8h5V3M21 8h-5V3M16 21v-5h5M8 21v-5H3"/></svg></BuilderActionButton>
 </div>