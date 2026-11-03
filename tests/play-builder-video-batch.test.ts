import test from 'node:test';
import assert from 'node:assert/strict';
import { concurrentVideoExports } from '../src/lib/play-builder-video-batch';
test('video exports overlap with a bounded worker count and preserve play order',async()=>{
 const controller=new AbortController();let active=0,max=0;const completed:number[]=[];
 const result=await concurrentVideoExports([0,1,2,3],2,async(value)=>{active++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,value===0?20:1));completed.push(value);active--;return value*2;},controller.signal,error=>controller.abort(error));
 assert.equal(max,2);assert.equal(active,0);assert.notEqual(completed[0],0);assert.deepEqual(result,[0,2,4,6]);
});
test('failed video jobs cancel siblings and settle before editor restoration',async()=>{
 const controller=new AbortController();let active=0;
 await assert.rejects(concurrentVideoExports([0,1,2],2,async(value)=>{active++;try{if(value===0)throw new Error('Encoder failed');await new Promise(resolve=>setTimeout(resolve,10));controller.signal.throwIfAborted();return value;}finally{active--; }},controller.signal,error=>controller.abort(error)),/Encoder failed/);
 assert.equal(active,0);assert.equal(controller.signal.aborted,true);
});
