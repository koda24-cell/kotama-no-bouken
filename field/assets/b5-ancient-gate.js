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
 // Replace visually harsh rectangular base corners with low polygonal
 // battered stone footings; the original structural cores remain intact.
 const bevelledFooting=(x,z,w,d)=>{
  const shape=new THREE.Shape();
  const r=.28;
  shape.moveTo(-w/2+r,-d/2);
  shape.lineTo(w/2-r,-d/2);shape.lineTo(w/2,-d/2+r);
  shape.lineTo(w/2,d/2-r);shape.lineTo(w/2-r,d/2);
  shape.lineTo(-w/2+r,d/2);shape.lineTo(-w/2,d/2-r);
  shape.lineTo(-w/2,-d/2+r);shape.closePath();
  const geo=G(new THREE.ExtrudeGeometry(shape,{depth:.38,bevelEnabled:true,bevelThickness:.09,bevelSize:.11,bevelSegments:2,curveSegments:1}));
  const obj=add(geo,stone,x,.08,z);
  obj.rotation.x=-Math.PI/2;
 };
 for(const x of [-4.5,4.5])bevelledFooting(x,0,3.0,3.0);
 // High-detail Gothic relief, deliberately modeled rather than painted.
 // Repeated stone ribs make the arch and pillars read from oblique angles.
 const groove=M(new THREE.MeshStandardMaterial({color:0x393640,roughness:1,flatShading:true}));
 const moss=M(new THREE.MeshStandardMaterial({color:0x4a5448,roughness:1,flatShading:true}));
 const rib=(a,b,w=.11,depth=.14,mat=trim)=>beam(a,b,w,depth,mat);
 // Nested pointed arch mouldings, with dark recessed band and light raised trim.
 for(const z of [-.99,-1.19,.98]){
  for(const offset of [-.32,0,.32]){
   const x0=-4.0+offset,x1=-2.25+offset,x2=offset,x3=2.15+offset,x4=3.85+offset;
   const y=offset===0?0:Math.abs(offset)*.26;
   rib([x0,10.5-y,z],[x1,13.3-y,z],.11,.13,offset===0?trim:cut);
   rib([x1,13.3-y,z],[x2,15.5-y,z],.11,.13,offset===0?trim:cut);
   rib([x2,15.5-y,z],[x3,13.4-y,z],.11,.13,offset===0?trim:cut);
   rib([x3,13.4-y,z],[x4,10.9-y,z],.11,.13,offset===0?trim:cut);
  }
 }
 // Tall blind pointed-arch windows carved in each pillar face.
 for(const side of [-1,1]){
  const x=side*4.5,h=side<0?12.8:10.7;
  for(const z of [-1.045,1.045]){
   for(const y0 of [3.0,7.3]){
    const top=Math.min(y0+3.3,h+1.0);
    block(x,(top+y0)/2,z,.86,top-y0,.035,cut);
    for(const edge of [-.48,.48]){
     block(x+edge,(top+y0)/2,z+Math.sign(z)*.055,.105,top-y0,.09,trim);
    }
    rib([x-.48,top-.66,z+Math.sign(z)*.08],[x,top,z+Math.sign(z)*.08],.115,.1);
    rib([x,top,z+Math.sign(z)*.08],[x+.48,top-.66,z+Math.sign(z)*.08],.115,.1);
    block(x,(top+y0)/2,z+Math.sign(z)*.09,.085,top-y0-.2,.085,trim);
    block(x,(top+y0)/2,z+Math.sign(z)*.1,.64,.085,.1,trim);
   }
  }
  // Triple-tier cornice and fractured crest above the surviving tower.
  for(let tier=0;tier<3;tier++){
   block(x,2+h+.36+tier*.17,0,2.55-tier*.18,.12,2.45-tier*.17,tier===1?cut:trim);
  }
  if(side<0){
   for(let j=0;j<7;j++){
    const xx=x-1.0+j*.34;
    const hh=.65+rand()*1.25;
    block(xx,2+h+.63+hh/2,-.22,.25,hh,.5,j%2?stone:trim);
   }
  }else{
   // Right crest is broken and its upper stonework has slid sideways.
   const fallen=block(x+.78,2+h+.55,-.18,1.3,.48,1.85,stone);
   fallen.rotation.z=-.22;
  }
  // Thin carved vertical flutes and relief bands on side faces.
  for(const sx of [-.56,.56]){
   for(const z of [-.58,.58]){
    block(x+sx,5.8,z,.1,7.1,.11,trim);
   }
  }
 }
 // Shattered horizontal cornice courses, offset with missing pieces.
 for(let i=0;i<7;i++){
  const x=-3.1+i*.87;
  if(i===4||i===5)continue;
  const piece=block(x,12.95+(i%3)*.045,-.68,.8,.22,1.1,i%2?stone:trim);
  piece.rotation.z=(i%2?-.035:.03);
 }
 // Extra buttress stubs and structural wedges, not free-floating rods.
 for(const side of [-1,1]){
  const x=side*5.25;
  block(x,2.15,1.08,1.25,3.1,1.1,cut);
  rib([x,3.5,1.1],[side*4.5,5.1,.8],.42,.58,stone);
  for(let i=0;i<3;i++){
   const h=.4+i*.55;
   block(x+side*.3,h+.14,1.15,1.1,.28,1.4,i===1?trim:stone);
  }
 }
 // Weathering on stone, small localized chips and moss caught in joints.
 for(let i=0;i<28;i++){
  const side=i%2?-1:1;
  const x=side*(4.0+rand()*1.1),y=2+rand()*9,z=(rand()-.5)*1.8;
  if(i%3===0){
   const chip=block(x,y,z,.22+rand()*.28,.13+rand()*.22,.19,cut);
   chip.rotation.z=(rand()-.5)*.6;
  }else{
   const growth=block(x,y,z,.1+rand()*.19,.04+rand()*.12,.1+rand()*.2,moss);
   growth.rotation.y=rand()*Math.PI;
  }
 }
 // A heavier, grounded pile of angular masonry along the base, mixed sizes.
 for(let i=0;i<24;i++){
  const side=i%2?-1:1,x=side*(3.1+rand()*4.1),z=(rand()-.5)*4.4;
  rock(x,z,.25+rand()*.88,.12+rand()*.65,.3+rand()*.9);
 }
 const scale=Number.isFinite(options.scale)?Math.max(.1,Math.min(4,options.scale)):1;
 group.scale.setScalar(scale);
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.parent?.remove(group);group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
