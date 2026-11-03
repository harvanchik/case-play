<script lang="ts">
 export let open=false;
 export let size=12;
</script>
<svg data-dropdown-chevron viewBox="0 0 12 12" width={size} height={size} aria-hidden="true" class:open><path d="m2 4 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
<style>svg{display:block;flex-shrink:0;align-self:center;transition:transform 150ms ease;transform-origin:center;}svg.open{transform:rotate(180deg);}</style>
