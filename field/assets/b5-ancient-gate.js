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
 // Weathered structural stone with rounded bevel rings and gently
 // undulating faces. No sharp noise peaks; retain the original silhouette.
 const weatheredCore=(x,y,z,w,h,d,mat=stone)=>{
  const n=12,verts=[],indices=[];
  const outline=[[-.78,-1],[-.18,-1],[.66,-1],[1,-.76],[1,-.1],[1,.72],[.75,1],[.14,1],[-.72,1],[-1,.72],[-1,.06],[-1,-.74]];
  const rings=7;
  for(let k=0;k<rings;k++){
   const t=k/(rings-1),yy=(t-.5)*h;
   const bevel=(k===0||k===rings-1)?.10:(k===1||k===rings-2)?.035:0;
   for(let j=0;j<n;j++){
    const [px,pz]=outline[j];
    const wave=(k>0&&k<rings-1)?(.018*Math.sin(j*2.1+k*.9)+.012*Math.cos(j*.8-k*1.7)):0;
    const scale=1-bevel+wave;
    verts.push(px*w*.5*scale,yy,pz*d*.5*scale);
   }
  }
  for(let k=0;k<rings-1;k++)for(let j=0;j<n;j++){
   const q=(j+1)%n,a=k*n+j,b=k*n+q,c=(k+1)*n+j,e=(k+1)*n+q;
   indices.push(a,b,c,b,e,c);
  }
  for(let j=1;j<n-1;j++){indices.push(0,j+1,j);indices.push((rings-1)*n,(rings-1)*n+j,(rings-1)*n+j+1);}
  const geo=G(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();
  return add(geo,mat,x,y,z);
 };
 // Eroded fracture faces: uneven but broadly planar chipped ends.
 // The fractured cross-section is a real cap with bevelled rim, not spikes.
 const fracturedStone=(x,y,z,w,h,d,mat=stone,brokenEnd=1)=>{
  const nx=9,nz=7,verts=[],indices=[];
  const at=(i,j)=>j*nx+i;
  const xs=Array.from({length:nx},(_,i)=>i/(nx-1));
  const zs=Array.from({length:nz},(_,j)=>j/(nz-1));
  const top=[],bottom=[];
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
   const u=xs[i],v=zs[j],edge=Math.min(u,1-u,v,1-v);
   const erode=Math.min(1,edge*9);
   const chips=(Math.sin(i*2.17+j*1.3)+Math.sin(i*.83-j*2.4))*.024*h*erode;
   const fracture=brokenEnd*(u>.68?(u-.68)/.32:0)*(.12+.08*Math.sin(v*6.28))*h;
   const xx=(u-.5)*w,zz=(v-.5)*d;
   bottom.push([xx,-h/2,zz]);
   top.push([xx,h/2-fracture+chips,zz]);
  }
  for(const p of bottom)verts.push(...p);
  for(const p of top)verts.push(...p);
  const topOffset=nx*nz;
  for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){
   const a=topOffset+at(i,j),b=topOffset+at(i+1,j),c=topOffset+at(i,j+1),e=topOffset+at(i+1,j+1);
   indices.push(a,c,b,b,c,e);
  }
  const ring=[];
  for(let i=0;i<nx;i++)ring.push(at(i,0));
  for(let j=1;j<nz;j++)ring.push(at(nx-1,j));
  for(let i=nx-2;i>=0;i--)ring.push(at(i,nz-1));
  for(let j=nz-2;j>0;j--)ring.push(at(0,j));
  for(let k=0;k<ring.length;k++){
   const a=ring[k],b=ring[(k+1)%ring.length];
   indices.push(a,b,topOffset+a,b,topOffset+b,topOffset+a);
  }
  for(let j=1;j<nz-1;j++)for(let i=1;i<nx-1;i++){
   const a=at(i,j),b=at(i+1,j),c=at(i,j+1),e=at(i+1,j+1);
   indices.push(a,b,c,b,e,c);
  }
  const geo=G(new THREE.BufferGeometry());
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  return add(geo,mat,x,y,z);
 };
 // Continuous fluted pillar shaft: one closed mesh per pier.
 // Vertical grooves are cut into its front/back and side cross-sections,
 // not separate rods glued to the surface.
 const flutedShaft=(x,bottom,h,w=1.95,d=1.86)=>{
  const n=64,levels=29,verts=[],idx=[];
  for(let k=0;k<levels;k++){
   const t=k/(levels-1),y=bottom+t*h;
   for(let j=0;j<n;j++){
    const a=2*Math.PI*j/n,c=Math.cos(a),q=Math.sin(a);
    const norm=Math.max(Math.abs(c),Math.abs(q));
    const bx=c/norm*w*.5,bz=q/norm*d*.5;
    // Grooves run the entire height, following a softly weathered outline.
    const front=Math.abs(q)>.84;
    const side=Math.abs(c)>.84;
    const across=front?bx/(w*.5):bz/(d*.5);
    const grooves=(front||side)?Math.pow(Math.max(0,Math.cos(across*3*Math.PI)),8)*.11:0;
    const ripple=.025*Math.sin(t*19+a*3)+.014*Math.sin(t*31-a*5);
    const edge=1-.055*Math.pow(Math.abs(t-.5)*2,9);
    const shrink=1+(ripple-grooves)/Math.max(w,d);
    verts.push(x+bx*edge*shrink,y,bz*edge*shrink);
   }
  }
  for(let k=0;k<levels-1;k++)for(let j=0;j<n;j++){
   const a=k*n+j,b=k*n+(j+1)%n,c=(k+1)*n+j,d=(k+1)*n+(j+1)%n;
   idx.push(a,b,c,b,d,c);
  }
  for(let j=1;j<n-1;j++){idx.push(0,j+1,j);idx.push((levels-1)*n,(levels-1)*n+j,(levels-1)*n+j+1);}
  const g=G(new THREE.BufferGeometry());
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setIndex(idx);g.computeVertexNormals();
  return add(g,stone,0,0,0);
 };
 // Reference silhouette: horizontal broken lintel and two masonry piers.
 // There is NO large triangular / pointed arch spanning the gate.
 for(const side of [-1,1]){
  const x=side*3.75,h=side<0?9.8:7.1;
  weatheredCore(x,.7,0,2.65,1.4,2.5);
  flutedShaft(x,1.4,h);
  // Capital and plinth remain distinct architectural pieces.
  weatheredCore(x,1.4+h,0,2.7,.48,2.6,trim);
 }
 // Surviving flat lintel sections, with a broken centre and right end.
 for(const [x,y,w,ang] of [
  [-3.3,11.45,3.6,0],[-.75,11.45,1.7,-.025],
  [2.45,9.05,2.7,-.045],[4.15,9.0,1.45,-.11]
 ]){
  const stoneBeam=fracturedStone(x,y,0,w,.78,2.1,stone,1);stoneBeam.rotation.z=ang;
  weatheredCore(x,y+.46,-.02,w+.12,.18,2.3,trim).rotation.z=ang;
 }
 // Thick broken arch shoulders grow directly out of each pier.
 // The missing centre remains open, matching the ruined lintel silhouette.
 for(const side of [-1,1]){
  const x=side*3.75;
  const shoulder=weatheredCore(x-side*.63,8.55,0,1.65,1.48,1.88,stone);
  shoulder.rotation.z=side*.14;
  const upper=weatheredCore(x-side*1.42,9.18,0,1.72,1.28,1.88,stone);
  upper.rotation.z=side*.32;
  const broken=fracturedStone(x-side*1.91,9.46,0,1.22,1.06,1.88,cut,1);
  broken.rotation.z=side*.36;
 }
 // A collapsed right cornice creates a distinct asymmetric ruin silhouette.
 fracturedStone(4.8,8.9,-.18,1.7,.5,2.2,cut,1).rotation.z=-.17;
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
 // Faceted weathered masonry: four bevelled rings, irregular edges,
 // flat top and side planes. Broad, shallow facets rather than spikes.
 const polygonStone=(x,y,z,w,h,d,mat=stone)=>{
  const n=12,verts=[],indices=[];
  const corners=[[-.76,-1],[-.16,-1],[.64,-1],[1,-.77],[1,-.18],[1,.68],[.73,1],[.12,1],[-.69,1],[-1,.74],[-1,.08],[-1,-.72]];
  const irregular=corners.map((p,j)=>[
   p[0]*(.965+.035*rand()),p[1]*(.965+.035*rand())
  ]);
  const rings=[
   {y:-h/2,inset:.085},{y:-h/2+Math.min(h*.20,.18),inset:0},
   {y:h/2-Math.min(h*.24,.20),inset:0},{y:h/2,inset:.12}
  ];
  for(let k=0;k<rings.length;k++){
   const ring=rings[k];
   for(let j=0;j<n;j++){
    const p=irregular[j],scale=1-ring.inset;
    const perturb=(k===1||k===2)?(rand()-.5)*Math.min(.045,w*.018):0;
    verts.push(p[0]*w*.5*scale+perturb,ring.y,p[1]*d*.5*scale+perturb);
   }
  }
  for(let k=0;k<rings.length-1;k++)for(let j=0;j<n;j++){
   const next=(j+1)%n,a=k*n+j,b=k*n+next,c=(k+1)*n+j,e=(k+1)*n+next;
   indices.push(a,b,c,b,e,c);
  }
  for(let j=1;j<n-1;j++){
   indices.push(0,j+1,j);
   indices.push(3*n,3*n+j,3*n+j+1);
  }
  const g=G(new THREE.BufferGeometry());
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setIndex(indices);g.computeVertexNormals();
  return add(g,mat,x,y,z);
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
 // Carved pier detail pass: recessed panels and chamfered masonry bands.
 // Keep the broken horizontal silhouette unchanged.
 for(const side of [-1,1]){
  const x=side*3.75;
  for(const z of [-1.09,1.09]){
   const facing=Math.sign(z);
   for(const y of [3.1,5.0]){
    // Three stepped layers give the inset an actual architectural depth.
    polygonStone(x,y,z,1.35,1.48,.11,trim);
    polygonStone(x,y,z+facing*.075,1.09,1.22,.085,cut);
    polygonStone(x,y,z+facing*.128,.74,.94,.07,stone);
    for(const dx of [-.46,.46]){
     block(x+dx,y,z+facing*.19,.085,1.05,.09,trim);
    }
    block(x,y,z+facing*.20,.87,.085,.1,trim);
   }
  }
  // Stone course divisions and shallow stepped corner chamfers.
  for(const y of [2.1,3.95,5.85,7.5]){
   polygonStone(x,y,-.01,2.16,.19,2.04,trim);
   block(x,y+.14,-1.04,1.62,.07,.13,cut);
  }
  for(const sx of [-.77,.77]){
   block(x+sx,4.65,-.88,.17,5.05,.16,trim);
   block(x+sx*.87,4.65,-1.02,.08,4.68,.12,stone);
  }
 }
 // Broken pillar faces inspired by the approved eroded masonry reference.
 // Large broad stone islands alternate with recessed fracture channels;
 // each face is a shallow solid with chipped multi-ring edges, not a decal.
 const fracturePlate=(x,y,z,w,h,depth,front=1,material=stone,seedOffset=0)=>{
  const n=11,verts=[],idx=[],phase=seedOffset*.83;
  const radii=Array.from({length:n},(_,i)=>.82+.13*Math.sin(i*2.7+phase)+.05*Math.cos(i*4.1+phase));
  for(const [scale,offset] of [[.78,0],[1,.085],[.93,depth]]){
   for(let i=0;i<n;i++){
    const a=Math.PI*2*i/n;
    const xx=Math.cos(a)*w*.5*radii[i]*scale;
    const yy=Math.sin(a)*h*.5*radii[i]*scale;
    verts.push(xx,yy,front*offset);
   }
  }
  for(let ring=0;ring<2;ring++)for(let i=0;i<n;i++){
   const j=(i+1)%n,a=ring*n+i,b=ring*n+j,c=(ring+1)*n+i,d=(ring+1)*n+j;
   idx.push(a,b,c,b,d,c);
  }
  for(let i=1;i<n-1;i++)idx.push(2*n,2*n+i,2*n+i+1);
  const geo=G(new THREE.BufferGeometry());
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setIndex(idx);geo.computeVertexNormals();
  const plate=add(geo,material,x,y,z);return plate;
 };
 for(const side of [-1,1]){
  const x=side*3.75;
  for(const facing of [-1,1]){
   // Both FRONT and BACK carry the same depth of broken masonry.
   const z=facing*1.09;
   const scars=[
    {dx:-.17,y:2.75,w:1.33,h:1.52,rot:-.12},
    {dx:.12,y:4.18,w:1.56,h:1.78,rot:.16},
    {dx:-.10,y:5.76,w:1.41,h:1.43,rot:-.09},
    {dx:.19,y:7.05,w:1.32,h:1.19,rot:.13}
   ];
   for(let i=0;i<scars.length;i++){
    const p=scars[i];
    // Dark fracture recess reads as a genuine missing layer.
    fracturePlate(x+p.dx,p.y,z,p.w*1.10,p.h*1.10,.025,facing,cut,i+side*3);
    const island=fracturePlate(x+p.dx,p.y,z+facing*.048,p.w,p.h,.15,facing,i%3===0?trim:stone,i+side*5);
    island.rotation.z=p.rot;
   }
   // Broad gouges crossing between surviving islands.
   for(const [y,dx,angle] of [[3.52,-.24,-.28],[5.06,.19,.22],[6.46,-.12,-.19]]){
    const gouge=block(x+dx,y,z+facing*.11,.66,.11,.12,cut);
    gouge.rotation.z=angle;
   }
  }
 }
 // Layered capstones, with small missing pieces on the surviving lintel.
 for(const [x,y,w] of [[-3.3,11.94,3.58],[-.75,11.94,1.66],[2.45,9.54,2.65]]){
  polygonStone(x,y,-.06,w,.21,2.26,trim);
  polygonStone(x,y+.17,-.08,w*.88,.12,2.03,stone);
 }
 // Broken masonry lies on the floor, broad flat stones and scattered rubble.
 for(const [x,z,w,h,d,ang] of [
  [-5.0,1.5,1.7,.65,1.2,.09],[-4.25,2.2,1.3,.46,1.0,-.08],
  [4.9,1.6,1.8,.64,1.3,-.14],[5.85,-.8,1.35,.45,1.1,.07],
  [2.9,2.4,1.2,.38,.85,-.12]
 ]){
  fracturedStone(x,h*.5,z,w,h,d,stone,1).rotation.z=ang;
 }
 const scale=Number.isFinite(options.scale)?Math.max(.1,Math.min(4,options.scale)):1;
 group.scale.setScalar(scale);
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.parent?.remove(group);group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
