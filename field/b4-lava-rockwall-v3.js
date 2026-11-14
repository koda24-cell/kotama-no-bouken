import * as THREE from 'three';
import {createB4LavaRockwallV2} from './b4-lava-rockwall-v2.js';
// Additive sculptural V3: preserve all prior meshes and add interlocking natural rock faces.
export function createB4LavaRockwallV3(){
 const root=createB4LavaRockwallV2();root.name='b4:lava-rockwall-v3';
 const basalt=new THREE.MeshStandardMaterial({color:0x282326,roughness:1,flatShading:true});
 const edge=new THREE.MeshStandardMaterial({color:0x4c3b39,roughness:.98,flatShading:true});
 const burnt=new THREE.MeshStandardMaterial({color:0x141719,roughness:1,flatShading:true});
 const magma=new THREE.MeshStandardMaterial({color:0xff5818,emissive:0xff3205,emissiveIntensity:3.8,roughness:.7});
 let seed=17702;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
 function add(geo,mat,pos,rot=[0,0,0]){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.rotation.set(...rot);root.add(m);return m}
 // Wide, irregular rock faces with a non-rectilinear boundary and recessed lower sections.
 const plates=[[-3.65,2.75,1.85,1.1,2.8,.65],[-2.1,3.15,1.75,1.4,3.05,.8],[-.35,2.65,1.82,1.25,3.7,.95],[1.3,3.15,1.82,1.2,3.1,.75],[2.85,2.75,1.72,1.35,3.5,.8],[3.9,2.65,1.55,.6,2.65,.7]];
 for(let i=0;i<plates.length;i++){const [x,y,z,w,h,d]=plates[i];const geo=new THREE.CylinderGeometry(w*.65,w,h,7,3);const m=add(geo,i%3===0?edge:basalt,[x,y,z],[.05,(rnd()-.5)*.5,(rnd()-.5)*.24]);m.scale.z=d}
 // Broken angular strata crossing the wall, with unequal widths, depths and angles.
 for(let i=0;i<17;i++){const x=-4.1+i*.5+(rnd()-.5)*.2;const y=4.7+rnd()*1.2;const z=1.9+rnd()*.25;add(new THREE.BoxGeometry(.6+rnd()*.75,.22+rnd()*.25,.55+rnd()*.55),i%4===0?edge:basalt,[x,y,z],[(rnd()-.5)*.4,(rnd()-.5)*.65,(rnd()-.5)*.6])}
 // Glowing lava waterfall branching across a central fault, behind broken rim fragments.
 function link(a,b,r,mat){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);const m=add(new THREE.CylinderGeometry(r*.72,r,d.length(),7),mat,p.clone().add(q).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize())}
 const fault=[[-1.2,5.65,2.43],[-1.55,4.85,2.48],[-1.27,4.05,2.5],[-1.65,3.35,2.53],[-1.37,2.45,2.57],[-1.7,1.6,2.6]];
 for(let i=1;i<fault.length;i++){link(fault[i-1],fault[i],.23,burnt);link(fault[i-1].map((v,j)=>j===2?v+.12:v),fault[i].map((v,j)=>j===2?v+.12:v),.12,magma)}
 link([-1.27,4.05,2.55],[-.55,3.55,2.57],.09,magma);link([-1.65,3.35,2.57],[-2.25,2.85,2.55],.07,magma);
 // Jagged hanging basalt and thick rock ledges rather than repeating conical spikes.
 for(let i=0;i<9;i++){const x=-3.75+i*.91+(rnd()-.5)*.22;const h=.6+rnd()*1.1;add(new THREE.ConeGeometry(.25+rnd()*.35,h,5),i%3===0?edge:basalt,[x,5.25-h*.2,2.0+rnd()*.3],[Math.PI,(rnd()-.5)*.3,(rnd()-.5)*.3])}
 // Heat-scaled impact scar: three parallel blackened cuts with sparse incandescent interiors.
 for(let i=0;i<3;i++){const x=2.15+i*.36;link([x,4.25,2.4],[x-.38,2.65,2.45],.13,burnt);link([x+.03,3.9,2.5],[x-.24,2.95,2.52],.045,magma)}
 // Asymmetric collapsed talus near the right foot; preserve a clear central path.
 for(let i=0;i<12;i++){const x=1.3+rnd()*2.9;const y=.2+rnd()*.5;const g=new THREE.DodecahedronGeometry(.3+rnd()*.42,0);const m=add(g,i%4===0?edge:basalt,[x,y,1.9+rnd()*1.4],[(rnd()-.5)*.8,rnd()*2,(rnd()-.5)*1.2]);m.scale.set(1.35,.52+rnd()*.4,.75)}
 root.userData={floor:4,asset:'lava-rockwall',version:3,status:'review',gameIntegrated:false};return root;
}
