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

 // PASS 2: irregular frozen mechanical decay and architectural depth. Preserve original geometry.
 const iron=new THREE.MeshStandardMaterial({color:0x515d65,roughness:.83,metalness:.26});
 const frost=new THREE.MeshStandardMaterial({color:0xc5e2e8,roughness:.45,transparent:true,opacity:.88});
 // Uneven broken wheel paddles, iron fasteners and frost accumulation.
 for(let i=0;i<spokes;i++){
  const a=(i+.5)*Math.PI*2/spokes,y=cy+R*Math.cos(a),z=cz+R*Math.sin(a);
  for(const x of [-.55,.55]){
   const rivet=add(new THREE.IcosahedronGeometry(.09,0),iron,x,y,z);
   rivet.scale.set(.45,1,1);
  }
  if(i===2||i===8||i===11){
   const split=add(new THREE.TetrahedronGeometry(.25+(i%3)*.1),wood,Math.sin(i)*.3,y+.22,z+.1);
   split.rotation.set(i*.3,i*.2,i*.55);
  }
  if(i%3===1){
   const icePatch=add(new THREE.IcosahedronGeometry(.24+(i%4)*.09,0),ice,-.36+(i%2)*.7,y,z);
   icePatch.scale.set(.85,1.8,.6);icePatch.rotation.set(i*.2,0,i*.3);
  }
 }
 // Staggered masonry joints and projecting caps on both wheel supports.
 for(const x of [-3.25,3.25]){
  for(let level=0;level<4;level++){
   for(let k=0;k<3;k++){
    const offset=(level%2)*.16;
    box(x-.49+k*.48+offset,.37+level*.47,.86,.42,.075,.19,level%2?stone:darkStone);
   }
  }
  box(x,2.63,-.05,1.72,.19,1.98,darkStone);
  for(const side of [-1,1]){
   beam([x+side*.68,.25,-.7],[x+side*.85,1.9,-.95],.13,stone);
  }
 }
 // Pointed arcade stone ribs: actual segmented masonry arch instead of two long poles.
 for(const z of [-5.25,5.25]){
  for(const x of [-5.75,5.75]){
   const left=[x-1.07,3.27,z],apex=[x,4.45,z],right=[x+1.07,3.27,z];
   for(const [p,q] of [[left,apex],[apex,right]]){
    for(let k=0;k<5;k++){
     const t=k/5,u=(k+1)/5;
     const a=p.map((v,j)=>v+(q[j]-v)*t),b=p.map((v,j)=>v+(q[j]-v)*u);
     beam(a,b,.25+(k%2)*.018,k%3?stone:darkStone);
    }
   }
   box(x,4.46,z,.34,.23,.84,darkStone);
  }
 }
 // Jagged overhanging cave ledges, ice shelves and varied hanging ice clusters.
 for(let side of [-1,1]){
  for(let i=0;i<9;i++){
   const x=side*(5.8+(i%3)*1.05),z=-4.8+i*1.18;
   const ledge=add(new THREE.DodecahedronGeometry(.6+(i%4)*.15,0),darkStone,x,5.7+Math.sin(i)*.35,z);
   ledge.scale.set(1.65,.45,1.3);ledge.rotation.set(i*.1,i*.31,i*.07);
   for(let j=0;j<2+(i%3);j++){
    const h=.55+((i*3+j*5)%8)*.24;
    const spike=add(new THREE.ConeGeometry(.13+j*.06,h,5),j%3?ice:frost,x+(j-1)*.28,5.43-h*.48,z+Math.sin(j+i)*.27);
    spike.rotation.z=Math.PI+Math.sin(i+j)*.11;
   }
  }
 }
 // Broad, fractured ice sheets around water's edge, with irregular boundaries.
 for(let i=0;i<18;i++){
  const x=(i%2?1:-1)*(1.75+(i%4)*.21),z=-4.6+i*.52;
  const shard=add(new THREE.TetrahedronGeometry(.36+(i%4)*.12),i%3?ice:frost,x,.17,z);
  shard.scale.set(1.6,.22,1.15);shard.rotation.set(.13,i*.49,.05);
 }
 // Broken stone lintels grounded on ruined floor rather than floating.
 for(let i=0;i<7;i++){
  const x=-7.3+i*2.25,z=i%2?4.8:-4.6;
  const block=box(x,.22,z,.72+(i%3)*.25,.33,.42,darkStone,[i*.09,i*.28,i*.07]);
  block.position.y=.18;
 }

 return {group:root,dispose(){for(const m of meshes){m.geometry.dispose()}for(const mat of [stone,darkStone,wood,ice,water,iron,frost])mat.dispose()}};
}
