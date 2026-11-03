import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupYardPositions} from '../src/lib/play-builder-setups';
const field={total:100,aGoal:10,bGoal:90},standard={lineOfScrimmage:24,lineToGain:30,quarterbackDepth:5};
test('special setups place officials on the required yard lines',()=>{
 const short=setupYardPositions('short-yardage',field,standard);assert.equal(short.ltg-short.los,6);assert.equal(short.fieldJudge,short.ltg);assert.equal(short.fourthDown,true);
 const goal=setupYardPositions('goal-line',field,standard);assert.equal(goal.los,80);assert.equal(goal.fieldJudge,90);assert.equal(goal.backJudge,100);
 const reverse=setupYardPositions('reverse-goal-line',field,standard);assert.equal(reverse.los,17);assert.equal(reverse.referee,0);assert.equal(reverse.fieldJudge,27);assert.equal(reverse.backJudge,37);
 const punt=setupYardPositions('punt',field,standard);assert.equal(punt.los,40);assert.equal(punt.receiver,70);assert.equal(punt.fieldJudge,65);assert.equal(punt.backJudge,73);assert.equal(punt.depth,7);
});
test('referee goal-line exception and smaller fields remain in bounds',()=>{
 const r=setupYardPositions('default',field,{...standard,lineOfScrimmage:21});assert.equal(r.referee,10);assert.equal(r.wideReferee,true);
 for(const variant of ['short-yardage','goal-line','reverse-goal-line','punt'] as const){const p=setupYardPositions(variant,{total:60,aGoal:10,bGoal:50},standard);assert.ok(p.los>10&&p.los<50);assert.ok(p.backJudge<=60);assert.ok(p.fieldJudge<=50);}
});
