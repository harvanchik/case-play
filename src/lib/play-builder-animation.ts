import type { FieldMarker, PlayBuilderScene, Point } from './play-builder-scene';

export const MAX_ANIMATION_SECONDS = 60;
export const MAX_ANIMATION_STEPS = 61;
export type AnimationTarget = { type: 'marker' | 'guide'; id: number };
export type AnimationPose = AnimationTarget & Point & { visible: boolean; label?: string | null; name?: string | null; carrierId?: number; offset?: Point };
export type AnimationStep = { id: string; name: string; poses: AnimationPose[] };
export type Motion = AnimationTarget & {
	path: 'straight' | 'curve' | 'custom' | 'jump';
	/** Geometry is relative to the endpoints: x is progress, y is perpendicular field distance. */
	points: Point[];
	smooth: boolean;
	start: number;
	end: number;
	easing: 'linear' | 'in' | 'out' | 'in-out';
};
export type AnimationTransition = { from: string; to: string; duration: number; motions: Motion[] };
export type PlayAnimation = { steps: AnimationStep[]; transitions: AnimationTransition[] };
export const cloneAnimation = (animation: PlayAnimation): PlayAnimation => structuredClone(animation);
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
export const capturePoses = (scene: PlayBuilderScene): AnimationPose[] => [
	...scene.markers.map(({ id, x, y, label, name }) => ({ label: label ?? null, name: name ?? null, type: 'marker' as const, id, x, y, visible: true })),
	...scene.guides.map(({ id, x, name }) => ({ name: name ?? null, type: 'guide' as const, id, x, y: 242, visible: true }))
];
const newStepId = () => globalThis.crypto.randomUUID();
export const createAnimation = (scene: PlayBuilderScene): PlayAnimation => ({
	steps: [{ id: newStepId(), name: 'Start', poses: capturePoses(scene) }],
	transitions: []
});

