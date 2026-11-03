import test from 'node:test';
import assert from 'node:assert/strict';
import {
	createAnimation,
	appendAnimationStep,
	defaultMotion,
	evaluateAnimation,
	passBallToElement,
	validateAnimation
} from '../src/lib/play-builder-animation';
import { playBuilderDrawArrow } from '../src/lib/play-builder-rendering';
import {
	encodePlayBuilderDocument,
	decodePlayBuilderDocument,
	defaultPlayBuilderFieldSettings,
	type PlayBuilderScene
} from '../src/lib/play-builder-scene';
const scene = (): PlayBuilderScene => ({
	markers: [
		{ id: 1, kind: 'ball', x: 100, y: 250 },
		{ id: 2, kind: 'team-a', label: 'A-1', x: 400, y: 220 },
		{ id: 3, kind: 'official-b', x: 600, y: 250 },
		{ id: 4, kind: 'event', x: 700, y: 250, label: 'Event' }
	],
	paths: ['run', 'pass', 'kick'].map((kind, i) => ({
		id: 10 + i,
		kind: kind as 'run' | 'pass' | 'kick',
		start: { x: 150, y: 300 },
		end: { x: 800, y: 300 },
		color: 'cyan',
		style: 'dashed'
	})),
	guides: [],
	freeStrokes: [],
	layerOrder: []
});
test('Run/Pass/Kick Draw reveal honors timing, easing and round trips', () => {
	const base = scene(),
		animation = appendAnimationStep(createAnimation(base));
	animation.transitions[0].motions = base.paths.map((path) => ({
		...defaultMotion({ type: 'path', id: path.id }),
		path: 'draw',
		start: 0.25,
		end: 0.75
	}));
	for (const path of evaluateAnimation({ scene: base, animation }, 0.1).paths) assert.equal(path.animationReveal, 0);
	for (const path of evaluateAnimation({ scene: base, animation }, 0.5).paths) {
		assert.equal(path.animationReveal, 0.5);
		const partial = playBuilderDrawArrow(path, 50);
		assert.ok(partial.points.length > 1);
		assert.ok(partial.points.at(-1)!.x < 800);
		assert.ok(partial.points.at(-1)!.x > 150);
	}
	animation.transitions[0].motions[0].easing = 'in';
	assert.equal(evaluateAnimation({ scene: base, animation }, 0.5).paths[0].animationReveal, 0.25);
	validateAnimation(animation, base);
	const decoded = decodePlayBuilderDocument(
		encodePlayBuilderDocument({ activePlayIndex: 0, plays: [{ name: 'Draw', scene: base, animation, settings: defaultPlayBuilderFieldSettings() }] })
	);
	assert.equal(decoded.plays[0].animation!.transitions[0].motions[0].path, 'draw');
	animation.transitions[0].motions[0].type = 'marker';
	animation.transitions[0].motions[0].id = 1;
	assert.throws(() => validateAnimation(animation, base));
});
test('new arrows can Draw from their insertion step without mutating the saved poses', () => {
	const base = scene(),
		animation = appendAnimationStep(createAnimation(base));
	animation.steps[0].poses.find((p) => p.type === 'path' && p.id === 10)!.visible = false;
	animation.transitions[0].motions = [{ ...defaultMotion({ type: 'path', id: 10 }), path: 'draw' }];
	const original = JSON.stringify(animation);
	assert.equal(evaluateAnimation({ scene: base, animation }, 0.5).paths.find((p) => p.id === 10)!.animationReveal, 0.5);
	assert.equal(JSON.stringify(animation), original);
});
test('passing is a one-shot curved placement at the receiver destination with a ground shadow', () => {
	const base = scene(),
		animation = appendAnimationStep(createAnimation(base));
	animation.steps[1].poses.find((p) => p.type === 'marker' && p.id === 2)!.x = 550;
	const passed = passBallToElement(base, animation, 1, 1, 2);
	const ball = passed.steps[1].poses.find((p) => p.type === 'marker' && p.id === 1)!;
	assert.equal(ball.x, 562);
	assert.equal(ball.y, 230);
	assert.equal(ball.carrierId, undefined);
	assert.equal(passed.transitions[0].motions[0].path, 'curve');
	const halfway = evaluateAnimation({ scene: base, animation: passed }, 0.5).markers.find((m) => m.id === 1)!;
	assert.ok(halfway.animationShadow);
	assert.equal(halfway.animationShadow.x, halfway.x);
	assert.ok(halfway.y < halfway.animationShadow.y - 30);
	passed.steps[1].poses.find((p) => p.type === 'marker' && p.id === 2)!.x = 700;
	assert.equal(passed.steps[1].poses.find((p) => p.id === 1)!.x, 562);
	const retarget = passBallToElement(base, passed, 1, 1, 3);
	assert.equal(retarget.steps[1].poses.find((p) => p.id === 1)!.x, 612);
	assert.equal(retarget.steps[1].poses.find((p) => p.id === 1)!.carrierId, undefined);
	assert.deepEqual(passBallToElement(base, animation, 1, 1, 4), animation);
	validateAnimation(retarget, base);
});

test('curved ball shadows shrink aloft and grow again near landing',()=>{
 const base=scene(),animation=passBallToElement(base,appendAnimationStep(createAnimation(base)),1,1,2);
 const scale=(time:number)=>evaluateAnimation({scene:base,animation},time).markers.find(marker=>marker.id===1)!.animationShadow!.scale!;
 assert.ok(scale(.5)<scale(.1));assert.ok(scale(.9)>scale(.5));assert.ok(scale(.5)>=.3);
});
