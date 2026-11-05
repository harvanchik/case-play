/** Framework- and sport-neutral animation authoring/playback orchestration. */
export type AnimationControllerState<Scene, Animation> = {
	animation: Animation | undefined;
	baseScene: Scene;
	step: number;
	time: number;
	preview: boolean;
	playing: boolean;
	shuttleRate: number;
	rate: number;
	loop: boolean;
	open: boolean;
};
export type AnimationClock = { now: () => number; request: (callback: (time: number) => void) => number; cancel: (id: number) => void };
export function createAnimationController<Scene, Animation>(adapter: {
	read: () => AnimationControllerState<Scene, Animation>;
	write: (patch: Partial<AnimationControllerState<Scene, Animation>>) => void;
	scene: () => Scene;
	applyScene: (scene: Scene) => void;
	cloneScene: (scene: Scene) => Scene;
	cloneAnimation: (animation: Animation) => Animation;
	capture: (base: Scene, scene: Scene, animation: Animation, step: number) => { scene: Scene; animation: Animation };
	create: (scene: Scene) => Animation;
	evaluate: (scene: Scene, animation: Animation, time: number) => Scene;
	stepScene: (scene: Scene, animation: Animation, index: number) => Scene;
	stepCount: (animation: Animation) => number;
	stepTime: (animation: Animation, index: number) => number;
	duration: (animation: Animation) => number;
	checkpoint: () => void;
	editable: () => boolean;
	onStep?: (scene: Scene) => void;
	onPreview?: () => void;
	onOpen?: () => void;
	clock?: AnimationClock;
}) {
	const clock = adapter.clock ?? {
		now: () => performance.now(),
		request: (callback: (time: number) => void) => requestAnimationFrame(callback),
		cancel: (id: number) => cancelAnimationFrame(id)
	};
	let frame: number | null = null,
		lastTime = 0;
	function content(): { scene: Scene; animation: Animation | undefined } {
		const state = adapter.read();
		return !state.animation
			? { scene: adapter.scene(), animation: undefined }
			: state.preview
				? { scene: adapter.cloneScene(state.baseScene), animation: adapter.cloneAnimation(state.animation) }
				: adapter.capture(state.baseScene, adapter.scene(), state.animation, state.step);
	}
	function commit() {
		const next = content();
		adapter.write({ baseScene: next.scene, animation: next.animation });
	}
	function cancelFrame() {
		if (frame !== null) clock.cancel(frame);
		frame = null;
	}
	function pause() {
		cancelFrame();
		adapter.write({ playing: false, shuttleRate: 0 });
	}
	function selectStep(index: number) {
		if (!adapter.read().animation || index < 0 || index >= adapter.stepCount(adapter.read().animation!)) return false;
		pause();
		commit();
		const state = adapter.read(),
			animation = state.animation!;
		adapter.write({ step: index, preview: false, time: adapter.stepTime(animation, index) });
		const scene = adapter.stepScene(state.baseScene, animation, index);
		if (adapter.onStep) adapter.onStep(scene);
		else adapter.applyScene(scene);
		return true;
	}
	function replace(next: Animation, index = adapter.read().step) {
		if (!adapter.editable()) return false;
		adapter.checkpoint();
		const current = content();
		adapter.write({ baseScene: current.scene, animation: adapter.cloneAnimation(next), preview: true });
		return selectStep(Math.max(0, Math.min(index, adapter.stepCount(next) - 1)));
	}
	function open() {
		if (!adapter.editable()) return false;
		if (!adapter.read().animation) {
			adapter.checkpoint();
			const scene = adapter.scene();
			adapter.write({ baseScene: scene, animation: adapter.create(scene) });
		}
		adapter.write({ open: true });
		adapter.onOpen?.();
		return true;
	}
	function close() {
		selectStep(0);
		adapter.write({ open: false });
	}
	function showTime(value: number) {
		const state = adapter.read();
		if (!state.animation || !Number.isFinite(value)) return;
		const time = Math.max(0, Math.min(adapter.duration(state.animation), value));
		adapter.write({ time, preview: true });
		adapter.onPreview?.();
		adapter.applyScene(adapter.evaluate(state.baseScene, state.animation, time));
	}
	const stepAtTime = (animation: Animation, time: number) =>
		Array.from({ length: adapter.stepCount(animation) }, (_, index) => index).find(
			(index) => Math.abs(adapter.stepTime(animation, index) - time) < 0.00001
		) ?? -1;
	function seek(time: number) {
		pause();
		commit();
		const animation = adapter.read().animation;
		const index = animation ? stepAtTime(animation, time) : -1;
		if (index >= 0) selectStep(index);
		else showTime(time);
	}
	function tick(now: number) {
		frame = null;
		const state = adapter.read();
		if ((!state.playing && !state.shuttleRate) || !state.animation) return;
		const duration = adapter.duration(state.animation),
			next = state.time + ((now - lastTime) / 1000) * (state.shuttleRate || state.rate);
		lastTime = now;
		showTime(!state.shuttleRate && state.loop && next >= duration ? next % duration : next);
		if (!state.shuttleRate && next >= duration && !state.loop) {
			selectStep(adapter.stepCount(state.animation) - 1);
			return;
		}
		frame = clock.request(tick);
	}
	function shuttle(direction: number, speed = 2) {
		const state = adapter.read();
		if (
			!state.animation ||
			!adapter.duration(state.animation) ||
			(direction && (!Number.isFinite(speed) || speed <= 0 || state.shuttleRate === direction * speed))
		)
			return;
		cancelFrame();
		if (direction) commit();
		adapter.write({ shuttleRate: direction * speed });
		lastTime = clock.now();
		if (adapter.read().playing || direction) frame = clock.request(tick);
		else {
			const index = stepAtTime(state.animation, adapter.read().time);
			if (index >= 0) selectStep(index);
		}
	}
	function togglePlayback() {
		const state = adapter.read();
		if (state.playing) {
			pause();
			return;
		}
		if (!state.animation || !adapter.duration(state.animation)) return;
		commit();
		cancelFrame();
		adapter.write({ playing: true, ...(state.time >= adapter.duration(state.animation) ? { time: 0 } : {}) });
		lastTime = clock.now();
		frame = clock.request(tick);
	}
	return { content, commit, selectStep, replace, open, close, pause, showTime, seek, shuttle, togglePlayback, dispose: pause };
}
