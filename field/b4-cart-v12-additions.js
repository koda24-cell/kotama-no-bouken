import * as THREE from 'three';
// Non-destructive V12 overlays: the existing cart tub, ore, rims, axles and V9 additions are unchanged.
export function enhanceB4CartV12(root, level=1) {
 const cart=root.getObjectByName('b4:buried-ore-cart');
 if(!cart)throw new Error('Missing original cart');
 const id='b4:cart-v12-quality-'+level;
 if(cart.getObjectByName(id))return root;
 const g=new THREE.Group();g.name=id;cart.add(g);
 const dark=new THREE.MeshStandardMaterial({color:0x333537,metalness:.65,roughness:.71});
 const rust=new THREE.MeshStandardMaterial({color:0x76503b,metalness:.28,roughness:.92});
 const wood=new THREE.MeshStandardMaterial({color:0x79583d,metalness:.03,roughness:1});
 const edge=new THREE.MeshStandardMaterial({color:0xa07550,roughness:.96});
 const cube=new THREE.BoxGeometry(1,1,1);
 function beam(x,y,z,w,h,d,mat=dark,rx=0,ry=0,rz=0) {
  const m=new THREE.Mesh(cube,mat);m.position.set(x,y,z);m.scale.set(w,h,d);m.rotation.set(rx,ry,rz);g.add(m);return m;
 }
 function rivet(x,y,z) {const m=new THREE.Mesh(new THREE.SphereGeometry(.043,8,6),rust);m.position.set(x,y,z);g.add(m)}
 // Visible curved side guards outside all old meshes; do not cover original shape.
 for(const side of [-1,1]){
  for(const z of [-.61,-.30,.02,.34,.61]){
   beam(side*.98,.64,z,.075,.94,.085,dark,0,0,side*.055);
   rivet(side*1.035,.35,z);rivet(side*1.035,.91,z);
  }
  for(const y of [.40,.82,1.10]){
   beam(side*1.01,y,0,.055,.075,1.40,level===1?rust:dark);
  }
  // Raised external cross-brace between wheel mounting points.
  beam(side*.91,.08,0,.13,.12,1.48,dark);
  for(const z of [-.43,.43]){
   const bearing=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.12,12),dark);
   bearing.rotation.z=Math.PI/2;bearing.position.set(side*1.14,-.1,z);g.add(bearing);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.24,.042,8,24),rust);
   ring.rotation.y=Math.PI/2;ring.position.set(side*1.16,-.1,z);g.add(ring);
   const cap=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.04,12),rust);
   cap.rotation.z=Math.PI/2;cap.position.set(side*1.22,-.1,z);g.add(cap);
  }
 }
 // Framed end boards: visibly define the silhouette around the oversized original ore.
 for(const z of [-.73,.73]){
  beam(0,.66,z,1.50,.11,.10,wood);
  beam(0,1.07,z,1.54,.115,.12,edge);
  for(const x of [-.61,.61]){
   beam(x,.75,z*1.03,.12,.72,.11,dark);
   for(const y of [.46,.98])rivet(x,y,z*1.13);
  }
 }
 // Variation pass: coarse but restrained edge wear and bolts, no tiny repeated pellets.
 if(level>=2){
  for(const side of [-1,1])for(let k=0;k<6;k++){
   const z=-.55+k*.22;
   beam(side*1.045,.48+(k%3)*.22,z,.018,.038,.12,k%2?rust:edge,0,(k%3-1)*.11);
  }
  // Braced chassis diagonals and heavy outer corner shoes.
  for(const side of [-1,1]){
   for(const z of [-.53,.53]){
    beam(side*.83,-.02,z,.17,.16,.21,rust);
   }
   const diagonal=beam(side*.83,.36,0,.074,.068,1.12,dark);
   diagonal.rotation.y=side*.30;
  }
  // Welded rail-contact plates beneath existing wheel chassis.
  for(const z of [-.43,.43])beam(0,-.20,z,1.85,.06,.18,dark);
 }
 root.userData={...root.userData,enhancement:'Additive V12 detail level '+level};
 return root;
}
