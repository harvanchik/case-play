import type { BuilderPoint as Point, BuilderBounds as Bounds, BuilderSurface as Surface } from './play-builder-controller';
export type MovementInput = { pointerId: number; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean };
export type MovementSession = { pointerStart: Point; moved: boolean };
export type MarqueeSession = { pointerId: number; start: Point; current: Point };
export const normalizedBounds = (a: Point, b: Point): Bounds => ({
	left: Math.min(a.x, b.x),
	top: Math.min(a.y, b.y),
	right: Math.max(a.x, b.x),
	bottom: Math.max(a.y, b.y)
});
export const boundsOverlap = (a: Bounds, b: Bounds) => a.right >= b.left && a.left <= b.right && a.bottom >= b.top && a.top <= b.bottom;
export function unionBounds(bounds: Bounds[]): Bounds | null {
	return bounds.length
		? {
				left: Math.min(...bounds.map((b) => b.left)),
				top: Math.min(...bounds.map((b) => b.top)),
				right: Math.max(...bounds.map((b) => b.right)),
				bottom: Math.max(...bounds.map((b) => b.bottom))
			}
		: null;
}
export function constrainTranslation(delta: Point, bounds: Bounds, viewport: Surface): Point {
	return {
		x: Math.max(viewport.left - bounds.left, Math.min(viewport.left + viewport.width - bounds.right, delta.x)),
		y: Math.max(viewport.top - bounds.top, Math.min(viewport.top + viewport.height - bounds.bottom, delta.y))
	};
}
export function angleConstrainedDelta(delta: Point, origin: Point = { x: 0, y: 0 }, mode: 'project' | 'radial' = 'project'): Point {
	const x = delta.x - origin.x,
		y = delta.y - origin.y,
		angle = (Math.round(Math.atan2(y, x) / (Math.PI / 4)) * Math.PI) / 4,
		cosine = Math.cos(angle),
		sine = Math.sin(angle),
		distance = mode === 'radial' ? Math.hypot(x, y) : x * cosine + y * sine;
	return { x: origin.x + (Math.abs(cosine) < 1e-8 ? 0 : distance * cosine), y: origin.y + (Math.abs(sine) < 1e-8 ? 0 : distance * sine) };
}
export function angleConstrainedPoint(start: Point, point: Point, viewport: Surface): Point {
	const delta = angleConstrainedDelta({ x: point.x - start.x, y: point.y - start.y }, undefined, 'radial'),
		distance = Math.hypot(delta.x, delta.y);
	if (!distance) return { ...point };
	const x = delta.x / distance,
		y = delta.y / distance;
	let maximum = Infinity;
	if (x > 0) maximum = Math.min(maximum, (viewport.left + viewport.width - start.x) / x);
	else if (x < 0) maximum = Math.min(maximum, (viewport.left - start.x) / x);
	if (y > 0) maximum = Math.min(maximum, (viewport.top + viewport.height - start.y) / y);
	else if (y < 0) maximum = Math.min(maximum, (viewport.top - start.y) / y);
	const length = Math.min(distance, maximum);
	return { x: start.x + x * length, y: start.y + y * length };
}
export function createMovementController<Drag extends MovementSession, Input extends MovementInput = MovementInput, Context = unknown>(options: {
	read: () => Drag | null;
	write: (drag: Drag | null) => void;
	enabled: () => boolean;
	threshold?: number;
	angleMode?: 'project' | 'radial';
	originOffset?: (drag: Drag) => Point;
	onStart: (drag: Drag, input: Input) => void;
	apply: (drag: Drag, delta: Point, input: Input, context: Context | undefined) => void;
}) {
	let pointerId: number | null = null;
	function begin(drag: Drag, id: number) {
		if (!options.enabled()) return false;
		pointerId = id;
		options.write(drag);
		return true;
	}
	function move(point: Point, input: Input, context?: Context) {
		let drag = options.read();
		if (!drag || !options.enabled() || (pointerId !== null && input.pointerId !== pointerId)) return false;
		let delta = { x: point.x - drag.pointerStart.x, y: point.y - drag.pointerStart.y };
		if (input.shiftKey && !input.ctrlKey && !input.metaKey) delta = angleConstrainedDelta(delta, options.originOffset?.(drag), options.angleMode);
		if (!drag.moved && Math.hypot(delta.x, delta.y) < (options.threshold ?? 4)) return false;
		if (!drag.moved) {
			options.onStart(drag, input);
			drag = { ...drag, moved: true };
			options.write(drag);
		}
		options.apply(drag, delta, input, context);
		return true;
	}
	function finish() {
		const drag = options.read();
		options.write(null);
		pointerId = null;
		return drag;
	}
	return {
		begin,
		move,
		finish,
		cancel: () => {
			options.write(null);
			pointerId = null;
		}
	};
}
export function createInteractionController<
	Target,
	Drag extends MovementSession,
	Input extends MovementInput = MovementInput,
	Context = unknown
