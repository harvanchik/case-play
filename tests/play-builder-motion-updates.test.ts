import {perceptualColorTransition} from '../src/lib/play-builder-color';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
	createAnimation,
	appendAnimationStep,
	captureAnimationEdits,
	applyAnimationStep,
	evaluateAnimation,
	defaultMotion,
	validateAnimation,
	rebuildTransitions, retimeTransition
} from '../src/lib/play-builder-animation';
import { defaultDrawingAnimation } from '../src/lib/play-builder-drawing-animation';
import {
	encodePlayBuilderDocument,
	decodePlayBuilderDocument,
	defaultPlayBuilderFieldSettings,
	type PlayBuilderScene
} from '../src/lib/play-builder-scene';
const scene = (): PlayBuilderScene => ({
	markers: [{ id: 1, kind: 'team-a', label: 'A-1', x: 100, y: 200 }],
	guides: [{ id: 2, kind: 'line-to-gain', x: 200, color: 'yellow', style: 'solid', down: '1st' }],
	paths: [],
	freeStrokes: [],
	layerOrder: []
});
function play() {
	const base = scene(),
		animation = appendAnimationStep(createAnimation(base));
	animation.steps[1].poses[0].x = 300;
	return { scene: base, animation };
}
test('per-object speed changes arrival within the step without changing authored duration', () => {
	const p = play();
	p.animation.transitions[0].motions = [{ ...defaultMotion({ type: 'marker', id: 1 }), speed: 2 }];
	assert.equal(evaluateAnimation(p, 0.25).markers[0].x, 200);
	assert.equal(evaluateAnimation(p, 0.5).markers[0].x, 300);
	p.animation.transitions[0].motions[0].speed = 0.25;
	assert.equal(evaluateAnimation(p, 1).markers[0].x, 300);
	assert.equal(p.animation.transitions[0].duration, 1);
});
test('Jump supports hard cut, fade, shrink and a quarter-second transition scaled by speed', () => {
	const p = play(),
		motion = { ...defaultMotion({ type: 'marker' as const, id: 1 }), path: 'jump' as const, jumpEffect: 'fade' as const };
	p.animation.transitions[0].motions = [motion];
	const a = evaluateAnimation(p, 0.0625).markers[0],
		b = evaluateAnimation(p, 0.125).markers[0];
	assert.equal(a.x, 100);
	assert.equal(a.animationOpacity, 0.5);
	assert.equal(b.x, 300);
	assert.equal(b.animationOpacity, 0);
	assert.equal(evaluateAnimation(p, 0.25).markers[0].animationOpacity, 1);
	p.animation.transitions[0].motions[0] = { ...motion, jumpEffect: 'shrink', speed: 2 };
	assert.equal(evaluateAnimation(p, 0.03125).markers[0].animationScale, 0.5);
	assert.equal(evaluateAnimation(p, 0.125).markers[0].animationScale, 1);
	p.animation.transitions[0].motions[0] = { ...motion, jumpEffect: 'cut' };
	assert.equal(evaluateAnimation(p, 0).markers[0].x, 300);
});
test('guide down is step-local and changes only when Shift or Jump finishes', () => {
	const p = play();
	p.animation.steps[1].poses[1].x = 400;
	p.animation.steps[1].poses[1].down = '2nd';
	p.animation.transitions[0].motions = [{ ...defaultMotion({ type: 'guide', id: 2 }), end: 0.5 }];
	assert.equal(evaluateAnimation(p, 0.49).guides[0].down, '1st');
	assert.equal(evaluateAnimation(p, 0.5).guides[0].down, '2nd');
	p.animation.transitions[0].motions[0] = { ...defaultMotion({ type: 'guide', id: 2 }), path: 'jump', start: 0.2, jumpEffect: 'fade' };
	assert.equal(evaluateAnimation(p, 0.4).guides[0].down, '1st');
	assert.equal(evaluateAnimation(p, 0.46).guides[0].down, '2nd');
	assert.equal(applyAnimationStep(p.scene, p.animation.steps[0]).guides[0].down, '1st');
	assert.doesNotThrow(() => validateAnimation(p.animation, p.scene));
});
test('drawings reveal along the authored stroke, stay step-local, round trip, and support instant/easing', () => {
	const p = play();
	const live = applyAnimationStep(p.scene, p.animation.steps[1]);
	live.freeStrokes = [
		{
			id: 3,
			color: 'red',
			width: 4,
			points: [
				{ x: 0, y: 0 },
				{ x: 100, y: 0 }
			]
		}
	];
	const authored = captureAnimationEdits(p.scene, live, p.animation, 1);
	assert.equal(applyAnimationStep(authored.scene, authored.animation.steps[0]).freeStrokes.length, 0);
	assert.equal(applyAnimationStep(authored.scene, authored.animation.steps[1]).freeStrokes.length, 1);
	assert.equal(evaluateAnimation(authored, 0.25).freeStrokes.length, 0);
	assert.equal(evaluateAnimation(authored, 0.75).freeStrokes[0].points.at(-1)!.x, 50);
	authored.animation.drawings![0].easing = 'in';
	assert.equal(evaluateAnimation(authored, 0.75).freeStrokes[0].points.at(-1)!.x, 25);
	authored.animation.drawings![0].mode = 'instant';
	assert.equal(evaluateAnimation(authored, 0.49).freeStrokes.length, 0);
	assert.equal(evaluateAnimation(authored, 0.5).freeStrokes[0].points.at(-1)!.x, 100);
	const restored = decodePlayBuilderDocument(
		encodePlayBuilderDocument({ activePlayIndex: 0, plays: [{ name: 'Draw', ...authored, settings: defaultPlayBuilderFieldSettings() }] })
	);
	assert.deepEqual(restored.plays[0].animation!.drawings, authored.animation.drawings);
	assert.equal(evaluateAnimation(restored.plays[0], 0.25).freeStrokes.length, 0);
});
test('malformed speeds, jump effects and drawing references are rejected', () => {
	for (const invalid of [{ speed: 3 }, { jumpEffect: 'bogus' }]) {
		const p = play();
		p.animation.transitions[0].motions = [{ ...defaultMotion({ type: 'marker', id: 1 }), ...invalid } as never];
		assert.throws(() => validateAnimation(p.animation, p.scene));
	}
	const p = play();
	p.animation.drawings = [defaultDrawingAnimation(999, p.animation.steps[1].id)];
	assert.throws(() => validateAnimation(p.animation, p.scene));
});

