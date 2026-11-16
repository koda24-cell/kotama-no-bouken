import * as THREE from 'three';
// V15/V16: a tapered, elongated outer cargo tub, authored as additive cladding.
// Original minecart, original ore, V14 detailing and wheels remain untouched.
export function enhanceB4CartTaper(root, variant=1) {
 const cart=root.getObjectByName('b4:buried-ore-cart');
 if(!cart)throw Error('Missing preserved cart');
 const name='b4:cart-taper-v'+(variant===1?'15':variant===2?'16':'17');
 if(cart.getObjectByName(name))return root;
 const g=new THREE.Group();g.name=name;cart.add(g);
 const dark=new THREE.MeshStandardMaterial({color:0x4d3c32,roughness:.94,metalness:.10,side:THREE.DoubleSide});
 const frame=new THREE.MeshStandardMaterial({color:0x383a3b,roughness:.81,metalness:.5});
 const weathered=new THREE.MeshStandardMaterial({color:0x655142,roughness:.92,metalness:.15});
 const seam=new THREE.MeshStandardMaterial({color:0x947258,roughness:1});
 const topX=variant===1?1.02:variant===2?1.13:1.075;
 const botX=.72;
 const topZ=variant===1?1.13:variant===2?1.27:1.20;
 const botZ=.87;
 const baseY=.30, topY=variant===1?1.32:variant===2?1.39:1.36;
 const wallT=.075;
 function block(x,y,z,sx,sy,sz,mat=frame) {
  const o=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);
  o.position.set(x,y,z);g.add(o);return o;
 }
 function bar(a,b,w,d,material=frame) {
  const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),dv=q.clone().sub(p);
  const o=new THREE.Mesh(new THREE.BoxGeometry(w,d,dv.length()),material);
  o.position.copy(p.add(q).multiplyScalar(.5));
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dv.normalize());
  g.add(o);return o;
 }
 // Explicit solid trapezoidal shell parts; no shear of prior geometry.
 function panel(bottomA,bottomB,topA,topB,thick,material){
  const a=new THREE.Vector3(...bottomA),b=new THREE.Vector3(...bottomB),
        c=new THREE.Vector3(...topB),d=new THREE.Vector3(...topA);
  const normal=new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(d,a)).normalize().multiplyScalar(thick/2);
  const v=[a,b,c,d].map(x=>x.clone());
  const points=[...v.map(x=>x.clone().add(normal)),...v.map(x=>x.clone().sub(normal))];
  const faces=[[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],[1,5,6],[1,6,2],[2,6,7],[2,7,3],[3,7,4],[3,4,0]];
  const positions=[];
  for(const tri of faces)for(const i of tri) positions.push(...points[i].toArray());
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,material);g.add(m);return m;
 }
 function wallSegments(face) {
  const intervals=variant===3?[[.025,.305],[.355,.64],[.69,.975]]:[[0,1]];
  for(const [t0,t1] of intervals) {
   const y0=baseY+(topY-baseY)*t0, y1=baseY+(topY-baseY)*t1;
   const x0=botX+(topX-botX)*t0,x1=botX+(topX-botX)*t1;
   const z0=botZ+(topZ-botZ)*t0,z1=botZ+(topZ-botZ)*t1;
   if(face==='side')for(const side of [-1,1]) panel([side*x0,y0,-z0],[side*x0,y0,z0],[side*x1,y1,-z1],[side*x1,y1,z1],wallT,dark);
   if(face==='end')for(const side of [-1,1]) panel([-x0,y0,side*z0],[x0,y0,side*z0],[-x1,y1,side*z1],[x1,y1,side*z1],wallT,dark);
  }
 }
 wallSegments('side');
 for (const side of [-1,1]) {
  // One long tapered reinforcement strut across each end, rather than many tiny patches.
  for (const zSide of [-1,1]) {
   bar([side*(botX+.055),baseY,zSide*botZ],
       [side*(topX+.035),topY,zSide*topZ],.115,.115,frame);
  }
  // Top rails: full-length, emphasized rectangular wagon silhouette in Z direction.
  bar([side*topX,topY,-topZ],[side*topX,topY,topZ],.10,.11,frame);
  // Sparse tilted timber strakes follow the sloping wall rather than adding boxy horizontal bands.
  for(const t of [.32,.68]){
   const x=botX+(topX-botX)*t,y=baseY+(topY-baseY)*t,z=botZ+(topZ-botZ)*t;
   bar([side*(x+.045),y,-z*.88],[side*(x+.045),y,z*.88],.035,.045, t===.32?weathered:seam);
  }
 }
 wallSegments('end');
 for(const side of [-1,1]) {
  bar([-topX,topY,side*topZ],[topX,topY,side*topZ],.10,.11,frame);
  bar([-.5,baseY,side*(botZ+.07)],[-.63,topY,side*(topZ+.045)],.095,.075,frame);
  bar([.5,baseY,side*(botZ+.07)],[.63,topY,side*(topZ+.045)],.095,.075,frame);
 }
 // Chassis extension makes the wagon read longer without changing its original base.
 for(const side of [-1,1])block(side*.54,.16,0,.13,.14,topZ*1.8,frame);
 for(const z of [-topZ*.86,topZ*.86])block(0,.08,z,1.5,.11,.14,frame);
 // Sparse purposeful bolt heads on the new upper corners.
 for(const side of [-1,1])for(const z of [-topZ*.92,topZ*.92]){
  const stud=new THREE.Mesh(new THREE.SphereGeometry(.037,8,5),weathered);
  stud.position.set(side*(topX+.045),topY-.09,z);g.add(stud);
 }
 cart.userData={...cart.userData,taper_variant:variant,taper_profile:{bottom_width:botX*2,top_width:topX*2,bottom_length:botZ*2,top_length:topZ*2,height:topY-baseY}};
 return root;
}
