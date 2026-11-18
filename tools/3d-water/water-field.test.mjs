import assert from 'node:assert/strict';
import {WATER_EDGES,validWaterNeighbor,makeWaterFlowRGBA,makeCausticsRGBA} from './water-field.mjs';
assert.equal(WATER_EDGES.E,2);assert.equal(WATER_EDGES.W,4);
for(let a=0;a<16;a++)for(let b=0;b<16;b++)for(let d of ['N','E','S','W']){
 const opp={N:'S',E:'W',S:'N',W:'E'}[d];
 assert.equal(validWaterNeighbor(a,b,d),Boolean(a&WATER_EDGES[d])===Boolean(b&WATER_EDGES[opp]));
}
assert.throws(()=>validWaterNeighbor(16,1,'N'));
let f=makeWaterFlowRGBA({size:64}),c=makeCausticsRGBA({size:64});
assert.equal(f.data.length,64*64*4);assert.equal(c.data.length,64*64*4);
assert.deepEqual(f.data,makeWaterFlowRGBA({size:64}).data);
assert.deepEqual(c.data,makeCausticsRGBA({size:64}).data);
assert.ok(f.data[3]>f.data[(32*64+32)*4+3]);
assert.ok(f.data[(32*64+32)*4+2]>f.data[2]);
assert.ok(c.data.some((x,i)=>i%4===0&&x>200));
assert.throws(()=>makeWaterFlowRGBA({size:3}));
console.log('Water flow/caustics textures + 16-mask neighbor contract: PASS');