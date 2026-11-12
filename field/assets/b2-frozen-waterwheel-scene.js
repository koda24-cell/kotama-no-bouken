/** Floor 2 frozen ancient waterwheel courtyard. Standalone additive Three.js asset. */
export function createB2FrozenWaterwheelScene(THREE) {
 const root=new THREE.Group();root.name='B2 Frozen Ancient Waterwheel Courtyard';
 const stone=new THREE.MeshStandardMaterial({color:0xa0a6ab,roughness:1});
 const darkStone=new THREE.MeshStandardMaterial({color:0x6c7981,roughness:1});
 const wood=new THREE.MeshStandardMaterial({color:0x6d5b4e,roughness:1});
 const ice=new THREE.MeshStandardMaterial({color:0x9ecbdc,roughness:.26,metalness:.04,transparent:true,opacity:.82});
 const water=new THREE.MeshStandardMaterial({color:0x486f84,roughness:.23,metalness:.1});
 const meshes=[];
 function add(geo,mat,x=0,y=0,z=0,rot){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);if(rot)m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;root.add(m);meshes.push(m);return m}
 function box(x,y,z,w,h,d,mat=stone,rot){return add(new THREE.BoxGeometry(w,h,d),mat,x,y,z,rot)}
 function beam(a,b,r,mat=wood,r2=r){const d=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const mid=new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5);const m=add(new THREE.CylinderGeometry(r2,r,d.length(),8),mat,...mid.toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m}
 // Traversable-looking stone foreground and excavated channel (decorative, no collision logic).
 box(0,-.32,0,18,.55,12,darkStone);
 box(-5,-.03,0,6,.12,11,stone);box(5,-.03,0,6,.12,11,stone);
 box(0,-.15,0,4.1,.1,11,water);
 for(let i=0;i<15;i++){const z=-5.15+i*.73;box(-2.12,.12,z,.28,.34,.69,stone);box(2.12,.12,z,.28,.34,.69,stone)}
 // Broken mill foundations, buttresses and ruined wall piers.
 for(const x of [-3.25,3.25]) {
  box(x,1.05,0,1.3,2.1,1.65,darkStone);
  box(x,2.25,0,1.58,.42,1.9,stone);
  for(let i=0;i<4;i++)box(x+(i-1.5)*.22,1.38,.87,.12,.9,.14,stone);
  beam([x,2.4,-.6],[x,3.45,-1.6],.2,stone);
 }
 // Wheel axis runs X; wheel lies in YZ plane and has physically separate rims.
 const cx=0,cy=3.7,cz=0,R=2.55,spokes=14;
 beam([-3.65,cy,cz],[3.65,cy,cz],.3,wood);
 for(const x of [-.42,.42]){
  for(let i=0;i<spokes;i++){
   const a=i*Math.PI*2/spokes,b=(i+1)*Math.PI*2/spokes;
   const p=[x,cy+R*Math.cos(a),cz+R*Math.sin(a)];
   const q=[x,cy+R*Math.cos(b),cz+R*Math.sin(b)];
   beam(p,q,.115,wood);
   beam([x,cy,cz],p,.095,wood);
  }
 }
 for(let i=0;i<spokes;i++){
  const a=(i+.5)*Math.PI*2/spokes;
  const y=cy+R*Math.cos(a),z=cz+R*Math.sin(a);
  const paddle=box(0,y,z,1.23,.16,.58,wood);
  paddle.rotation.x=-a;
  if(i%4===0){box(.05,y+.16,z,1.15,.19,.51,ice,[a*.14,0,0])}
 }
 // Broad irregular ice wedges, unequal icicles and natural stalactite clusters.
 for(let i=0;i<12;i++){
  const a=i*2.399,rr=2.1+(.2*Math.sin(i*3.1));
  const y=cy+rr*Math.cos(a),z=rr*Math.sin(a);
  const h=.45+(i%5)*.24;
  add(new THREE.ConeGeometry(.13+(i%3)*.07,h,5),ice,Math.sin(i)*.45,y-h*.3,z);
 }
 for(let i=0;i<20;i++){
  const x=-8+(i%10)*1.72,z=-4.5+Math.floor(i/10)*8.7;
  const h=.3+((i*7)%9)*.18;
  add(new THREE.ConeGeometry(.24+(i%3)*.12,h,5),ice,x,h/2,z,[Math.sin(i)*.13,0,Math.cos(i)*.1]);
 }
 // Irregular masonry rubble on ground (not identical rounded pebbles).
 for(let i=0;i<24;i++){
  const x=(i%8-3.5)*1.9+Math.sin(i*8)*.28;
  const z=(Math.floor(i/8)-1)*4+Math.cos(i*5)*.3;
  const size=.22+(i%5)*.12;
  const m=add(new THREE.DodecahedronGeometry(size,0),i%3===0?stone:darkStone,x,size*.48,z);
  m.scale.set(1.4,.52,.8);m.rotation.set(i*.37,i*.67,i*.13);
 }
 // Deep backdrop: ruined arcades with open archways rather than a solid enclosing box.
 for(const z of [-5.25,5.25]){
  for(const x of [-7,-4.5,4.5,7]){
   box(x,1.8,z,.65,3.6,.75,stone);
   box(x,3.78,z,.98,.4,1.02,darkStone);
  }
  for(const x of [-5.75,5.75]){
   beam([x-1.1,3.3,z],[x,4.4,z],.24,stone);
   beam([x,4.4,z],[x+1.1,3.3,z],.24,stone);
  }
 }
 return {group:root,dispose(){for(const m of meshes){m.geometry.dispose()}for(const mat of [stone,darkStone,wood,ice,water])mat.dispose()}};
}