test('legacy guide downs become complete poses before editing an earlier step', () => {
	const p = play();
	for (const step of p.animation.steps) delete step.poses.find((pose) => pose.type === 'guide')!.down;
	const live = applyAnimationStep(p.scene, p.animation.steps[0]);
	live.guides[0].down = '2nd';
	const edited = captureAnimationEdits(p.scene, live, p.animation, 0);
	assert.equal(applyAnimationStep(edited.scene, edited.animation.steps[1]).guides[0].down, '1st');
	assert.equal(applyAnimationStep(edited.scene, edited.animation.steps[0]).guides[0].down, '2nd');
});
test('moving a drawing step to Start preserves the drawing as a still and removes its incoming track', () => {
	const p = play();
	const live = applyAnimationStep(p.scene, p.animation.steps[1]);
	live.freeStrokes = [
		{
			id: 3,
			color: 'red',
			points: [
				{ x: 0, y: 0 },
				{ x: 10, y: 10 }
			]
		}
	];
	const authored = captureAnimationEdits(p.scene, live, p.animation, 1);
	authored.animation.steps.reverse();
	const reordered = rebuildTransitions(authored.animation);
	assert.doesNotThrow(() => validateAnimation(reordered, authored.scene));
	assert.equal(reordered.drawings!.length, 0);
	assert.equal(applyAnimationStep(authored.scene, reordered.steps[0]).freeStrokes.length, 1);
});


test('step duration preserves partial windows in seconds and lets full windows follow the step', () => {
 const animation = appendAnimationStep(createAnimation(scene()));
 const transition = animation.transitions[0];
 transition.motions = [
  { ...defaultMotion({type:'marker',id:1}), start:0, end:1 },
  { ...defaultMotion({type:'marker',id:2}), start:.2, end:.7 }
 ];
 animation.drawings = [{ ...defaultDrawingAnimation(3, transition.to), start:.25, end:.75 }];
 retimeTransition(animation, 0, 2);
 assert.equal(transition.motions[0].end, 1);
 assert.equal(transition.motions[1].start * 2, .2);
 assert.equal(transition.motions[1].end * 2, .7);
 assert.equal(animation.drawings[0].end * 2, .75);
 retimeTransition(animation, 0, .1);
 assert.equal(transition.motions[1].end, 1);
 assert.ok(transition.motions[1].end - transition.motions[1].start >= .099999);
});


