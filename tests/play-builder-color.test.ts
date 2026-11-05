import test from 'node:test';
import assert from 'node:assert/strict';
import {perceptualColorTransition,fabricTintMatrix} from '../src/lib/play-builder-color';
test('color transitions interpolate in OKLab with exact endpoints and neutral handling',()=>{
 assert.equal(perceptualColorTransition('#ff0000','#0000ff',.5),'rgb(140, 83, 162)');
 assert.equal(perceptualColorTransition('#ff0000','#00ff00',.5),'rgb(208, 168, 0)');
 assert.equal(perceptualColorTransition('#000000','#ffffff',.5),'rgb(99, 99, 99)');
 assert.equal(perceptualColorTransition('#ffffff','#0000ff',1),'rgb(0, 0, 255)');
 assert.equal(perceptualColorTransition('#ff0000','#0000ff',-1),'rgb(255, 0, 0)');
 assert.equal(perceptualColorTransition('#ff0000','#0000ff',2),'rgb(0, 0, 255)');
 assert.equal(perceptualColorTransition('#ff0000','#0000ff',.5),perceptualColorTransition('#0000ff','#ff0000',.5));
});
test('fabric tint maps its reference color to the animated color and preserves neutral details',()=>{
 const matrix=fabricTintMatrix('#ff0000','rgb(0, 255, 0)').split(' ').map(Number);
 const apply=(rgb:number[])=>[0,1,2].map(row=>matrix.slice(row*5,row*5+3).reduce((n,value,col)=>n+value*rgb[col],matrix[row*5+4]));
 const near=(actual:number[],expected:number[])=>actual.forEach((value,i)=>assert.ok(Math.abs(value-expected[i])<.00001));
 near(apply([1,0,0]),[0,1,0]);near(apply([1,1,1]),[1,1,1]);near(apply([.2,.2,.2]),[.2,.2,.2]);
});
