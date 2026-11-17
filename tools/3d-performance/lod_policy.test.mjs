import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseLOD, classifyCells } from './lod_policy.mjs';

test('high quality retained at close range and different distant screen sizes',()=>{
  assert.equal(chooseLOD({projectedPixels:400}),0);
  assert.equal(chooseLOD({projectedPixels:5,previous:2}),2);
  assert.equal(chooseLOD({projectedPixels:90,previous:2}),1);
});
test('hysteresis avoids LOD flickering at thresholds',()=>{
  assert.equal(chooseLOD({projectedPixels:195,previous:0}),0);
  assert.equal(chooseLOD({projectedPixels:195,previous:1}),1);
  assert.equal(chooseLOD({projectedPixels:219,previous:1}),1);
  assert.equal(chooseLOD({projectedPixels:225,previous:1}),0);
  assert.equal(chooseLOD({projectedPixels:68,previous:1}),1);
  assert.equal(chooseLOD({projectedPixels:55,previous:1}),2);
});
test('important skyline objects get higher quality at same pixel size',()=>{
  assert.equal(chooseLOD({projectedPixels:160,previous:1}),1);
  assert.equal(chooseLOD({projectedPixels:160,previous:1,important:true}),0);
});
test('prefetch exactly an outer Chebyshev ring and preserve visible cells',()=>{
  const {visible,prefetch}=classifyCells({x:10,y:20,radius:1,prefetchRing:1});
  assert.equal(visible.length,9);
  assert.equal(prefetch.length,16);
  assert.ok(visible.some(p=>p.x===10 && p.y===20));
  assert.equal(new Set([...visible,...prefetch].map(p=>p.x+','+p.y)).size,25);
});
test('reject invalid input',()=>{
  assert.throws(()=>chooseLOD({projectedPixels:-2}),TypeError);
  assert.throws(()=>classifyCells({x:1,y:2,radius:-1}),TypeError);
});
