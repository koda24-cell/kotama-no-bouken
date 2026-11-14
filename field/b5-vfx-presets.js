/* Shared low-cost VFX presets for floor 5; optional visual-only effects. */
import * as THREE from 'three';
export function createB5ArcaneSparks({count=42,seed=505}={}) {
  const n=Math.max(0,Math.min(96,count)), positions=new Float32Array(n*3);
  let state=seed>>>0;
  const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
  for(let i=0;i<n;i++){positions[i*3]=(random()-.5)*12;positions[i*3+1]=random()*4;positions[i*3+2]=(random()-.5)*12;}
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const material=new THREE.PointsMaterial({color:0x9a64e9,size:.055,transparent:true,opacity:.48,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
  const points=new THREE.Points(geometry,material);points.name='b5:arcane-sparks';
  return {points,update(time,cameraPosition){
    if(cameraPosition)points.position.copy(cameraPosition).setY(0);
    material.opacity=.36+.12*Math.sin(time*.7);
    points.rotation.y=time*.025;
  },dispose(){geometry.dispose();material.dispose();}};
}
