import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	createInteractionController,
	createMovementController,
	angleConstrainedDelta,
	angleConstrainedPoint,
	constrainTranslation,
	boundsOverlap,
	type MarqueeSession,
	type MovementSession,
	type MovementInput
} from '../src/lib/play-builder-interaction-controller';
const input = (patch: Partial<MovementInput> = {}): MovementInput => ({ pointerId: 1, shiftKey: false, ctrlKey: false, metaKey: false, ...patch });
function fixture() {
	let selection: string[] = [],
		marquee: MarqueeSession | null = null,
		drag: MovementSession | null = null,
		enabled = true,
		checkpoints = 0;
	const boxes: Record<string, { left: number; top: number; right: number; bottom: number }> = {
		player: { left: 10, top: 10, right: 20, bottom: 20 },
		drawing: { left: 25, top: 20, right: 40, bottom: 30 }
	};
	const c = createInteractionController<string, MovementSession>({
		selection: () => selection,
		setSelection: (next) => (selection = next),
		all: () => Object.keys(boxes),
		key: (t) => t,
		exists: (t) => !!boxes[t],
		bounds: (t) => boxes[t] ?? null,
		matchesMarquee: (t, b) => boundsOverlap(boxes[t], b),
		marquee: () => marquee,
		setMarquee: (next) => (marquee = next),
		enabled: () => enabled,
		checkpoint: () => checkpoints++,
		movement: { read: () => drag, write: (next) => (drag = next), enabled: () => enabled, onStart: () => checkpoints++, apply: () => {} }
	});
	return {
		c,
		get selected() {
			return selection;
		},
		set selected(v: string[]) {
			selection = v;
		},
		get marquee() {
			return marquee;
		},
		get checkpoints() {
			return checkpoints;
		},
		disable() {
			enabled = false;
		}
	};
}
test('selection keeps a mixed group and toggles additive clicks only after a click finishes', () => {
	const f = fixture();
	f.c.select('player');
	f.c.select('drawing', true);
	f.c.select('player');
	assert.deepEqual(f.selected, ['player', 'drawing']);
	f.c.selectForDrag('player', true);
	f.c.movement.begin({ pointerStart: { x: 0, y: 0 }, moved: false }, 1);
	f.c.finishDrag();
	assert.deepEqual(f.selected, ['drawing']);
	f.c.select('player', true);
	f.c.selectForDrag('drawing', true);
	f.c.movement.begin({ pointerStart: { x: 0, y: 0 }, moved: false }, 1);
	f.c.movement.move({ x: 20, y: 0 }, input());
	f.c.finishDrag();
	assert.deepEqual(f.selected, ['drawing', 'player']);
	f.c.select('missing');
	assert.equal(f.c.selectionBounds(), null);
	assert.deepEqual(f.selected, []);
});
test('marquee accepts only its pointer, finds all object types and clears on cancellation', () => {
	const f = fixture();
	f.c.beginMarquee(1, { x: 0, y: 0 });
	assert.equal(f.c.moveMarquee(2, { x: 40, y: 40 }), false);
	f.c.moveMarquee(1, { x: 45, y: 35 });
	assert.deepEqual(f.c.finishMarquee(1)?.selected, ['player', 'drawing']);
	assert.equal(f.marquee, null);
	assert.equal(f.c.containsGroup({ x: 5, y: 5 }), true);
	f.c.beginMarquee(1, { x: 0, y: 0 });
	f.c.finishMarquee(1, { x: 1, y: 1 });
	assert.deepEqual(f.selected, []);
	f.c.beginMarquee(1, { x: 0, y: 0 });
	f.c.cancel();
	assert.equal(f.marquee, null);
	f.disable();
	assert.equal(f.c.select('player'), false);
	assert.equal(f.c.selectForDrag('player', true), false);
	assert.equal(f.c.beginMarquee(1, { x: 0, y: 0 }), false);
});
test('bounded group translation checkpoints once and allows axis-constrained objects', () => {
	const f = fixture();
	f.c.select('player');
	f.c.select('drawing', true);
	let delta = { x: 0, y: 0 };
	f.c.translate({ x: 100, y: -100 }, { left: 0, top: 0, width: 50, height: 50 }, true, (d) => (delta = d));
	assert.deepEqual(delta, { x: 10, y: -10 });
	assert.equal(f.checkpoints, 1);
	f.c.translate({ x: 0, y: 20 }, { left: 0, top: 0, width: 50, height: 50 }, false, () => assert.fail());
	assert.equal(f.checkpoints, 1);
	assert.deepEqual(f.c.ordered(['drawing', 'player'], ['player']), ['player', 'drawing']);
});
test('drag threshold, pointer identity, snapping modifiers and cancellation are shared', () => {
	let drag: MovementSession | null = null,
		starts = 0,
		delta = { x: 0, y: 0 };
	const c = createMovementController({
		read: () => drag as MovementSession | null,
		write: (next) => (drag = next),
		enabled: () => true,
		onStart: () => starts++,
		apply: (_drag, d) => (delta = d)
	});
	c.begin({ pointerStart: { x: 10, y: 10 }, moved: false }, 1);
	assert.equal(c.move({ x: 12, y: 12 }, input()), false);
	assert.equal(c.move({ x: 40, y: 15 }, input({ pointerId: 2 })), false);
	c.move({ x: 40, y: 15 }, input({ shiftKey: true }));
	assert.deepEqual(delta, { x: 30, y: 0 });
	c.move({ x: 15, y: 40 }, input({ shiftKey: true }));
	assert.deepEqual(delta, { x: 0, y: 30 });
	c.move({ x: 40, y: 15 }, input({ shiftKey: true, ctrlKey: true }));
	assert.deepEqual(delta, { x: 30, y: 5 });
	c.move({ x: 40, y: 15 }, input({ shiftKey: true, metaKey: true }));
	assert.deepEqual(delta, { x: 30, y: 5 });
	assert.equal(starts, 1);
	assert.equal(c.finish()?.moved, true);
	assert.equal(drag, null);
	c.cancel();
	assert.equal(c.move({ x: 90, y: 90 }, input()), false);
});
test('snap origin and radial drawing behavior are configurable without sport types', () => {
	assert.deepEqual(angleConstrainedDelta({ x: 50, y: 50 }, { x: -100, y: 0 }), { x: 50, y: 0 });
	const d = angleConstrainedDelta({ x: 30, y: 5 }, undefined, 'radial');
	assert.ok(Math.abs(d.x - Math.hypot(30, 5)) < 0.000001);
	assert.equal(d.y, 0);
	assert.deepEqual(angleConstrainedPoint({ x: 90, y: 50 }, { x: 200, y: 60 }, { left: 0, top: 0, width: 100, height: 100 }), { x: 100, y: 50 });
	assert.deepEqual(
		constrainTranslation({ x: 100, y: -100 }, { left: 10, top: 20, right: 50, bottom: 40 }, { left: 0, top: 0, width: 80, height: 50 }),
		{ x: 30, y: -20 }
	);
});