/** Keep transition settings only when the same two neighboring steps remain adjacent. */
export const rebuildTransitions = (animation: PlayAnimation): PlayAnimation => ({
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
 for (const frame of next.steps) for (const pose of frame.poses) {
  const object = pose.type === 'marker' ? base.markers.find(item => item.id === pose.id) : base.guides.find(item => item.id === pose.id);
  if (pose.name === undefined) pose.name = object?.name ?? null;
  if (pose.type === 'marker' && pose.label === undefined) pose.label = base.markers.find(item => item.id === pose.id)?.label ?? null;
 }
	const step = next.steps[index];
	if (!step) return { scene: structuredClone(base), animation: next };
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
		if (current) return { ...pose, x: current.x, y: current.y, name: current.name, ...(pose.type === 'marker' ? { label: current.label } : {}), visible: true };
		// Previously hidden objects must stay hidden when another object is edited.
		if (pose.visible && !liveKeys.has(targetKey(pose))) {
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
	const scene: PlayBuilderScene = { ...structuredClone(live), markers: merge(base.markers, live.markers), guides: merge(base.guides, live.guides) };
	const layerKeys = new Set(scene.layerOrder.map(targetKey));
	for (const layer of base.layerOrder) if (layer.type !== 'path' && !layerKeys.has(targetKey(layer))) scene.layerOrder.push({ ...layer });
	const initial = next.steps[0];
	scene.markers = scene.markers.map((marker) => {
		const pose = initial.poses.find((item) => item.type === 'marker' && item.id === marker.id);
		return pose ? { ...marker, x: pose.x, y: pose.y, label: pose.label === undefined ? marker.label : pose.label ?? undefined, name: pose.name === undefined ? marker.name : pose.name ?? undefined } : marker;
	});
	scene.guides = scene.guides.map((guide) => {
		const pose = initial.poses.find((item) => item.type === 'guide' && item.id === guide.id);
		return pose ? { ...guide, x: pose.x, name: pose.name === undefined ? guide.name : pose.name ?? undefined } : guide;
	});
	return { scene, animation: next };
};

export const applyAnimationStep = (scene: PlayBuilderScene, step: AnimationStep): PlayBuilderScene => {
	const poses = new Map(step.poses.map((pose) => [targetKey(pose), pose]));
	const markerAt = (marker: FieldMarker): FieldMarker | null => {
		const pose = poses.get(`marker:${marker.id}`);
		if (!pose?.visible) return null;
		const carrier = pose.carrierId === undefined ? undefined : poses.get(`marker:${pose.carrierId}`);
		const position = carrier?.visible ? { x: carrier.x + (pose.offset?.x ?? 12), y: carrier.y + (pose.offset?.y ?? 8) } : pose;
		return { ...marker, x: position.x, y: position.y, label: pose.label === undefined ? marker.label : pose.label ?? undefined, name: pose.name === undefined ? marker.name : pose.name ?? undefined };
	};
	return {
		...scene,
		markers: scene.markers.map(markerAt).filter((item): item is FieldMarker => item !== null),
		guides: scene.guides.flatMap((guide) => {
			const pose = poses.get(`guide:${guide.id}`);
			return pose?.visible ? [{ ...guide, x: pose.x, name: pose.name === undefined ? guide.name : pose.name ?? undefined }] : [];
		})
	};
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const relativePoint = (point: Point, start: Point, end: Point): Point => {
	const dx = end.x - start.x,
		dy = end.y - start.y;
	const length = Math.hypot(dx, dy) || 1;
	return {
		x: ((point.x - start.x) * dx + (point.y - start.y) * dy) / (length * length),
		y: ((point.y - start.y) * dx - (point.x - start.x) * dy) / length
	};
};
const absolutePoint = (point: Point, start: Point, end: Point): Point => {
	const dx = end.x - start.x,
		dy = end.y - start.y,
		length = Math.hypot(dx, dy) || 1;
	return { x: start.x + point.x * dx - (point.y * dy) / length, y: start.y + point.x * dy + (point.y * dx) / length };
};
export const motionPoints = (motion: Motion, start: Point, end: Point): Point[] => {
	if (motion.path === 'straight' || motion.path === 'jump') return [{ ...start }, { ...end }];
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
		if (!a.visible) return b.visible ? resolveAttachment(b, progress) : { ...a };
		if (!b.visible) return { ...b };
		const motion = transition.motions.find((item) => sameTarget(item, target)) ?? defaultMotion(target);
        if (motion.path === 'jump') return progress < motion.start ? resolveAttachment(a, progress) : { ...resolveAttachment(b, progress), label: a.label, name: a.name };
		const carrierA = attached && a.carrierId !== undefined ? a.carrierId : undefined;
		const carrierB = attached && b.carrierId !== undefined ? b.carrierId : undefined;
		if (carrierA !== undefined && carrierA === carrierB) return resolveAttachment(a, progress);
		if (progress <= motion.start) return resolveAttachment(a, progress);
		if (progress >= motion.end) return { ...resolveAttachment(b, progress), label: a.label, name: a.name };
		const start = resolveAttachment(a, motion.start),
			end = resolveAttachment(b, motion.end);
		const fraction = ease(clamp((progress - motion.start) / (motion.end - motion.start)), motion.easing);
		const position = distancePoint(motionPoints(motion, start, end), fraction);
		return { ...a, ...position, carrierId: undefined, offset: undefined };
	};
	const resolveAttachment = (pose: AnimationPose, progress: number): AnimationPose => {
		if (pose.carrierId === undefined) return { ...pose };
		const carrier = poseAt({ type: 'marker', id: pose.carrierId }, progress, false);
		if (!carrier?.visible) return { ...pose, carrierId: undefined, offset: undefined };
		return { ...pose, x: carrier.x + (pose.offset?.x ?? 12), y: carrier.y + (pose.offset?.y ?? 8), carrierId: undefined, offset: undefined };
	};
	const poses = from.poses.map((pose) => poseAt(pose, t)).filter((pose): pose is AnimationPose => Boolean(pose));
	return applyAnimationStep(staticScene, { id: 'preview', name: '', poses });
};

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
	if (registry.size !== scene.markers.length + scene.guides.length) return invalid();
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
			step.poses.length !== registry.size
		)
			return invalid();
		ids.add(step.id);
		const poseKeys = new Set<string>();
		for (const pose of step.poses) {
			if (
				!pose ||
				!['marker', 'guide'].includes(pose.type) ||
				!registry.has(targetKey(pose)) ||
				poseKeys.has(targetKey(pose)) ||
				!finite(pose.x) ||
				!finite(pose.y) ||
				typeof pose.visible !== 'boolean'
			)
				return invalid();
			if ([pose.label, pose.name].some(value => value !== undefined && value !== null && (typeof value !== 'string' || value.length > 64))) return invalid();
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
				!['straight', 'curve', 'custom', 'jump'].includes(motion.path) ||
				(motion.type === 'guide' && motion.path !== 'straight') ||
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
			keys.add(targetKey(motion));
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
