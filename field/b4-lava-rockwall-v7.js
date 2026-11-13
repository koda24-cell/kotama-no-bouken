import * as THREE from 'three';
import {createB4LavaRockwallV6} from './b4-lava-rockwall-v6.js';
// V7 additive silhouette correction: 4 large continuous mother-rock masses.
// Older V6 geometry remains intact. The new broad stone surfaces obscure its
// small scattered fragments and regularly interrupted glowing segments.
export function createB4LavaRockwallV7(){
 const root=createB4LavaRockwallV6();root.name='b4:lava-rockwall-v7-massive-rock';
 const basalt=[0x29282a,0x302d2c,0x252425,0x373133].map(color=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true,side:THREE.DoubleSide}));
 const dark=new THREE.MeshStandardMaterial({color:0x110b0a,roughness:1,side:THREE.DoubleSide});
 const magma=new THREE.MeshStandardMaterial({color:0xff6215,emissive:0xff3c07,emissiveIntensity:3.6,roughness:.7,side:THREE.DoubleSide});
 const inner=new THREE.MeshStandardMaterial({color:0xffba45,emissive:0xff8c1d,emissiveIntensity:4.5,roughness:.6,side:THREE.DoubleSide});
 // Make solid polygonal mother-rock bodies with 9 height rings and 11 vertices per ring.
 // Their dominant scale is 2-3 m wide and 4-7 m tall, not pebbles or narrow columns.
 const masses=[
  {x:-3.2,y:3.45,w:1.48,h:5.45,z:5.06,lean:-.13},
  {x:-1.2,y:4.12,w:1.62,h:6.65,z:5.20,lean:.11},
  {x:1.35,y:4.10,w:1.58,h:6.45,z:5.25,lean:-.12},
  {x:3.45,y:2.75,w:1.15,h:4.45,z:5.06,lean:.09}
 ];
 function rockBody(cfg,index){
  const sides=11,rings=9,positions=[],faces=[];
  for(let j=0;j<rings;j++){
   const t=j/(rings-1),y=(t-.5)*cfg.h;
   const taper=.72+.28*Math.sin(Math.PI*t*.95);
   for(let k=0;k<sides;k++){
    const theta=2*Math.PI*k/sides;
    const radial=(1+.085*Math.sin(k*3.7+j*2.1+index)+.07*Math.cos(k*6.3-j*1.4));
    const step=.14*Math.sin(j*1.75+k*1.1+index);
    positions.push(cfg.x+Math.cos(theta)*cfg.w*taper*radial+cfg.lean*y+step,
      cfg.y+y+.10*Math.sin(k*2.1+j*.7),
      cfg.z+Math.sin(theta)*.52*taper*radial+.12*Math.sin(k*2.3+j*1.5));
   }
  }
  for(let j=0;j<rings-1;j++)for(let k=0;k<sides;k++){const a=j*sides+k,b=j*sides+(k+1)%sides,c=a+sides,d=b+sides;faces.push(a,c,b,b,c,d)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(faces);g.computeVertexNormals();const mesh=new THREE.Mesh(g,basalt[index%4]);root.add(mesh);
 }
 masses.forEach(rockBody);
 // Continuous, variable-width magma ribbon with shared vertices at every segment.
 // The entire channel is one mesh, no segment gaps. Jagged dark margins frame it.
 const primary=[[-2.15,6.65],[-1.95,6.15],[-2.08,5.55],[-1.81,5.1],[-1.7,4.48],[-1.86,3.85],[-1.57,3.3],[-1.22,2.88],[-.82,2.45],[-.25,1.96],[.35,1.5],[.8,.9]];
 const branches=[
 [[-1.57,3.3],[-.95,3.47],[-.42,3.22],[.18,3.08],[.72,2.8],[1.35,2.5]],
 [[.35,1.5],[1.04,1.38],[1.64,1.15],[2.2,.9],[2.7,.52]]
 ];
 function ribbon(points,width,material,z,phase){
  const v=[],ix=[];
  for(let i=0;i<points.length;i++){
   const [x,y]=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
   const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;
   const half=width*(.7+.22*Math.sin(i*1.6+phase)+.12*Math.cos(i*2.8+phase));
   for(const sign of [-1,1])v.push(x-sign*dy/len*half,y+sign*dx/len*half,z+.03*Math.sin(i*1.3));
  }
  for(let i=0;i<points.length-1;i++){const a=i*2;ix.push(a,a+2,a+1,a+1,a+2,a+3)}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.setIndex(ix);geo.computeVertexNormals();root.add(new THREE.Mesh(geo,material));
 }
 for(const [i,path] of [primary,...branches].entries()){
  ribbon(path,i===0?.39:.26,dark,5.78,i);
  ribbon(path,i===0?.27:.17,magma,5.81,i);
  if(i===0)ribbon(path.slice(4,10),.055,inner,5.835,0);
 }
 // Few large fallen slabs at the foot rather than dozens of pebbles.
 for(const [i,p] of [[-3.6,.52,5.65],[-1.45,.35,5.7],[2.8,.47,5.67]].entries()){
  const mesh=new THREE.Mesh(new THREE.DodecahedronGeometry(.78,0),basalt[i]);mesh.position.set(...p);mesh.scale.set(1.45,.62,.75);mesh.rotation.z=(i-1)*.18;root.add(mesh);
 }
 root.userData={floor:4,asset:'lava-rockwall',version:7,status:'review',gameIntegrated:false,change:'4 massive mother-rock bodies and continuous branching lava ribbons'};
 return root;
}