test('drawing movement preserves step geometry, interpolates, and round trips', () => {
 const base=scene();base.freeStrokes=[{id:51,color:'red',points:[{x:100,y:100},{x:200,y:150}]}];
 const animation=appendAnimationStep(createAnimation(base));
 const live=structuredClone(base);live.freeStrokes[0].points=live.freeStrokes[0].points.map(point=>({x:point.x+100,y:point.y+50}));
 const saved=captureAnimationEdits(base,live,animation,1);
 assert.equal(applyAnimationStep(saved.scene,saved.animation.steps[0]).freeStrokes[0].points[0].x,100);
 assert.equal(applyAnimationStep(saved.scene,saved.animation.steps[1]).freeStrokes[0].points[0].x,200);
 const play={scene:saved.scene,animation:saved.animation};
 assert.equal(evaluateAnimation(play,.5).freeStrokes[0].points[0].x,150);
 assert.doesNotThrow(()=>validateAnimation(saved.animation,saved.scene));
 const encoded=encodePlayBuilderDocument({activePlayIndex:0,plays:[{name:'Moving drawing',settings:defaultPlayBuilderFieldSettings(),scene:saved.scene,animation:saved.animation}]});
 const decoded=decodePlayBuilderDocument(encoded);
 assert.deepEqual(decoded.plays[0].animation?.steps[1].strokeOffsets,saved.animation.steps[1].strokeOffsets);
});


test('drawing colors remain step-local and blend for Linear but cut for Jump',()=>{
 const base=scene();base.freeStrokes=[{id:51,color:'red',points:[{x:100,y:100},{x:200,y:150}]}];
 const animation=appendAnimationStep(createAnimation(base));
 const live=structuredClone(base);live.freeStrokes[0].color='blue';live.freeStrokes[0].points=live.freeStrokes[0].points.map(point=>({x:point.x+100,y:point.y}));
 const saved=captureAnimationEdits(base,live,animation,1);
 assert.equal(applyAnimationStep(saved.scene,saved.animation.steps[0]).freeStrokes[0].color,'red');
 assert.equal(applyAnimationStep(saved.scene,saved.animation.steps[1]).freeStrokes[0].color,'blue');
 const play={scene:saved.scene,animation:saved.animation};
 assert.equal(evaluateAnimation(play,.5).freeStrokes[0].animationColor,perceptualColorTransition('#ff1744','#2979ff',.5));
 saved.animation.drawings=[{...defaultDrawingAnimation(51,saved.animation.steps[1].id),mode:'jump',start:.4}];
 assert.equal(evaluateAnimation(play,.39).freeStrokes[0].points[0].x,100);
 assert.equal(evaluateAnimation(play,.39).freeStrokes[0].animationColor,'rgb(255, 23, 68)');
 assert.equal(evaluateAnimation(play,.4).freeStrokes[0].points[0].x,200);
 assert.equal(evaluateAnimation(play,.4).freeStrokes[0].animationColor,'rgb(41, 121, 255)');
 const encoded=encodePlayBuilderDocument({activePlayIndex:0,plays:[{name:'Colors',...saved,settings:defaultPlayBuilderFieldSettings()}]});
 assert.deepEqual(decodePlayBuilderDocument(encoded).plays[0].animation,saved.animation);
});


test('authored Jump duration controls fades and validates bounds',()=>{
 const p=play();p.animation.steps[1].poses[0].x=500;
 p.animation.transitions[0].motions=[{...defaultMotion({type:'marker',id:1}),path:'jump',jumpEffect:'fade',jumpDuration:.6}];
 assert.equal(evaluateAnimation(p,.15).markers[0].animationOpacity,.5);
 assert.equal(evaluateAnimation(p,.45).markers[0].animationOpacity,.5);
 assert.equal(evaluateAnimation(p,.6).markers[0].animationOpacity,1);
 assert.doesNotThrow(()=>validateAnimation(p.animation,p.scene));
 p.animation.transitions[0].motions[0].jumpDuration=1.01;
 assert.throws(()=>validateAnimation(p.animation,p.scene));
});
