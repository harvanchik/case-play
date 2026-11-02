import assert from 'node:assert/strict';
import test from 'node:test';
import {
	animationDuration,
	evaluateAnimationClock,
	appendAnimationStep,
	applyAnimationStep,
	captureAnimationEdits,
	cloneAnimation,
	createAnimation,
	defaultMotion,
	evaluateAnimation,
	insertAnimationStep,
	rebuildTransitions,
	validateAnimation
} from '../src/lib/play-builder-animation';
import {
	decodePlayBuilderDocument,
	defaultPlayBuilderFieldSettings,
	encodePlayBuilderDocument,
	type PlayBuilderScene
} from '../src/lib/play-builder-scene';

const scene = (): PlayBuilderScene => ({
	markers: [
		{ id: 1, kind: 'team-a', x: 100, y: 100, label: 'A-1' },
		{ id: 2, kind: 'team-a', x: 300, y: 100, label: 'A-2' },
		{ id: 3, kind: 'ball', x: 112, y: 108 }
	],
	guides: [{ id: 4, kind: 'line-of-scrimmage', x: 100, color: 'orange', style: 'solid' }],
	paths: [],
	freeStrokes: [],
	layerOrder: [
		{ type: 'marker', id: 1 },
		{ type: 'marker', id: 2 },
		{ type: 'marker', id: 3 },
		{ type: 'guide', id: 4 }
	]
});
function play() {
	const base = scene(),
		animation = insertAnimationStep(createAnimation(base), 0);
	animation.transitions[0].duration = 2;
	animation.steps[1].poses[0].x = 200;
	animation.steps[1].poses[3].x = 200;
	return { scene: base, animation, settings: defaultPlayBuilderFieldSettings(), name: 'Test Play' };
}
const near = (actual: number, expected: number, tolerance = 0.001) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);

test('v7 round trips animation; v1–v6 documents remain static and readable', () => {
	const source = { activePlayIndex: 0, plays: [play()] };
	assert.deepEqual(JSON.parse(JSON.stringify(decodePlayBuilderDocument(encodePlayBuilderDocument(source)))), source);
	const encoded = encodePlayBuilderDocument(source);
	assert.equal(decodePlayBuilderDocument(encoded.p[0][1]).plays[0].animation, undefined);
	for (const version of [2, 3, 4, 5, 6]) {
		const settings = [...encoded.p[0][2]!];
		if (version < 6) settings.splice(5);
		const tuple = version === 2 ? ['Test Play', encoded.p[0][1]] : ['Test Play', encoded.p[0][1], settings];
		assert.equal(decodePlayBuilderDocument({ v: version, a: 0, p: [tuple] }).plays[0].animation, undefined);
	}
});

test('steady interpolation, guide movement, delayed start, early arrival, and stationary objects', () => {
	const value = play();
	value.animation.transitions[0].motions = [{ ...defaultMotion({ type: 'marker', id: 1 }), start: 0.25, end: 0.75 }];
	near(evaluateAnimation(value, 0.25).markers[0].x, 100);
	near(evaluateAnimation(value, 1).markers[0].x, 150);
	near(evaluateAnimation(value, 1.75).markers[0].x, 200);
	near(evaluateAnimation(value, 1).guides[0].x, 150);
	near(evaluateAnimation(value, 1).markers[1].x, 300);
	assert.deepEqual(evaluateAnimation(value, 99), applyAnimationStep(value.scene, value.animation.steps[1]));
});

test('curves use arc distance and easing changes pace', () => {
	const value = play();
	value.animation.transitions[0].motions = [{ ...defaultMotion({ type: 'marker', id: 1 }), path: 'curve', points: [{ x: 0.15, y: -80 }] }];
	const positions = Array.from({ length: 21 }, (_, i) => evaluateAnimation(value, i / 10).markers[0]);
	const lengths = positions.slice(1).map((p, i) => Math.hypot(p.x - positions[i].x, p.y - positions[i].y));
	assert.ok(Math.max(...lengths) / Math.min(...lengths) < 1.05);
	value.animation.transitions[0].motions[0] = { ...defaultMotion({ type: 'marker', id: 1 }), easing: 'in' };
	near(evaluateAnimation(value, 1).markers[0].x, 125);
});

