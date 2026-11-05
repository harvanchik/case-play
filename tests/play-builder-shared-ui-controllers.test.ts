import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnnotationController, type AnnotationState } from '../src/lib/play-builder-annotations';
import { createDrawingController } from '../src/lib/play-builder-drawing-controller';
import { createReorderController } from '../src/lib/play-builder-reorder-controller';
import { createElementEditorController } from '../src/lib/play-builder-editor-controller';
import { createPresentationController } from '../src/lib/play-builder-presentation-controller';

test('annotation gestures checkpoint the correct history and clear with a timed fade', () => {
	let now = 1000, next = 0;
	const frames = new Map<number, () => void>();
	const checkpoints: string[] = [];
	const captures = new Set<number>();
	let state: AnnotationState = {
		laserTrailFrame: null, laserTrailClock: 0, laserTrail: [], laserDrawings: [], spotlightStrokes: [], laserPointer: null,
		spotlightEnabled: false, spotlightRadius: 80, activeSpotlightStroke: null, activeLaserDrawing: null,
		laserDrawingPointerId: null, rainbowLaserEnabled: false, laserColor: 'red', presentation: false
	};
	const controller = createAnnotationController({
		read: () => state, write: value => state = value, checkpoint: kind => checkpoints.push(kind), promoteLayer() {},
		capture: id => captures.add(id), release: id => { captures.delete(id); },
		clock: { now: () => now, request: callback => { frames.set(++next, callback); return next; }, cancel: id => { frames.delete(id); } }
	});
	const event = { pointerId: 1 } as PointerEvent;
	controller.beginLaserDrawing(event, { x: 5, y: 5 });
	controller.continueLaserDrawing({ pointerId: 2 } as PointerEvent, { x: 80, y: 80 });
	assert.equal(state.activeLaserDrawing?.points.length, 1);
	controller.continueLaserDrawing(event, { x: 20, y: 20 });
	controller.finishLaserDrawing();
	assert.equal(state.laserDrawings.length, 1);
	assert.deepEqual(checkpoints, ['laser']);
	state = { ...state, spotlightEnabled: true };
	controller.beginLaserDrawing(event, { x: 30, y: 30 });
	controller.finishLaserDrawing();
	assert.equal(state.spotlightStrokes[0].radius, 80);
	assert.deepEqual(checkpoints, ['laser', 'spotlight']);
	controller.fadeLaserDrawings();
	assert.equal(state.spotlightEnabled, true, 'clear retains spotlight dimming mode');
	assert.equal(state.spotlightStrokes[0].releasedAt, 1000);
	now += 501;
	const frame = frames.get(state.laserTrailFrame!)!;
	frames.delete(state.laserTrailFrame!);
	frame();
	assert.equal(state.laserDrawings.length, 0);
	assert.equal(state.spotlightStrokes.length, 0);
	assert.equal(state.laserTrailFrame, null);
	controller.updateLaserPointer({ x: 0, y: 0 });
	controller.dispose();
	assert.equal(state.laserTrailFrame, null);
});

test('presentation laser strokes remain outside authoring history', () => {
	let checkpoints = 0;
	let state: AnnotationState = { laserTrailFrame: null, laserTrailClock: 0, laserTrail: [], laserDrawings: [], spotlightStrokes: [], laserPointer: null, spotlightEnabled: false, spotlightRadius: 80, activeSpotlightStroke: null, activeLaserDrawing: null, laserDrawingPointerId: null, rainbowLaserEnabled: true, laserColor: 'red', presentation: true };
	const controller = createAnnotationController({ read: () => state, write: value => state = value, checkpoint: () => { checkpoints++; }, promoteLayer() {}, capture() {}, release() {}, clock: { now: () => 1, request: () => 1, cancel() {} } });
	controller.beginLaserDrawing({ pointerId: 1 } as PointerEvent, { x: 0, y: 0 });
	controller.continueLaserDrawing({ pointerId: 1 } as PointerEvent, { x: 10, y: 10 });
	controller.finishLaserDrawing();
	assert.equal(state.laserDrawings[0].color, 'rainbow');
	controller.fadeLaserDrawings();
	assert.equal(checkpoints, 0);
});

test('authored drawing sampling preserves straight pen paths on stale pointer-up', () => {
	const drawing = createDrawingController(4);
	const origin = { x: 10, y: 10 };
	const points = drawing.move([origin], { x: 100, y: 10 }, 'straight');
	assert.deepEqual(drawing.finish(points, origin, 'straight'), points);
	assert.equal(drawing.finish([origin], { x: 11, y: 10 }, 'straight'), null);
	assert.equal(drawing.move([origin], { x: 10.2, y: 10 }, 'squiggle').length, 1);
	assert.equal(drawing.finish([origin], { x: 30, y: 30 }, 'squiggle')?.length, 2);
});

test('play reorder respects pointer identity, cancel and commit boundaries', () => {
	let order = ['one', 'two', 'three'], preview: string[] | null = null, commits = 0, suppressions = 0;
	const reorder = createReorderController({ ids: () => order, enabled: () => true, preview: ids => preview = ids,
		hit: () => 'three', capture() {}, scroll() {}, commit: ids => { order = ids; commits++; }, suppressClick: () => { suppressions++; } });
	reorder.begin({ button: 0, clientX: 0, pointerId: 1 }, 'one');
	reorder.move({ clientX: 50, pointerId: 2 });
	assert.equal(preview, null);
	reorder.move({ clientX: 50, pointerId: 1 });
	assert.deepEqual(preview, ['two', 'three', 'one']);
	reorder.end(true);
	assert.equal(commits, 0);
	assert.deepEqual(order, ['one', 'two', 'three']);
	reorder.begin({ button: 0, clientX: 0, pointerId: 1 }, 'one');
	reorder.move({ clientX: 50, pointerId: 1 });
	reorder.end();
	assert.deepEqual(order, ['two', 'three', 'one']);
	assert.equal(commits, 1);
	assert.equal(suppressions, 2);
});

test('editor leases close the previous editor and cannot unregister its replacement', () => {
	const editors = createElementEditorController();
	let closed = 0;
	const releaseFirst = editors.activate(() => { closed++; }, { color: true });
	editors.activate(() => { closed++; }, { motion: true });
	assert.equal(closed, 1);
	releaseFirst();
	assert.deepEqual(editors.capabilities, { motion: true });
	editors.close();
	assert.equal(closed, 2);
	assert.equal(editors.capabilities, null);
});

test('fullscreen restores opaque authoring state after exit and request failure', async () => {
	let active = false, full: Element | null = null, focused = false, restored = '', failed = false;
	const root = { requestFullscreen: async () => { if (failed) throw new Error('denied'); full = root as unknown as Element; }, focus: () => { focused = true; } } as unknown as HTMLElement;
	const controller = createPresentationController({ root: () => root, active: () => active, fullscreenElement: () => full,
		exitFullscreen: async () => { full = null; }, prepare: () => { active = true; return { tool: 'custom-tool' }; },
		failed: state => { active = false; restored = state.tool; }, leave: state => { active = false; restored = state!.tool; }, message() {} });
	await controller.toggle();
	assert.equal(focused, true);
	await controller.toggle();
	controller.sync();
	assert.equal(restored, 'custom-tool');
	failed = true;
	await controller.toggle();
	assert.equal(active, false);
	assert.equal(restored, 'custom-tool');
});
