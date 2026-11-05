export interface PresentationAdapter<State> {
	root: () => HTMLElement;
	active: () => boolean;
	fullscreenElement: () => Element | null;
	exitFullscreen: () => Promise<void>;
	prepare: () => State;
	failed: (state: State) => void;
	leave: (state: State | null) => void;
	message: (message: string) => void;
}

/** Native fullscreen lifecycle; the adapter preserves/restores sport authoring state. */
export function createPresentationController<State>(adapter: PresentationAdapter<State>) {
	let restore: State | null = null;
	return {
		async toggle() {
			const root = adapter.root();
			if (adapter.fullscreenElement() === root) { await adapter.exitFullscreen(); return; }
			if (!root.requestFullscreen) { adapter.message('Full Screen is not supported in this browser.'); return; }
			restore = adapter.prepare();
			try { await root.requestFullscreen(); root.focus(); }
			catch {
				const state = restore;
				restore = null;
				adapter.failed(state);
				adapter.message('Unable to enter Full Screen.');
			}
		},
		sync() {
			if (!adapter.active() || adapter.fullscreenElement() === adapter.root()) return;
			const state = restore;
			restore = null;
			adapter.leave(state);
		}
	};
}
