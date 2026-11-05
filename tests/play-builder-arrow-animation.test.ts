import {perceptualColorTransition} from '../src/lib/play-builder-color';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
	animationTargetChanged, createAnimation,
	appendAnimationStep,
	captureAnimationEdits,
	applyAnimationStep,
	evaluateAnimation,
	defaultMotion,
	validateAnimation
} from '../src/lib/play-builder-animation';
import {
	encodePlayBuilderDocument,
	decodePlayBuilderDocument,
	defaultPlayBuilderFieldSettings,
	type PlayBuilderScene
} from '../src/lib/play-builder-scene';
const scene = (): PlayBuilderScene => ({
	markers: [
		{ id: 1, kind: 'team-a', x: 100, y: 200, color: 'red' },
		{ id: 2, kind: 'deflag', x: 150, y: 200, color: 'yellow' },
		{ id: 3, kind: 'bean-bag', x: 180, y: 200, color: 'blue' }
	],
	guides: [{ id: 4, kind: 'line-of-scrimmage', x: 200, color: 'white', style: 'solid' }],
	paths: ['run', 'pass', 'kick'].map((kind, index) => ({
		id: 10 + index,
		kind: kind as 'run' | 'pass' | 'kick',
		start: { x: 100, y: 100 },
		end: { x: 200, y: 100 },
		color: 'yellow',
		style: 'solid'
	})),
	freeStrokes: [],
	layerOrder: []
});
test('all arrow kinds retain step geometry and interpolate with object motion controls', () => {
	const base = scene();
	let animation = appendAnimationStep(createAnimation(base));
	animation = appendAnimationStep(animation);
	const live = applyAnimationStep(base, animation.steps[1]);
	live.paths = live.paths.map((path) => ({ ...path, start: { x: 200, y: 200 }, end: { x: 350, y: 200 } }));
	const saved = captureAnimationEdits(base, live, animation, 1);
	assert.equal(applyAnimationStep(saved.scene, saved.animation.steps[0]).paths[0].start.x, 100);
	assert.equal(applyAnimationStep(saved.scene, saved.animation.steps[2]).paths[0].start.x, 100);
	for (const path of evaluateAnimation(saved, 0.5).paths) {
		assert.equal(path.start.x, 150);
		assert.equal(path.start.y, 150);
		assert.equal(path.end.x, 275);
	}
	saved.animation.transitions[0].motions = [{ ...defaultMotion({ type: 'path', id: 10 }), start: 0.25, end: 0.75, easing: 'in' }];
	assert.equal(evaluateAnimation(saved, 0.25).paths[0].start.x, 100);
	assert.equal(evaluateAnimation(saved, 0.5).paths[0].start.x, 125);
	saved.animation.transitions[0].motions[0] = { ...defaultMotion({ type: 'path', id: 10 }), path: 'jump', jumpEffect: 'fade', jumpDuration: 0.25 };
	assert.equal(evaluateAnimation(saved, 0.0625).paths[0].animationOpacity, 0.5);
	assert.equal(evaluateAnimation(saved, 0.125).paths[0].start.x, 200);
	const doc = { activePlayIndex: 0, plays: [{ name: 'Arrows', settings: defaultPlayBuilderFieldSettings(), ...saved }] };
	assert.deepEqual(
		JSON.parse(JSON.stringify(decodePlayBuilderDocument(encodePlayBuilderDocument(doc)).plays[0].animation)),
		JSON.parse(JSON.stringify(saved.animation))
	);
});
test('arrows appear in their authored step, hide after deletion, and old animations remain valid', () => {
	const base = scene(),
		animation = appendAnimationStep(createAnimation(base));
	animation.steps.forEach((step) => (step.poses = step.poses.filter((pose) => pose.type !== 'path')));
	validateAnimation(animation, base);
	assert.equal(evaluateAnimation({ scene: base, animation }, 0.5).paths.length, 3);
	const live = applyAnimationStep(base, animation.steps[1]);
	live.paths.shift();
	const saved = captureAnimationEdits(base, live, animation, 1);
	assert.equal(applyAnimationStep(saved.scene, saved.animation.steps[0]).paths.length, 3);
	assert.equal(evaluateAnimation(saved, 0.1).paths.length, 2);
	const added = applyAnimationStep(saved.scene, saved.animation.steps[1]);
	added.paths.push({ id: 50, kind: 'run', start: { x: 20, y: 20 }, end: { x: 50, y: 50 }, color: 'red', style: 'solid' });
	const next = captureAnimationEdits(saved.scene, added, saved.animation, 1);
	assert.equal(
		evaluateAnimation(next, 0.1).paths.some((path) => path.id === 50),
		true
	);
	const invalid = structuredClone(next.animation);
	invalid.steps[1].poses.find((pose) => pose.type === 'path')!.end!.x = Infinity;
	assert.throws(() => validateAnimation(invalid, next.scene));
});
test('marker and guide colors are step-local, blend with timing and easing, and cut with Jump', () => {
	const base = scene();
	let animation = appendAnimationStep(createAnimation(base));
	animation = appendAnimationStep(animation);
	const live = applyAnimationStep(base, animation.steps[1]);
	live.markers.forEach((marker) => (marker.color = 'green'));
	live.guides[0].color = 'blue';
	const saved = captureAnimationEdits(base, live, animation, 1);
	assert.equal(applyAnimationStep(saved.scene, saved.animation.steps[0]).markers[0].color, 'red');
	assert.equal(applyAnimationStep(saved.scene, saved.animation.steps[2]).markers[0].color, 'red');
	const middle = evaluateAnimation(saved, 0.5);
	assert.equal(middle.markers[0].animationColor, perceptualColorTransition('#ef4444','#4ade80',.5));
	for (const marker of middle.markers) {
		assert.equal(marker.colorMix, 0.5);
		assert.ok(marker.colorFrom);
	}
	assert.ok(middle.guides[0].animationColor);
	saved.animation.transitions[0].motions = [{ ...defaultMotion({ type: 'marker', id: 1 }), path: 'jump', jumpEffect: 'cut', start: 0.5 }];
	assert.equal(evaluateAnimation(saved, 0.49).markers[0].colorMix, 0);
	assert.equal(evaluateAnimation(saved, 0.5).markers[0].colorMix, 1);
	validateAnimation(saved.animation, saved.scene);
});

