/* Standalone stage-four abandoned mine hoist. No runtime integration. */
import * as THREE from 'three';
export function createB4MineHoist(){
 const root=new THREE.Group();root.name='b4:mine-hoist-v1';
 const timber=new THREE.MeshStandardMaterial({color:0x63432e,roughness:.96,flatShading:true});
 const endwood=new THREE.MeshStandardMaterial({color:0x997050,roughness:1,flatShading:true});
 const iron=new THREE.MeshStandardMaterial({color:0x55453d,metalness:.65,roughness:.76});
 const rust=new THREE.MeshStandardMaterial({color:0x8b4c32,metalness:.35,roughness:.91});
 const rope=new THREE.MeshStandardMaterial({color:0x8c795b,roughness:1});
 const add=(geo,mat,x,y,z,rx=0,ry=0,rz=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);root.add(m);return m};
 const beam=(x,y,z,w,h,d,mat=timber,rz=0)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y,z,0,0,rz);
 const cyl=(r1,r2,h,mat,x,y,z,segments=12,rx=0,ry=0,rz=0)=>add(new THREE.CylinderGeometry(r1,r2,h,segments),mat,x,y,z,rx,ry,rz);
 // Four structural posts and double crown beams.
 for(const x of [-1.5,1.5])for(const z of [-.95,.95]){
  beam(x,2.25,z,.33,4.5,.36);
  beam(x,.23,z,.54,.42,.56,iron);
  for(const y of [1.3,3.5])beam(x,y,z,.41,.18,.44,rust);
 }
 for(const z of [-.95,.95]){
  beam(0,4.43,z,3.65,.34,.45);
  beam(0,4.13,z,3.2,.16,.28,endwood);
  for(const x of [-1.17,1.17])beam(x,3.65,z,.2,1.25,.22,timber,x<0?-.67:.67);
 }
 for(const x of [-1.5,1.5])beam(x,4.45,0,.36,.32,2.4,timber);
 // Suspended hoist drum, axle along X.
 cyl(.67,.67,1.48,timber,0,2.23,0,20,0,0,Math.PI/2);
 for(const x of [-.79,.79]){
  cyl(.79,.79,.14,iron,x,2.23,0,20,0,0,Math.PI/2);
  cyl(.17,.17,.21,rust,x,2.23,0,12,0,0,Math.PI/2);
 }
 // Spiral ropes wrapped around the drum, using a single continuous tube.
 for(let j=0;j<2;j++){
  const pts=[];for(let i=0;i<=240;i++){const t=i/240,theta=t*Math.PI*2*9;pts.push(new THREE.Vector3(-.67+t*1.34,2.23+Math.cos(theta+j*Math.PI)*.70,Math.sin(theta+j*Math.PI)*.70));}
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),240,.035,5,false),rope,0,0,0);
 }
 // External gear wheel, raised teeth and 8 radial spokes.
 const gx=1.02,gy=2.23,gz=0;
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.92,.095,8,48),iron);ring.rotation.y=Math.PI/2;ring.position.set(gx,gy,gz);root.add(ring);
 for(let i=0;i<24;i++){
  const a=i*Math.PI/12;
  const tooth=beam(gx,gy+Math.cos(a)*.96,gz+Math.sin(a)*.96,.16,.18,.20,rust);
  tooth.rotation.x=a;
 }
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,spoke=beam(gx,gy+Math.cos(a)*.46,gz+Math.sin(a)*.46,.12,.85,.12,iron);
  spoke.rotation.x=a;
 }
 cyl(.21,.21,.23,rust,1.16,gy,gz,12,0,0,Math.PI/2);
 // Small driving pinion at lower rear.
 const px=1.04,py=1.03,pz=.77;
 const pinion=new THREE.Mesh(new THREE.TorusGeometry(.31,.07,7,24),iron);pinion.rotation.y=Math.PI/2;pinion.position.set(px,py,pz);root.add(pinion);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;beam(px,py+Math.cos(a)*.35,pz+Math.sin(a)*.35,.12,.10,.12,rust).rotation.x=a;}
 beam(0,.26,0,3.35,.28,2.38,timber);
 // Overhead crossbar, chains and hanging ore bucket.
 beam(-.35,4.02,-.95,.18,.22,2.3,iron);
 const chainMat=iron;
 const chain=(x,z,top,bottom)=>{for(let y=top;y>bottom;y-=.16){const loop=new THREE.Mesh(new THREE.TorusGeometry(.075,.024,5,10),chainMat);loop.position.set(x,y,z);loop.rotation.y=((Math.round((top-y)/.16)%2)?Math.PI/2:0);root.add(loop);}};
 for(const z of [-.48,.48])chain(-2.0,z,3.9,1.55);
 const bucket=beam(-2,1.17,0,.92,.13,1.05,iron);
 for(const x of [-2.43,-1.57])beam(x,1.48,0,.12,.65,1.06,timber);
 for(const z of [-.49,.49])beam(-2,1.48,z,.96,.65,.12,timber);
 for(const x of [-2.38,-1.62])for(const z of [-.45,.45])beam(x,1.48,z,.13,.76,.14,rust);
 // Bracing on front and back.
 for(const z of [-.95,.95])for(const x of [-1,1]){
  const b=beam(x*.94,1.04,z,.18,1.85,.19,timber,x*.43);b.rotation.z=x*.43;
 }
 root.userData={asset:'B4 abandoned mine hoist',stage:4,prototype:true};
 return root;
}
