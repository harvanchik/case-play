<script lang="ts" generics="Color extends string">
 import HoverTooltip from '../HoverTooltip.svelte';
 export let freeDrawShape:'straight'|'squiggle';export let freeDrawMode:'draw'|'erase';
 export let freeDrawColor:Color;export let freeDrawThickness:number;
 export let freeDrawColors:{id:Color;label:string;value:string}[];
 export let hasDrawings:boolean;export let onclear:()=>void;
 export let shortcutKeys:(index:number)=>string[];
 export let oncolorkey:(event:KeyboardEvent,index:number)=>void;
</script>
				<div
					data-tutorial="draw-options"
					class="draw-options-panel relative z-40 mt-px w-full border-2 border-stone-900 bg-stone-900 p-px shadow-xl"
					role="group"
					aria-label="Drawing options"
				>
					<div class="draw-options-line-types grid grid-cols-2 gap-px" role="group" aria-label="Drawing line type">
						<HoverTooltip text="Free Draw" minWidthPx={0} wrapperClass="flex h-7 min-w-0">
							<button
								type="button"
								aria-label="Draw squiggle lines"
								aria-pressed={freeDrawShape === 'squiggle' && freeDrawMode === 'draw'}
								on:pointerdown|stopPropagation={() => {
									freeDrawShape = 'squiggle';
									freeDrawMode = 'draw';
								}}
								on:click|stopPropagation={() => {
									freeDrawShape = 'squiggle';
									freeDrawMode = 'draw';
								}}
								class="flex h-7 w-full cursor-pointer items-center justify-center bg-stone-100 text-stone-800 hover:bg-white"
								class:!bg-stone-600={freeDrawShape === 'squiggle' && freeDrawMode === 'draw'}
								class:!text-white={freeDrawShape === 'squiggle' && freeDrawMode === 'draw'}
							>
								<svg viewBox="0 0 24 12" class="h-3 w-4" aria-hidden="true">
									<path d="M2 8c4-8 6 8 10 0s6 8 10 0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
								</svg>
								<span class="sr-only">Squiggle</span>
							</button>
						</HoverTooltip>
						<HoverTooltip text="Straight Line" minWidthPx={0} wrapperClass="flex h-7 min-w-0">
							<button
								type="button"
								aria-label="Draw straight lines"
								aria-pressed={freeDrawShape === 'straight' && freeDrawMode === 'draw'}
								on:pointerdown|stopPropagation={() => {
									freeDrawShape = 'straight';
									freeDrawMode = 'draw';
								}}
								on:click|stopPropagation={() => {
									freeDrawShape = 'straight';
									freeDrawMode = 'draw';
								}}
								class="flex h-7 w-full cursor-pointer items-center justify-center bg-stone-100 text-stone-800 hover:bg-white"
								class:!bg-stone-600={freeDrawShape === 'straight' && freeDrawMode === 'draw'}
								class:!text-white={freeDrawShape === 'straight' && freeDrawMode === 'draw'}
							>
								<svg viewBox="0 0 24 12" class="h-3 w-4" aria-hidden="true">
									<path d="M2 10 22 2" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
								</svg>
								<span class="sr-only">Straight</span>
							</button>
						</HoverTooltip>
					</div>

					<label class="draw-options-thickness mt-px block bg-stone-100 px-0.5 py-0.5 text-[7px] font-bold text-stone-800">
						<span class="flex items-center justify-between"><span>Line</span><span>{freeDrawThickness}</span></span>
						<input
							type="range"
							min="2"
							max="8"
							step="1"
							bind:value={freeDrawThickness}
							on:pointerdown|stopPropagation
							aria-label="Drawing line thickness"
							class="block h-3 w-full cursor-pointer accent-red-600"
						/>
					</label>

					<div class="draw-options-colors mt-px grid grid-cols-2 gap-px" role="group" aria-label="Drawing color">
						{#each freeDrawColors as option, colorIndex}
							<HoverTooltip
								text={option.label}
								shortcutKeys={shortcutKeys(colorIndex)}
								minWidthPx={0}
								wrapperClass="flex aspect-square min-h-0 min-w-0"
							>
								<button
									data-draw-color
									type="button"
									aria-label={`${option.label} drawing color`}
									aria-pressed={freeDrawColor === option.id}
									on:pointerdown|stopPropagation={() => {
										freeDrawColor = option.id;
										freeDrawMode = 'draw';
									}}
									on:keydown={(event) => oncolorkey(event, colorIndex)}
									on:click|stopPropagation={() => {
										freeDrawColor = option.id;
										freeDrawMode = 'draw';
									}}
									class="flex h-full w-full cursor-pointer items-center justify-center border border-stone-500 text-[8px] font-black outline-none ring-inset hover:ring-1 hover:ring-white"
									class:ring-2={freeDrawColor === option.id}
									class:ring-white={freeDrawColor === option.id}
									class:text-white={!['yellow', 'white', 'gray'].includes(option.id)}
									class:text-stone-900={['yellow', 'white', 'gray'].includes(option.id)}
									style:background={option.value}>{colorIndex === 9 ? 0 : colorIndex + 1}</button
								>
							</HoverTooltip>
						{/each}
					</div>

					<div class="draw-options-actions mt-px grid grid-cols-2 gap-px">
						<HoverTooltip text="Drawing Eraser" shortcutKeys={['Shift', 'D']} minWidthPx={0} wrapperClass="flex h-7 min-w-0">
							<button
								type="button"
								aria-label="Erase drawing strokes"
								aria-pressed={freeDrawMode === 'erase'}
								on:pointerdown|stopPropagation
								on:click|stopPropagation={() => (freeDrawMode = freeDrawMode === 'erase' ? 'draw' : 'erase')}
								class="flex h-7 w-full cursor-pointer items-center justify-center bg-white hover:ring-1 hover:ring-stone-500 hover:ring-inset"
								class:!ring-2={freeDrawMode === 'erase'}
								class:!ring-stone-900={freeDrawMode === 'erase'}
								class:!ring-inset={freeDrawMode === 'erase'}
							>
								<img src="/images/toolbar/drawing-eraser.png" alt="" class="h-6 w-6 object-contain" draggable="false" />
								<span class="sr-only">Eraser</span>
							</button>
						</HoverTooltip>
						<HoverTooltip text="Clear Drawings" shortcutKeys={['C']} minWidthPx={0} wrapperClass="flex h-7 min-w-0">
							<button
								type="button"
								aria-label="Clear free drawings"
								disabled={!hasDrawings}
								on:pointerdown|stopPropagation
								on:click|stopPropagation={() => onclear()}
								class="flex h-7 w-full cursor-pointer items-center justify-center bg-white hover:ring-1 hover:ring-stone-500 hover:ring-inset disabled:cursor-not-allowed disabled:opacity-35"
							>
								<img src="/images/toolbar/clear-drawings.png" alt="" class="h-6 w-6 object-contain" draggable="false" />
								<span class="sr-only">Clear</span>
							</button>
						</HoverTooltip>
					</div>
				</div>
<style>
@media(max-height:850px){
		.draw-options-panel {
			position: absolute;
			top: 100%;
			left: 0;
			display: grid;
			width: min(20rem, calc(100vw - 3rem));
			grid-template-columns: 1fr 2fr 1fr;
			grid-template-rows: 1.75rem auto;
			gap: 1px;
			margin-top: 1px;
		}

		.draw-options-line-types {
			grid-column: 1;
			grid-row: 1;
		}

		.draw-options-thickness {
			grid-column: 2;
			grid-row: 1;
			margin-top: 0;
		}

		.draw-options-actions {
			grid-column: 3;
			grid-row: 1;
			margin-top: 0;
		}

		.draw-options-colors {
			grid-column: 1 / -1;
			grid-row: 2;
			grid-template-columns: repeat(10, minmax(0, 1fr));
			margin-top: 0;
		}

		.draw-options-colors button {
			min-height: 0;
		}
}
</style>