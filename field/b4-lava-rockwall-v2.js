import * as THREE from 'three';
import {createB4LavaRockwall} from './b4-lava-rockwall.js';
// V2 is strictly additive: the entire V1 wall remains intact.
export function createB4LavaRockwallV2(){
 const root=createB4LavaRockwall();root.name='b4:lava-rockwall-v2';
 const rock=new THREE.MeshStandardMaterial({color:0x29252a,roughness:.96,flatShading:true});
 const ridge=new THREE.MeshStandardMaterial({color:0x413439,roughness:1,flatShading:true});
 const char=new THREE.MeshStandardMaterial({color:0x161719,roughness:1,flatShading:true});
 const lava=new THREE.MeshStandardMaterial({color:0xff5517,emissive:0xff2c03,emissiveIntensity:3,roughness:.45});
 let s=88011;const rnd=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
 function mesh(geo,mat,x,y,z,rx=0,ry=0,rz=0){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);root.add(o);return o}
 // Large continuous slab silhouettes conceal the V1 pebble-grid while retaining its original geometry.
 const columns=[[-3.9,1.85,.85,1.05,2.8,.8],[-2.4,2.6,.65,.92,3.35,1.02],[-.85,2.8,.45,1.25,3.1,.9],[.95,2.6,.42,1.12,3.2,1.05],[2.55,2.25,.7,.95,3.05,.82],[3.85,2.3,.5,.7,3.1,.9]];
 for(let i=0;i<columns.length;i++){const [x,y,z,w,h,d]=columns[i];const geo=new THREE.CylinderGeometry(w*.73,w,h,5,1);mesh(geo,i%2?rock:ridge,x,y,z,0,(rnd()-.5)*.5,(rnd()-.5)*.19).scale.z=d; }
 // Overhang and deep stratification: elongated slabs, not piles of round stones.
 for(let i=0;i<13;i++){const x=-3.7+i*.62;const g=new THREE.BoxGeometry(.85+rnd()*.65,.3+rnd()*.3,.85+rnd()*.65);mesh(g,i%3===0?char:ridge,x,4.7+rnd()*.8,1.05+rnd()*.45,(rnd()-.5)*.3,(rnd()-.5)*.4,(rnd()-.5)*.4)}
 // Fracture bands: paired dark chasm margins and recessed orange vein.
 const veins=[[[-3.5,5.0,1.47],[-3.12,4.15,1.53],[-3.36,3.3,1.58],[-2.82,2.55,1.6],[-2.65,1.55,1.62] ],[[1.4,5.2,1.45],[1.12,4.35,1.6],[1.62,3.55,1.63],[1.36,2.85,1.66],[1.9,1.9,1.67]]];
 const beam=(a,b,r,mat)=>{const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);const o=mesh(new THREE.CylinderGeometry(r*.65,r,d.length(),5),mat,...p.clone().add(q).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize())};
 for(const v of veins)for(let j=1;j<v.length;j++){beam(v[j-1],v[j],.16,char);beam(v[j-1].map((n,k)=>k===2?n+.13:n),v[j].map((n,k)=>k===2?n+.13:n),.085,lava)}
 // Volcanic vertical teeth along top; silhouette asymmetry and heat-weathered fractures.
 for(let i=0;i<8;i++){const x=-3.6+i*1.03+rnd()*.24;const h=.35+rnd()*1.35;mesh(new THREE.ConeGeometry(.35+rnd()*.28,h,5),i%3===0?ridge:rock,x,5.5+h*.25,.25+rnd()*.5,0,0,(rnd()-.5)*.45)}
 // One concentrated fall zone: broken angular plates and debris, deliberately sparse.
 for(let i=0;i<11;i++){const x=1.6+(rnd()-.5)*2.7;const g=new THREE.BoxGeometry(.28+rnd()*.9,.15+rnd()*.32,.3+rnd()*.85);mesh(g,i%4===0?char:rock,x,.12+rnd()*.45,1.55+rnd()*1.3,(rnd()-.5)*.8,rnd()*2,(rnd()-.5)*1.2)}
 // Broad dragon-claw gouges cut visually across the basalt with blackened margins.
 for(let k=0;k<3;k++){const x=2.3+k*.38;beam([x,4.2,1.85],[x-.42,2.8,1.92],.11,char)}
 root.userData={floor:4,asset:'lava-rockwall',version:2,gameIntegrated:false,reference:'volcanic cavern reference concept'};
 return root;
}
