import * as THREE from 'three';
// V14: art-directed alternative after reviewing V12/V13. Base cart and ore stay intact.
// No duplicated external rim rings and no continuous bright horizontal bands.
export function enhanceB4CartV14(root) {
 const cart=root.getObjectByName('b4:buried-ore-cart');
 if(!cart)throw Error('Base ore cart missing');
 if(cart.getObjectByName('b4:cart-v14-quality'))return root;
 const g=new THREE.Group();g.name='b4:cart-v14-quality';cart.add(g);
 const steel=new THREE.MeshStandardMaterial({color:0x414244,metalness:.55,roughness:.82});
 const weathered=new THREE.MeshStandardMaterial({color:0x5a4535,metalness:.25,roughness:.96});
 const timber=new THREE.MeshStandardMaterial({color:0x68503d,roughness:1});
 const lightwood=new THREE.MeshStandardMaterial({color:0x8a6649,roughness:1});
 const geom=new THREE.BoxGeometry(1,1,1);
 function bar(x,y,z,sx,sy,sz,mat=steel,rot=0){
  const m=new THREE.Mesh(geom,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.y=rot;g.add(m);return m;
 }
 function bolt(x,y,z){const m=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.026,8),weathered);m.rotation.z=Math.PI/2;m.position.set(x,y,z);g.add(m)}
 // Iron corner posts on the outside of the existing wood tub; silhouette remains legible.
 for(const side of [-1,1]){
  for(const z of [-.62,.62]){
   bar(side*.92,.70,z,.12,.92,.13,steel);
   bolt(side*.995,.46,z);bolt(side*.995,.94,z);
  }
  // Narrow lower rail to brace the existing chassis, not cover sideboards.
  bar(side*.88,.22,0,.11,.13,1.40,steel);
  // Distinct wheel axle bearings without floating decorative rings.
  for(const z of [-.43,.43]){
    const bearing=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.065,12),steel);
    bearing.rotation.z=Math.PI/2;bearing.position.set(side*1.13,-.1,z);g.add(bearing);
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.047,.047,.025,10),weathered);
    shaft.rotation.z=Math.PI/2;shaft.position.set(side*1.18,-.1,z);g.add(shaft);
  }
  // 3 localized timber repair patches per side, not a uniform railing cage.
  for(const [z,y] of [[-.37,.56],[.10,.78],[.46,.46]]){
   bar(side*.88,y,z,.035,.13,.34,timber,(z*.13));
  }
 }
 // Two asymmetric restraint bars on top edge; structural frame rather than covering ore.
 for(const z of [-.68,.68]){
  bar(0,1.17,z,1.54,.10,.15,steel);
  for(const x of [-.55,.55]){
   bar(x,1.08,z*1.04,.075,.30,.09,weathered);
  }
 }
 // Upper timber lips are deliberately sparse to avoid the old thick striped look.
 for(const side of [-1,1]){
  bar(side*.84,1.27,0,.085,.09,1.40,lightwood);
  for(const z of [-.48,.49])bar(side*.88,1.21,z,.085,.24,.085,steel);
 }
 // Off-center handle/grip on the back of the wagon.
 for(const x of [-.52,.52])bar(x,.75,.88,.065,.14,.34,steel);
 bar(0,.80,1.03,1.15,.075,.075,timber);
 root.userData={...root.userData,enhancement:'V14 restrained wear and axle bearing alternative; no original meshes removed'};
 return root;
}
