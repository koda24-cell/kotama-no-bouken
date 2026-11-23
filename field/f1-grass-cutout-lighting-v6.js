/* Crossed grass cards: both faces represent the same upward leaf canopy. */
import * as THREE from 'three';
export function grassCutoutMaterialV6(original){
 const material=original.clone();material.name=original.name+':canopy-lighting';
 material.color.multiplyScalar(.78);material.alphaToCoverage=true;
 material.customProgramCacheKey=()=> 'f1-v6-grass-two-sided-canopy-r180';
 material.onBeforeCompile=shader=>{
  const chunk=THREE.ShaderChunk.normal_fragment_begin;
  if(!chunk.includes('normal *= faceDirection;'))throw Error('Unsupported grass normal shader chunk');
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',chunk.replace('normal *= faceDirection;','normal = normalize(normal);'));
 };
 return material;
}
