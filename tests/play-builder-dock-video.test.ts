import test from 'node:test';
import assert from 'node:assert/strict';
import {ANIMATION_DOCK_KEY,readLockedDock,saveLockedDock} from '../src/lib/play-builder-dock-preference';
import {videoFramePlan} from '../src/lib/play-builder-video-timing';

test('dock preferences validate geometry and clear on unlock without requiring browser storage',()=>{
 const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};
 const dock={locked:true as const,x:125,y:270,width:620};saveLockedDock(storage,dock);assert.deepEqual(readLockedDock(storage),dock);
 saveLockedDock(storage,null);assert.equal(readLockedDock(storage),null);
 for(const value of ['invalid','null','{"locked":true,"width":-20,"x":0,"y":0}','{"locked":false,"width":600,"x":0,"y":0}']){values.set(ANIMATION_DOCK_KEY,value);assert.equal(readLockedDock(storage),null);}
 assert.equal(readLockedDock({getItem:()=>{throw Error('blocked');}}),null);
 assert.doesNotThrow(()=>saveLockedDock({setItem:()=>{throw Error('blocked');},removeItem:()=>{throw Error('blocked');}},dock));
});

test('video and GIF schedules hold the exact final pose for one additional second',()=>{
 for(const fps of [15,30])for(const duration of [.1,1,5.75,60]){
  const plan=videoFramePlan(duration,fps);
  assert.equal(plan.frames,Math.ceil(duration*fps)+fps);
  assert.equal(plan.time(plan.authoredFrames-1)<duration,true);
  assert.deepEqual(Array.from({length:fps},(_,i)=>plan.time(plan.authoredFrames+i)),Array(fps).fill(duration));
 }
});


test('play clock defaults follow the field and its toggle survives document round trips',async()=>{
 const {playBuilderPlayClockSeconds:clock,defaultPlayBuilderFieldSettings,encodePlayBuilderDocument,decodePlayBuilderDocument}=await import('../src/lib/play-builder-scene');
 assert.equal(clock('traditional'),25);assert.equal(clock('nfl-flag'),40);assert.equal(clock('traditional',1.99),24);assert.equal(clock('nfl-flag',80),0);
 for(const showPlayClock of [true,false]){
  const document={activePlayIndex:0,plays:[{name:'Clock',scene:{markers:[],paths:[],guides:[],freeStrokes:[],layerOrder:[]},settings:{...defaultPlayBuilderFieldSettings(),showPlayClock}}]};
  assert.equal(decodePlayBuilderDocument(encodePlayBuilderDocument(document)).plays[0].settings.showPlayClock,showPlayClock);
 }
});


test('edited play clock seconds round-trip and old documents enable the clock by default',async()=>{
 const {defaultPlayBuilderFieldSettings,encodePlayBuilderDocument,decodePlayBuilderDocument}=await import('../src/lib/play-builder-scene');
 const document={activePlayIndex:0,plays:[{name:'Clock',scene:{markers:[],paths:[],guides:[],freeStrokes:[],layerOrder:[]},settings:{...defaultPlayBuilderFieldSettings(),playClockSeconds:17}}]};
 const saved=encodePlayBuilderDocument(document);assert.equal(decodePlayBuilderDocument(saved).plays[0].settings.playClockSeconds,17);
 saved.p[0][2]![0]&=8191;assert.equal(decodePlayBuilderDocument(saved).plays[0].settings.showPlayClock,true);
});
