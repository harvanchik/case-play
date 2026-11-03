import { playBuilderGuideColor } from './play-builder-rendering';
import { defaultDrawingAnimation, evaluateDrawings, type DrawingAnimation } from './play-builder-drawing-animation';
import type { DownMarkerValue, GuideColor, FieldMarker, PlayBuilderScene, Point } from './play-builder-scene';

export const MAX_ANIMATION_SECONDS = 60;
export const MAX_ANIMATION_STEPS = 61;
export type AnimationTarget = { type: 'marker' | 'guide' | 'path'; id: number };
export type AnimationPose = AnimationTarget & Point & { visible: boolean; color?: GuideColor; animationColor?: string; colorFrom?: GuideColor; colorMix?: number; end?:Point; points?:Point[]; down?: DownMarkerValue; animationScale?: number; animationOpacity?: number; animationLabelOpacity?:number; animationReveal?:number; animationShadow?:Point & {scale?:number}; label?: string | null; name?: string | null; carrierId?: number; offset?: Point };
export type AnimationStep = { id: string; name: string; poses: AnimationPose[]; strokeIds?: number[]; strokeOffsets?: { id: number; x: number; y: number; color?: GuideColor }[] };
export type Motion = AnimationTarget & {
	path: 'straight' | 'curve' | 'custom' | 'jump' | 'draw';
	speed?: number;
	jumpEffect?: 'cut' | 'fade' | 'shrink';
 jumpDuration?: number;
	/** Geometry is relative to the endpoints: x is progress, y is perpendicular field distance. */
	points: Point[];
	smooth: boolean;
	start: number;
	end: number;
	easing: 'linear' | 'in' | 'out' | 'in-out';
};
export const MOTION_SPEEDS = [.25,.5,.75,1,1.25,1.5,1.75,2] as const;
export const motionArrival = (motion: Motion) => Math.min(1,motion.start+(motion.end-motion.start)/(motion.speed ?? 1));
export type AnimationTransition = { from: string; to: string; duration: number; motions: Motion[] };
export type PlayAnimation = { drawings?: DrawingAnimation[]; steps: AnimationStep[]; transitions: AnimationTransition[] };
export const cloneAnimation = (animation: PlayAnimation): PlayAnimation => structuredClone(animation);
/** Retime an already-cloned animation, preserving authored seconds for partial windows. */
export function retimeTransition(animation: PlayAnimation, index: number, duration: number) {
 const transition = animation.transitions[index];
 const previous = transition.duration;
 const retime = (timing: { start: number; end: number; speed?: number; jumpDuration?: number }, jump = false) => {
  if(timing.jumpDuration!==undefined)timing.jumpDuration=Math.min(duration,timing.jumpDuration);
  if (timing.start === 0 && timing.end === 1 && (jump || (timing.speed ?? 1) === 1)) return;
  const minimum = .01 / duration;
  timing.end = jump ? 1 : Math.max(minimum, Math.min(1, timing.end * previous / duration));
  timing.start = Math.max(0, Math.min(timing.end - minimum, timing.start * previous / duration));
 };
 transition.motions.forEach(motion => retime(motion, motion.path === 'jump'));
 animation.drawings?.filter(drawing => drawing.stepId === transition.to).forEach(drawing => retime(drawing,drawing.mode==='jump'));
 transition.duration = duration;
}
export const targetKey = (target: { type: string; id: number }) => `${target.type}:${target.id}`;
export const sameTarget = (a: AnimationTarget, b: AnimationTarget) => a.type === b.type && a.id === b.id;
export const animationDuration = (animation?: PlayAnimation) => animation?.transitions.reduce((sum, item) => sum + item.duration, 0) ?? 0;
export const stepTime = (animation: PlayAnimation, index: number) =>
	animation.transitions.slice(0, index).reduce((sum, item) => sum + item.duration, 0);