test('carrying, delayed release, moving receiver catch, and possession after arrival', () => {
	const value = play();
	value.animation.steps[1].poses[1].x = 400;
	value.animation.steps[0].poses[2] = { ...value.animation.steps[0].poses[2], carrierId: 1, offset: { x: 12, y: 8 } };
	value.animation.steps[1].poses[2] = { ...value.animation.steps[1].poses[2], carrierId: 2, offset: { x: 12, y: 8 } };
	value.animation.transitions[0].motions = [{ ...defaultMotion({ type: 'marker', id: 3 }), start: 0.25, end: 0.75 }];
	near(evaluateAnimation(value, 0.25).markers[2].x, 124.5);
	near(evaluateAnimation(value, 0.5).markers[2].x, 137);
	near(evaluateAnimation(value, 1).markers[2].x, 262);
	near(evaluateAnimation(value, 1.5).markers[2].x, 387);
	near(evaluateAnimation(value, 1.75).markers[2].x, 399.5);
	near(evaluateAnimation(value, 2).markers[2].x, 412);
});

test('editing an earlier step leaves future destinations unchanged; newly added objects appear from their insertion step', () => {
	const value = play();
	const live = applyAnimationStep(value.scene, value.animation.steps[0]);
	live.markers[0].x = 50;
	const first = captureAnimationEdits(value.scene, live, value.animation, 0);
	assert.equal(first.animation.steps[0].poses[0].x, 50);
	assert.equal(first.animation.steps[1].poses[0].x, 200);
	const later = applyAnimationStep(first.scene, first.animation.steps[1]);
	later.markers.push({ id: 10, kind: 'flag', x: 250, y: 150 });
	const added = captureAnimationEdits(first.scene, later, first.animation, 1);
	validateAnimation(added.animation, added.scene);
	assert.equal(
		evaluateAnimation(added, 0).markers.some((item) => item.id === 10),
		true
	);
	assert.equal(
		evaluateAnimation(added, 2).markers.some((item) => item.id === 10),
		true
	);
	assert.ok(
		added.scene.markers.some((item) => item.id === 10),
		'hidden objects remain in registry'
	);
});

test('deleting a carrier detaches the ball without losing its position or destroying earlier poses', () => {
	const value = play();
	value.animation.steps[1].poses[2].carrierId = 1;
	value.animation.steps[1].poses[2].offset = { x: 12, y: 8 };
	const live = applyAnimationStep(value.scene, value.animation.steps[1]);
	live.markers = live.markers.filter((item) => item.id !== 1);
	const updated = captureAnimationEdits(value.scene, live, value.animation, 1);
	validateAnimation(updated.animation, updated.scene);
	const ball = updated.animation.steps[1].poses.find((pose) => pose.id === 3)!;
	assert.equal(ball.carrierId, undefined);
	near(ball.x, 212);
	assert.equal(updated.animation.steps[0].poses[0].visible, true);
	assert.equal(updated.animation.steps[1].poses[0].visible, false);
});

test('evaluation and rebuilding never mutate authoring data; neighboring transitions retain their settings', () => {
	const value = play();
	value.animation = insertAnimationStep(value.animation, 1);
	value.animation.transitions[0].duration = 3;
	const before = structuredClone(value);
	for (let i = 0; i < 100; i++) evaluateAnimation(value, i / 20);
	assert.deepEqual(value, before);
	const reordered = cloneAnimation(value.animation);
	assert.equal(rebuildTransitions(reordered).transitions[0].duration, 3);
});

test('reject malformed references, non-finite coordinates, cycles, timings, oversized paths, and duration overruns', () => {
	const value = play();
	for (const mutate of [
		(a: typeof value.animation) => (a.steps[0].poses[0].x = Infinity),
		(a: typeof value.animation) => (a.steps[0].poses[0].id = 999),
		(a: typeof value.animation) => (a.steps[0].poses[0].carrierId = 1),
		(a: typeof value.animation) => (a.transitions[0].duration = 61),
		(a: typeof value.animation) => a.transitions[0].motions.push({ ...defaultMotion({ type: 'marker', id: 1 }), start: 0.8, end: 0.2 }),
		(a: typeof value.animation) =>
			a.transitions[0].motions.push({ ...defaultMotion({ type: 'marker', id: 1 }), points: Array.from({ length: 257 }, () => ({ x: 0, y: 0 })) })
	]) {
		const next = cloneAnimation(value.animation);
		mutate(next);
		assert.throws(() => validateAnimation(next, value.scene));
	}
	let full = createAnimation(value.scene);
	for (let i = 0; i < 60; i++) full = insertAnimationStep(full, i);
	assert.equal(animationDuration(full), 60);
	assert.throws(() => insertAnimationStep(full, 60));
	const start = performance.now();
	for (let i = 0; i < 1800; i++) evaluateAnimation({ scene: value.scene, animation: full }, i / 30);
	assert.ok(performance.now() - start < 3000);
});

