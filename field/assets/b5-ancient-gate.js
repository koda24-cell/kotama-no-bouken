/* B5 throne hall: ancient ruined Gothic gate behind the Demon King.
 * Standalone visual prop, not a traversable portal or collision surface.
 * Coordinate system: X horizontal, Y up, Z depth. Ground is Y=0.
 */
export function createB5AncientGate(THREE,options={}){
 const group=new THREE.Group();group.name='b5:throne:ancientGate';group.userData.visualOnly=true;
 const geometries=[],materials=[];
 const G=g=>(geometries.push(g),g),M=m=>(materials.push(m),m);
 const stone=M(new THREE.MeshStandardMaterial({color:0x68636c,roughness:.96,flatShading:true}));
 const cut=M(new THREE.MeshStandardMaterial({color:0x48444d,roughness:.98,flatShading:true}));
 const trim=M(new THREE.MeshStandardMaterial({color:0x85808a,roughness:.92,flatShading:true}));
 const box=G(new THREE.BoxGeometry(1,1,1));
 const add=(geo,mat,x,y,z,sx=1,sy=1,sz=1)=>{
  const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);group.add(o);return o;
 };
 const block=(x,y,z,w,h,d,mat=stone)=>add(box,mat,x,y,z,w,h,d);
 const beam=(a,b,w,d,mat=stone)=>{
  const v=new THREE.Vector3(...a),t=new THREE.Vector3(...b),delta=t.clone().sub(v);
  const m=block((v.x+t.x)/2,(v.y+t.y)/2,(v.z+t.z)/2,w,delta.length(),d,mat);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
 };
 let seed=(options.seed??5081)>>>0;
 const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 // Reference silhouette: horizontal broken lintel and two masonry piers.
 // There is NO large triangular / pointed arch spanning the gate.
 for(const side of [-1,1]){
  const x=side*3.75,h=side<0?9.8:7.1;
  block(x,.7,0,2.65,1.4,2.5);
  block(x,1.4+h/2,0,1.85,h,1.75);
  for(let y=2.3;y<h+1.4;y+=1.65){
   block(x,y,0,2.14,.25,2.05,trim);
  }
  for(const z of [-1.03,1.03]){
   // Blind lancet ornament is small and shallow; no oversized apex.
   block(x,4.2,z,.93,3.6,.10,cut);
   for(const dx of [-.48,.48])block(x+dx,4.2,z+Math.sign(z)*.07,.14,3.75,.15,trim);
   for(const dx of [-.28,.28])block(x+dx,4.2,z+Math.sign(z)*.11,.075,3.25,.09,stone);
   block(x,6.05,z+Math.sign(z)*.06,.94,.18,.18,trim);
   block(x,3.7,z+Math.sign(z)*.11,.85,.12,.14,trim);
  }
  block(x,1.4+h,0,2.7,.48,2.6,trim);
 }
 // Surviving flat lintel sections, with a broken centre and right end.
 for(const [x,y,w,ang] of [
  [-3.3,11.45,3.6,0],[-.75,11.45,1.7,-.025],
  [2.45,9.05,2.7,-.045],[4.15,9.0,1.45,-.11]
 ]){
  const stoneBeam=block(x,y,0,w,.78,2.1,stone);stoneBeam.rotation.z=ang;
  block(x,y+.46,-.02,w+.12,.18,2.3,trim).rotation.z=ang;
 }
 // Rounded, recessed fragmentary opening beneath the surviving left lintel.
 // Short shallow curve, not a full triangular gateway.
 for(let i=0;i<9;i++){
  const t=i/8,ang=Math.PI*(1-t);
  const x=-2.55+1.45*Math.cos(ang),y=8.55+1.05*Math.sin(ang);
  const m=block(x,y,-1.07,.52,.25,.30,trim);
  m.rotation.z=ang-Math.PI/2;
 }
 // A collapsed right cornice creates a distinct asymmetric ruin silhouette.
 block(4.8,8.9,-.18,1.7,.5,2.2,cut).rotation.z=-.17;
 // Broken silhouette: asymmetrical rubble piles resting on the ground.
 const rock=(x,z,sx,h,sz)=>{
  // Low, broad grounded masonry chunks, with a bevelled shoulder and
  // irregular broad top. No sharp central apex or spike-like silhouette.
  const n=9,verts=[],idx=[],phase=rand()*Math.PI*2;
  const radial=Array.from({length:n},()=>0.82+rand()*.18);
  const topH=Array.from({length:n},()=>h*(0.67+rand()*.13));
  for(let j=0;j<n;j++){
   const a=phase+j*2*Math.PI/n;
   verts.push(Math.cos(a)*sx*radial[j],0,Math.sin(a)*sz*radial[j]);
  }
  for(let j=0;j<n;j++){
   const a=phase+j*2*Math.PI/n;
   verts.push(Math.cos(a)*sx*radial[j]*.74,topH[j],Math.sin(a)*sz*radial[j]*.74);
  }
  // broad flattened upper surface, not a single pointed peak
  for(let j=1;j<n-1;j++)idx.push(n,n+j,n+j+1);
  for(let j=0;j<n;j++){
   const k=(j+1)%n;
   idx.push(j,k,n+j,k,n+k,n+j);
  }
  const geo=G(new THREE.BufferGeometry());
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setIndex(idx);geo.computeVertexNormals();
  add(geo,rand()>.5?cut:stone,x,0,z);
 };
 for(let i=0;i<35;i++){
  const side=i%3===0?-1:1,x=side*(3.5+rand()*3.4),z=(rand()-.5)*4.2;
  rock(x,z,.24+rand()*.78,.18+rand()*.75,.28+rand()*.75);
 }
 // Detached fragment of a broken right-hand arch, grounded.
 block(6.1,.58,-1.25,1.5,1.05,1.2,stone).rotation.z=.28;
 block(6.65,.24,.4,.8,.45,1.1,cut).rotation.z=-.24;
 // Bevelled polygonal masonry, softened corners rather than spiky slabs.
 const polygonStone=(x,y,z,w,h,d,mat=stone)=>{
  const pts=[[-.78,-1],[.77,-1],[1,-.73],[1,.75],[.76,1],[-.8,1],[-1,.76],[-1,-.72]];
  const vertices=[],indices=[];
  for(const yy of [-h/2,h/2])for(const [px,pz] of pts)vertices.push(px*w*.5,yy,pz*d*.5);
  for(let j=0;j<8;j++){const k=(j+1)%8;indices.push(j,k,8+j,k,8+k,8+j);}
  for(let j=1;j<7;j++){indices.push(0,j+1,j,8,8+j,8+j+1);}
  const g=G(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setIndex(indices);g.computeVertexNormals();return add(g,mat,x,y,z);
 };
 for(const side of [-1,1]){
  const x=side*3.75;
  polygonStone(x,.36,0,3.1,.72,2.9,stone);
  polygonStone(x,1.05,0,2.65,.35,2.45,trim);
  // Small relief courses anchored to the pier, not free-standing sticks.
  for(let i=0;i<3;i++){
   const y=2.5+i*1.7;
   polygonStone(x,y,-.93,1.75,.24,.25,i%2?cut:trim);
  }
 }
 // Broken masonry lies on the floor, broad flat stones and scattered rubble.
 for(const [x,z,w,h,d,ang] of [
  [-5.0,1.5,1.7,.65,1.2,.09],[-4.25,2.2,1.3,.46,1.0,-.08],
  [4.9,1.6,1.8,.64,1.3,-.14],[5.85,-.8,1.35,.45,1.1,.07],
  [2.9,2.4,1.2,.38,.85,-.12]
 ]){
  polygonStone(x,h*.5,z,w,h,d,stone).rotation.z=ang;
 }
 const scale=Number.isFinite(options.scale)?Math.max(.1,Math.min(4,options.scale)):1;
 group.scale.setScalar(scale);
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.parent?.remove(group);group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
