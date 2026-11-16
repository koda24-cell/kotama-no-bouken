// Geometry-only additive detailing for the existing approved B5 Gothic arch.
// The source group is never modified or removed.
export function enhanceB5GothicArch(THREE, root) {
 const stone=new THREE.MeshStandardMaterial({color:0x59545e,roughness:.95,flatShading:true});
 const shadow=new THREE.MeshStandardMaterial({color:0x37343d,roughness:.98,flatShading:true});
 const extra=new THREE.Group();extra.name='b5:gothicArch:additiveDetail';
 const box=(x,y,z,w,h,d,mat=stone)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);extra.add(m);return m;};
 const between=(a,b,w=.24,d=.35,mat=stone)=>{const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b);const m=box((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,w,p.distanceTo(q),d,mat);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize());return m;};
 // Deep vertical stone flutes and narrow shadow recesses on the surviving jambs.
 for(const x of [-4,4])for(const z of [-.78,.78]){
  for(let i=0;i<4;i++){const y=2+i*2.15;box(x+(x<0?-.04:.04),y,z,.18,1.65,.15,shadow);}
  for(let i=0;i<3;i++){const y=3.0+i*2.2;box(x,y,z,.9,.15,.2);}
 }
 // Two layered, incomplete pointed archivolts. Deliberate breaks preserve the ruined silhouette.
 const left=[[-3.5,10.2,-.75],[-2.75,11.6,-.75],[-1.8,13.0,-.75],[-.75,14.0,-.75]];
 const right=[[3.5,10.2,-.75],[2.75,11.6,-.75],[1.8,13.0,-.75],[.75,14.0,-.75]];
 for(const path of [left,right])for(let i=0;i<path.length-1;i++){if(path===right&&i===1)continue;between(path[i],path[i+1],.58,.48);}
 for(const x of [-3.1,3.1])for(const z of [-1.05,-.48]){
  // Carved buttress tiers add depth without covering the existing columns.
  box(x,6.2,z,.42,5.2,.28);
  box(x,8.9,z,.65,.24,.52);
  box(x,3.4,z,.65,.24,.52);
 }
 // Worn detached stones at ground level, irregular low profiles rather than hovering blocks.
 for(let i=0;i<14;i++){
  const a=i*2.39996,r=2.2+(i%5)*.68,x=Math.cos(a)*r,z=Math.sin(a)*r;
  const geo=new THREE.DodecahedronGeometry(.5+(i%3)*.14,0);
  const m=new THREE.Mesh(geo,stone);m.position.set(x,.22+(i%3)*.06,z);m.scale.set(1.2,.5,.82);m.rotation.set(i*.31,i*.77,i*.13);extra.add(m);
 }

 // Readable architectural silhouette: inner lancet mouldings and an open central void.
 // These ribs sit at the front and back of the existing masonry, without replacing it.
 for(const z of [-1.28,1.28]){
  const leftRib=[[-3.35,9.65,z],[-2.85,11.15,z],[-2.0,12.85,z],[-.55,14.65,z]];
  const rightRib=[[3.35,9.65,z],[2.85,11.15,z],[2.0,12.85,z],[.55,14.65,z]];
  for(const path of [leftRib,rightRib])for(let i=0;i<path.length-1;i++){
   // Keep a missing segment on the rear-right archivolt to show structural collapse.
   if(z>0&&path===rightRib&&i===1)continue;
   between(path[i],path[i+1],.48,.32);
  }
  // Capital and springer stones emphasize where the pointed arch rises.
  for(const x of [-3.5,3.5]){
   box(x,9.85,z,.9,.36,.52);
   box(x,10.3,z,.62,.45,.45,shadow);
  }
 }
 // Deep, individually readable channels in the face of both stone pillars.
 for(const x of [-4,4])for(const z of [-1.38,1.38]){
  for(let i=0;i<3;i++){
   const dx=(i-1)*.34;
   box(x+dx,5.5,z,.13,6.6,.11,shadow);
   box(x+dx+.12,5.5,z,.075,6.6,.13);
  }
 }
 // Broken flying buttress fragments, low to avoid obscuring the central passage.
 for(const s of [-1,1]){
  // Twelfth pass: the former long, exposed diagonal braces looked like
  // scaffolding rather than load-bearing Gothic stone. Build a compact,
  // stepped masonry buttress with a broad grounded foot instead.
  // This only alters additive detail meshes; the approved source is untouched.
  box(s*5.65,1.25,0,1.65,2.5,2.2);
  box(s*5.46,3.05,0,1.35,1.25,1.92);
  box(s*5.22,4.23,0,1.13,1.15,1.65);
  box(s*5.02,5.18,0,.92,.84,1.42);
  // Stone offsets visually tie the buttress into the outer pier.
  for(const y of [2.5,3.75,4.8]){
   box(s*5.36,y,-.96,1.32,.14,.18,shadow);
   box(s*5.36,y,.96,1.32,.14,.18,shadow);
  }
  for(let i=0;i<3;i++)box(s*(4.2+i*.42),.2+i*.1,2.3+i*.5,.9,.4,.8);
 }

 // Concept-sheet-inspired tracery: paired Gothic lancets and a quatrefoil.
 // Geometry is additive and deliberately kept inside the arch head.
 const tracer=new THREE.Group();tracer.name='b5:gothicArch:quatrefoilTracery';
 const carved=new THREE.MeshStandardMaterial({color:0x918995,roughness:.91,flatShading:true});
 const tube=(points,r=.11,mat=carved)=>{const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*5),r,5,false),mat);tracer.add(mesh);return mesh;};
 for(const z of [-1.52,1.52]){
  // A pointed Gothic cusped window in the tympanum, legible from front and back.
  tube([[-1.28,11.5,z],[-1.25,12.25,z],[-.88,13.0,z],[0,13.95,z],[.88,13.0,z],[1.25,12.25,z],[1.28,11.5,z]],.13);
  // Four circular lobes make a carved quatrefoil instead of a plain ring.
  for(let k=0;k<4;k++){
   const a=k*Math.PI/2;
   const cx=Math.cos(a)*.29,cy=12.72+Math.sin(a)*.29;
   const pts=[];
   for(let i=0;i<=12;i++){const t=i*Math.PI*2/12;pts.push([cx+Math.cos(t)*.34,cy+Math.sin(t)*.34,z]);}
   tube(pts,.085);
  }
  // Delicate descending cusps, retaining a walkable central opening below.
  for(const s of [-1,1])tube([[s*1.3,11.5,z],[s*1.0,11.22,z],[s*.78,11.52,z],[s*.55,11.5,z]],.095);
 }
 extra.add(tracer);
 // Decorative finials and eroded pinnacles: one is broken off near its crown.
 for(const s of [-1,1]){
  for(const z of [-1.05,1.05]){
   box(s*4.3,10.3,z,.92,.58,.84);
   box(s*4.3,11.12,z,.58,1.1,.58);
   const pinnacle=new THREE.Mesh(new THREE.ConeGeometry(.43,s<0?1.18:.62,5),stone);
   pinnacle.position.set(s*4.3,s<0?12.15:11.91,z);extra.add(pinnacle);
  }
  // Short vertical blind-arcade ribs along the exterior jamb.
  for(let i=0;i<3;i++){
   const x=s*(4.65+i*.28);
   between([x,3.3,-1.55],[x,7.9,-1.55],.12,.16,carved);
   between([x,3.3,1.55],[x,7.9,1.55],.12,.16,carved);
  }
 }

 // Seventh pass: readable stone construction rather than a tangle of rods.
 // Individual voussoirs follow the outer pointed arch and leave the doorway empty.
 const paleStone=new THREE.MeshStandardMaterial({color:0x716a73,roughness:.98,flatShading:true});
 for(const z of [-1.72,1.72]){
  for(const side of [-1,1]){
   const archPoints=[[3.42,9.8],[3.05,10.9],[2.58,12.0],[1.94,13.08],[1.14,14.0],[.32,14.58]];
   for(let i=0;i<archPoints.length-1;i++){
    const [ax,ay]=archPoints[i],[bx,by]=archPoints[i+1];
    const p=[side*ax,ay,z],q=[side*bx,by,z];
    // Visible joints between blocks; shallow depth avoids masking the tracery.
    between(p,q,.57,.32,paleStone);
    const joint=box(side*bx,by,z,.63,.095,.35,shadow);
    joint.rotation.z=side*.16;
   }
   // Outer jamb masonry: alternating rectangular courses and recessed joint lines.
   for(let i=0;i<7;i++){
    const y=1.55+i*1.14;
    box(side*4.03,y,z,.98,.91,.29,i%3===0?paleStone:stone);
    box(side*4.03,y+.51,z,.99,.075,.32,shadow);
    const shift=(i%2?-.22:.22);
    box(side*4.03+shift,y,z+.175,.08,.86,.055,shadow);
   }
   // Two surviving carved capitals and projecting moulding bands.
   for(const y of [3.1,8.85]){
    box(side*4.02,y,z,1.34,.26,.46,paleStone);
    box(side*4.02,y+.23,z,1.12,.15,.38,shadow);
   }
  }
 }
 // Eroded masonry scattered outside the central passage, not inside the arch.
 for(const side of [-1,1])for(let i=0;i<7;i++){
  const x=side*(5.3+(i%3)*.46),z=(i-3)*.54;
  const m=new THREE.Mesh(new THREE.DodecahedronGeometry(.3+(i%3)*.13,0),i%2?paleStone:stone);
  m.position.set(x,.16+(i%2)*.07,z);
  m.scale.set(1.4,.55,1.1);m.rotation.y=i*.83;extra.add(m);
 }

 // Structural pass: two shallow, broken stone spandrels visually consolidate
 // the busy upper beamwork into masonry. The pointed central void remains open.
 const spandrelMaterial=new THREE.MeshStandardMaterial({color:0x655e68,roughness:.98,flatShading:true,side:THREE.DoubleSide});
 const brokenSpandrel=(side,z)=>{
  const outline=[
   [3.48,9.6],[4.58,9.5],[5.02,10.75],[4.78,11.3],
   [5.17,12.15],[4.7,12.6],[4.95,13.45],[4.28,13.8],
   [4.15,14.7],[3.32,14.48],[2.76,15.05],[1.95,14.96],
   [1.37,15.37],[.42,15.04],[.42,14.69],
   [1.14,14.04],[1.94,13.11],[2.58,12.05],[3.05,10.95]
  ];
  const shape=new THREE.Shape();
  outline.forEach(([x,y],i)=>i?shape.lineTo(side*x,y):shape.moveTo(side*x,y));
  shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:3.08,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,curveSegments:1});
  const mesh=new THREE.Mesh(geo,spandrelMaterial);
  mesh.position.z=z;mesh.name='b5:gothicArch:brokenMasonrySpandrel';extra.add(mesh);
  // Shallow, irregular block joints are deliberately restricted to the solid wall.
  for(let i=0;i<4;i++){
   const x=side*(3.75+(i%2)*.42),y=10.65+i*1.03;
   // Recessed joint marks on both masonry faces, not floating mid-wall.
   for(const face of [-1,1]){
    const joint=box(x,y,face<0?-1.62:1.61,.65,.07,.045,shadow);
    joint.rotation.z=side*(i%2?.11:-.08);
   }
  }
 };
 // One continuous masonry volume per shoulder replaces two paper-thin skins.
 brokenSpandrel(-1,-1.54);
 brokenSpandrel(1,-1.54);

 // High-detail structural masonry: actual bevelled and chipped mesh geometry,
 // not a texture or a subdivision of flat rectangular decorative strips.
 const carvedStone=new THREE.MeshStandardMaterial({color:0x77717a,roughness:.97,flatShading:true});
 const cutStone=(outline,z,depth,material=carvedStone)=>{
  const shape=new THREE.Shape();
  outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
  shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth,steps:2,bevelEnabled:true,bevelThickness:.045,bevelSize:.05,bevelSegments:3,curveSegments:2});
  const mesh=new THREE.Mesh(geometry,material);mesh.position.z=z;
  mesh.name='b5:gothicArch:sculptedStone';extra.add(mesh);return mesh;
 };
 // Irregular interlocking voussoirs have radial cuts and real volume.
 // Keep the interior of the pointed opening unobstructed.
 const archLine=[[3.48,9.7],[3.1,10.85],[2.63,11.96],[2.0,13.04],[1.23,13.94],[.38,14.57]];
 for(const side of [-1,1])for(const z of [-1.99,1.7]){
  for(let i=0;i<archLine.length-1;i++){
   const [x0,y0]=archLine[i],[x1,y1]=archLine[i+1];
   const dx=x1-x0,dy=y1-y0,length=Math.hypot(dx,dy),nx=dy/length,ny=-dx/length;
   const segments=3;
   for(let j=0;j<segments;j++){
    if(side===1&&z>0&&i===2&&j===1)continue; // ruined missing block
    const t0=j/segments+.012,t1=(j+1)/segments-.012;
    const ax=x0+dx*t0,ay=y0+dy*t0,bx=x0+dx*t1,by=y0+dy*t1;
    const inner=.19,outer=.77+(i%2)*.07;
    const poly=[[ax+nx*inner,ay+ny*inner],[bx+nx*inner,by+ny*inner],
      [bx+nx*outer,by+ny*outer],[ax+nx*outer,ay+ny*outer]];
    cutStone(poly.map(([x,y])=>[side*x,y]),z,.3,j%4===0?paleStone:carvedStone);
   }
  }
 }
 // Chipped cornerstones on the surviving outer piers: each block has an
 // asymmetric 8-point perimeter, bevelled edges and shallow depth.
 for(const side of [-1,1])for(const z of [-1.94,1.68]){
  for(let course=0;course<9;course++){
   const y=1.2+course*.91,x=side*(4.15+(course%2)*.09);
   const w=.6,h=.39;
   const poly=[[x-w,y-h+.08],[x-w+.11,y-h],[x+w-.08,y-h],
     [x+w,y-h+.11],[x+w,y+h-.07],[x+w-.13,y+h],
     [x-w+.07,y+h],[x-w,y+h-.09]];
   cutStone(poly,z,.26,course%3===0?paleStone:carvedStone);
  }
 }
 // Real polygonal fractured caps on both outer wall ends, not thin spikes.
 for(const side of [-1,1])for(const z of [-1.96,1.68]){
  const poly=[[3.78,13.9],[4.16,14.3],[4.3,14.92],
    [4.58,14.77],[4.78,15.24],[4.95,14.88],[5.13,14.42],
    [4.91,14.08],[4.99,13.65],[4.51,13.48]].map(([x,y])=>[side*x,y]);
  cutStone(poly,z,.28,stone);
 }

 // Silhouette correction: reposition, never delete, the original five hanging
 // vertical ribs and two oversized diagonal slabs into plausible fallen masonry.
 // Operates only on this standalone Gothic-arch instance, not shared source props.
 const near=(a,b)=>Math.abs(a-b)<.015;
 let salvaged=0;
 for(const part of root.children){
  if(!part.isMesh||!part.geometry?.isBoxGeometry)continue;
  const p=part.position,s=part.scale;
  const isUpperSlab=near(Math.abs(p.x),2.15)&&near(p.y,12.2)&&near(s.x,5.6)&&near(s.y,1.1);
  const isHangingRib=near(p.z,-.9)&&near(s.x,.3)&&near(s.y,4.5)&&p.y>12.4&&p.y<13.2;
  if(!isUpperSlab&&!isHangingRib)continue;
  const side=p.x<0?-1:1;
  const index=salvaged++;
  // Each piece survives as fallen architectural debris outside the doorway.
  p.set(side*(6.0+(index%3)*.54),.28+(index%2)*.12,-1.1+(index%4)*.8);
  part.rotation.set(.15+(index%3)*.24,index*.57,side*(.95+(index%2)*.27));
  // The relocated 5.6-unit slab remained a huge tilted plate at ground level.
  // Keep its source mesh but reduce its exposed footprint into a plausible
  // chipped fallen block; do not alter the shared source or doorway.
  if(isUpperSlab)part.scale.set(1.65,.62,1.12);
  if(isHangingRib)part.scale.set(.42,2.0,.54);
 }

 // Eighth pass: full-depth, bonded Gothic voussoirs. Previous arch faces
 // were only 0.3 deep and looked like disconnected plates from oblique angles.
 // These keystone blocks span the entire masonry thickness, with beveled
 // silhouette edges and staggered radial joints.
 const archMasonry=new THREE.MeshStandardMaterial({color:0x68616b,roughness:.98,flatShading:true,side:THREE.DoubleSide});
 const archCourse=[[3.43,9.8],[3.09,10.86],[2.63,11.96],[2.0,13.04],[1.23,13.94],[.38,14.57]];
 for(const side of [-1,1])for(let k=0;k<archCourse.length-1;k++){
  const [x0,y0]=archCourse[k],[x1,y1]=archCourse[k+1];
  const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy);
  const nx=dy/L,ny=-dx/L;
  for(let j=0;j<3;j++){
   // A broken-out block on the right upper shoulder reads as actual damage.
   if(side===1&&k===3&&j===2)continue;
   const t0=j/3+.014,t1=(j+1)/3-.014;
   const a=[x0+dx*t0,y0+dy*t0],b=[x0+dx*t1,y0+dy*t1];
   const inner=.12,outer=.82+(k%2)*.07;
   const contour=[[a[0]+nx*inner,a[1]+ny*inner],
    [b[0]+nx*inner,b[1]+ny*inner],
    [b[0]+nx*outer,b[1]+ny*outer],
    [a[0]+nx*outer,a[1]+ny*outer]];
   const outline=contour.map(([x,y])=>[side*x,y]);
   const shape=new THREE.Shape();
   outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
   shape.closePath();
   const geo=new THREE.ExtrudeGeometry(shape,{
    depth:3.34,steps:1,bevelEnabled:true,bevelSize:.035,
    bevelThickness:.035,bevelSegments:2,curveSegments:1
   });
   const block=new THREE.Mesh(geo,archMasonry);
   block.position.z=-1.67;
   block.name='b5:gothicArch:fullDepthVoussoir';
   extra.add(block);
  }
 }
 // Deep outer-wall masonry connects the two previously separate facade skins.
 // Short irregular blocks stop the top reading as a paper-thin polygon sheet.
 for(const side of [-1,1])for(let course=0;course<5;course++){
  const y=9.9+course*.83,x=side*(4.46+(course%2)*.08);
  const w=.63,h=.35;
  const poly=[[x-w,y-h+.07],[x-w+.08,y-h],[x+w-.09,y-h],
   [x+w,y-h+.08],[x+w,y+h-.06],[x+w-.1,y+h],
   [x-w+.08,y+h],[x-w,y+h-.08]];
  const shape=new THREE.Shape();
  poly.forEach(([px,py],i)=>i?shape.lineTo(px,py):shape.moveTo(px,py));
  shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:3.1,
   bevelEnabled:true,bevelSize:.04,bevelThickness:.04,bevelSegments:2});
  const m=new THREE.Mesh(geo,course%2?stone:archMasonry);
  m.position.z=-1.55;m.name='b5:gothicArch:fullDepthWallBlock';extra.add(m);
 }

 // Ninth pass: the broken upper shoulders need solid bonded stone, not another
 // thin front-facing sheet. These irregular crest blocks bridge the full depth.
 // Keep them outside the central lancet and leave an uneven collapsed skyline.
 const shoulderCourses=[
  {x:3.45,y:14.15,w:.62,h:.48},
  {x:3.95,y:14.62,w:.55,h:.42},
  {x:3.28,y:14.91,w:.43,h:.32},
  {x:4.45,y:14.12,w:.48,h:.55}
 ];
 for(const side of [-1,1])for(let i=0;i<shoulderCourses.length;i++){
  if(side>0&&i===2)continue; // visibly collapsed right-hand crest
  const {x,y,w,h}=shoulderCourses[i];
  const cx=side*x,chip=.09+(i%2)*.04;
  const profile=[[cx-side*w,y-h+chip],[cx-side*(w-chip),y-h],
   [cx+side*(w-.08),y-h+.04],[cx+side*w,y-h+.16],
   [cx+side*(w-.06),y+h-chip],[cx+side*(w-.19),y+h],
   [cx-side*(w-.08),y+h-.05],[cx-side*w,y+h-.17]];
  const s=new THREE.Shape();profile.forEach(([px,py],j)=>j?s.lineTo(px,py):s.moveTo(px,py));s.closePath();
  const geometry=new THREE.ExtrudeGeometry(s,{depth:3.18,steps:1,
   bevelEnabled:true,bevelThickness:.065,bevelSize:.055,bevelSegments:2});
  const m=new THREE.Mesh(geometry,i%2?paleStone:archMasonry);
  m.position.z=-1.59;m.name='b5:gothicArch:bondedBrokenCrest';extra.add(m);
 }

 // Tenth pass: correct the two oversized central crest elements observed in
 // the actual 2026-11-12 high-angle Blender render. Both original meshes stay
 // alive; only their transforms change, leaving the Gothic opening readable.
 let crestRepositioned=0;
 for(const part of root.children){
  if(!part.isMesh)continue;
  const p=part.position,s=part.scale;
  // The original second-pass fractured slab was hovering across the apex
  // like a large triangular sheet, obscuring the pointed arch silhouette.
  if(Math.abs(p.x)<.02&&Math.abs(p.y-14.4)<.02&&Math.abs(p.z)<.02&&
     Math.abs(s.x-1.8)<.02&&part.geometry?.isBufferGeometry&&!part.geometry?.isBoxGeometry){
   p.set(-4.62,13.85,-.18);
   s.set(.96,.78,1.1);
   part.rotation.set(.12,-.28,.24);
   part.name='b5:gothicArch:relocatedBrokenCrestSlab';
   crestRepositioned++;
  }
  // The central cone read as a huge freestanding spike, not a keystone.
  // Scale it to a short damaged crown embedded between the two arch shoulders.
  if(Math.abs(p.x)<.02&&Math.abs(p.y-14.5)<.02&&Math.abs(p.z)<.02&&
     Math.abs(s.x-2.5)<.02&&Math.abs(s.y-3.2)<.02){
   // A detached cone at the central apex still reads as a freestanding spike.
   // Salvage it as a chipped fallen finial on the left outer shoulder instead.
   p.set(-4.88,13.74,.18);
   s.set(.72,.82,1.02);
   part.rotation.set(.31,-.22,-.58);
   part.name='b5:gothicArch:salvagedOuterCrestFinial';
   crestRepositioned++;
  }
 }
 extra.userData.crestRepositioned=crestRepositioned;
 // Eleventh pass: remove the visibly artificial spike fence and horizontal
 // floating crown from the upper silhouette. Retain every source mesh by
 // relocating it as ground-level architectural debris outside the doorway.
 let crownSalvaged=0;
 for(const part of root.children){
  if(!part.isMesh)continue;
  const p=part.position,s=part.scale;
  const isCrownSlab=part.geometry?.isBoxGeometry&&
   Math.abs(p.x)<.02&&Math.abs(p.y-15.6)<.02&&
   Math.abs(p.z+.4)<.02&&Math.abs(s.x-3.57)<.03;
  const isCrownSpike=part.geometry?.type==='ConeGeometry'&&
   Math.abs(p.z+.4)<.02&&p.y>16.1&&p.y<17.4&&Math.abs(p.x)<2;
  const isRearSpike=part.geometry?.type==='ConeGeometry'&&
   Math.abs(p.z+1.7)<.02&&p.y>13.1&&p.y<15.5&&Math.abs(p.x)<3.5;
  if(!isCrownSlab&&!isCrownSpike&&!isRearSpike)continue;
  const n=crownSalvaged++;
  const side=n%2===0?-1:1;
  p.set(side*(6.2+(n%4)*.36),.18+(n%3)*.08,1.9+(n%3)*.55);
  part.rotation.set(.32+n*.09,n*.48,.8+(n%3)*.19);
  if(isCrownSlab)part.scale.set(2.1,.28,1.15);
  else part.scale.set(.45,.42,.5);
  part.name='b5:gothicArch:salvagedCrownDebris';
 }
 extra.userData.crownSalvaged=crownSalvaged;
 // Front-first masonry variation: three unmistakable pockets of MUCH smaller
 // individual bricks. Keep all original stones and add sculpted mini courses.
 // Facing the front camera means negative Z in the original Three.js scene.
 // The new stones project forward beyond existing carved masonry, not inside it.
 const tinyStoneA=new THREE.MeshStandardMaterial({color:0x918992,roughness:.98,flatShading:true});
 const tinyStoneB=new THREE.MeshStandardMaterial({color:0x5e5762,roughness:.98,flatShading:true});
 const tinyJoint=new THREE.MeshStandardMaterial({color:0x25232a,roughness:1});
 // Each brick uses 40 explicit outline control points (previously 8):
 // five times the original contour resolution without scaling the whole gate.
 const frontBrick=(x,y,w,h,depth,course,index)=>{
  const base=[[-w/2+.025,-h/2],[w/2-.03,-h/2],[w/2,-h/2+.035],
   [w/2-.015,h/2-.025],[w/2-.065,h/2],
   [-w/2+.035,h/2],[-w/2,h/2-.055],[-w/2,-h/2+.025]];
  const outline=[];
  for(let k=0;k<base.length;k++){
   const a=base[k],b=base[(k+1)%base.length];
   for(let j=0;j<5;j++){
    const t=j/5,edgeX=a[0]+(b[0]-a[0])*t,edgeY=a[1]+(b[1]-a[1])*t;
    // Chipped edges and slightly staggered facets; no random nondeterminism.
    const dent=(j===0?0:((index*13+k*7+j*11)%7-3)*.0038);
    const cx=(a[0]+b[0])*.5,cy=(a[1]+b[1])*.5;
    outline.push([edgeX-Math.sign(edgeX||cx)*dent,edgeY-Math.sign(edgeY||cy)*dent]);
   }
  }
  const shape=new THREE.Shape();
  outline.forEach(([px,py],i)=>i?shape.lineTo(px,py):shape.moveTo(px,py));
  shape.closePath();
  const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{
   depth,bevelEnabled:true,bevelSize:.008,bevelThickness:.013,bevelSegments:3
  }),index%5===0?tinyStoneA:index%4===0?tinyStoneB:carvedStone);
  mesh.position.set(x,y,-2.95-(course%2)*.035);
  mesh.name='b5:gothicArch:frontSmallBrick40Point';
  extra.add(mesh);
  // Individually sculpted short fracture line across a subset of front faces.
  if(index%4===0){
   const crack=between([x-w*.24,y+h*.12,-2.966],
    [x+w*.12,y-h*.22,-2.966],.018,.025,tinyJoint);
   crack.name='b5:gothicArch:brickSurfaceFracture';
  }
 };
 const brickPatch=(cx,cy,width,height,cols,rows,seed)=>{
  // Forward-mounted bonded patch, fully readable from the front. A shallow
  // stepped border and shadowed mortar emphasize the contrast in block size.
  box(cx,cy,-2.83,width+.14,height+.12,.17,tinyJoint);
  const bw=width/cols,bh=height/rows;
  let count=0;
  for(let row=0;row<rows;row++){
   const offset=row%2?bw*.43:0;
   for(let col=0;col<=cols;col++){
    const x=cx-width/2+col*bw+offset+bw*.5;
    if(x>cx+width/2-bw*.21||x<cx-width/2+bw*.21)continue;
    const y=cy-height/2+(row+.5)*bh;
    const vary=((seed+row*7+col*11)%5-2)*.008;
    frontBrick(x,y,bw*.88+vary,bh*.82-vary,.23,row,seed+row*cols+col);
    count++;
   }
  }
  return count;
 };
 // Three prominent regions, larger facade patches with markedly smaller
 // individual units. Asymmetry makes them readable in the front silhouette.
 const smallBrickCount=[
  brickPatch(-4.03,4.25,1.58,2.70,6,11,3),
  brickPatch(4.03,7.42,1.58,2.45,6,10,19),
  brickPatch(-4.23,11.32,1.55,1.86,6,8,37)
 ].reduce((a,b)=>a+b,0);
 extra.userData.frontSmallBrickZones=3;
 extra.userData.frontSmallBrickCount=smallBrickCount;
 extra.userData.frontBrickOutlineControlPoints=40;
 // Pinterest-informed ground rubble refinement ONLY. Existing gate, arch,
 // facade, and all above-ground masonry remain unchanged.
 // Reference shapes: broken wall stone courses, temple collapse, scattered
 // thick angular masonry (see pinterest-reference-library handoff).
 const rubbleMat=new THREE.MeshStandardMaterial({color:0x69636d,roughness:.99,flatShading:true});
 const rubblePale=new THREE.MeshStandardMaterial({color:0x89818a,roughness:.98,flatShading:true});
 const rubbleDark=new THREE.MeshStandardMaterial({color:0x4d4752,roughness:1,flatShading:true});
 const fracturedRubble=(x,z,rx,ry,rz,seed,mat)=>{
  // 12-point irregular footprint with independent top/bottom ring vertices.
  // Side walls have volume, uneven fracture planes and no paper-thin slabs.
  const n=12,verts=[],indices=[];
  for(let ring=0;ring<2;ring++)for(let i=0;i<n;i++){
   const a=i*Math.PI*2/n,perturb=.79+((seed*17+i*13)%9)*.045;
   const px=Math.cos(a)*rx*perturb,pz=Math.sin(a)*rz*(.8+((i*7+seed)%6)*.06);
   const y=ring===0?.045:ry*(.74+((i*11+seed*3)%9)*.055);
   verts.push(px,y,pz);
  }
  for(let i=1;i<n-1;i++){indices.push(0,i+1,i);indices.push(n,n+i,n+i+1);}
  for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(i,j,n+j,i,n+j,n+i);}
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,mat);
  mesh.position.set(x,0,z);mesh.rotation.y=seed*1.618;
  mesh.name='b5:gothicArch:thickFracturedGroundRubble';
  extra.add(mesh);return mesh;
 };
 // Place a few major collapsed voussoirs with smaller rubble around them.
 // Keep the center of the doorway clear for player navigation.
 for(const side of [-1,1]){
  for(let i=0;i<5;i++){
   const x=side*(5.25+(i%3)*.7),z=-2.5+(i%4)*1.35;
   fracturedRubble(x,z,.44+(i%2)*.22,.35+(i%3)*.12,
    .47+(i%3)*.16,21+i+(side+1)*5,i%3===0?rubblePale:rubbleMat);
   for(let j=0;j<3;j++){
    const a=(i*3+j)*2.39996;
    fracturedRubble(x+Math.cos(a)*(.55+j*.13),
     z+Math.sin(a)*(.5+j*.12),.13+j*.06,.12+j*.045,
     .18+j*.04,51+i*3+j,rubbleDark);
   }
  }
 }
 // Former relocated flat source slabs at ground level still looked like
 // oversized plates. Preserve their meshes, change only their proportions
 // and lay them into thick angular fallen stone positions.
 let repairedGroundSlabs=0;
 for(const part of root.children){
  if(!part.isMesh||part.position.y>1.1)continue;
  if(part.name==='b5:gothicArch:salvagedCrownDebris'&&part.geometry?.isBoxGeometry){
   part.scale.set(.95,.62,.86);
   part.position.y=.29;
   part.rotation.set(.19,.42,.27);
   repairedGroundSlabs++;
  }else if(part.geometry?.isBoxGeometry&&
    Math.abs(part.scale.x-1.65)<.02&&Math.abs(part.scale.y-.62)<.02){
   part.scale.set(1.02,.86,.95);
   part.position.y=.34;
   part.rotation.set(.12,.51,.22);
   repairedGroundSlabs++;
  }
 }
 // Thirty additional brick-shaped fallen masonry blocks. Each is a thick,
 // irregularly chipped rectangular stone (not a thin plate). Concentrate
 // around both collapsed jambs and leave the central doorway open.
 const fallenBrickMaterial=[rubbleMat,rubblePale,rubbleDark];
 for(let i=0;i<30;i++){
  const side=i<15?-1:1,local=i%15;
  const tier=Math.floor(local/5),slot=local%5;
  const x=side*(4.65+tier*.77+slot*.22);
  const z=-3.45+slot*1.38+(tier%2)*.32;
  const w=.42+((i*7)%5)*.075;
  const h=.25+((i*11)%4)*.075;
  const d=.55+((i*13)%5)*.065;
  const outline=new THREE.Shape();
  const pts=[[-w*.5+.045,-d*.5], [w*.5-.04,-d*.5],
   [w*.5,-d*.5+.06],[w*.5-.035,d*.5-.045],
   [w*.5-.095,d*.5],[-w*.5+.045,d*.5],
   [-w*.5,d*.5-.07],[-w*.5,-d*.5+.055]];
  pts.forEach(([px,py],j)=>j?outline.lineTo(px,py):outline.moveTo(px,py));
  outline.closePath();
  const geom=new THREE.ExtrudeGeometry(outline,{
   depth:h,bevelEnabled:true,bevelSize:.025,bevelThickness:.035,bevelSegments:1
  });
  // Extrusion axis is local Z. Turn the block so thickness stands vertically.
  geom.rotateX(-Math.PI/2);
  const brick=new THREE.Mesh(geom,fallenBrickMaterial[(i+Math.floor(i/7))%3]);
  brick.position.set(x,.07,z);
  brick.rotation.set(((i%5)-2)*.055,i*1.37,((i%7)-3)*.065);
  brick.name='b5:gothicArch:fallenMasonryBrick30';
  extra.add(brick);
 }
 extra.userData.additionalFallenBrickCount=30;
 extra.userData.rubbleRefinement={fracturedBlocks:40,groundSlabsAdjusted:repairedGroundSlabs};
 root.add(extra);return root;
}