test('new objects only appear in their selected step; newly copied steps inherit them', () => {
	const value = play();
	value.animation = insertAnimationStep(value.animation, 1);
	const live = applyAnimationStep(value.scene, value.animation.steps[1]);
	live.markers.push({ id: 20, kind: 'flag', x: 300, y: 200 });
	const added = captureAnimationEdits(value.scene, live, value.animation, 1);
	assert.deepEqual(
		added.animation.steps.map((step) => step.poses.find((pose) => pose.id === 20)?.visible),
		[false, true, false]
	);
	const copied = insertAnimationStep(added.animation, 1);
	assert.deepEqual(
		copied.steps.map((step) => step.poses.find((pose) => pose.id === 20)?.visible),
		[false, true, true, false]
	);
	validateAnimation(copied, added.scene);
});

test('new transitions default to one second without changing existing authored durations', () => {
	const initial = insertAnimationStep(createAnimation(scene()), 0);
	assert.equal(initial.transitions[0].duration, 1);
	initial.transitions[0].duration = 3.25;
	const next = insertAnimationStep(initial, 1);
	assert.deepEqual(
		next.transitions.map((transition) => transition.duration),
		[3.25, 1]
	);
});

test('adding a step copies the last pose and preserves the existing order', () => {
	const value = play();
	value.animation = insertAnimationStep(value.animation, 1);
	const ids = value.animation.steps.map((step) => step.id);
	const next = appendAnimationStep(value.animation);
	assert.deepEqual(
		next.steps.slice(0, 3).map((step) => step.id),
		ids
	);
	assert.deepEqual(next.steps[3].poses, value.animation.steps[2].poses);
	assert.equal(next.transitions[2].duration, 1);
});

test('animation object names round trip separately from field labels', () => {
	const value = play();
	value.scene.markers[0].name = 'Quarterback';
	value.scene.guides[0].name = 'Snap line';
	const decoded = decodePlayBuilderDocument(encodePlayBuilderDocument({ activePlayIndex: 0, plays: [value] }));
	assert.equal(decoded.plays[0].scene.markers[0].name, 'Quarterback');
	assert.equal(decoded.plays[0].scene.markers[0].label, 'A-1');
	assert.equal(decoded.plays[0].scene.guides[0].name, 'Snap line');
	const malformed = encodePlayBuilderDocument({ activePlayIndex: 0, plays: [value] });
	malformed.p[0][1].m[0][7] = 'x'.repeat(65);
	assert.throws(() => decodePlayBuilderDocument(malformed));
});

test('animation clock counts authored seconds, clamps at zero, and only flashes after expiry', () => {
	assert.deepEqual(evaluateAnimationClock(2, 0), { seconds: 2, expired: false, visible: true });
	assert.equal(evaluateAnimationClock(2, 1.2).seconds, 1);
	assert.deepEqual(evaluateAnimationClock(2, 2), { seconds: 0, expired: true, visible: true });
	assert.deepEqual(evaluateAnimationClock(2, 2.5), { seconds: 0, expired: true, visible: false });
	assert.deepEqual(evaluateAnimationClock(2, 3), { seconds: 0, expired: true, visible: true });
	assert.deepEqual(evaluateAnimationClock(0, 30), { seconds: 0, expired: false, visible: true });
});

