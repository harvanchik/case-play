import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnimationController, type AnimationControllerState } from '../src/lib/play-builder-animation-controller';
type Scene = { x: number };
type Animation = { poses: number[]; durations: number[] };
function fixture() {
	let scene: Scene = { x: 0 },
		state: AnimationControllerState<Scene, Animation> = {
			animation: { poses: [0, 100, 200], durations: [1, 1] },
			baseScene: { x: 0 },
			step: 0,
			time: 0,
			preview: false,
			playing: false,
			shuttleRate: 0,
			rate: 1,
			loop: false,
			open: false
		};
	let now = 0,
		id = 0,
		checkpoints = 0,
		editable = true;
	const frames = new Map<number, (now: number) => void>();
	const stepTime = (a: Animation, i: number) => a.durations.slice(0, i).reduce((s, v) => s + v, 0),
		duration = (a: Animation) => a.durations.reduce((s, v) => s + v, 0);
	const c = createAnimationController<Scene, Animation>({
		read: () => state,
		write: (patch) => (state = { ...state, ...patch }),
		scene: () => structuredClone(scene),
		applyScene: (next) => (scene = next),
		cloneScene: structuredClone,
		cloneAnimation: structuredClone,
		capture: (base, current, a, step) => {
			const next = structuredClone(a);
			next.poses[step] = current.x;
			return { scene: structuredClone(base), animation: next };
		},
		create: (current) => ({ poses: [current.x], durations: [] }),
		evaluate: (_base, a, t) => {
			let i = 0;
			while (i < a.durations.length && t >= stepTime(a, i + 1)) i++;
			const fraction = i === a.durations.length ? 0 : (t - stepTime(a, i)) / a.durations[i];
			return { x: a.poses[i] + ((a.poses[i + 1] ?? a.poses[i]) - a.poses[i]) * fraction };
		},
		stepScene: (_base, a, i) => ({ x: a.poses[i] }),
		stepCount: (a) => a.poses.length,
		stepTime,
		duration,
		checkpoint: () => checkpoints++,
		editable: () => editable,
		clock: {
			now: () => now,
			request: (callback) => {
				frames.set(++id, callback);
				return id;
			},
			cancel: (frame) => {
				frames.delete(frame);
			}
		}
	});
	return {
		c,
		get state() {
			return state;
		},
		get scene() {
			return scene;
		},
		get checkpoints() {
			return checkpoints;
		},
		get frames() {
			return frames.size;
		},
		patch(p: Partial<typeof state>) {
			state = { ...state, ...p };
		},
		edit(x: number) {
			scene = { x };
		},
		readonly() {
			editable = false;
		},
		advance(ms: number) {
			now += ms;
			const callbacks = [...frames.values()];
			frames.clear();
			callbacks.forEach((callback) => callback(now));
		}
	};
}
test('step edits affect their selected pose and preview never captures evaluated positions', () => {
	const f = fixture();
	f.edit(20);
	f.c.selectStep(1);
	assert.deepEqual(f.state.animation!.poses, [20, 100, 200]);
	const before = structuredClone(f.state.animation);
	f.c.seek(0.5);
	assert.equal(f.scene.x, 60);
	assert.equal(f.state.preview, true);
	f.c.commit();
	assert.deepEqual(f.state.animation, before);
	f.c.selectStep(0);
	assert.equal(f.scene.x, 20);
	assert.equal(f.state.preview, false);
});
test('exact seeks select editable steps, while replacement does not capture an old step over a new pose', () => {
	const f = fixture();
	f.c.seek(1);
	assert.equal(f.state.step, 1);
	assert.equal(f.state.preview, false);
	f.c.replace({ poses: [0, 300, 400], durations: [1, 1] }, 1);
	assert.equal(f.scene.x, 300);
	assert.equal(f.checkpoints, 1);
	f.c.seek(0.25);
	assert.equal(f.state.preview, true);
	assert.equal(f.c.selectStep(9), false);
});
test('elapsed-time playback uses preview speed and selects the final editable step on completion', () => {
	const f = fixture();
	f.c.togglePlayback();
	f.advance(250);
	assert.equal(f.state.time, 0.25);
	assert.equal(f.scene.x, 25);
	f.patch({ rate: 2 });
	f.advance(250);
	assert.equal(f.state.time, 0.75);
	f.advance(1000);
	assert.equal(f.state.time, 2);
	assert.equal(f.state.step, 2);
	assert.equal(f.state.preview, false);
	assert.equal(f.state.playing, false);
	assert.equal(f.frames, 0);
	f.c.togglePlayback();
	assert.equal(f.state.time, 0);
	assert.equal(f.state.playing, true);
	f.c.dispose();
	assert.equal(f.frames, 0);
});
test('looping, temporary 2x shuttle and release preserve configured playback speed', () => {
	const f = fixture();
	f.patch({ rate: 0.5, loop: true });
	f.c.togglePlayback();
	f.advance(1000);
	assert.equal(f.state.time, 0.5);
	f.c.shuttle(1);
	f.advance(500);
	assert.equal(f.state.time, 1.5);
	f.c.shuttle(0);
	f.advance(500);
	assert.equal(f.state.time, 1.75);
	f.c.shuttle(-1);
	f.advance(500);
	assert.equal(f.state.time, 0.75);
	f.c.shuttle(0);
	assert.equal(f.state.rate, 0.5);
	f.advance(3000);
	assert.equal(f.state.time, 0.25);
	f.c.pause();
	assert.equal(f.frames, 0);
});
test('paused shuttling clamps at endpoints and selects an exact step on release', () => {
	const f = fixture();
	f.c.shuttle(1);
	f.advance(500);
	assert.equal(f.state.time, 1);
	assert.equal(f.state.playing, false);
	f.c.shuttle(0);
	assert.equal(f.state.step, 1);
	assert.equal(f.state.preview, false);
	f.c.shuttle(-1);
	f.advance(2000);
	assert.equal(f.state.time, 0);
	f.c.shuttle(0);
	assert.equal(f.state.step, 0);
	assert.equal(f.frames, 0);
});
test('readonly viewing cannot create or replace animations and a static Start never schedules frames', () => {
	const f = fixture();
	f.readonly();
	assert.equal(f.c.open(), false);
	assert.equal(f.c.replace({ poses: [4], durations: [] }), false);
	assert.equal(f.checkpoints, 0);
	f.c.seek(1);
	assert.equal(f.scene.x, 100);
	const g = fixture();
	g.patch({ animation: undefined });
	assert.equal(g.c.open(), true);
	assert.deepEqual(g.state.animation, { poses: [0], durations: [] });
	g.c.togglePlayback();
	g.c.shuttle(1);
	assert.equal(g.frames, 0);
	g.c.close();
	assert.equal(g.state.open, false);
});

test('variable-speed shuttle preserves pause/play state and switches without an initial jump',()=>{
 const f=fixture();f.patch({rate:1.25});f.c.shuttle(1,1.25);assert.equal(f.state.time,0);f.advance(400);assert.equal(f.state.time,.5);f.c.shuttle(1,2);assert.equal(f.state.time,.5);f.advance(250);assert.equal(f.state.time,1);f.c.shuttle(-1,1.25);f.advance(400);assert.equal(f.state.time,.5);f.c.shuttle(0);assert.equal(f.state.playing,false);assert.equal(f.frames,0);
 f.c.togglePlayback();f.c.shuttle(1,2);assert.equal(f.frames,1);f.advance(250);f.c.shuttle(0);f.advance(400);assert.equal(f.state.time,1.5);assert.equal(f.state.playing,true);assert.equal(f.state.rate,1.25);f.c.dispose();
});
