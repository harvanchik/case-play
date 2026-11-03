import assert from 'node:assert/strict';
import test from 'node:test';
import { renamePlayerLetter, playerLetter } from '../src/lib/play-builder-player-letters';
import { createAnimation, appendAnimationStep } from '../src/lib/play-builder-animation';
import {
	encodePlayBuilderDocument,
	decodePlayBuilderDocument,
	defaultPlayBuilderFieldSettings,
	type PlayBuilderScene
} from '../src/lib/play-builder-scene';
test('custom letters round trip and rename all animation poses without changing manual names or officials', () => {
	const scene: PlayBuilderScene = {
		markers: [
			{ id: 1, kind: 'team-a', label: 'A-1', x: 10, y: 20 },
			{ id: 2, kind: 'team-a', label: 'QB', x: 20, y: 30 },
			{ id: 3, kind: 'official-r', label: 'R', x: 30, y: 40 }
		],
		paths: [],
		guides: [],
		freeStrokes: [],
		layerOrder: []
	};
	const original = { name: 'Test', scene, settings: defaultPlayBuilderFieldSettings(), animation: appendAnimationStep(createAnimation(scene)) };
	const renamed = renamePlayerLetter(original, 'team-a', 'X');
	assert.equal(playerLetter(renamed.settings, 'team-a'), 'X');
	assert.equal(original.scene.markers[0].label, 'A-1');
	assert.equal(renamed.scene.markers[0].label, 'X-1');
	assert.equal(renamed.scene.markers[1].label, 'QB');
	assert.equal(renamed.scene.markers[2].label, 'R');
	for (const step of renamed.animation.steps) assert.equal(step.poses.find((p) => p.id === 1 && p.type === 'marker')!.label, 'X-1');
	const saved = decodePlayBuilderDocument(encodePlayBuilderDocument({ activePlayIndex: 0, plays: [renamed] }));
	assert.equal(saved.plays[0].settings.playerLetters, 'XBKR');
	assert.equal(saved.plays[0].scene.markers[0].label, 'X-1');
	const old = decodePlayBuilderDocument(encodePlayBuilderDocument({ activePlayIndex: 0, plays: [original] }));
	assert.equal(playerLetter(old.plays[0].settings, 'team-a'), 'A');
});
