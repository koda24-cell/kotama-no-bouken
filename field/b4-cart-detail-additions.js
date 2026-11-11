/* Additive B4 cart detailing: never mutates existing meshes or source geometries. */
import * as THREE from 'three';
export function enhanceB4MineCart(root) {
  const cart=root.getObjectByName('b4:buried-ore-cart');
  if(!cart)throw new Error('Existing B4 ore cart not found');
  if(cart.getObjectByName('b4:cart-detail-additions'))return root;
  const details=new THREE.Group();details.name='b4:cart-detail-additions';cart.add(details);
  const iron=new THREE.MeshStandardMaterial({color:0x666365,roughness:.82,metalness:.18,flatShading:true});
  const wood=new THREE.MeshStandardMaterial({color:0x514238,roughness:1,flatShading:true});
  const geometries=[];
  const cube=new THREE.BoxGeometry(1,1,1);geometries.push(cube);
  function bar(x,y,z,sx,sy,sz,mat=iron,rot=0){
    const m=new THREE.Mesh(cube,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.z=rot;details.add(m);return m;
  }
  // Existing cart tub, wheels and ore heap are retained unchanged.
  // Three offset planks and visible seams strengthen the side silhouette.
  for(const side of [-1,1]){
    for(let i=0;i<3;i++)bar(side*.79,.42+i*.23,0,.065,.18,1.33,wood,side*(.12+i*.03));
    for(const z of [-.56,.56]){
      bar(side*.81,.66,z,.11,.85,.10,iron,side*.17);
      bar(side*.82,1.08,z,.12,.1,.2);
    }
    // Axle ends and four-wheel hub caps.
    for(const z of [-.43,.43]){
      const hubGeo=new THREE.CylinderGeometry(.105,.105,.08,10);geometries.push(hubGeo);
      const hub=new THREE.Mesh(hubGeo,iron);
      hub.rotation.z=Math.PI/2;hub.position.set(side*1.015,-.1,z);details.add(hub);
      for(let k=0;k<6;k++){
        const a=k*Math.PI/3;
        const spoke=bar(side*1.02,-.1+Math.sin(a)*.23,z+Math.cos(a)*.23,.035,.035,.27);
        spoke.rotation.x=a;
      }
    }
  }
  // Reinforcing lip and bent corner brackets, without replacing the original tub.
  for(const z of [-.68,.68])bar(0,1.13,z,1.52,.095,.12);
  for(const x of [-.76,.76])bar(x,1.13,0,.1,.095,1.38);
  for(const x of [-.62,.62])for(const z of [-.54,.54]){
    bar(x,.96,z,.16,.055,.19,iron,(x+z)*.12);
  }
  // Rivets as actual geometry rather than texture decals.
  const rivetGeo=new THREE.SphereGeometry(.043,6,4);geometries.push(rivetGeo);
  for(const side of [-1,1])for(const z of [-.48,0,.48])for(const y of [.42,.87]){
    const rivet=new THREE.Mesh(rivetGeo,iron);rivet.position.set(side*.86,y,z);details.add(rivet);
  }

  // V3: silhouette-first detailing, retaining the existing cart and its ore.
  // Strongly readable external iron corner gussets and timber end-board seams.
  const darkIron=new THREE.MeshStandardMaterial({color:0x383737,metalness:.48,roughness:.77,flatShading:true});
  const agedWood=new THREE.MeshStandardMaterial({color:0x68503a,roughness:1,flatShading:true});
  for(const z of [-.69,.69]){
    for(let i=0;i<4;i++){
      const y=.35+i*.19;
      bar(0,y,z,1.43,.145,.065,i%2?agedWood:wood);
    }
    for(const x of [-.68,.68]){
      bar(x,.72,z*1.07,.105,.83,.075,darkIron);
      for(const y of [.43,.68,.94]){
        const rivet=new THREE.Mesh(rivetGeo,iron);
        rivet.position.set(x,y,z*1.14);details.add(rivet);
      }
    }
  }
  // Outer wheel rim bands: make the running gear visually substantial.
  for(const side of [-1,1])for(const z of [-.43,.43]){
    const rimGeo=new THREE.TorusGeometry(.295,.052,7,18);geometries.push(rimGeo);
    const rim=new THREE.Mesh(rimGeo,darkIron);
    rim.rotation.y=Math.PI/2;rim.position.set(side*1.04,-.1,z);details.add(rim);
    const innerGeo=new THREE.TorusGeometry(.20,.019,5,14);geometries.push(innerGeo);
    const inner=new THREE.Mesh(innerGeo,iron);
    inner.rotation.y=Math.PI/2;inner.position.copy(rim.position);details.add(inner);
    const capGeo=new THREE.CylinderGeometry(.067,.067,.045,10);geometries.push(capGeo);
    const cap=new THREE.Mesh(capGeo,darkIron);cap.rotation.z=Math.PI/2;
    cap.position.set(side*1.10,-.1,z);details.add(cap);
  }
  // Longitudinal chassis members and underbody axle supports.
  for(const side of [-1,1]){
    bar(side*.61,.08,0,.13,.16,1.52,darkIron);
    for(const z of [-.43,.43])bar(side*.61,-.11,z,.37,.12,.12,darkIron);
  }
  for(const z of [-.43,.43])bar(0,-.10,z,2.03,.09,.095,darkIron);
  // Corner plates protrude above timber to clarify the trapezoid tub outline.
  for(const side of [-1,1])for(const z of [-.64,.64]){
    bar(side*.80,1.05,z,.15,.23,.16,darkIron,side*.12);
  }
  details.userData.dispose=()=>{geometries.forEach(g=>g.dispose());iron.dispose();wood.dispose();darkIron.dispose();agedWood.dispose();};
  return root;
}
