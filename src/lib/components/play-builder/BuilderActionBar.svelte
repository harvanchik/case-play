<script lang="ts">
 export let position:'top-left'|'top-right'|'bottom-right';
 export let label:string;
 export let tutorial:string|undefined=undefined;
 export let hidden=false;
 export let presentation=false;
 export let presentationOnly=false;
 export let role:'toolbar'|undefined=undefined;
 $: toolbarClass=presentationOnly?'presentation-actions':position==='top-left'?'top-action-toolbar':position==='top-right'?'export-action-toolbar':'bottom-action-toolbar';
</script>
<div class={toolbarClass+' absolute z-'+(position==='bottom-right'?'20':'30')+' flex gap-1.5 '+(position==='bottom-right'?'items-end right-2':position==='top-left'?'items-start left-2':'right-2')}
 class:hidden data-tutorial={tutorial} aria-label={label} {role}
 style:top={position==='bottom-right'?undefined:presentationOnly?'8px':'calc(50% - 23.8cqw)'}
 style:bottom={position==='bottom-right'?presentation?'8px':'calc(50% - 23.8cqw)':undefined}>
 <slot/>
</div>
<style>
 .top-action-toolbar{transform:scale(var(--builder-action-scale));transform-origin:top left;}
 .export-action-toolbar{transform:scale(var(--builder-action-scale));transform-origin:top right;}
 .bottom-action-toolbar{transform:scale(var(--builder-action-scale));transform-origin:bottom right;}
 @container(max-width:900px){.top-action-toolbar,.export-action-toolbar,.bottom-action-toolbar{transform:scale(.72);}}
 @container(min-width:901px) and (max-width:1080px){.top-action-toolbar,.export-action-toolbar,.bottom-action-toolbar{transform:scale(.82);}}
</style>
