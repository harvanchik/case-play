<script lang="ts">
 import { laserDrawingPath, laserTrailPath, laserDrawingVisibility, type Point, type TrailPoint, type LaserDrawing, type ActiveLaserDrawing, type SpotlightStroke, type LaserColor } from '$lib/play-builder-annotations';
 export let tool: string;
 export let spotlightStrokes: SpotlightStroke[];
 export let laserTrail: TrailPoint[];
 export let laserDrawings: LaserDrawing[];
 export let activeLaserDrawing: ActiveLaserDrawing | null;
 export let activeSpotlightStroke: SpotlightStroke | null;
 export let spotlightEnabled: boolean;
 export let laserPointer: Point | null;
 export let pointerOnField: boolean;
 export let spotlightRadius: number;
 export let laserTrailClock: number;
 export let laserFadeDuration: number;
 export let viewOnly: boolean;
 export let presentation: boolean;
 export let rainbowLaserEnabled: boolean;
 export let laserColor: LaserColor;
 export let width:number; export let height:number;
 export let laserColorValue:(color:LaserColor)=>string;
 export let laserPaint:(color:LaserColor|'rainbow')=>string;
 // Raise after Svelte inserts its sibling artwork, not only on the next pointer move.
 const annotationLayer=(node:SVGGElement,_state:unknown)=>{
  let disposed=false;
  const raise=()=>queueMicrotask(()=>{if(disposed)return;const surface=node.ownerSVGElement;if(surface&&surface.lastElementChild!==node)surface.appendChild(node);});
  raise();return{update:raise,destroy:()=>{disposed=true;}};
 };
