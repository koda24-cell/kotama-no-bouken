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
 // The open arch leaves a clear central silhouette behind the boss.
 // Right pillar is damaged; left pillar remains taller.
 for(const side of [-1,1]){
  const x=side*4.5,h=side<0?12.8:10.7;
  block(x,.7,0,2.3,1.4,2.3);
  block(x,1.6+h/2,0,1.48,h,1.6);
  for(const z of [-.83,.83]){
   block(x,2+h*.45,z,.18,h*.82,.22,trim);
   block(x,2+h*.45,z+Math.sign(z)*.16,.12,h*.77,.14,cut);
  }
  for(let y=3;y<h+1;y+=2.6){
   block(x,y,0,1.95,.26,2.0,trim);
   block(x,y+.33,-.95,1.55,.12,.15,cut);
  }
  block(x,2+h,0,2.35,.55,2.2,trim);
  // Recessed pointed tracery on the pillar face.
  for(const z of [-1.02,1.02]){
   beam([x-.4,4,z],[x,5.2,z],.12,.12,trim);
   beam([x,5.2,z],[x+.4,4,z],.12,.12,trim);
  }
 }
 // Pointed arch, deliberately incomplete and asymmetric.
 beam([-4.0,10.5,0],[-2.25,13.3,0],1.05,1.55);
 beam([-2.25,13.3,0],[0,15.5,0],.9,1.55);
 beam([0,15.5,0],[2.15,13.4,0],.9,1.55);
 beam([2.15,13.4,0],[3.85,10.9,0],1.0,1.55);
 for(const side of [-1,1]){
  beam([side*4.1,10.6,-.87],[side*2.2,13.2,-.87],.19,.18,trim);
  beam([side*2.2,13.2,-.87],[0,15.05,-.87],.18,.18,trim);
 }
 // Surviving horizontal cornice and chipped detached pieces.
 block(-3.6,13.3,0,3.1,.55,2.2,trim);
 block(-4.8,13.65,0,1.8,.22,2.4,cut);
 block(3.95,11.4,0,2.3,.44,2.1,trim).rotation.z=-.12;
 // Broken silhouette: asymmetrical rubble piles resting on the ground.
 const rock=(x,z,sx,h,sz)=>{
  const n=7,verts=[],idx=[],phase=rand()*Math.PI*2;
  for(let j=0;j<n;j++){const a=phase+j*2*Math.PI/n,r=.65+rand()*.35;verts.push(Math.cos(a)*sx*r,0,Math.sin(a)*sz*r);}
  for(let j=0;j<n;j++){const a=phase+j*2*Math.PI/n;verts.push(Math.cos(a)*sx*.3,h*(.55+rand()*.45),Math.sin(a)*sz*.3);}
  verts.push((rand()-.5)*sx*.3,h,(rand()-.5)*sz*.3);
  for(let j=0;j<n;j++){const k=(j+1)%n;idx.push(j,k,n+j,k,n+k,n+j,n+j,n+k,2*n);}
  const geo=G(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();
  add(geo,rand()>.5?cut:stone,x,0,z);
 };
 for(let i=0;i<35;i++){
  const side=i%3===0?-1:1,x=side*(3.5+rand()*3.4),z=(rand()-.5)*4.2;
  rock(x,z,.24+rand()*.78,.18+rand()*.75,.28+rand()*.75);
 }
 // Detached fragment of a broken right-hand arch, grounded.
 block(6.1,.58,-1.25,1.5,1.05,1.2,stone).rotation.z=.28;
 block(6.65,.24,.4,.8,.45,1.1,cut).rotation.z=-.24;
 const scale=Number.isFinite(options.scale)?Math.max(.1,Math.min(4,options.scale)):1;
 group.scale.setScalar(scale);
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.parent?.remove(group);group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
