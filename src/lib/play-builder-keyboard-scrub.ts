/** Animate held-arrow scrubbing independently of OS key-repeat/modifier behavior. */
export function createKeyboardScrubber(getTime: () => number, getDuration: () => number, seek: (time: number) => void, shuttle?: { playing: () => boolean; change: (direction: number) => void }) {
	let direction = 0;
	let fast = false;
 let shuttling = false;
	let frame: number | null = null;
	let last = 0;
	const stop = () => {
		direction = 0;
        if (shuttling) shuttle?.change(0);
        shuttling = false;
		if (frame !== null) cancelAnimationFrame(frame);
		frame = null;
	};
	const advance = (amount: number) => {
		const next = Math.max(0, Math.min(getDuration(), getTime() + amount));
		seek(next);
		return next;
	};
	const tick = (now: number) => {
		frame = null;
		if (!direction) return;
		const elapsed = Math.max(0, (now - last) / 1000);
		last = Math.max(last, now);
		if (elapsed) {
			const next = advance(direction * elapsed * 0.3 * (fast ? 5 : 1));
			if (next === 0 || next === getDuration()) return stop();
		}
		frame = requestAnimationFrame(tick);
	};
 const updateMode = () => {
  if (!direction || !shuttle) return;
  const next = fast || shuttle.playing();
  if (next === shuttling) return;
  shuttling = next;
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  shuttle.change(next ? direction : 0);
  if (!next) { last = performance.now(); frame = requestAnimationFrame(tick); }
 };
	return {
		stop,
		modifier(shift: boolean) { fast = shift; updateMode(); },
		keydown(event: KeyboardEvent) {
			fast = event.shiftKey;
			const nextDirection = event.key === 'ArrowLeft' ? -1 : 1;
			if (direction === nextDirection) { updateMode(); return; }
			stop();
			direction = nextDirection;
            if (shuttle && (fast || shuttle.playing())) { shuttling = true; shuttle.change(direction); return; }
			advance(direction * (fast ? 0.05 : 0.01));
			last = performance.now() + 200;
			frame = requestAnimationFrame(tick);
		},
		keyup(event: KeyboardEvent) {
			fast = event.shiftKey;
			if ((event.key === 'ArrowLeft' && direction === -1) || (event.key === 'ArrowRight' && direction === 1)) stop();
            else updateMode();
		}
	};
}
