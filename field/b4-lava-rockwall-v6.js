import * as THREE from 'three';
import {createB4LavaRockwallV5} from './b4-lava-rockwall-v5.js';
// Pinterest-guided additive V6: basalt cliff masses, fractured plates and recessed lava.
export function createB4LavaRockwallV6(){
 const root=createB4LavaRockwallV5();root.name='b4:lava-rockwall-v6-pinterest';
 let seed=61117;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const stones=[0x292829,0x363132,0x423a38,0x1d2021].map(color=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true}));
 const black=new THREE.MeshStandardMaterial({color:0x100d0d,roughness:1});
 const ember=new THREE.MeshStandardMaterial({color:0xff6a17,emissive:0xff4006,emissiveIntensity:3.5,roughness:.6});
 const core=new THREE.MeshStandardMaterial({color:0xffbc46,emissive:0xff910e,emissiveIntensity:4.5,roughness:.5});
 const add=(g,m,p)=>{const o=new THREE.Mesh(g,m);o.position.set(...p);root.add(o);return o};
 // Huge vertically fractured basalt columns, nonuniform width, sheared polygonal faces.
 const masses=[[-3.75,2.6,.66,2.0],[-2.75,3.55,.9,2.85],[-1.52,4.35,.82,3.45],[-.22,4.7,1.0,3.8],[1.3,4.55,.85,3.65],[2.65,3.25,.85,2.65],[3.75,2.1,.7,1.75]];
 masses.forEach(([x,y,w,h],i)=>{
   const g=new THREE.CylinderGeometry(w*.75,w,h,7,7);
   const a=g.attributes.position;for(let j=0;j<a.count;j++){const yy=a.getY(j);const xx=a.getX(j);const zz=a.getZ(j);const n=.13*Math.sin(yy*3.1+xx*5.3+i)+.075*Math.sin(yy*8.7+zz*3.2+i*2);a.setXYZ(j,xx+n*.65,yy,zz+n);}
   g.computeVertexNormals();const m=add(g,stones[i%4],[x,y,4.17+rand()*.12]);m.scale.z=.62+rand()*.23;m.rotation.z=(rand()-.5)*.17;
 });
 // Fractured slab chips create silhouette breaks without a regular brick pattern.
 for(let i=0;i<62;i++){const x=-4.2+rand()*8.4,y=.4+rand()*6.1,r=.13+rand()*.32;
 const m=add(new THREE.DodecahedronGeometry(r,i%4===0?1:0),stones[(i+1)%4],[x,y,4.52+rand()*.26]);
 m.scale.set(.65+rand()*.85,1.0+rand()*1.2,.24+rand()*.35);m.rotation.set(rand()*.3,rand()*.6,(rand()-.5)*.8)}
 // Lava pools: dark crust pieces float over glowing interior, irregular and recessed in stone.
 const pool=add(new THREE.CylinderGeometry(1.48,1.65,.08,23),ember,[-.75,.27,4.65]);pool.scale.z=.5;
 for(let i=0;i<16;i++){const angle=rand()*Math.PI*2,r=.2+rand()*1.2;
 const x=-.75+Math.cos(angle)*r,y=.3+Math.sin(angle)*r*.25;
 const m=add(new THREE.DodecahedronGeometry(.11+rand()*.25,0),stones[i%4],[x,y,4.79]);m.scale.set(1.4,.35,.8)}
 // Light leakage inside discontinuous fissures, not continuous neon cylinders.
 const fissures=[[[-2.15,5.9],[-1.95,5.3],[-2.06,4.7],[-1.78,4.05],[-1.9,3.45]],[[-1.78,4.05],[-1.25,3.55],[-.85,3.05],[-.35,2.65]],[[1.25,4.9],[1.08,4.25],[1.32,3.55],[1.18,2.95]]];
 for(const path of fissures)for(let j=1;j<path.length;j++){const [x1,y1]=path[j-1],[x2,y2]=path[j];const len=Math.hypot(x2-x1,y2-y1);const p=[(x1+x2)/2,(y1+y2)/2,4.85];
 const dark=add(new THREE.BoxGeometry(.22+rand()*.16,len,.055),black,p);dark.rotation.z=-Math.atan2(x2-x1,y2-y1);
 const bright=add(new THREE.BoxGeometry(.06+rand()*.12,len*.72,.06),j%3===0?core:ember,[p[0],p[1],4.9]);bright.rotation.z=dark.rotation.z;}
 root.userData={floor:4,asset:'lava-rockwall',version:6,source:'Pinterest references 980307043871859813,1084171310324835975,1109363320821023222',status:'review',gameIntegrated:false};return root;
}
