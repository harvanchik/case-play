import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createKeyboardScrubber} from '../src/lib/play-builder-keyboard-scrub';
const key=(key:string,shiftKey=false)=>({key,shiftKey} as KeyboardEvent);
test('arrows use playback rate without discrete seeks and change speed while held',()=>{
 let rate=1.25;const calls:[number,number|undefined][]=[];
 const c=createKeyboardScrubber(()=>0,()=>10,()=>assert.fail('arrows must not issue discrete seeks'),{rate:()=>rate,change:(direction,speed)=>calls.push([direction,speed])});
 c.keydown(key('ArrowRight'));assert.deepEqual(calls,[[1,1.25]]);c.keydown(key('ArrowRight'));assert.equal(calls.length,1);
 c.modifier(true);assert.deepEqual(calls.at(-1),[1,2]);c.keyup(key('Shift'));assert.deepEqual(calls.at(-1),[1,1.25]);rate=.5;c.modifier(false);assert.deepEqual(calls.at(-1),[1,.5]);
 c.keyup(key('ArrowRight'));assert.deepEqual(calls.at(-1),[0,undefined]);c.keydown(key('ArrowLeft',true));assert.deepEqual(calls.at(-1),[-1,2]);c.modifier(false);assert.deepEqual(calls.at(-1),[-1,.5]);c.stop();assert.deepEqual(calls.at(-1),[0,undefined]);
});
