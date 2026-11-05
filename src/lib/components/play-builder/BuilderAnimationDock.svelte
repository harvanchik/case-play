<script lang="ts">
 export let fullscreenRoot:HTMLElement|null=null;
 export let left:number;export let width:number;export let hidden=false;
 const portal=(node:HTMLElement,root:HTMLElement|null)=>{const move=(target:HTMLElement|null)=>(target??document.body).appendChild(node);move(root);return{update:move,destroy:()=>node.remove()};};
</script>
<div use:portal={fullscreenRoot} class="animation-dock" class:invisible={hidden} style:left={`${left}px`} style:width={`${width}px`}><slot/></div>
<style>.animation-dock{position:fixed;bottom:8px;z-index:1000;height:112px;pointer-events:none;}.animation-dock :global([data-animation-ui]){pointer-events:auto;}</style>
