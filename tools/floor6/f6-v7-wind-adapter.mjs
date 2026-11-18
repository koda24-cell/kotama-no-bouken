/** Adapter for the verified V7 GLB primitive layout, experimental only.
 * Assumptions from downloaded run 43602069517: grass primitives 19200 vertices
 * (800 blades x 24), canopy primitives 1760 (110 ribbons x 16).
 * Recheck topology counts before deriving per-blade root/tip weights. */
import * as THREE from 'three';
import {MEADOW_WIND_GLSL} from '../floor6/meadow-wind-field.mjs';
export function windWeightsFromPositions(positions,verticesPerBlade=24){
 if(!positions||positions.length%3||!Number.isInteger(verticesPerBlade)||verticesPerBlade<2)throw Error('invalid positions/stride');
 const count=positions.length/3;
 if(count%verticesPerBlade!==0)throw Error('unexpected V7 topology');
 const weights=new Float32Array(count),phase=new Float32Array(count);
 for(let b=0;b<count/verticesPerBlade;b++){
  let lo=Infinity,hi=-Infinity;
  for(let k=0;k<verticesPerBlade;k++){const y=positions[(b*verticesPerBlade+k)*3+1];if(!Number.isFinite(y))throw Error('nonfinite geometry');lo=Math.min(lo,y);hi=Math.max(hi,y);}
  if(hi-lo<1e-5)throw Error('degenerate blade height');
  for(let k=0;k<verticesPerBlade;k++){
   const i=b*verticesPerBlade+k;
   weights[i]=Math.max(0,Math.min(1,(positions[i*3+1]-lo)/(hi-lo)));
   phase[i]=b*.6180339887;
  }
 }
 return {weights,phase,blades:count/verticesPerBlade};
}
export function enableV7MeadowWind(root){
 const uniforms={uWindTime:{value:0},uWindStrength:{value:1},uWindDirection:{value:new THREE.Vector2(Math.cos(32*Math.PI/180),Math.sin(32*Math.PI/180))}};
 const matched=[];
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const name=mesh.name.toLowerCase();
  const grass=name.includes('meadow_grass')||name.startsWith('grass');
  const canopy=name.includes('meadow_canopy')||name.startsWith('canopy_ribbon');
  if(!grass&&!canopy)return;
  const stride=grass?24:16,geo=mesh.geometry;
  const expected=grass?19200:1760;
  if(geo.attributes.position.count!==expected)throw Error('V7 mesh topology mismatch: '+mesh.name+' got '+geo.attributes.position.count);
  const {weights,phase,blades}=windWeightsFromPositions(geo.attributes.position.array,stride);
  geo.setAttribute('aWindHeight',new THREE.Float32BufferAttribute(weights,1));
  geo.setAttribute('aPlantPhase',new THREE.Float32BufferAttribute(phase,1));
  const original=mesh.material;
  const materials=Array.isArray(original)?original:[original];
  const updated=materials.map(src=>{
   const mat=src.clone();mat.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=`uniform float uWindTime,uWindStrength;uniform vec2 uWindDirection;
attribute float aWindHeight,aPlantPhase;
${MEADOW_WIND_GLSL}
`+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
vec3 worldWindPosition=(modelMatrix*vec4(position,1.0)).xyz;
vec2 windDelta=kotamaMeadowWind(worldWindPosition.xz,aWindHeight,uWindTime,aPlantPhase,1.0,uWindDirection);
transformed.xz+=windDelta*uWindStrength;`);
   };
   mat.customProgramCacheKey=()=> 'kotama-v7-meadow-wind-v1';
   return mat;
  });
  mesh.userData.originalV7Material=original;
  mesh.material=Array.isArray(original)?updated:updated[0];
  mesh.frustumCulled=false; // prevent old static bounds from clipping animated tips; revisit with dynamic bounds.
  matched.push({name:mesh.name,blades,vertices:geo.attributes.position.count});
 });
 if(matched.length!==8)throw Error('expected 8 V7 grass/canopy primitives; found '+matched.length);
 return {matched,uniforms,update(t,amplitude=1){
  if(!Number.isFinite(t)||!Number.isFinite(amplitude))throw Error('nonfinite time/strength');
  uniforms.uWindTime.value=t;uniforms.uWindStrength.value=amplitude;
 }};
}