test('untrusted animation poses cannot supply preview paint values',()=>{
 const base=scene(),animation=createAnimation(base);
 animation.steps[0].poses[0].animationColor='unexpected';
 assert.throws(()=>validateAnimation(animation,base));
});

test('only changed step poses need animation settings',()=>{
 const base=scene(),animation=appendAnimationStep(createAnimation(base));
 const target={type:'path' as const,id:10};assert.equal(animationTargetChanged(animation,1,target),false);
 const pose=animation.steps[1].poses.find(pose=>pose.type==='path'&&pose.id===10)!;
 pose.color='red';assert.equal(animationTargetChanged(animation,1,target),true);pose.color='yellow';
 pose.end!.x+=10;assert.equal(animationTargetChanged(animation,1,target),true);
 assert.equal(animationTargetChanged(animation,0,target),false);
});

test('added and removed labels fade within the first quarter of their own movement window',()=>{
 const base=scene();base.markers[0].label=undefined;const animation=appendAnimationStep(createAnimation(base));
 const pose=animation.steps[1].poses.find(pose=>pose.type==='marker'&&pose.id===1)!;pose.label='New';pose.name='Named';
 assert.equal(animationTargetChanged(animation,1,{type:'marker',id:1}),true);
 animation.transitions[0].motions=[{...defaultMotion({type:'marker',id:1}),start:.2,end:1}];
 const play={scene:base,animation};
 assert.equal(evaluateAnimation(play,.2).markers[0].animationLabelOpacity,0);
 assert.equal(evaluateAnimation(play,.3).markers[0].animationLabelOpacity,.4999999999999999);
 assert.equal(evaluateAnimation(play,.4).markers[0].animationLabelOpacity,1);
 assert.equal(evaluateAnimation(play,.3).markers[0].label,'New');
 animation.steps[0].poses.find(pose=>pose.type==='marker'&&pose.id===1)!.label='Old';pose.label=null;
 assert.ok(Math.abs(evaluateAnimation(play,.3).markers[0].animationLabelOpacity!-.5)<.0001);
 assert.equal(evaluateAnimation(play,1).markers[0].label,undefined);
});
test('Jump label additions and removals follow the object cut, fade and shrink',()=>{
 const base=scene();base.markers[0].label=undefined;const animation=appendAnimationStep(createAnimation(base));animation.steps[1].poses[0].label='New';
 const motion={...defaultMotion({type:'marker' as const,id:1}),path:'jump' as const,start:.2,jumpDuration:.4};animation.transitions[0].motions=[motion];
 const play={scene:base,animation};
 for(const effect of ['cut','fade','shrink'] as const){animation.transitions[0].motions[0].jumpEffect=effect;
  assert.equal(evaluateAnimation(play,.19).markers[0].label,undefined);
  assert.equal(evaluateAnimation(play,effect==='cut'?.2:.41).markers[0].label,'New');
 }
});

test('name-only edits enable animation settings and legacy Jump labels retain their scene fallback',()=>{
 const base=scene();base.markers[0].label='Static';const animation=appendAnimationStep(createAnimation(base));
 animation.steps[1].poses[0].name='Renamed';assert.equal(animationTargetChanged(animation,1,{type:'marker',id:1}),true);
 for(const step of animation.steps){delete step.poses[0].label;delete step.poses[0].name;}
 animation.transitions[0].motions=[{...defaultMotion({type:'marker',id:1}),path:'jump'}];
 assert.equal(evaluateAnimation({scene:base,animation},.2).markers[0].label,'Static');
});

test('Custom motion can leave and return to an unchanged step position',()=>{
 const base=scene(),animation=appendAnimationStep(createAnimation(base));animation.transitions[0].motions=[{...defaultMotion({type:'marker',id:1}),path:'custom',points:[{x:100,y:-50}],smooth:false}];
 const mid=evaluateAnimation({scene:base,animation},.5).markers[0];assert.ok(mid.x>150);assert.equal(evaluateAnimation({scene:base,animation},1).markers[0].x,100);
});

test('deleted elements use Jump and honor cut, fade and shrink removal timing',()=>{
 const base=scene(),animation=appendAnimationStep(createAnimation(base)),live=structuredClone(base);live.markers.shift();
 const saved=captureAnimationEdits(base,live,animation,1);const motion=saved.animation.transitions[0].motions.find(item=>item.type==='marker'&&item.id===1)!;assert.equal(motion.path,'jump');assert.equal(motion.jumpEffect,'cut');
 motion.start=.2;motion.jumpDuration=.4;
 for(const effect of ['cut','fade','shrink'] as const){motion.jumpEffect=effect;assert.ok(evaluateAnimation(saved,.1).markers.some(item=>item.id===1));const middle=evaluateAnimation(saved,.4).markers.find(item=>item.id===1);if(effect==='cut')assert.equal(middle,undefined);else assert.ok(Math.abs((effect==='fade'?middle!.animationOpacity:middle!.animationScale)!-.5)<.00001);assert.equal(evaluateAnimation(saved,.8).markers.some(item=>item.id===1),false);}
});
