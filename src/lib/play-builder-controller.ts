/** Sport-neutral editing state. Renderers and sport-specific object rules stay in adapters. */
export type BuilderPoint = { x: number; y: number };
export type BuilderSurface = { left: number; top: number; width: number; height: number };
export type BuilderBounds = { left: number; top: number; right: number; bottom: number };
export type BuilderControllerStatus = { canUndo: boolean; canRedo: boolean; hasClipboard: boolean };
export type BuilderHistory<State> = { past: State[]; future: State[] };
export type ClipboardOrigin = { playId: string | number; surface: BuilderSurface; bounds: BuilderBounds };
export type PasteDestination = { playId: string | number; surface: BuilderSurface; viewport: BuilderSurface };
export type PastePlacement = { samePlay: boolean; mapPoint: (point: BuilderPoint) => BuilderPoint };

export function createPlayBuilderController<State, Clipboard = never>(options: {
	snapshot: () => State;
	restore: (state: State) => void;
	onChange?: (status: BuilderControllerStatus) => void;
	historyLimit?: number;
	pasteOffset?: number;
	cloneState?: (state: State) => State;
	cloneClipboard?: (payload: Clipboard) => Clipboard;
}) {
	const limit = options.historyLimit ?? 30;
	if (!Number.isInteger(limit) || limit < 1) throw new RangeError('History limit must be a positive integer.');
	const offset = options.pasteOffset ?? 14;
	if (!Number.isFinite(offset) || offset < 0) throw new RangeError('Paste offset must be finite and nonnegative.');
	const cloneState = options.cloneState ?? ((state: State) => structuredClone(state));
	const cloneClipboard = options.cloneClipboard ?? ((payload: Clipboard) => structuredClone(payload));
	let past: State[] = [],
		future: State[] = [];
	let clipboard: { payload: Clipboard; origin: ClipboardOrigin; pasteCount: number } | null = null;
	const status = (): BuilderControllerStatus => ({ canUndo: past.length > 0, canRedo: future.length > 0, hasClipboard: clipboard !== null });
	const publish = () => options.onChange?.(status());
	const push = (stack: State[], state: State) => [...stack.slice(Math.max(0, stack.length - limit + 1)), state];
	const snapshot = () => cloneState(options.snapshot());
	const checkpointState = (state: State) => {
		past = push(past, state);
		future = [];
		publish();
	};
	function checkpoint() {
		checkpointState(snapshot());
	}
	function undo() {
		if (!past.length) return false;
		const current = snapshot(),
			previous = cloneState(past.at(-1)!);
		options.restore(previous);
		past = past.slice(0, -1);
		future = push(future, current);
		publish();
		return true;
	}
	function redo() {
		if (!future.length) return false;
		const current = snapshot(),
			next = cloneState(future.at(-1)!);
		options.restore(next);
		past = push(past, current);
		future = future.slice(0, -1);
		publish();
		return true;
	}
	/** Adapter returns false without changing state when there is nothing to apply. */
	function mutate(apply: () => boolean) {
		const before = snapshot();
		if (!apply()) return false;
		checkpointState(before);
		return true;
	}
	function validSurface(surface: BuilderSurface) {
		if (!Object.values(surface).every(Number.isFinite) || surface.width <= 0 || surface.height <= 0)
			throw new RangeError('Invalid clipboard surface.');
	}
	function copy(payload: Clipboard, origin: ClipboardOrigin) {
		validSurface(origin.surface);
		if (!Object.values(origin.bounds).every(Number.isFinite) || origin.bounds.right < origin.bounds.left || origin.bounds.bottom < origin.bounds.top)
			throw new RangeError('Invalid clipboard bounds.');
		clipboard = { payload: cloneClipboard(payload), origin: structuredClone(origin), pasteCount: 0 };
		publish();
	}
	const boundedOffset = (minimum: number, maximum: number, desired: number) =>
		desired <= maximum ? desired : -desired >= minimum ? -desired : Math.max(minimum, Math.min(maximum, 0));
	function paste(destination: PasteDestination, apply: (payload: Clipboard, placement: PastePlacement) => boolean) {
		if (!clipboard) return false;
		validSurface(destination.surface);
		validSurface(destination.viewport);
		const entry = clipboard,
			{ origin } = entry,
			samePlay = origin.playId === destination.playId;
		const desired = samePlay ? offset * (entry.pasteCount + 1) : 0;
		const dx = boundedOffset(
			destination.viewport.left - origin.bounds.left,
			destination.viewport.left + destination.viewport.width - origin.bounds.right,
			desired
		);
		const dy = boundedOffset(
			destination.viewport.top - origin.bounds.top,
			destination.viewport.top + destination.viewport.height - origin.bounds.bottom,
			desired
		);
		const mapPoint = (point: BuilderPoint) =>
			samePlay
				? { x: point.x + dx, y: point.y + dy }
				: {
						x: destination.surface.left + ((point.x - origin.surface.left) * destination.surface.width) / origin.surface.width,
						y: destination.surface.top + ((point.y - origin.surface.top) * destination.surface.height) / origin.surface.height
					};
		if (!mutate(() => apply(cloneClipboard(entry.payload), { samePlay, mapPoint }))) return false;
		if (clipboard === entry) entry.pasteCount += 1;
		publish();
		return true;
	}
	return {
		get status() {
			return status();
		},
		checkpoint,
		undo,
		redo,
		mutate,
		copy,
		paste,
		cut(remove: () => boolean) {
			return clipboard !== null && mutate(remove);
		},
		clearHistory() {
			past = [];
			future = [];
			publish();
		},
		clearClipboard() {
			clipboard = null;
			publish();
		},
		exportHistory(): BuilderHistory<State> {
			return { past: past.map(cloneState), future: future.map(cloneState) };
		},
		restoreHistory(history: BuilderHistory<State>) {
			past = history.past.slice(-limit).map(cloneState);
			future = history.future.slice(-limit).map(cloneState);
			publish();
		}
	};
}
