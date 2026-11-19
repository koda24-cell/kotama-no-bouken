import assert from 'node:assert/strict';
import {installMeadowV8Look} from './meadow-v8-enhancement.mjs';
const meshes=Array.from({length:8},(_,i)=>{
 const mat={roughness:0.6,metalness:0.1,emissive:{r:1,g:1,b:1,setRGB(r,g,b){this.r=r;this.g=g;this.b=b;}},emissiveIntensity:1,onBeforeCompile(shader){shader.vertexShader='attribute float aWindHeight,aPlantPhase;\n'+shader.vertexShader;},customProgramCacheKey(){return 'v7';}};
 return {isMesh:true,name:'V7-'+i,userData:{originalV7Material:{}},material:mat};
});
const root={traverse(fn){meshes.forEach(fn)}};
const look=installMeadowV8Look(root,{x:-3,y:6,z:4});
assert.equal(look.matched,8);
assert.equal(look.uniforms.uKotamaEnhance.value,1);
look.setEnhanced(false);
assert.equal(look.uniforms.uKotamaEnhance.value,0);
look.setEnhanced(true);
assert.equal(look.uniforms.uKotamaEnhance.value,1);
for(const mesh of meshes){
 const shader={uniforms:{},vertexShader:'#include <begin_vertex>\n',fragmentShader:'#include <color_fragment>\n#include <lights_fragment_end>\n'};
 mesh.material.onBeforeCompile(shader);
 assert.match(shader.vertexShader,/vKotamaWorldNormal/);
 assert.match(shader.fragmentShader,/diffuseColor\.rgb\*=mix/);
 assert.match(shader.fragmentShader,/reflectedLight\.indirectDiffuse/);
 assert.ok(shader.uniforms.uKotamaEnhance===look.uniforms.uKotamaEnhance);
 assert.equal(mesh.material.metalness,0);
 assert.deepEqual([mesh.material.emissive.r,mesh.material.emissive.g,mesh.material.emissive.b],[0,0,0]);
 assert.equal(mesh.material.emissiveIntensity,0);
 assert.ok(mesh.material.roughness>=0.88);
 assert.match(mesh.material.customProgramCacheKey(),/meadow-v8-look/);
}
assert.throws(()=>installMeadowV8Look({traverse(fn){meshes.slice(0,7).forEach(fn)}},{x:1,y:1,z:1}),/expected 8/);
assert.throws(()=>installMeadowV8Look(root,{x:0,y:0,z:0}),/zero sun/);
console.log('F6 V8 shader injection and non-destructive material regression: PASS');