>(options: {
	selection: () => Target[];
	setSelection: (targets: Target[]) => void;
	all: () => Target[];
	key: (target: Target) => string;
	exists: (target: Target) => boolean;
	bounds: (target: Target) => Bounds | null;
	matchesMarquee: (target: Target, bounds: Bounds) => boolean;
	groupBounds?: () => Bounds | null;
	marquee: () => MarqueeSession | null;
	setMarquee: (value: MarqueeSession | null) => void;
	enabled: () => boolean;
	checkpoint: () => void;
	movement: Parameters<typeof createMovementController<Drag, Input, Context>>[0];
}) {
	let pendingDeselection: Target | null = null;
	const includes = (items: Target[], target: Target) => items.some((item) => options.key(item) === options.key(target));
	function select(target: Target, additive = false) {
		if (!options.enabled()) return false;
		const selected = options.selection(),
			contains = includes(selected, target);
		const next = additive
			? contains
				? selected.filter((item) => options.key(item) !== options.key(target))
				: [...selected, target]
			: contains
				? selected
				: [target];
		options.setSelection(next);
		return includes(next, target);
	}
	const movement = createMovementController(options.movement);
	return {
		movement,
		select,
		selectForDrag(target: Target, additive = false) {
			if (!options.enabled()) return false;
			pendingDeselection = additive && includes(options.selection(), target) ? target : null;
			return pendingDeselection ? true : select(target, additive);
		},
		finishDrag() {
			const drag = movement.finish();
			if (pendingDeselection && drag && !drag.moved)
				options.setSelection(options.selection().filter((item) => options.key(item) !== options.key(pendingDeselection!)));
			pendingDeselection = null;
			return drag;
		},
		cancel() {
			movement.cancel();
			options.setMarquee(null);
			pendingDeselection = null;
		},
		selectionBounds() {
			const selection = options.selection().filter(options.exists);
			options.setSelection(selection);
			return unionBounds(selection.map(options.bounds).filter((bounds): bounds is Bounds => bounds !== null));
		},
		containsGroup(point: Point, padding = 6) {
			if (options.selection().length <= 1) return false;
			const b = options.groupBounds
				? options.groupBounds()
				: unionBounds(
						options
							.selection()
							.map(options.bounds)
							.filter((bounds): bounds is Bounds => bounds !== null)
					);
			return !!b && point.x >= b.left - padding && point.x <= b.right + padding && point.y >= b.top - padding && point.y <= b.bottom + padding;
		},
		ordered(targets: Target[], layers: Target[]) {
			const requested = new Map(targets.map((t) => [options.key(t), t]));
			const ordered = layers.map((t) => requested.get(options.key(t))).filter((t): t is Target => t !== undefined);
			const included = new Set(ordered.map(options.key));
			return [...ordered, ...targets.filter((t) => !included.has(options.key(t)))];
		},
		beginMarquee(id: number, start: Point) {
			if (!options.enabled()) return false;
			options.setMarquee({ pointerId: id, start, current: start });
			return true;
		},
		moveMarquee(id: number, point: Point) {
			const state = options.marquee();
			if (!state || state.pointerId !== id) return false;
			options.setMarquee({ ...state, current: point });
			return true;
		},
		finishMarquee(id: number, point?: Point) {
			if (!options.enabled()) {
				options.setMarquee(null);
				return null;
			}
			const state = options.marquee();
			if (!state || state.pointerId !== id) return null;
			const bounds = normalizedBounds(state.start, point ?? state.current),
				dragged = bounds.right - bounds.left >= 4 || bounds.bottom - bounds.top >= 4;
			const selected = dragged ? options.all().filter((target) => options.matchesMarquee(target, bounds)) : [];
			options.setSelection(selected);
			options.setMarquee(null);
			return { selected, dragged };
		},
		translate(delta: Point, viewport: Surface, canMoveY: boolean, apply: (delta: Point) => void) {
			const bounds = unionBounds(
				options
					.selection()
					.map(options.bounds)
					.filter((bounds): bounds is Bounds => bounds !== null)
			);
			if (!options.enabled() || !bounds) return false;
			const next = constrainTranslation(delta, bounds, viewport);
			if (!canMoveY) next.y = 0;
			if (!next.x && !next.y) return false;
			options.checkpoint();
			apply(next);
			return true;
		}
	};
}