test('labels are step-local, survive round trips, and switch only at step boundaries', () => {
 const base = scene();
 let animation = appendAnimationStep(createAnimation(base));
 animation = appendAnimationStep(animation);
 const live = applyAnimationStep(base, animation.steps[1]);
 live.markers[0].label = 'Runner';
 const edited = captureAnimationEdits(base, live, animation, 1);
 animation = edited.animation;
 assert.equal(applyAnimationStep(edited.scene, animation.steps[0]).markers[0].label, 'A-1');
 assert.equal(applyAnimationStep(edited.scene, animation.steps[1]).markers[0].label, 'Runner');
 assert.equal(applyAnimationStep(edited.scene, animation.steps[2]).markers[0].label, 'A-1');
 animation.transitions[0].motions = [{ ...defaultMotion({ type: 'marker', id: 1 }), end: 0.25 }];
 assert.equal(evaluateAnimation({ scene: edited.scene, animation }, 0.9).markers[0].label, 'A-1');
 assert.equal(evaluateAnimation({ scene: edited.scene, animation }, 1).markers[0].label, 'Runner');
 const document = encodePlayBuilderDocument({ activePlayIndex: 0, plays: [{ name: 'Labels', scene: edited.scene, settings: defaultPlayBuilderFieldSettings(), animation }] });
 const restored = decodePlayBuilderDocument(document)!;
 assert.equal(restored.plays[0].animation!.steps[1].poses.find(pose => pose.id === 1)!.label, 'Runner');
 const malformed = cloneAnimation(animation);
 malformed.steps[1].poses[0].label = 'x'.repeat(65);
 assert.throws(() => validateAnimation(malformed, edited.scene));
});

test('new markers and guides appear at the start of their incoming step, including the final step', () => {
 const base = scene();
 let animation = appendAnimationStep(createAnimation(base));
 animation = appendAnimationStep(animation);
 const live = applyAnimationStep(base, animation.steps[2]);
 live.markers.push({ id: 20, kind: 'flag', x: 500, y: 200 });
 live.guides.push({ id: 21, kind: 'custom', x: 600, color: 'white', style: 'solid' });
 const edited = captureAnimationEdits(base, live, animation, 2);
 const play = { scene: edited.scene, animation: edited.animation };
 assert.equal(evaluateAnimation(play, 0.999).markers.some(marker => marker.id === 20), false);
 for (const time of [1, 1.01, 1.5, 2]) {
  assert.equal(evaluateAnimation(play, time).markers.find(marker => marker.id === 20)?.x, 500);
  assert.equal(evaluateAnimation(play, time).guides.find(guide => guide.id === 21)?.x, 600);
 }
 assert.equal(applyAnimationStep(edited.scene, edited.animation.steps[0]).markers.some(marker => marker.id === 20), false);
 const step2 = applyAnimationStep(base, animation.steps[1]);
 step2.markers.push({ id: 22, kind: 'flag', x: 400, y: 200 });
 const first = captureAnimationEdits(base, step2, animation, 1);
 assert.equal(evaluateAnimation(first, 0).markers.find(marker => marker.id === 22)?.x, 400);
 assert.equal(evaluateAnimation(first, .5).markers.find(marker => marker.id === 22)?.x, 400);
});

test('default setup identities round trip for markers and guides', () => {
 const base = scene();
 base.markers[0].setupDefault = true;
 base.guides[0].setupDefault = true;
 base.markers[1].setupDefault = false;
 const document = encodePlayBuilderDocument({ activePlayIndex: 0, plays: [{ name: 'Setup', scene: base, settings: defaultPlayBuilderFieldSettings() }] });
 const restored = decodePlayBuilderDocument(document)!;
 assert.equal(restored.plays[0].scene.markers[0].setupDefault, true);
 assert.equal(restored.plays[0].scene.markers[1].setupDefault, false);
 assert.equal(restored.plays[0].scene.guides[0].setupDefault, true);
});


test('jump motion teleports at its start time and round-trips', () => {
 const base = scene();
 const animation = insertAnimationStep(createAnimation(base), 0);
 animation.steps[1].poses.find(p => p.type === 'marker' && p.id === 1)!.x = 500;
 animation.transitions[0].motions = [{ ...defaultMotion({ type: 'marker', id: 1 }), path: 'jump', start: .5, end: 1, easing: 'in-out' }];
 const play = { scene: base, animation };
 assert.equal(evaluateAnimation(play, .49).markers.find(m => m.id === 1)!.x, 100);
 assert.equal(evaluateAnimation(play, .5).markers.find(m => m.id === 1)!.x, 500);
 assert.equal(evaluateAnimation(play, .75).markers.find(m => m.id === 1)!.x, 500);
 assert.deepEqual(validateAnimation(animation, base), animation);
 const encoded = encodePlayBuilderDocument({ activePlayIndex: 0, plays: [{ name: 'Jump', ...play, settings: defaultPlayBuilderFieldSettings() }] });
 assert.equal(decodePlayBuilderDocument(encoded).plays[0].animation!.transitions[0].motions[0].path, 'jump');
});
