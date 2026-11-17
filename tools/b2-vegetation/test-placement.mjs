import assert from 'node:assert/strict';
import {planB2Vegetation} from './placement.mjs';

const base={seed:20261117,tileKey:'f2:17:23',surface:'wet_rock',
 bounds:{minX:-2,maxX:2,minZ:-2,maxZ:2,y:0},
 reserved:[{x:0,z:0,radius:.7}]};
const make=()=>planB2Vegetation(base);
assert.deepEqual(make(),make(),'seeded placement must be reproducible');
for(const p of make()){
 assert(p.x-p.radius>=base.bounds.minX && p.x+p.radius<=base.bounds.maxX);
 assert(p.z-p.radius>=base.bounds.minZ && p.z+p.radius<=base.bounds.maxZ);
 assert(Math.hypot(p.x,p.z)>=p.radius+.7,'must avoid occupied landmark center');
}
for(const surface of ['water','ice_smooth','walkway','door','stairs']){
 assert.deepEqual(planB2Vegetation({...base,surface}),[],'plant cannot spawn on '+surface);
}
assert.deepEqual(planB2Vegetation({...base,bounds:{minX:0,maxX:0,minZ:0,maxZ:0,y:0}}),[]);
console.log('B2_VEGETATION_PLACEMENT_TEST_OK',make().length,'plant instances');
