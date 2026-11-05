<script context="module" lang="ts">
 import type { Motion as RememberedMotion } from '$lib/play-builder-animation';
 // Deliberately session-only: saved documents contain only the active motion.
 const routeMemory = new Map<string, { routes: Partial<Record<RememberedMotion['path'], RememberedMotion>>; end: number }>();
</script>
<script lang="ts">
 import { useElementEditor } from '$lib/play-builder-element-editor';
 const elementEditor=useElementEditor();
 import { rememberPopoverAnchor } from '$lib/play-builder-popover';
 import ElementEditorModes from './ElementEditorModes.svelte';
 import DropdownChevron from './DropdownChevron.svelte';
	import {
		animationTargetChanged,
		applyAnimationStep,
		defaultMotion,
		evaluateAnimation,
		motionPoints,
		relativePoint,
		sameTarget,
		stepTime,
		type AnimationTarget,
		type Motion,
		type PlayAnimation
	} from '$lib/play-builder-animation';
	import ArrowArtwork from './ArrowArtwork.svelte';
	import MarkerArtwork from './MarkerArtwork.svelte';
 import { playBuilderGuideColor, playBuilderGuideDash } from '$lib/play-builder-rendering';
	import AnimationIcon from './AnimationIcon.svelte';
 import AnimationTiming from './AnimationTiming.svelte';
 import TransitionDuration from './TransitionDuration.svelte';
 import HoverTooltip from '../HoverTooltip.svelte';
	import type { PlayBuilderScene, Point } from '$lib/play-builder-scene';
	export let animation: PlayAnimation;
	export let scene: PlayBuilderScene;
	export let stepIndex: number;
	export let selection: AnimationTarget[];
	export let ghosts = true;
 export let interactive=true;
	export let drawingRoute = false;
 export let otherEditorOpen = false;
 export let canedit:(target:AnimationTarget)=>boolean=()=>true;
 export let onedit:(target:AnimationTarget,event:MouseEvent)=>void=()=>{};
 export let onopen: () => void = () => {};
	export let onselect: (target: AnimationTarget) => void;
	export let onchange: (motion: Motion) => void;
	export let ondraw: (active: boolean) => void;
	let easingOpen = false;
 $: if (otherEditorOpen) picker = null;
 let picker: { target: AnimationTarget; x: number; y: number } | null = null;
	$: rawPickerRoute = picker ? routes.find((route) => sameTarget(route.start, picker!.target)) ?? (()=>{const start=from?.poses.find(item=>sameTarget(item,picker!.target)),end=to?.poses.find(item=>sameTarget(item,picker!.target));return start&&end?{start,end,motion:transition.motions.find(item=>sameTarget(item,picker!.target))??defaultMotion(start)}:undefined;})() : undefined;
 $: deleted=Boolean(rawPickerRoute?.start.visible&&!rawPickerRoute?.end.visible);
 $: added=Boolean(rawPickerRoute&&!rawPickerRoute.start.visible&&rawPickerRoute.end.visible);
 $: restrictedAdded=added&&rawPickerRoute?.start.type!=='path';
 $: effectivePickerRoute=(deleted||restrictedAdded)&&rawPickerRoute?{...rawPickerRoute,motion:{...rawPickerRoute.motion,path:'jump' as const,jumpEffect:rawPickerRoute.motion.path==='jump'?(rawPickerRoute.motion.jumpEffect??'cut'):'cut' as const}}:rawPickerRoute;
 $: pickerRoute=effectivePickerRoute?.start.type==='path'&&effectivePickerRoute.motion.path!=='jump'&&effectivePickerRoute.motion.path!=='draw'?{...effectivePickerRoute,motion:{...effectivePickerRoute.motion,path:'straight' as const,points:[]}}:effectivePickerRoute;
 $: activePath=pickerRoute&&Math.hypot(pickerRoute.end.x-pickerRoute.start.x,pickerRoute.end.y-pickerRoute.start.y)<.001&&!(pickerRoute.start.type==='path'&&JSON.stringify([pickerRoute.start.end,pickerRoute.start.points])!==JSON.stringify([pickerRoute.end.end,pickerRoute.end.points]))&&['straight','curve'].includes(pickerRoute.motion.path)?null:pickerRoute?.motion.path;
	export function openPicker(event: MouseEvent, target: AnimationTarget) {
 const clickedGhost=(event.currentTarget as Element|null)?.closest?.('[data-animation-ghost]')??(event.target as Element|null)?.closest?.('[data-animation-ghost]');
 const anchor=clickedGhost??document.querySelector(`[data-layer-type="${target.type}"][data-layer-id="${target.id}"]`)??document.querySelector(`[data-animation-ghost="${target.id}"][data-animation-ghost-type="${target.type}"]`);
 rememberPopoverAnchor(event,anchor);
		event.preventDefault();
		event.stopPropagation();
  if(!animationTargetChanged(animation,stepIndex,target)){onedit(target,event);return;}
		onopen();
		onselect(target);
  easingOpen = false;
		const box=(event.currentTarget as Element|null)?.getBoundingClientRect();
		picker = { target, x: Math.max(8, Math.min(window.innerWidth - 240, event.clientX ?? box?.left ?? 8)), y: Math.max(8, Math.min(window.innerHeight - 240, event.clientY ?? box?.top ?? 8)) };
	}
 function choosePath(value: Motion['path']) {
  if (!pickerRoute) return;
  if (value === 'custom' && pickerRoute.motion.path === 'custom') { ondraw(true); picker = null; return; }
  if (value === pickerRoute.motion.path) return;
  const current = pickerRoute.motion;
  const key = `${transition.from}:${transition.to}:${current.type}:${current.id}`;
  const memory = routeMemory.get(key) ?? { routes: {}, end: current.end };
  if (current.path !== 'jump') {
   memory.routes[current.path] = structuredClone(current);
   memory.end = current.end;
  }
  routeMemory.set(key, memory);
  easingOpen = false;
  if (value === 'jump') {
   onchange({ ...current, path: 'jump', end: 1 });
   return;
  }
  const remembered = memory.routes[value];
  const next = { ...current, ...(remembered ?? {}), path: value, start: Math.min(current.start, Math.max(0, memory.end - 0.05 / transition.duration)), end: memory.end, points: remembered?.points ?? (value === 'curve' ? [{ x: 0.5, y: -35 }] : []) };
  if (value === 'custom' && !remembered) {
   ondraw(true);
   picker = null;
   return;
  }
  onchange(next);
 }


 function artworkLayer(node:SVGElement,value:{selected:boolean;ghost?:boolean}){
  const home=document.createComment('animation artwork');node.before(home);
  let disposed=false;
  const update=(value:{selected:boolean;ghost?:boolean})=>{
   if(disposed)return;
   const svg=node.ownerSVGElement??home.parentElement?.closest('svg');
   if(!svg)return;
   const destination=value.selected?svg.querySelector('[data-animation-selected-overlay]'):value.ghost?home.parentNode:svg.querySelector('[data-animation-route-underlay]');
   if(destination===home.parentNode&&value.ghost&&!value.selected)destination?.insertBefore(node,home);else destination?.appendChild(node);
  };
  update(value);queueMicrotask(()=>update(value));return {update,destroy(){disposed=true;node.remove();home.remove();}};
 }

	let dragging: { index: number; motion: Motion; points: Point[] } | null = null;
	let drawn: Point[] = [];
	let drawing = false;
	let routeSession = false;
	let originalRoute: { target: AnimationTarget; points: Point[] } | null = null;
	$: if (drawingRoute !== routeSession) {
		routeSession = drawingRoute;
		const route = routes.find((item) => selection[0] && sameTarget(item.start, selection[0]));
		originalRoute = drawingRoute && route ? { target: route.start, points: motionPoints(route.motion, route.start, route.end) } : null;
	}
	$: transition = animation.transitions[Math.max(0, stepIndex - 1)];
	$: from = animation.steps[Math.max(0, stepIndex - 1)];
	$: to = animation.steps[Math.max(0, stepIndex - 1) + 1];
	$: previousScene = applyAnimationStep(scene, from);
	$: currentScene = applyAnimationStep(scene, animation.steps[stepIndex]);
	$: movedGhosts = from.poses.filter((pose) => {
		if (!pose.visible) return false;
		if (pose.type === 'path') { const next=animation.steps[stepIndex].poses.find(item=>sameTarget(item,pose));return !next?.visible||JSON.stringify([pose.x,pose.y,pose.end,pose.points])!==JSON.stringify([next.x,next.y,next.end,next.points]); }
		if (pose.type === 'guide') {
			const next = animation.steps[stepIndex].poses.find((item) => sameTarget(item, pose));
			return !next?.visible || pose.x !== next.x;
		}
		const before = previousScene.markers.find((m) => m.id === pose.id),
			after = currentScene.markers.find((m) => m.id === pose.id);
		return before && (!after || before.x !== after.x || before.y !== after.y);
	});
	$: routes =
		stepIndex > 0 && from && to
			? from.poses
					.filter((pose) => pose.visible)
					.flatMap((start) => {
						const end = to.poses.find((pose) => sameTarget(pose, start));
						if (!end?.visible) return [];
						const motion = transition?.motions.find((item) => sameTarget(item, start)) ?? defaultMotion(start);
						const arrowMotion=start.type==='path'&&motion.path!=='jump'&&motion.path!=='draw'?{...motion,path:'straight' as const,points:[]}:motion;
						const displayedMotion = dragging && sameTarget(dragging.motion, start) ? dragging.motion : arrowMotion;
						if (start.carrierId !== undefined || end.carrierId !== undefined) {
							if (start.carrierId !== undefined && start.carrierId === end.carrierId) return [];
							const offset = stepTime(animation, Math.max(0, stepIndex - 1));
							const release = evaluateAnimation({ scene, animation }, offset + motion.start * transition.duration).markers.find(
								(marker) => marker.id === start.id
							);
							const arrival = evaluateAnimation({ scene, animation }, offset + motion.end * transition.duration).markers.find(
								(marker) => marker.id === start.id
							);
							if (release && arrival)
								return [{ start: { ...start, x: release.x, y: release.y }, end: { ...end, x: arrival.x, y: arrival.y }, motion: displayedMotion }];
						}
						const geometryChanged=start.type==='path'&&JSON.stringify([start.end,start.points])!==JSON.stringify([end.end,end.points]);
						return start.x === end.x && start.y === end.y && !geometryChanged && !(displayedMotion.path==='custom'&&displayedMotion.points.length>0) && !(drawingRoute&&selection.some(target=>sameTarget(target,start))) ? [] : [{ start, end, motion: displayedMotion }];
					})
			: [];
	const isSelected = (target: AnimationTarget, targets = selection) => targets.some((item) => sameTarget(item, target));
	const targetName = (target: AnimationTarget) =>
		target.type === 'marker'
			? scene.markers.find((item) => item.id === target.id)?.name || scene.markers.find((item) => item.id === target.id)?.label || 'object'
			: target.type==='path' ? scene.paths.find(item=>item.id===target.id)?.kind ?? 'arrow' : 'guide';
 // Subtract the exact union of marker clearances, without filling the gaps
 // between overlapping groups (which can otherwise swallow a football route).
 const markerClearanceClip = (points: Point[]) => {
  const boxes = points.map(point => ({ left: point.x - 20, right: point.x + 20, top: point.y - 20, bottom: point.y + 20 }));
  const edges = [...new Set(boxes.flatMap(box => [box.top, box.bottom]))].sort((a, b) => a - b);
  let result = 'M-100,-100H1100V584H-100Z';
  for (let i = 0; i < edges.length - 1; i++) {
   const top = edges[i], bottom = edges[i + 1];
   const spans = boxes.filter(box => box.top < bottom && box.bottom > top).sort((a, b) => a.left - b.left);
   const merged: { left: number; right: number }[] = [];
   for (const span of spans) {
    const last = merged.at(-1);
    if (last && span.left <= last.right) last.right = Math.max(last.right, span.right);
    else merged.push({ left: span.left, right: span.right });
   }
   for (const span of merged) result += `M${span.left},${top}H${span.right}V${bottom}H${span.left}Z`;
  }
  return result;
 };

	$: currentMarkerClip = markerClearanceClip(currentScene.markers);
	$: routeMarkerClip = markerClearanceClip([...currentScene.markers, ...previousScene.markers]);
	const path = (points: Point[]) => points.map((point, i) => `${i ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
	function point(event: PointerEvent): Point {
		const svg = (event.currentTarget as SVGElement).ownerSVGElement!;
		const matrix = svg.getScreenCTM();
		return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : { x: 0, y: 0 };
	}
	function dragBegin(event: PointerEvent, motion: Motion, index: number) {
		event.preventDefault();
		event.stopPropagation();
		dragging = { index, motion: structuredClone(motion), points: structuredClone(motion.points) };
		(event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
	}
	function dragMove(event: PointerEvent) {
		if (!dragging || !to) return;
		const route = routes.find((item) => sameTarget(item.start, dragging!.motion));
		const a = route?.start,
			b = route?.end;
		if (!a || !b) return;
		const handle=point(event);
		dragging.motion.points[dragging.index] = relativePoint({x:2*handle.x-(a.x+b.x)/2,y:2*handle.y-(a.y+b.y)/2}, a, b);
		dragging = { ...dragging };
	}
	function dragEnd(event: PointerEvent) {
		event.stopPropagation();
		if (dragging) onchange(dragging.motion);
		dragging = null;
	}
	function routePoint(event: PointerEvent) {
		event.stopPropagation();
		event.preventDefault();
		if (!drawingRoute) return;
		drawing = true;routePointer=event.pointerId;
		drawn = [point(event)];
		(event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
	}
	function routeMove(event: PointerEvent) {
		event.stopPropagation();
		if (!drawing) return;
  if(event.buttons===0){cancelRoute();return;}
		const next = point(event),
			previous = drawn.at(-1)!;
		if (Math.hypot(next.x - previous.x, next.y - previous.y) > 4 && drawn.length < 200) drawn = [...drawn, next];
	}
 let routePointer:number|null=null;
 function routeEnd(event:PointerEvent){
  if(!drawing||event.pointerId!==routePointer)return;
  event.stopPropagation();
  const route=routes.find(item=>selection[0]&&sameTarget(item.start,selection[0]));
  const points=[...drawn];
  drawing=false;routePointer=null;drawn=[];
  // End the session before committing: committing replaces authoring state/selection.
  ondraw(false);
  if(route&&points.length>1)onchange({...route.motion,path:'custom',smooth:route.motion.smooth,points:points.map(p=>relativePoint(p,route.start,route.end))});
 }
 function cancelRoute(){drawing=false;routePointer=null;drawn=[];ondraw(false);}

</script>

<svelte:window on:pointerup={routeEnd} on:pointercancel={cancelRoute} on:blur={cancelRoute}
	on:pointerdown|capture={(event) => {
		if (!(event.target as Element)?.closest('[data-animation-path-picker],.driver-popover')) picker = null;
	}}
	on:keydown={(event) => {
		if (event.key === 'Escape') {
			picker = null;
			ondraw(false);
		}
	}}
/>

<g data-animation-overlay data-export-exclude class:noninteractive={!interactive}>
	<defs>
		<clipPath id="animation-ghost-hit-clearance"><path d={currentMarkerClip} clip-rule="evenodd" /></clipPath>
		<clipPath id="animation-route-hit-clearance"><path d={routeMarkerClip} clip-rule="evenodd" /></clipPath>
	</defs>
	{#if ghosts && stepIndex > 0}
		{#each movedGhosts as pose (pose.type + pose.id)}
			<g
				use:artworkLayer={{selected:isSelected(pose,selection),ghost:true}}
    class:noninteractive={!interactive||drawingRoute}
				data-animation-ghost={pose.id}
    data-animation-ghost-type={pose.type}
    data-tutorial-kind={pose.type==='guide'?scene.guides.find(item=>item.id===pose.id)?.kind:undefined}
				opacity={.25}
				role="button"
				tabindex="0"
				aria-label={`Select previous position of ${targetName(pose)}`}
				style="cursor:pointer"
				on:pointerdown|preventDefault|stopPropagation={() => onselect(pose)}
    on:dblclick={(event) => openPicker(event, pose)}
    on:contextmenu|preventDefault|stopPropagation={(event) => openPicker(event, pose)}
				on:keydown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						event.stopPropagation();
						onselect(pose);
					}
				}}
			>
				{#if pose.type === 'marker'}
					{@const before = previousScene.markers.find((m) => m.id === pose.id)!}
                    <g pointer-events="none"><MarkerArtwork marker={before} /></g>
					<circle cx={before.x} cy={before.y} r="17" fill="transparent" pointer-events="all" clip-path="url(#animation-ghost-hit-clearance)" />
				{:else if pose.type==='path'}
 {@const arrow=previousScene.paths.find(item=>item.id===pose.id)!}
 <ArrowArtwork {arrow}/>
 {:else}
                    {@const guide = previousScene.guides.find((item) => item.id === pose.id)!}
                    <line x1={pose.x} x2={pose.x} y1="54" y2="430" stroke={playBuilderGuideColor(guide.color)} stroke-width="5" stroke-dasharray={playBuilderGuideDash(guide.style)} stroke-linecap={guide.style === 'dotted' ? 'round' : 'square'} pointer-events="none" />
					<line
						x1={pose.x}
						x2={pose.x}
						y1="50"
						y2="434"
						stroke="transparent"
						stroke-width="14"
						pointer-events="stroke"
						clip-path="url(#animation-ghost-hit-clearance)"
					/>
				{/if}
			</g>
		{/each}
	{/if}
	{#each routes as route (route.start.type + route.start.id)}
		<g use:artworkLayer={{selected:isSelected(route.start,selection)}} class:noninteractive={!interactive||drawingRoute} data-animation-route={route.start.id} opacity={isSelected(route.start, selection) ? 1 : 0.25}>
			<path
				data-animation-route-line
                visibility={route.motion.path === 'jump' ? 'hidden' : undefined}
				opacity={drawingRoute && isSelected(route.start, selection) ? .2 : 1}
				d={path(
					drawingRoute && originalRoute && sameTarget(originalRoute.target, route.start)
						? originalRoute.points
						: motionPoints(route.motion, route.start, route.end)
				)}
				stroke="white"
				stroke-width="2"
				stroke-dasharray="5 4"
				fill="none"
				pointer-events="none"
			/>
			<path
				d={path(motionPoints(route.motion, route.start, route.end))}
				stroke="transparent"
				stroke-width="14"
				fill="none"
				pointer-events="stroke"
				role="button"
				tabindex="0"
				aria-label={`Select movement route for ${targetName(route.start)}`}
				clip-path="url(#animation-route-hit-clearance)"
				style="cursor:pointer"
				on:pointerdown|preventDefault|stopPropagation={() => onselect(route.start)}
				on:dblclick={(event) => openPicker(event, route.start)}
				on:contextmenu|preventDefault|stopPropagation={(event) => openPicker(event, route.start)}
				on:keydown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						event.stopPropagation();
						onselect(route.start);
					}
				}}
			/>
		</g>
		{#if route.motion.path === 'curve' && selection.some((target) => sameTarget(target, route.start))}
			{#each route.motion.points as control, index}
				{@const dx = route.end.x - route.start.x}
				{@const dy = route.end.y - route.start.y}
				{@const length = Math.hypot(dx, dy) || 1}
				<circle
					role="button"
					tabindex="0"
					aria-label={route.motion.path === 'curve' ? 'Bend movement path' : `Movement waypoint ${index + 1}`}
					cx={(route.start.x+route.end.x)/4+(route.start.x+control.x*dx-(control.y*dy)/length)/2}
					cy={(route.start.y+route.end.y)/4+(route.start.y+control.x*dy+(control.y*dx)/length)/2}
					r="6"
					fill="white"
					stroke="#292524"
					stroke-width="2"
					style="cursor:move;touch-action:none"
					on:pointerdown={(event) => dragBegin(event, route.motion, index)}
					on:pointermove={dragMove}
					on:pointerup={dragEnd}
					on:pointercancel={() => (dragging = null)}
					on:keydown={(event) => {
						if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Delete', 'Backspace'].includes(event.key)) {
							event.preventDefault();
							event.stopPropagation();
							const next = structuredClone(route.motion);
							if (event.key === 'Delete' || event.key === 'Backspace') {
								if (next.path === 'curve') {
									next.path = 'straight';
									next.points = [];
								} else next.points.splice(index, 1);
							} else {
								next.points[index].x += event.key === 'ArrowLeft' ? -0.01 : event.key === 'ArrowRight' ? 0.01 : 0;
								next.points[index].y += event.key === 'ArrowUp' ? -2 : event.key === 'ArrowDown' ? 2 : 0;
							}
							onchange(next);
						}
					}}
				/>
			{/each}
		{/if}
	{/each}
	{#if drawingRoute}
		<rect
			role="application"
			aria-label="Draw movement route"
			x="0"
			y="0"
			width="1000"
			height="484"
			fill="transparent"
			style="cursor:crosshair;touch-action:none"
			on:pointerdown={routePoint}
			on:pointermove={routeMove}
			on:pointerup={routeEnd}
			on:pointercancel={cancelRoute}
   on:lostpointercapture={()=>{if(drawing)cancelRoute();}}
		/>
		{#if drawn.length > 1}<path d={path(drawn)} stroke="white" stroke-width="3" stroke-dasharray="5 4" fill="none" pointer-events="none" />{/if}
	{/if}
	{#if picker && pickerRoute}
		<foreignObject width="0" height="0">
			<div
				data-animation-path-picker
    use:elementEditor={{close:()=>picker=null,capabilities:{motion:true}}}
    style:left={`${picker.x}px`}
    style:top={`${picker.y}px`}
				data-animation-ui
				role="dialog"
				aria-label="Movement path options"
				tabindex="-1"
				class="path-picker"
				on:pointerdown|stopPropagation
			>
				{#if picker && canedit(picker.target)}<div class="mode-row"><ElementEditorModes active="animation" onchange={(mode,event)=>{if(mode==='element'&&picker){const target=picker.target;picker=null;onedit(target,event);}}}/></div>{/if}
                <div class="path-types">
						{#each (pickerRoute.start.type==='path'?(scene.paths.find(path=>path.id===pickerRoute.start.id)?.kind==='line'?[['straight','Morph'],['jump','Jump']]:[['draw','Draw'],['straight','Morph'],['jump','Jump']]):pickerRoute.start.type==='guide'?[['straight','Shift'],['jump','Jump']]:[['straight', 'Linear'], ['curve', 'Curved'], ['custom', 'Custom'], ['jump', 'Jump']]) as [value, label]}
							<HoverTooltip text={restrictedAdded&&value!=='jump'?'Not Available for Added Element':deleted&&value!=='jump'?'Not Available for Deleted Element':(label==='Linear'||label==='Curved')&&Math.hypot(pickerRoute.end.x-pickerRoute.start.x,pickerRoute.end.y-pickerRoute.start.y)<.001?'Move Element to Enable':value==='draw'?'Draw Along Arrow':value==='straight'?(pickerRoute.start.type==='path'?'Blend Arrow Shapes':pickerRoute.start.type==='guide'?'Slide the Line':'A Straight Line'):value==='curve'?'A Bending Line':value==='custom'?'Draw Your Route':'Change Position Instantly'} minWidthPx={0} wrapperClass="flex flex-1"><button style="width:100%" disabled={(deleted||restrictedAdded)&&value!=='jump'||(label==='Linear'||label==='Curved')&&Math.hypot(pickerRoute.end.x-pickerRoute.start.x,pickerRoute.end.y-pickerRoute.start.y)<.001} aria-pressed={activePath === value} class:active={activePath === value} on:click={() => choosePath(value as Motion['path'])}>{value === 'custom' && pickerRoute.motion.path === 'custom' ? 'Redraw' : label}</button></HoverTooltip>
						{/each}
					</div>
				<div class="picker-timing">
     <AnimationTiming motion={pickerRoute.motion} duration={transition.duration} label={targetName(pickerRoute.start)} showLabel={false} {onchange} />
    </div>
    <div class="picker-row">
					<div class="easing-select">
 <button class="easing-trigger" aria-label="Path easing" aria-haspopup="listbox" aria-expanded={easingOpen} on:click={() => easingOpen = !easingOpen}>{pickerRoute.motion.path==='jump'?({cut:'Hard Cut',fade:'Fade',shrink:'Shrink'}[pickerRoute.motion.jumpEffect??'fade']):{ linear: 'Steady', in: 'Ease In', out: 'Ease Out', 'in-out': 'Ease In/Out' }[pickerRoute.motion.easing]}<DropdownChevron open={easingOpen}/></button>
 {#if easingOpen}<div class="easing-menu" role="listbox" aria-label="Path easing">
 {#each (pickerRoute.motion.path==='jump'?(pickerRoute.start.type==='guide'?[['cut','Hard Cut'],['fade','Fade']]:[['cut','Hard Cut'],['fade','Fade'],['shrink','Shrink']]):[['linear', 'Steady'], ['in', 'Ease In'], ['out', 'Ease Out'], ['in-out', 'Ease In/Out']]) as [value, label]}
 <button role="option" aria-selected={(pickerRoute.motion.path==='jump'?(pickerRoute.motion.jumpEffect??'fade'):pickerRoute.motion.easing) === value} on:click={() => { if (pickerRoute) onchange({ ...pickerRoute.motion, ...(pickerRoute.motion.path==='jump'?{jumpEffect:value as Motion['jumpEffect']}:{easing:value as Motion['easing']}) }); easingOpen = false; }}>{label}</button>
 {/each}</div>{/if}
 </div>
 {#if pickerRoute.motion.path==='jump'&&(pickerRoute.motion.jumpEffect??'fade')!=='cut'}<TransitionDuration value={Math.min(pickerRoute.motion.jumpDuration??.25,transition.duration)} maximum={transition.duration} onchange={value=>{if(pickerRoute)onchange({...pickerRoute.motion,jumpDuration:value});}}/>{/if}

				</div>
			</div>
		</foreignObject>
	{/if}
</g>

<style>
 .noninteractive :global(*) {pointer-events:none !important;}
 .path-picker {
  position: fixed;
  z-index: 1001;
  width: 232px;
  padding: 4px;
  background: white;
  box-shadow: 0 0 0 2px #1c1917, 0 20px 25px -5px #0002;
  color: #1c1917;
  font: 700 12px Inter, sans-serif;
  user-select: none;
 }
 .mode-row{margin-bottom:4px;}
 .picker-timing { margin-bottom: 4px; }
 .picker-row, .path-types { display: flex; align-items: center; gap: 4px; }
 button { display: inline-flex; align-items: center; justify-content: center; gap: 4px; cursor: pointer; height: 28px; padding: 0 6px; background: #f5f5f4; color: #44403c; font: inherit; }
 .path-types { gap: 1px; padding: 1px; background: #a8a29e; margin-bottom: 4px; }
 .path-types button { flex: 1; padding-inline: 3px; }
 .easing-trigger:disabled { opacity: .4; cursor: default; }
 .path-types button.active { background: #1c1917; color: white; }
 button:disabled {opacity:.4;cursor:default;}
 button:hover { background: #e7e5e4; }
 button:focus-visible { outline: 2px solid #78716c; outline-offset: -2px; }
.easing-select { position: relative; flex: 1; min-width: 0; }
 .easing-trigger { width: 100%; justify-content: space-between; }
 .easing-menu { position: absolute; top: 100%; left: 0; right: 0; z-index: 2; background: white; box-shadow: 0 0 0 1px #a8a29e, 0 4px 8px #0002; padding: 2px; }
 .easing-menu button { display: flex; width: 100%; justify-content: flex-start; background: white; }
 .easing-menu button:hover, .easing-menu button[aria-selected='true'] { background: #e7e5e4; }
</style>