export const defaultMotion = (target: AnimationTarget): Motion => ({
	...target,
	path: 'straight',
	points: [],
	smooth: true,
	start: 0,
	end: 1,
	easing: 'linear'
});
const markerPoseColor = (marker: FieldMarker): GuideColor => marker.color ?? (
 marker.kind === 'team-a' || marker.kind === 'team-k' ? 'black' :
 marker.kind.startsWith('team-') ? 'white' : marker.kind === 'bean-bag' ? 'blue' :
 marker.kind === 'deflag' ? 'red' : 'yellow'
);
export const capturePoses = (scene: PlayBuilderScene): AnimationPose[] => [
 ...scene.markers.map(marker => ({
  color: markerPoseColor(marker), label: marker.label ?? null, name: marker.name ?? null,
  type: 'marker' as const, id: marker.id, x: marker.x, y: marker.y, visible: true
 })),
 ...scene.paths.map(path => {
  const anchor = path.startMarkerId === undefined ? undefined : scene.markers.find(marker => marker.id === path.startMarkerId);
  const start = anchor ?? path.start;
  const first = path.points?.[0] ?? path.start;
  return {
   color: path.color, type: 'path' as const, id: path.id, x: start.x, y: start.y, end: {...path.end},
   ...(path.points ? {points: path.points.map(point => ({x: point.x + start.x-first.x, y: point.y+start.y-first.y}))} : {}),
   visible: true
  };
 }),
 ...scene.guides.map(({id,x,name,down,color}) => ({
  color, ...(down !== undefined ? {down} : {}), name: name ?? null,
  type: 'guide' as const, id, x, y: 242, visible: true
 }))
];
/** Compare authored step state, excluding playback-only paint/opacity values. */
export function animationTargetChanged(animation:PlayAnimation,index:number,target:AnimationTarget):boolean {
 if(index<1)return false;
 if(target.type==='path'&&animation.transitions[index-1]?.motions.some(item=>sameTarget(item,target)&&item.path==='draw'))return true;
 const before=animation.steps[index-1]?.poses.find(pose=>sameTarget(pose,target));
 const after=animation.steps[index]?.poses.find(pose=>sameTarget(pose,target));
 if(!before||!after)return false;
 const state=(pose:AnimationPose)=>[pose.visible,pose.x,pose.y,pose.end,pose.points,pose.color,pose.label??null,pose.name??null,pose.down,pose.carrierId,pose.offset];
 return JSON.stringify(state(before))!==JSON.stringify(state(after));
}

const newStepId = () => globalThis.crypto.randomUUID();
export const createAnimation = (scene: PlayBuilderScene): PlayAnimation => ({
	steps: [{ id: newStepId(), name: 'Start', poses: capturePoses(scene), strokeIds:scene.freeStrokes.map(stroke=>stroke.id) }],
	transitions: []
});

/** Keep transition settings only when the same two neighboring steps remain adjacent. */
export const rebuildTransitions = (animation: PlayAnimation): PlayAnimation => ({
	...animation,
	...(animation.drawings?{drawings:animation.drawings.filter(item=>animation.steps.slice(1).some(step=>step.id===item.stepId))}:{}),
	steps: animation.steps,
	transitions: animation.steps.slice(1).map(
		(step, index) =>
			animation.transitions.find((item) => item.from === animation.steps[index].id && item.to === step.id) ?? {
				from: animation.steps[index].id,
				to: step.id,
				duration: 1,
				motions: []
			}
	)
});
const copyAnimationStep = (animation: PlayAnimation, index: number, insertAt: number): PlayAnimation => {
	if (animation.steps.length >= MAX_ANIMATION_STEPS) throw new Error('Animations can contain up to 61 steps and 60 seconds.');
	const next = cloneAnimation(animation);
	next.steps.splice(insertAt, 0, { ...structuredClone(next.steps[index]), id: newStepId(), name: `Step ${next.steps.length + 1}` });
	const rebuilt = rebuildTransitions(next);
	if (animationDuration(rebuilt) > MAX_ANIMATION_SECONDS) throw new Error('Animation exceeds 60 seconds.');
	return rebuilt;
};

/** Duplicate next to the selected step, retaining unaffected neighboring transitions. */
export const insertAnimationStep = (animation: PlayAnimation, index: number) => copyAnimationStep(animation, index, index + 1);
/** Add a copy of the last pose at the end, leaving the existing step order intact. */
export const appendAnimationStep = (animation: PlayAnimation) => copyAnimationStep(animation, animation.steps.length - 1, animation.steps.length);

