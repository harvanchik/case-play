/** Held arrows use elapsed time; key repeat never adds individual jumps. */
export function createKeyboardScrubber(
	getTime: () => number,
	getDuration: () => number,
	seek: (time: number) => void,
	shuttle?: { rate: () => number; change: (direction: number, speed?: number) => void }
) {
	let direction = 0,
		fast = false,
		appliedSpeed = 0,
		shuttling = false,
		frame: number | null = null,
		last = 0;
	const speed = () => (fast ? 2 : (shuttle?.rate() ?? 1));
	const stop = () => {
		direction = 0;
		if (shuttling) shuttle?.change(0);
		shuttling = false;
		appliedSpeed = 0;
		if (frame !== null) cancelAnimationFrame(frame);
		frame = null;
	};
	const tick = (now: number) => {
		frame = null;
		if (!direction) return;
		const elapsed = Math.max(0, (now - last) / 1000);
		last = now;
		const next = Math.max(0, Math.min(getDuration(), getTime() + direction * elapsed * speed()));
		seek(next);
		if (next === 0 || next === getDuration()) return stop();
		frame = requestAnimationFrame(tick);
	};
	const updateMode = () => {
		if (!direction || !shuttle) return;
		const next = speed();
		if (shuttling && appliedSpeed === next) return;
		shuttling = true;
		appliedSpeed = next;
		shuttle.change(direction, next);
	};
	return {
		stop,
		modifier(shift: boolean) {
			fast = shift;
			updateMode();
		},
		keydown(event: KeyboardEvent) {
			fast = event.shiftKey;
			const next = event.key === 'ArrowLeft' ? -1 : 1;
			if (direction === next) {
				updateMode();
				return;
			}
			stop();
			direction = next;
			if (shuttle) updateMode();
			else {
				last = performance.now();
				frame = requestAnimationFrame(tick);
			}
		},
		keyup(event: KeyboardEvent) {
			fast = event.shiftKey;
			if ((event.key === 'ArrowLeft' && direction === -1) || (event.key === 'ArrowRight' && direction === 1)) stop();
			else updateMode();
		}
	};
}
