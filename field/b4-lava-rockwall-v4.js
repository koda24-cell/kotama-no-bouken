import * as THREE from 'three';
import {createB4LavaRockwallV3} from './b4-lava-rockwall-v3.js';
// Additive V4 wall modules: V3 is preserved, no runtime references changed.
export function createB4LavaRockwallV4({magma=false}={}){
 const root=createB4LavaRockwallV3();root.name=magma?'b4:rockwall-v4-magma':'b4:rockwall-v4-dry';
 const stone=[0x302d2c,0x403934,0x292a2a,0x51443a].map(color=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true}));
 const dark=new THREE.MeshStandardMaterial({color:0x161617,roughness:1});
 const glow=new THREE.MeshStandardMaterial({color:0xff6d24,emissive:0xff3a08,emissiveIntensity:2.7,roughness:.75});
 let seed=40321;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const add=(geometry,material,x,y,z)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);root.add(mesh);return mesh};
 // Uneven overlapping boulder volumes hide the original columnar outlines without removing them.
 for(let i=0;i<32;i++){
   const x=-4.3+rand()*8.6,y=.35+rand()*5.45,z=2.05+rand()*.32;
   const radius=.38+rand()*.77;
   const mesh=add(new THREE.DodecahedronGeometry(radius,1),stone[i%stone.length],x,y,z);
   mesh.scale.set(.8+rand()*.9,.7+rand()*.75,.42+rand()*.55);
   mesh.rotation.set(rand()*.8,rand()*2,rand()*.9);
 }
 // Irregular, thick stratified ledges: do not use pointed cones.
 for(let i=0;i<13;i++){
   const x=-4.15+i*.68+(rand()-.5)*.28;
   const mesh=add(new THREE.DodecahedronGeometry(.55+rand()*.35,0),stone[(i+1)%4],x,5.15+rand()*.55,2.28+rand()*.32);
   mesh.scale.set(1.15+rand()*.65,.42+rand()*.5,.65+rand()*.35);
   mesh.rotation.set(rand()*.3,rand()*.6,rand()*.3);
 }
 // Broad irregular fracture edges are recessed into rock, with variable-width lava cores.
 // Dry variant gets dark fractured basalt instead of glowing seams.
 const faults=[
 [[-1.75,5.6],[-1.62,5.0],[-1.77,4.38],[-1.65,3.8],[-1.9,3.12],[-1.72,2.48],[-1.92,1.75]],
 [[.6,4.9],[.72,4.25],[.54,3.62],[.68,2.96]]
 ];
 for(const [fi,pts] of faults.entries()){
  for(let j=1;j<pts.length;j++){
   const [ax,ay]=pts[j-1],[bx,by]=pts[j];
   const dx=bx-ax,dy=by-ay,dist=Math.hypot(dx,dy),width=(fi===0?.17:.09)*(1+.35*Math.sin(j*1.7));
   const center=new THREE.Vector3((ax+bx)/2,(ay+by)/2,2.75);
   const channel=add(new THREE.CylinderGeometry(width*1.7,width*1.5,dist+.07,10),dark,center.x,center.y,center.z);
   channel.rotation.z=-Math.atan2(dx,dy);
   if(magma){
    const core=add(new THREE.CylinderGeometry(width*.8,width*.6,dist+.035,10),glow,center.x,center.y,center.z+.12);
    core.rotation.z=channel.rotation.z;
   }
  }
 }
 // Wall seam extents remain within approximately 9 units for tiled dungeon placement.
 root.userData={floor:4,asset:'lava-rockwall',version:4,variant:magma?'magma':'dry',status:'review',gameIntegrated:false};
 return root;
}