/** Merge current edits into just one pose; preserve the complete object registry for other steps. */
export const captureAnimationEdits = (base: PlayBuilderScene, live: PlayBuilderScene, animation: PlayAnimation, index: number) => {
	const next = cloneAnimation(animation);
 const basePoses=capturePoses(base);
 const basePoseMap=new Map(basePoses.map(pose=>[targetKey(pose),pose]));
 // Older animation documents did not store arrows in their step poses.
 const basePaths=basePoses.filter(pose=>pose.type==='path');
 for(const frame of next.steps)for(const pose of basePaths)
  if(!frame.poses.some(item=>sameTarget(item,pose)))frame.poses.push(structuredClone(pose));
 for (const frame of next.steps) for (const pose of frame.poses) {
  const object = basePoseMap.get(targetKey(pose));
  if(pose.color===undefined)pose.color=object?.color;
  if (pose.name === undefined) pose.name = object?.name ?? null;
  if(pose.type==='guide' && pose.down===undefined){const down=base.guides.find(item=>item.id===pose.id)?.down;if(down!==undefined)pose.down=down;}
  if (pose.type === 'marker' && pose.label === undefined) pose.label = base.markers.find(item => item.id === pose.id)?.label ?? null;
 }
	const step = next.steps[index];
	if (!step) return { scene: structuredClone(base), animation: next };
 const baseDrawingIds=new Set(base.freeStrokes.map(stroke=>stroke.id));
 for(const frame of next.steps){frame.strokeIds ??= [...baseDrawingIds];frame.strokeOffsets ??= [];for(const stroke of base.freeStrokes){const offset=frame.strokeOffsets.find(item=>item.id===stroke.id);if(offset)offset.color ??= stroke.color;else frame.strokeOffsets.push({id:stroke.id,x:0,y:0,color:stroke.color});}}
 step.strokeOffsets=live.freeStrokes.map(stroke=>{const original=base.freeStrokes.find(item=>item.id===stroke.id)?.points[0]??stroke.points[0];return {id:stroke.id,x:stroke.points[0].x-original.x,y:stroke.points[0].y-original.y,color:stroke.color};});
 const removedDrawings=(step.strokeIds ?? [...baseDrawingIds]).filter(id=>!live.freeStrokes.some(stroke=>stroke.id===id));
 for(let later=index+1;later<next.steps.length;later++)next.steps[later].strokeIds=next.steps[later].strokeIds!.filter(id=>!removedDrawings.includes(id));
 step.strokeIds=live.freeStrokes.map(stroke=>stroke.id);
 if(index>0)for(const stroke of live.freeStrokes)if(!baseDrawingIds.has(stroke.id)){
  next.drawings ??=[];next.drawings.push(defaultDrawingAnimation(stroke.id,step.id));
 }
	const livePoses = capturePoses(live);
	const liveKeys = new Set(livePoses.map(targetKey));
	const knownKeys = new Set(capturePoses(base).map(targetKey));
	for (const pose of livePoses) {
		if (!knownKeys.has(targetKey(pose))) {
			for (let i = 0; i < next.steps.length; i++) next.steps[i].poses.push({ ...pose, visible: i === index });
		}
	}
	step.poses = step.poses.map((pose) => {
		const current = livePoses.find((item) => sameTarget(item, pose));
		if (current) return { ...pose, x: current.x, y: current.y, color:current.color, ...(pose.type==='path'?{end:current.end,points:current.points}:{}), name: current.name, ...(pose.type === 'marker' ? { label: current.label } : current.down!==undefined ? {down:current.down} : {}), visible: true };
		// Previously hidden objects must stay hidden when another object is edited.
		if (pose.visible && !liveKeys.has(targetKey(pose))) {
   if(index>0&&next.steps[index-1].poses.some(item=>sameTarget(item,pose)&&item.visible)){
    const transition=next.transitions[index-1];transition.motions=[...transition.motions.filter(item=>!sameTarget(item,pose)),{...defaultMotion(pose),path:'jump',jumpEffect:'cut'}];
   }
			for (let i = index + 1; i < next.steps.length; i++) {
				const later = next.steps[i].poses.find((item) => sameTarget(item, pose));
				if (later) later.visible = false;
			}
		}
		return { ...pose, visible: false };
	});
	for (const currentStep of next.steps)
		for (const pose of currentStep.poses) {
			if (pose.carrierId === undefined) continue;
			const carrier = currentStep.poses.find((item) => item.type === 'marker' && item.id === pose.carrierId && item.visible);
			if (!carrier) {
				const previousCarrier = currentStep.poses.find((item) => item.type === 'marker' && item.id === pose.carrierId);
				if (previousCarrier) {
					pose.x = previousCarrier.x + (pose.offset?.x ?? 12);
					pose.y = previousCarrier.y + (pose.offset?.y ?? 8);
				}
				delete pose.carrierId;
				delete pose.offset;
			}
		}
	const merge = <T extends { id: number }>(old: T[], current: T[]) => [
		...old.map((item) => current.find((value) => value.id === item.id) ?? item),
		...current.filter((item) => !old.some((value) => value.id === item.id))
	];
	const scene: PlayBuilderScene = { ...structuredClone(live), markers: merge(base.markers, live.markers), guides: merge(base.guides, live.guides), paths:merge(base.paths,live.paths), freeStrokes:merge(base.freeStrokes,live.freeStrokes).map(stroke=>({...stroke,color:base.freeStrokes.find(item=>item.id===stroke.id)?.color??stroke.color,points:base.freeStrokes.find(item=>item.id===stroke.id)?.points??stroke.points})) };
	const layerKeys = new Set(scene.layerOrder.map(targetKey));
	for (const layer of base.layerOrder) if (!layerKeys.has(targetKey(layer))) scene.layerOrder.push({ ...layer });
	const initial = next.steps[0];
	scene.markers = scene.markers.map((marker) => {
		const pose = initial.poses.find((item) => item.type === 'marker' && item.id === marker.id);
		return pose ? { ...marker, color:pose.color ?? marker.color, x: pose.x, y: pose.y, label: pose.label === undefined ? marker.label : pose.label ?? undefined, name: pose.name === undefined ? marker.name : pose.name ?? undefined } : marker;
	});
	scene.guides = scene.guides.map((guide) => {
		const pose = initial.poses.find((item) => item.type === 'guide' && item.id === guide.id);
		return pose ? { ...guide, color:pose.color ?? guide.color,animationColor:pose.animationColor, down: pose.down ?? guide.down, animationScale: pose.animationScale, animationOpacity: pose.animationOpacity, x: pose.x, name: pose.name === undefined ? guide.name : pose.name ?? undefined } : guide;
	});
	scene.paths=scene.paths.map(path=>{const pose=initial.poses.find(item=>item.type==='path'&&item.id===path.id);return pose?{...path,start:{x:pose.x,y:pose.y},end:pose.end??path.end,points:pose.points,color:pose.color??path.color,startMarkerId:undefined}:path;});
	return { scene, animation: next };
};