</script>
						{#if tool === 'laser' || spotlightStrokes.length>0 || laserTrail.length > 0 || laserDrawings.length > 0 || (activeLaserDrawing?.points.length ?? 0) > 1}
							<g use:annotationLayer={{tool,spotlightEnabled,laserTrailClock,spotlightStrokes}} data-laser-pointer-layer data-export-exclude pointer-events="none">
         {#if spotlightStrokes.length||activeSpotlightStroke||spotlightEnabled&&tool==='laser'}
          <defs>
           <radialGradient id="builder-spotlight-edge"><stop offset="75%" stop-color="black"/><stop offset="100%" stop-color="black" stop-opacity="0"/></radialGradient>
           <filter id="builder-spotlight-soft-edge" filterUnits="userSpaceOnUse" x="-300" y="-300" width="1600" height="1100" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="5"/></filter>
           <mask id="builder-spotlight-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
            <rect width={width} height={height} fill="white"/>
            {#each [...spotlightStrokes,...(activeSpotlightStroke?[activeSpotlightStroke]:[])] as stroke}
             <g data-spotlight-stroke opacity={stroke.releasedAt===null?1:Math.max(0,1-(laserTrailClock-stroke.releasedAt)/laserFadeDuration)} filter="url(#builder-spotlight-soft-edge)">
              {#if stroke.points.length===1}<circle cx={stroke.points[0].x} cy={stroke.points[0].y} r={stroke.radius*.875} fill="black"/>
              {:else}<path d={laserDrawingPath(stroke.points)} fill="none" stroke="black" stroke-width={stroke.radius*1.75} stroke-linecap="round" stroke-linejoin="round"/>{/if}
             </g>
            {/each}
            {#if spotlightEnabled&&tool==='laser'&&laserPointer&&pointerOnField}<circle data-spotlight-cursor cx={laserPointer.x} cy={laserPointer.y} r={spotlightRadius} fill="url(#builder-spotlight-edge)"/>{/if}
           </mask>
          </defs>
          <rect data-spotlight width={width} height={height} fill="black" opacity=".65" mask="url(#builder-spotlight-mask)"/>
         {/if}
								<defs>
									<linearGradient
										id="builder-rainbow-laser-gradient"
										x1="0"
										y1="0"
										x2="180"
										y2="0"
										gradientUnits="userSpaceOnUse"
										spreadMethod="repeat"
									>
										<stop offset="0%" stop-color="#ff1744" />
										<stop offset="16.67%" stop-color="#ff9100" />
										<stop offset="33.33%" stop-color="#ffea00" />
										<stop offset="50%" stop-color="#00e676" />
										<stop offset="66.67%" stop-color="#00e5ff" />
										<stop offset="83.33%" stop-color="#2979ff" />
										<stop offset="100%" stop-color="#d500f9" />
										<animateTransform
											attributeName="gradientTransform"
											type="translate"
											from="-180 0"
											to="180 0"
											dur="0.8s"
											repeatCount="indefinite"
										/>
									</linearGradient>
								</defs>
								{#each laserDrawings as drawing}
									{@const drawingFreshness = laserDrawingVisibility(drawing, laserTrailClock)}
									<g
										data-laser-drawing
										data-laser-drawing-state={drawing.releasedAt !== null ? 'fading-out' : drawing.appearedAt != null ? 'fading-in' : 'persistent'}
										opacity={Math.pow(drawingFreshness, 1.25)}
									>
										<path
											d={laserDrawingPath(drawing.points)}
											fill="none"
											stroke={laserPaint(drawing.color)}
											stroke-width="8"
											stroke-linecap="round"
											stroke-linejoin="round"
											opacity="0.2"
										/>
										<path
											d={laserDrawingPath(drawing.points)}
											fill="none"
											stroke={laserPaint(drawing.color)}
											stroke-width="3.8"
											stroke-linecap="round"
											stroke-linejoin="round"
											opacity="0.88"
											filter="url(#builder-neon-glow)"
										/>
									</g>
								{/each}
								{#if activeLaserDrawing && activeLaserDrawing.points.length > 1}
									<g data-laser-active-drawing>
										<path
											d={laserDrawingPath(activeLaserDrawing.points)}
											fill="none"
											stroke={laserPaint(activeLaserDrawing.color)}
											stroke-width="8"
											stroke-linecap="round"
											stroke-linejoin="round"
											opacity="0.2"
										/>
										<path
											d={laserDrawingPath(activeLaserDrawing.points)}
											fill="none"
											stroke={laserPaint(activeLaserDrawing.color)}
											stroke-width="3.8"
											stroke-linecap="round"
											stroke-linejoin="round"
											opacity="0.88"
											filter="url(#builder-neon-glow)"
										/>
									</g>
								{/if}
								{#if laserTrail.length > 1}
									{@const trailStart = laserTrail[0]}
									{@const trailEnd = laserTrail.at(-1)!}
									{@const trailFreshness = Math.min(1, Math.max(0, 1 - (laserTrailClock - trailEnd.createdAt) / laserFadeDuration))}
									<defs>
										<linearGradient
											id="builder-laser-trail-gradient"
											x1={trailStart.x}
											y1={trailStart.y}
											x2={trailEnd.x}
											y2={trailEnd.y}
											gradientUnits="userSpaceOnUse"
										>
											<stop offset="0%" stop-color={laserColorValue(laserColor)} stop-opacity="0" />
											<stop offset="30%" stop-color={laserColorValue(laserColor)} stop-opacity="0.18" />
											<stop offset="70%" stop-color={laserColorValue(laserColor)} stop-opacity="0.55" />
											<stop offset="100%" stop-color={laserColorValue(laserColor)} stop-opacity="0.82" />
										</linearGradient>
									</defs>
									<path
										d={laserTrailPath(laserTrail, laserTrailClock)}
										fill={rainbowLaserEnabled ? 'url(#builder-rainbow-laser-gradient)' : 'url(#builder-laser-trail-gradient)'}
										opacity={Math.pow(trailFreshness, 1.25)}
										filter="url(#builder-neon-glow)"
									/>
								{/if}
								{#if !spotlightEnabled && (!viewOnly||presentation) && tool === 'laser' && laserPointer && pointerOnField}
									<circle
										cx={laserPointer.x}
										cy={laserPointer.y}
										r="7"
										fill={laserPaint(rainbowLaserEnabled ? 'rainbow' : laserColor)}
										opacity="0.2"
									/>
									<circle
										cx={laserPointer.x}
										cy={laserPointer.y}
										r="3"
										fill={laserPaint(rainbowLaserEnabled ? 'rainbow' : laserColor)}
										filter="url(#builder-neon-glow)"
									/>
								{/if}
							</g>
						{/if}
