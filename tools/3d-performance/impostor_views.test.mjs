import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseImpostorFrame } from './impostor_views.mjs';
const metadata={atlas:{size_px:[2080,1040]},frames:Array.from({length:8},(_,i)=>({name:`angle_${String(i).padStart(2,'0')}.png`,yaw_degrees:i*45,atlas_rect_px:[(i%4)*520+4,Math.floor(i/4)*520+4,512,512]}))};
test('direction wraps at 360 and negative values',()=>{
 assert.equal(chooseImpostorFrame(359,metadata).yaw_degrees,0);
 assert.equal(chooseImpostorFrame(-1,metadata).yaw_degrees,0);
 assert.equal(chooseImpostorFrame(47,metadata).yaw_degrees,45);
});
test('UV tiles preserve 4px padding and top-to-bottom flip',()=>{
 const p=chooseImpostorFrame(0,metadata);
 assert.equal(p.u0,4/2080);
 assert.equal(p.v1,1-4/1040);
 assert.equal(p.u1,516/2080);
});
test('invalid metadata fails safely',()=>{
 assert.throws(()=>chooseImpostorFrame(NaN,metadata),TypeError);
 assert.throws(()=>chooseImpostorFrame(45,{}),TypeError);
});
