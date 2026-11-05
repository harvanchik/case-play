import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayBuilderController, type ClipboardOrigin, type PasteDestination } from '../src/lib/play-builder-controller';
const origin: ClipboardOrigin = {
	playId: 'one',
	surface: { left: 100, top: 50, width: 800, height: 400 },
	bounds: { left: 200, top: 100, right: 250, bottom: 150 }
};
const destination: PasteDestination = { playId: 'one', surface: origin.surface, viewport: { left: 0, top: 0, width: 1000, height: 500 } };

test('history bounds, branching, and empty undo/redo are independent of a sport schema', () => {
	let state = { score: 0, nested: { label: 'court' } };
	const statuses: boolean[] = [];
	const c = createPlayBuilderController({
		snapshot: () => state,
		restore: (next) => (state = next),
		historyLimit: 2,
		onChange: (s) => statuses.push(s.canRedo)
	});
	assert.equal(c.undo(), false);
	assert.equal(c.redo(), false);
	for (let i = 1; i <= 3; i++) {
		c.checkpoint();
		state.score = i;
	}
	assert.equal(c.undo(), true);
	assert.equal(state.score, 2);
	assert.equal(c.undo(), true);
	assert.equal(state.score, 1);
	assert.equal(c.undo(), false);
	c.redo();
	assert.equal(state.score, 2);
	c.checkpoint();
	state.score = 9;
	assert.equal(c.redo(), false);
	assert.equal(c.status.canRedo, false);
	assert.ok(statuses.includes(true));
	c.undo();
	assert.equal(state.score, 2);
	state.nested.label = 'changed';
	c.redo();
	assert.equal(state.nested.label, 'court');
});
test('tutorial history can be suspended and restored without sharing mutable snapshots', () => {
	let state = { value: 0 };
	const c = createPlayBuilderController({ snapshot: () => state, restore: (next) => (state = next) });
	c.checkpoint();
	state.value = 1;
	const saved = c.exportHistory();
	c.clearHistory();
	c.checkpoint();
	state.value = 20;
	c.restoreHistory(saved);
	saved.past[0].value = 99;
	c.undo();
	assert.equal(state.value, 0);
	c.checkpoint();
	state.value = 5;
	const exposed = c.exportHistory();
	exposed.past[0].value = 100;
	c.undo();
	assert.equal(state.value, 0);
});
test('clipboard snapshots are isolated and repeated pastes preserve offsets and cross-surface positions', () => {
	let state: { points: { x: number; y: number }[] } = { points: [] };
	const c = createPlayBuilderController<typeof state, typeof state>({ snapshot: () => state, restore: (next) => (state = next) });
	const payload = { points: [{ x: 200, y: 100 }] };
	const copiedOrigin = structuredClone(origin);
	c.copy(payload, copiedOrigin);
	payload.points[0].x = 999;
	copiedOrigin.surface.width = 1;
	const paste = (target = destination) =>
		c.paste(target, (copied, { mapPoint }) => {
			state.points.push(mapPoint(copied.points[0]));
			copied.points[0].x = 888;
			return true;
		});
	paste();
	paste();
	assert.deepEqual(state.points, [
		{ x: 214, y: 114 },
		{ x: 228, y: 128 }
	]);
	paste({ ...destination, playId: 'two', surface: { left: 20, top: 10, width: 400, height: 200 } });
	assert.deepEqual(state.points.at(-1), { x: 70, y: 35 });
	c.undo();
	assert.equal(state.points.length, 2);
	c.redo();
	assert.equal(state.points.length, 3);
	c.clearHistory();
	assert.equal(c.status.hasClipboard, true);
	assert.equal(c.status.canUndo, false);
});
test('paste near viewport edges reverses its offset and failed pastes do not consume the next offset', () => {
	let state = { x: 0 };
	const c = createPlayBuilderController<typeof state, { x: number; y: number }>({ snapshot: () => state, restore: (next) => (state = next) });
	assert.equal(
		c.paste(destination, () => true),
		false
	);
	c.copy({ x: 990, y: 490 }, { ...origin, bounds: { left: 980, top: 480, right: 1000, bottom: 500 } });
	assert.equal(
		c.paste(destination, () => false),
		false
	);
	assert.equal(c.status.canUndo, false);
	c.paste(destination, (point, { mapPoint }) => {
		state.x = mapPoint(point).x;
		return true;
	});
	assert.equal(state.x, 976);
	c.undo();
	assert.equal(state.x, 0);
	c.redo();
	assert.equal(state.x, 976);
});
test('cut is undoable and leaves its clipboard available for paste', () => {
	let state = { items: ['basketball'] };
	const c = createPlayBuilderController<typeof state, string[]>({ snapshot: () => state, restore: (next) => (state = next) });
	assert.equal(
		c.cut(() => true),
		false
	);
	c.copy(state.items, origin);
	assert.equal(
		c.cut(() => {
			state.items = [];
			return true;
		}),
		true
	);
	c.undo();
	assert.deepEqual(state.items, ['basketball']);
	c.redo();
	assert.deepEqual(state.items, []);
	c.paste(destination, (items) => {
		state.items = items;
		return true;
	});
	assert.deepEqual(state.items, ['basketball']);
	c.undo();
	assert.deepEqual(state.items, []);
	c.clearClipboard();
	assert.equal(c.status.hasClipboard, false);
});
test('controllers are isolated and invalid geometry does not replace the clipboard', () => {
	let state = 0;
	const make = () => createPlayBuilderController<number, string>({ snapshot: () => state, restore: (next) => (state = next) });
	const a = make(),
		b = make();
	a.copy('football', origin);
	assert.equal(b.status.hasClipboard, false);
	assert.throws(() => a.copy('bad', { ...origin, surface: { ...origin.surface, width: 0 } }), RangeError);
	a.paste(destination, (payload) => {
		assert.equal(payload, 'football');
		return true;
	});
	assert.equal(b.status.canUndo, false);
	assert.throws(() => createPlayBuilderController({ snapshot: () => 0, restore: () => {}, historyLimit: 0 }), RangeError);
	const one = createPlayBuilderController({ snapshot: () => state, restore: (next) => (state = next), historyLimit: 1 });
	one.checkpoint();
	state = 1;
	one.checkpoint();
	state = 2;
	one.undo();
	assert.equal(state, 1);
	assert.equal(one.undo(), false);
});