export const applyAnimationStep = (scene: PlayBuilderScene, step: AnimationStep): PlayBuilderScene => {
	const poses = new Map(step.poses.map((pose) => [targetKey(pose), pose]));
	const markerAt = (marker: FieldMarker): FieldMarker | null => {
		const pose = poses.get(`marker:${marker.id}`);
		if (!pose?.visible) return null;
		const carrier = pose.carrierId === undefined ? undefined : poses.get(`marker:${pose.carrierId}`);
		const position = carrier?.visible ? { x: carrier.x + (pose.offset?.x ?? 12), y: carrier.y + (pose.offset?.y ?? 8) } : pose;
		return { ...marker, color:pose.color ?? marker.color,animationLabelOpacity:pose.animationLabelOpacity,animationShadow:pose.animationShadow,animationColor:pose.animationColor,colorFrom:pose.colorFrom,colorMix:pose.colorMix, animationScale: pose.animationScale, animationOpacity: pose.animationOpacity, x: position.x, y: position.y, label: pose.label === undefined ? marker.label : pose.label ?? undefined, name: pose.name === undefined ? marker.name : pose.name ?? undefined };
	};
	return {
		...scene,
		freeStrokes: scene.freeStrokes.filter(stroke=>step.strokeIds?.includes(stroke.id)??true).map(stroke=>{const offset=step.strokeOffsets?.find(item=>item.id===stroke.id);return offset?{...stroke,color:offset.color??stroke.color,points:stroke.points.map(point=>({x:point.x+offset.x,y:point.y+offset.y}))}:stroke;}),
        paths:scene.paths.flatMap(path=>{const pose=poses.get(`path:${path.id}`);return !pose?[path]:!pose.visible?[]:[{...path,color:pose.color??path.color,animationColor:pose.animationColor,start:{x:pose.x,y:pose.y},end:pose.end??path.end,points:pose.points,startMarkerId:undefined,animationOpacity:pose.animationOpacity,animationScale:pose.animationScale,animationReveal:pose.animationReveal}];}),
		markers: scene.markers.map(markerAt).filter((item): item is FieldMarker => item !== null),
		guides: scene.guides.flatMap((guide) => {
			const pose = poses.get(`guide:${guide.id}`);
			return pose?.visible ? [{ ...guide, color:pose.color ?? guide.color,animationColor:pose.animationColor, down: pose.down ?? guide.down, animationScale: pose.animationScale, animationOpacity: pose.animationOpacity, x: pose.x, name: pose.name === undefined ? guide.name : pose.name ?? undefined }] : [];
		})
	};
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const relativePoint = (point: Point, start: Point, end: Point): Point => {
	const dx = end.x - start.x || (end.y===start.y?1:0),
		dy = end.y - start.y;
	const length = Math.hypot(dx, dy) || 1;
	return {
		x: ((point.x - start.x) * dx + (point.y - start.y) * dy) / (length * length),
		y: ((point.y - start.y) * dx - (point.x - start.x) * dy) / length
	};
};
const absolutePoint = (point: Point, start: Point, end: Point): Point => {
	const dx = end.x - start.x || (end.y===start.y?1:0),
		dy = end.y - start.y,
		length = Math.hypot(dx, dy) || 1;
	return { x: start.x + point.x * dx - (point.y * dy) / length, y: start.y + point.x * dy + (point.y * dx) / length };
};
export const motionPoints = (motion: Motion, start: Point, end: Point): Point[] => {
	if (motion.path === 'straight' || motion.path === 'jump' || motion.path==='draw') return [{ ...start }, { ...end }];
	if (motion.path === 'curve') {
		const bend = absolutePoint(motion.points[0] ?? { x: 0.5, y: -35 }, start, end);
		return Array.from({ length: 65 }, (_, i) => {
			const t = i / 64,
				u = 1 - t;
			return { x: u * u * start.x + 2 * u * t * bend.x + t * t * end.x, y: u * u * start.y + 2 * u * t * bend.y + t * t * end.y };
		});
	}
	let points = [start, ...motion.points.map((point) => absolutePoint(point, start, end)), end].map((point) => ({ ...point }));
	if (motion.smooth)
		for (let pass = 0; pass < 2; pass++) {
			const result: Point[] = [points[0]];
			for (let i = 0; i < points.length - 1; i++)
				result.push(
					{ x: mix(points[i].x, points[i + 1].x, 0.25), y: mix(points[i].y, points[i + 1].y, 0.25) },
					{ x: mix(points[i].x, points[i + 1].x, 0.75), y: mix(points[i].y, points[i + 1].y, 0.75) }
				);
			points = [...result, points.at(-1)!];
		}
	return points;
};
const distancePoint = (points: Point[], progress: number): Point => {
	const lengths = points.slice(1).map((point, i) => Math.hypot(point.x - points[i].x, point.y - points[i].y));
	let remaining = lengths.reduce((sum, value) => sum + value, 0) * clamp(progress);
	for (let i = 0; i < lengths.length; i++) {
		if (remaining <= lengths[i] && lengths[i] > 0)
			return { x: mix(points[i].x, points[i + 1].x, remaining / lengths[i]), y: mix(points[i].y, points[i + 1].y, remaining / lengths[i]) };
		remaining -= lengths[i];
	}
	return { ...points.at(-1)! };
};
const ease = (value: number, easing: Motion['easing']) =>
	easing === 'in'
		? value * value
		: easing === 'out'
			? 1 - (1 - value) ** 2
			: easing === 'in-out'
				? value < 0.5
					? 2 * value * value
					: 1 - (-2 * value + 2) ** 2 / 2
				: value;

/** Pure, seekable evaluation. Ball endpoints are evaluated at release/catch time, not at step endpoints. */
export const evaluateAnimation = (play: { scene: PlayBuilderScene; animation?: PlayAnimation }, time: number): PlayBuilderScene => {
	const { scene, animation } = play;
	if (!animation) return scene;
	const staticScene = {
		...scene,
		paths: scene.paths.map((path) => {
			const anchor = path.startMarkerId === undefined ? undefined : scene.markers.find((marker) => marker.id === path.startMarkerId);
			return anchor ? { ...path, start: { x: anchor.x, y: anchor.y }, startMarkerId: undefined } : path;
		})
	};
	if (time < 0 || !animation.transitions.length) return applyAnimationStep(staticScene, animation.steps[0]);
	let elapsed = 0,
		index = 0;
	while (index < animation.transitions.length - 1 && time >= elapsed + animation.transitions[index].duration)
		elapsed += animation.transitions[index++].duration;
	const transition = animation.transitions[index];
	const t = clamp((time - elapsed) / transition.duration);
	const from = animation.steps[index],
		to = animation.steps[index + 1];
	const poseAt = (target: AnimationTarget, progress: number, attached = true): AnimationPose | undefined => {
		const a = from.poses.find((pose) => sameTarget(pose, target)),
			b = to.poses.find((pose) => sameTarget(pose, target));
		if (!a || !b) return undefined;
		if (progress >= 1) return resolveAttachment(b, 1);
		if (!a.visible && !(target.type==='path'&&transition.motions.some(item=>sameTarget(item,target)&&item.path==='draw'))) return b.visible ? resolveAttachment(b, progress) : { ...a };
		if (!b.visible) {
   const removal=transition.motions.find(item=>sameTarget(item,target));
   if(removal?.path!=='jump')return {...b};
   const elapsed=(progress-removal.start)*transition.duration;
   const length=Math.min(removal.jumpDuration??.25,(1-removal.start)*transition.duration);
   const fraction=clamp(elapsed/Math.max(.000001,length));
   const effect=removal.jumpEffect??'cut';
   return {...resolveAttachment(a,progress),visible:elapsed<0||(effect!=='cut'&&fraction<1),animationOpacity:effect==='fade'?1-fraction:1,animationScale:effect==='shrink'?1-fraction:1};
  }
		const authored = transition.motions.find((item) => sameTarget(item, target)) ?? defaultMotion(target);
		const motion = target.type==='path'&&authored.path!=='jump'&&authored.path!=='draw'?{...authored,path:'straight' as const,points:[]}:authored;
  if(target.type==='path'&&motion.path==='draw'){
   const fraction=ease(clamp((progress-motion.start)/Math.max(.000001,motionArrival(motion)-motion.start)),motion.easing);
   return {...b,visible:b.visible,animationReveal:fraction};
  }
        if (motion.path === 'jump') {
          const start=motion.start*transition.duration;
          const elapsed=progress*transition.duration-start;
          const length=Math.min((motion.jumpDuration ?? .25/(motion.speed ?? 1)),transition.duration-start);
          const effect=motion.jumpEffect ?? 'fade';
          const fraction=effect==='cut' ? (elapsed>=0?1:0) : clamp(elapsed/length);
          const atDestination=effect==='cut'?elapsed>=0:fraction>=.5;
          const visibility=elapsed<0 || effect==='cut'?1:Math.abs(2*fraction-1);
          return {...resolveAttachment(atDestination?b:a,progress),label:a.label,name:a.name,down:fraction>=1?b.down:a.down,animationOpacity:effect==='fade'?visibility:1,animationScale:effect==='shrink'?visibility:1};
        }
		const carrierA = attached && a.carrierId !== undefined ? a.carrierId : undefined;
		const carrierB = attached && b.carrierId !== undefined ? b.carrierId : undefined;
		if (carrierA !== undefined && carrierA === carrierB) return resolveAttachment(a, progress);
		if (progress <= motion.start) return resolveAttachment(a, progress);
		if (progress >= motionArrival(motion)) return { ...resolveAttachment(b, progress), label: a.label, name: a.name };
		const start = resolveAttachment(a, motion.start),
			end = resolveAttachment(b, motionArrival(motion));
		const fraction = ease(clamp((progress - motion.start) / (motionArrival(motion) - motion.start)), motion.easing);
		const position = distancePoint(motionPoints(motion, start, end), fraction);
		if(a.type==='path'){
         const endpoint=(first:Point,last:Point)=>({x:position.x+mix(first.x-a.x,last.x-b.x,fraction),y:position.y+mix(first.y-a.y,last.y-b.y,fraction)});
         return {...a,...position,end:endpoint(a.end??a,b.end??b),points:a.points?.length===b.points?.length?a.points?.map((point,index)=>endpoint(point,b.points![index])): (fraction<1?a.points:b.points)?.map(point=>({x:point.x+position.x-(fraction<1?a.x:b.x),y:point.y+position.y-(fraction<1?a.y:b.y)}))};
        }
        const ball=target.type==='marker'&&scene.markers.some(marker=>marker.id===target.id&&marker.kind==='ball');
        const groundY=mix(start.y,end.y,fraction);
        const height=Math.max(0,groundY-position.y);
        const shadow=ball&&motion.path==='curve'?{x:position.x,y:groundY+9,scale:Math.max(.3,1/(1+height/55))}:undefined;
        return { ...a, ...position, animationShadow:shadow,carrierId: undefined, offset: undefined };
	};
	const resolveAttachment = (pose: AnimationPose, progress: number): AnimationPose => {
		if (pose.carrierId === undefined) return { ...pose };
		const carrier = poseAt({ type: 'marker', id: pose.carrierId }, progress, false);
		if (!carrier?.visible) return { ...pose, carrierId: undefined, offset: undefined };
		return { ...pose, x: carrier.x + (pose.offset?.x ?? 12), y: carrier.y + (pose.offset?.y ?? 8), carrierId: undefined, offset: undefined };
	};
	const poses = from.poses.map((pose) => {
 let result=poseAt(pose,t);const destination=to.poses.find(item=>sameTarget(item,pose));
 if(result&&destination&&t<1){
  const timing=transition.motions.find(item=>sameTarget(item,pose))??defaultMotion(pose);
  const elapsed=(t-timing.start)*transition.duration;
  const jumpLength=Math.min(timing.jumpDuration??.25/(timing.speed??1),(1-timing.start)*transition.duration);
  const jumpAtDestination=elapsed>=((timing.jumpEffect??'fade')==='cut'?0:jumpLength/2);
  for(const key of ['label','name'] as const){
   const a=pose[key],b=destination[key];
   if(a===undefined&&b===undefined)continue;
   if(timing.path==='jump')result={...result,[key]:(jumpAtDestination?b:a)??null};
   else if(Boolean(a)!==Boolean(b)){
    const fade=clamp((t-timing.start)/Math.max(.000001,(motionArrival(timing)-timing.start)/4));
    result={...result,[key]:(b||a)??null,...(key==='label'?{animationLabelOpacity:b?fade:1-fade}:{})};
   }
  }
 }
 if(!result||!destination||!pose.color||!destination.color||pose.color===destination.color)return result;
 const motion=transition.motions.find(item=>sameTarget(item,pose))??defaultMotion(pose);
 const start=motion.start*transition.duration;const length=Math.min(motion.jumpDuration??.25,transition.duration-start);
 const fraction=motion.path==='jump'?(t*transition.duration-start>=((motion.jumpEffect??'fade')==='cut'?0:length/2)?1:0):ease(clamp((t-motion.start)/Math.max(.000001,motionArrival(motion)-motion.start)),motion.easing);
 const a=playBuilderGuideColor(pose.color),b=playBuilderGuideColor(destination.color);
 const channels=[1,3,5].map(index=>Math.round(mix(parseInt(a.slice(index,index+2),16),parseInt(b.slice(index,index+2),16),fraction)));
 return {...result,color:destination.color,colorFrom:pose.color,colorMix:fraction,animationColor:`rgb(${channels.join(', ')})`};
 }).filter((pose): pose is AnimationPose => Boolean(pose));
	return {...applyAnimationStep(staticScene, { id: 'preview', name: '', poses }),freeStrokes:evaluateDrawings(scene.freeStrokes,animation,index,t)};
};

/** One-shot placement shortcut: no receiver/carrier reference survives the operation. */
export function passBallToElement(scene:PlayBuilderScene,animation:PlayAnimation,index:number,ballId:number,receiverId:number):PlayAnimation {
 const next=cloneAnimation(animation);if(index<1)return next;
 const current=applyAnimationStep(scene,next.steps[index]),previous=applyAnimationStep(scene,next.steps[index-1]);
 const ball=current.markers.find(marker=>marker.id===ballId&&marker.kind==='ball'),receiver=current.markers.find(marker=>marker.id===receiverId&&marker.kind!=='event'&&marker.id!==ballId);
 const pose=next.steps[index].poses.find(pose=>pose.type==='marker'&&pose.id===ballId);if(!ball||!receiver||!pose)return next;
 const start=previous.markers.find(marker=>marker.id===ballId)??ball,end={x:receiver.x+12,y:receiver.y+10};pose.x=end.x;pose.y=end.y;delete pose.carrierId;delete pose.offset;
 const lift=Math.max(12,Math.min(100,Math.hypot(end.x-start.x,end.y-start.y)*.3,(start.y+end.y)/2-20));
 const control={x:(start.x+end.x)/2,y:(start.y+end.y)/2-lift*2};
 const target={type:'marker' as const,id:ballId};const transition=next.transitions[index-1],existing=transition.motions.find(item=>sameTarget(item,target));
 transition.motions=[...transition.motions.filter(item=>!sameTarget(item,target)),{...defaultMotion(target),...existing,path:'curve',points:[relativePoint(control,start,end)]}];
 return next;
}

export const validateAnimation = (value: unknown, scene: PlayBuilderScene): PlayAnimation => {
	const invalid = () => {
		throw new Error('Invalid animation. Check its steps, motion paths, and timing.');
	};
	if (!value || typeof value !== 'object') return invalid();
	const animation = value as PlayAnimation;
	if (
		!Array.isArray(animation.steps) ||
		animation.steps.length < 1 ||
		animation.steps.length > MAX_ANIMATION_STEPS ||
		!Array.isArray(animation.transitions) ||
		animation.transitions.length !== animation.steps.length - 1
	)
		return invalid();
	const registry = new Set(capturePoses(scene).map(targetKey)),
		ids = new Set<string>();
	if (registry.size !== scene.markers.length + scene.guides.length + scene.paths.length) return invalid();
	const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 100_000;
	for (const step of animation.steps) {
		if (
			!step ||
			typeof step.id !== 'string' ||
			step.id.length > 64 ||
			!step.id ||
			ids.has(step.id) ||
			typeof step.name !== 'string' ||
			!step.name.trim() ||
			step.name.length > 64 ||
			!Array.isArray(step.poses) ||
			(step.poses.length > registry.size || step.poses.filter(pose=>pose?.type!=='path').length!==scene.markers.length+scene.guides.length)
		)
			return invalid();
        if(step.strokeOffsets!==undefined && (!Array.isArray(step.strokeOffsets)||step.strokeOffsets.length>scene.freeStrokes.length||new Set(step.strokeOffsets.map(item=>item?.id)).size!==step.strokeOffsets.length||!step.strokeOffsets.every(item=>item&&scene.freeStrokes.some(stroke=>stroke.id===item.id)&&finite(item.x)&&finite(item.y)&&(item.color===undefined||['red','orange','yellow','green','cyan','blue','purple','white','gray','black'].includes(item.color)))))return invalid();
		if(step.strokeIds!==undefined && (!Array.isArray(step.strokeIds)||step.strokeIds.length>scene.freeStrokes.length||new Set(step.strokeIds).size!==step.strokeIds.length||!step.strokeIds.every(id=>scene.freeStrokes.some(stroke=>stroke.id===id))))return invalid();
		ids.add(step.id);
		const poseKeys = new Set<string>();
		for (const pose of step.poses) {
			if (
				!pose ||
				!['marker', 'guide','path'].includes(pose.type) ||
				!registry.has(targetKey(pose)) ||
				poseKeys.has(targetKey(pose)) ||
				!finite(pose.x) ||
				!finite(pose.y) ||
				typeof pose.visible !== 'boolean'
			)
				return invalid();
			if(pose.type==='path'&&(!pose.end||!finite(pose.end.x)||!finite(pose.end.y)||pose.points!==undefined&&(!Array.isArray(pose.points)||pose.points.length>4096||!pose.points.every(point=>point&&finite(point.x)&&finite(point.y)))))return invalid();
			if(pose.animationShadow!==undefined||pose.animationReveal!==undefined||pose.animationLabelOpacity!==undefined||pose.animationColor!==undefined||pose.colorFrom!==undefined||pose.colorMix!==undefined)return invalid();
			if(pose.color!==undefined&&!['orange','gold','yellow','red','cyan','blue','green','purple','black','white','gray','pink'].includes(pose.color))return invalid();
			if ([pose.label, pose.name].some(value => value !== undefined && value !== null && (typeof value !== 'string' || value.length > 64))) return invalid();
			if(pose.down!==undefined && (pose.type!=='guide' || !['1st','2nd','3rd','4th','pat'].includes(pose.down)))return invalid();
			poseKeys.add(targetKey(pose));
			if (pose.carrierId !== undefined) {
				const ball = scene.markers.find((marker) => pose.type === 'marker' && marker.id === pose.id && marker.kind === 'ball');
				const carrier = scene.markers.find((marker) => marker.id === pose.carrierId && marker.kind.startsWith('team-'));
				if (!ball || !carrier || pose.id === pose.carrierId || !pose.offset || !finite(pose.offset.x) || !finite(pose.offset.y)) return invalid();
			}
		}
	}
	for (let i = 0; i < animation.transitions.length; i++) {
		const item = animation.transitions[i];
		if (
			!item ||
			item.from !== animation.steps[i].id ||
			item.to !== animation.steps[i + 1].id ||
			!finite(item.duration) ||
			item.duration < 0.1 ||
			item.duration > 60 ||
			!Array.isArray(item.motions) ||
			item.motions.length > registry.size
		)
			return invalid();
		const keys = new Set<string>();
		for (const motion of item.motions) {
			if (
				!motion ||
				!registry.has(targetKey(motion)) ||
				keys.has(targetKey(motion)) ||
				!['straight', 'curve', 'custom', 'jump','draw'].includes(motion.path) || motion.path==='draw'&&(motion.type!=='path'||!scene.paths.some(path=>path.id===motion.id&&path.kind!=='line')) ||
				(motion.type === 'guide' && !['straight','jump'].includes(motion.path)) ||
				!Array.isArray(motion.points) ||
				motion.points.length > 256 ||
				!motion.points.every((p) => p && finite(p.x) && finite(p.y)) ||
				typeof motion.smooth !== 'boolean' ||
				!['linear', 'in', 'out', 'in-out'].includes(motion.easing) ||
				!finite(motion.start) ||
				!finite(motion.end) ||
				motion.start < 0 ||
				motion.end > 1 ||
				motion.start >= motion.end
			)
				return invalid();
			if(motion.speed!==undefined && !MOTION_SPEEDS.includes(motion.speed as typeof MOTION_SPEEDS[number]))return invalid();
			if(motion.jumpDuration!==undefined && (!finite(motion.jumpDuration)||motion.jumpDuration<.01||motion.jumpDuration>item.duration))return invalid();
			if(motion.jumpEffect!==undefined && !['cut','fade','shrink'].includes(motion.jumpEffect))return invalid();
			keys.add(targetKey(motion));
		}
	}
 if(animation.drawings!==undefined){
  if(!Array.isArray(animation.drawings)||animation.drawings.length>scene.freeStrokes.length*animation.steps.length)return invalid();
  const keys=new Set<string>();
  for(const drawing of animation.drawings){
   if(!drawing||!scene.freeStrokes.some(stroke=>stroke.id===drawing.id)||!animation.steps.slice(1).some(step=>step.id===drawing.stepId)||!['draw','instant','linear','jump'].includes(drawing.mode)||!['linear','in','out','in-out'].includes(drawing.easing)||!finite(drawing.start)||!finite(drawing.end)||drawing.start<0||drawing.end>1||drawing.start>=drawing.end||drawing.speed!==undefined&&!MOTION_SPEEDS.includes(drawing.speed as typeof MOTION_SPEEDS[number])||drawing.jumpEffect!==undefined&&!['cut','fade'].includes(drawing.jumpEffect)||drawing.jumpDuration!==undefined&&(!finite(drawing.jumpDuration)||drawing.jumpDuration<.01||drawing.jumpDuration>(animation.transitions.find(item=>item.to===drawing.stepId)?.duration??0)))return invalid();
   const key=`${drawing.stepId}:${drawing.id}`;if(keys.has(key))return invalid();keys.add(key);
  }
 }
	if (animationDuration(animation) > MAX_ANIMATION_SECONDS + 0.000001) return invalid();
	return cloneAnimation(animation);
};

/** Evaluate the display clock without changing the authored starting time. */
export const evaluateAnimationClock = (initialSeconds: number, time: number) => {
	const elapsed = Math.max(0, Number.isFinite(time) ? time : 0);
	const initial = Math.max(0, initialSeconds);
	const expired = initial > 0 && elapsed >= initial;
	return { seconds: Math.max(0, Math.ceil(initial - elapsed)), expired, visible: !expired || Math.floor((elapsed - initial) * 2) % 2 === 0 };
};
