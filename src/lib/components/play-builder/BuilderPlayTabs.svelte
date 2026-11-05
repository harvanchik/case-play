<script lang="ts">
 import {flip} from 'svelte/animate';
 import HoverTooltip from '../HoverTooltip.svelte';
 export let plays:{id:number;name:string}[];
 export let activeId:number|undefined;
 export let editingPlayId:number|null=null;
 export let count:number;export let maximum:number;
 export let viewOnly=false;export let presentation=false;
 export let addModifier:string;
 export let strip:HTMLElement;
 export let drag:{id:number;moved:boolean}|null=null;
 export let onbegin:(event:PointerEvent,id:number)=>void;
 export let onselect:(id:number)=>void;
 export let onmenu:(event:MouseEvent,id:number)=>void;
 export let onadd:()=>void;
</script>
			<div
				data-tutorial="play-management"
				class="play-management-toolbar absolute left-2 z-30"
				class:h-9={editingPlayId === null}
				class:h-40={editingPlayId !== null}
				style:right={presentation?"60%":"70.5%"} style:bottom={presentation?"8px":"calc(50% - 23.8cqw)"}
				aria-label="Plays in this play builder"
			>
				<div bind:this={strip} class="play-tabs-scroll absolute right-0 bottom-0 left-0 overflow-x-auto overflow-y-hidden">
					<div class="flex w-max items-stretch gap-1">
						{#each plays as play (play.id)}
       <div animate:flip={{duration:150}} class="shrink-0" class:opacity-60={drag?.moved&&drag.id===play.id}>
							<HoverTooltip
								text={viewOnly || editingPlayId === play.id ? '' : 'Double Click for Options'}
								minWidthPx={0}
								wrapperClass="flex h-9 min-w-20 shrink-0 max-lg:h-7 max-lg:min-w-14"
							>
								<button
									data-focus-button
                                    data-play-id={play.id}
									type="button"
									aria-label={`${viewOnly ? "View" : "Open"} ${play.name}`}
									aria-pressed={play.id === activeId}
									on:pointerdown={(event)=>onbegin(event,play.id)}


         style:touch-action={viewOnly?undefined:'pan-y'}
         on:click={() => onselect(play.id)}
									on:dblclick={(event) => { if (!viewOnly) onmenu(event, play.id); }}
									on:contextmenu|preventDefault|stopPropagation={(event) => { if (!viewOnly) onmenu(event, play.id); }}
									class="flex h-9 min-w-20 shrink-0 cursor-pointer items-center justify-center border-2 border-stone-950 bg-white px-3 text-xs font-normal whitespace-nowrap text-stone-950 hover:bg-stone-100 aria-pressed:bg-stone-200 aria-pressed:font-black aria-pressed:hover:bg-stone-300 max-lg:h-7 max-lg:min-w-14 max-lg:px-2 max-lg:text-[10px]"
								>
									{play.name}
								</button>
							</HoverTooltip>
						</div>
      {/each}
						{#if !viewOnly}<HoverTooltip
							text={count >= maximum ? 'Play Limit Reached' : 'Add Play'}
							shortcutKeys={[addModifier, 'N']}
							minWidthPx={0}
							wrapperClass="flex h-9 w-9 shrink-0 max-lg:h-7 max-lg:w-7"
						>
							<button
								type="button"
								aria-label="Add another play"
								disabled={count >= maximum}
								on:click={onadd}
								class="flex h-9 w-9 cursor-pointer items-center justify-center border-2 border-stone-950 bg-white font-black text-stone-950 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 max-lg:h-7 max-lg:w-7"
							>
<svg viewBox="0 0 24 24" class="h-3 w-3 max-lg:h-2.5 max-lg:w-2.5" aria-hidden="true"><path d="M12 3v18M3 12h18" fill="none" stroke="currentColor" stroke-width="2.5" /></svg>
							</button>
						</HoverTooltip>{/if}
					</div>
				</div>
<slot/>
</div>
<style>
 .play-management-toolbar{transform:scale(var(--builder-action-scale));transform-origin:bottom left;}
 .play-tabs-scroll{scrollbar-width:none;}.play-tabs-scroll::-webkit-scrollbar{display:none;width:0;height:0;}
 @container(max-width:900px){.play-management-toolbar{transform:scale(.72);}}
 @container(min-width:901px) and (max-width:1080px){.play-management-toolbar{transform:scale(.82);}}
</style>
