<script context="module" lang="ts">
 import type { Motion as RememberedMotion } from '$lib/play-builder-animation';
 // Deliberately session-only: saved documents contain only the active motion.
 const routeMemory = new Map<string, { routes: Partial<Record<RememberedMotion['path'], RememberedMotion>>; end: number }>();
</script>
<script lang="ts">
	import {
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
	import MarkerArtwork from './MarkerArtwork.svelte';
 import { playBuilderGuideColor, playBuilderGuideDash } from '$lib/play-builder-rendering';
	import AnimationIcon from './AnimationIcon.svelte';
 import AnimationTiming from './AnimationTiming.svelte';
	import type { PlayBuilderScene, Point } from '$lib/play-builder-scene';
	export let animation: PlayAnimation;
	export let scene: PlayBuilderScene;
	export let stepIndex: number;
	export let selection: AnimationTarget[];
	export let ghosts = true;
	export let drawingRoute = false;
	export let onselect: (target: AnimationTarget) => void;
	export let onchange: (motion: Motion) => void;
	export let ondraw: (active: boolean) => void;
	let easingOpen = false;
 let picker: { target: AnimationTarget; x: number; y: number } | null = null;
	$: pickerRoute = picker ? routes.find((route) => sameTarget(route.start, picker!.target)) : undefined;
	function openPicker(event: MouseEvent, target: AnimationTarget) {
		event.preventDefault();
		event.stopPropagation();
		onselect(target);
  easingOpen = false;
		picker = { target, x: Math.max(8, Math.min(window.innerWidth - 240, event.clientX)), y: Math.max(8, Math.min(window.innerHeight - 160, event.clientY)) };
	}
	function pickerPortal(node: HTMLDivElement) {
  document.body.appendChild(node);
  return { destroy: () => node.remove() };
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

	// Keep route artwork below scene objects while handles and hit targets stay above.
	function beneathElements(node: SVGPathElement) {
		node.ownerSVGElement?.querySelector('[data-animation-route-underlay]')?.appendChild(node);
		return { destroy: () => node.remove() };
	}
	let dragging: { index: number; motion: Motion; points: Point[] } | null = null;
	let drawn: Point[] = [];
	let drawing = false;
	let routeSession = false;
	let routeWaypoints: Point[] = [];
	let originalRoute: { target: AnimationTarget; points: Point[] } | null = null;
	$: if (drawingRoute !== routeSession) {
		routeSession = drawingRoute;
		routeWaypoints = [];
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
						const displayedMotion = dragging && sameTarget(dragging.motion, start) ? dragging.motion : motion;
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
						return start.x === end.x && start.y === end.y ? [] : [{ start, end, motion: displayedMotion }];
					})
			: [];
	const isSelected = (target: AnimationTarget, targets = selection) => targets.some((item) => sameTarget(item, target));
	const targetName = (target: AnimationTarget) =>
		target.type === 'marker'
			? scene.markers.find((item) => item.id === target.id)?.name || scene.markers.find((item) => item.id === target.id)?.label || 'object'
			: 'guide';
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
		dragging.motion.points[dragging.index] = relativePoint(point(event), a, b);
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
		drawing = true;
		drawn = [point(event)];
		(event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
	}
	function routeMove(event: PointerEvent) {
		event.stopPropagation();
		if (!drawing) return;
		const next = point(event),
			previous = drawn.at(-1)!;
		if (Math.hypot(next.x - previous.x, next.y - previous.y) > 4 && drawn.length < 200) drawn = [...drawn, next];
	}
	function routeEnd(event: PointerEvent) {
		event.stopPropagation();
		const route = routes.find((item) => selection[0] && sameTarget(item.start, selection[0]));
		if (!route || !drawing) return;
		const points = drawn.length > 1 ? drawn : [point(event)];
		if (drawn.length <= 1) routeWaypoints = [...routeWaypoints, relativePoint(points[0], route.start, route.end)].slice(0, 256);
		onchange({
			...route.motion,
			path: 'custom',
			smooth: route.motion.smooth,
			points: drawn.length > 1 ? points.map((p) => relativePoint(p, route.start, route.end)) : routeWaypoints
		});
		const strokeFinished = drawn.length > 1;
		drawing = false;
		drawn = [];
		if (strokeFinished) ondraw(false);
	}
</script>

<svelte:window
	on:pointerdown={(event) => {
		if (!(event.target as Element)?.closest('[data-animation-path-picker]')) picker = null;
	}}
	on:keydown={(event) => {
		if (event.key === 'Escape') {
			picker = null;
			ondraw(false);
		}
	}}
/>

<g data-animation-overlay data-export-exclude>
	<defs>
		<clipPath id="animation-ghost-hit-clearance"><path d={currentMarkerClip} clip-rule="evenodd" /></clipPath>
		<clipPath id="animation-route-hit-clearance"><path d={routeMarkerClip} clip-rule="evenodd" /></clipPath>
	</defs>
	{#if ghosts && stepIndex > 0}
		{#each movedGhosts as pose (pose.type + pose.id)}
			<g
				data-animation-ghost={pose.id}
				opacity={0.25}
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
		<g data-animation-route={route.start.id} opacity={isSelected(route.start, selection) ? 1 : 0.25}>
			<path
				use:beneathElements
				data-animation-route-line
                visibility={route.motion.path === 'jump' ? 'hidden' : undefined}
				opacity={drawingRoute && isSelected(route.start, selection) ? 0.2 : isSelected(route.start, selection) ? 1 : 0.25}
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
					cx={route.start.x + control.x * dx - (control.y * dy) / length}
					cy={route.start.y + control.x * dy + (control.y * dx) / length}
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
			on:pointercancel={() => {
				drawing = false;
				drawn = [];
			}}
		/>
		{#if drawn.length > 1}<path d={path(drawn)} stroke="white" stroke-width="3" stroke-dasharray="5 4" fill="none" pointer-events="none" />{/if}
	{/if}
	{#if picker && pickerRoute}
		<foreignObject width="0" height="0">
			<div
				data-animation-path-picker
    use:pickerPortal
    style:left={`${picker.x}px`}
    style:top={`${picker.y}px`}
				data-animation-ui
				role="dialog"
				aria-label="Movement path options"
				tabindex="-1"
				class="path-picker"
				on:pointerdown|stopPropagation
			>
				{#if pickerRoute.start.type === 'marker'}<div class="path-types">
						{#each [['straight', 'Linear'], ['curve', 'Curved'], ['custom', 'Custom'], ['jump', 'Jump']] as [value, label]}
							<button aria-pressed={pickerRoute.motion.path === value} class:active={pickerRoute.motion.path === value} on:click={() => choosePath(value as Motion['path'])}>{value === 'custom' && pickerRoute.motion.path === 'custom' ? 'Redraw' : label}</button>
						{/each}
					</div>
				{/if}
				<div class="picker-timing">
     <AnimationTiming motion={pickerRoute.motion} duration={transition.duration} label={targetName(pickerRoute.start)} showLabel={false} {onchange} />
    </div>
    <div class="picker-row">
					<div class="easing-select">
 <button class="easing-trigger" disabled={pickerRoute.motion.path === 'jump'} aria-label="Path easing" aria-haspopup="listbox" aria-expanded={easingOpen} on:click={() => easingOpen = !easingOpen}>{ { linear: 'Steady', in: 'Ease In', out: 'Ease Out', 'in-out': 'Ease In/Out' }[pickerRoute.motion.easing]}<span>⌄</span></button>
 {#if easingOpen}<div class="easing-menu" role="listbox" aria-label="Path easing">
 {#each [['linear', 'Steady'], ['in', 'Ease In'], ['out', 'Ease Out'], ['in-out', 'Ease In/Out']] as [value, label]}
 <button role="option" aria-selected={pickerRoute.motion.easing === value} on:click={() => { if (pickerRoute) onchange({ ...pickerRoute.motion, easing: value as Motion['easing'] }); easingOpen = false; }}>{label}</button>
 {/each}</div>{/if}
 </div>

				</div>
			</div>
		</foreignObject>
	{/if}
</g>

<style>
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
 .picker-timing { margin-bottom: 4px; }
 .picker-row, .path-types { display: flex; align-items: center; gap: 4px; }
 button { display: inline-flex; align-items: center; justify-content: center; gap: 4px; cursor: pointer; height: 28px; padding: 0 6px; background: #f5f5f4; color: #44403c; font: inherit; }
 .path-types { gap: 1px; padding: 1px; background: #a8a29e; margin-bottom: 4px; }
 .path-types button { flex: 1; padding-inline: 3px; }
 .easing-trigger:disabled { opacity: .4; cursor: default; }
 .path-types button.active { background: #1c1917; color: white; }
 button:hover { background: #e7e5e4; }
 button:focus-visible { outline: 2px solid #78716c; outline-offset: -2px; }
.easing-select { position: relative; flex: 1; min-width: 0; }
 .easing-trigger { width: 100%; justify-content: space-between; }
 .easing-menu { position: absolute; top: 100%; left: 0; right: 0; z-index: 2; background: white; box-shadow: 0 0 0 1px #a8a29e, 0 4px 8px #0002; padding: 2px; }
 .easing-menu button { display: flex; width: 100%; justify-content: flex-start; background: white; }
 .easing-menu button:hover, .easing-menu button[aria-selected='true'] { background: #e7e5e4; }
</style>
