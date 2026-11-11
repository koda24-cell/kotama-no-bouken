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
  between([s*5.7,2.0,-.5],[s*4.7,6.6,-.6],.55,.68);
  between([s*5.7,2.0,.5],[s*4.7,6.6,.6],.45,.58);
  box(s*5.7,1.0,0,1.0,2.0,1.8);
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
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.28,bevelEnabled:false,curveSegments:1});
  const mesh=new THREE.Mesh(geo,spandrelMaterial);
  mesh.position.z=z;mesh.name='b5:gothicArch:brokenMasonrySpandrel';extra.add(mesh);
  // Shallow, irregular block joints are deliberately restricted to the solid wall.
  for(let i=0;i<4;i++){
   const x=side*(3.75+(i%2)*.42),y=10.65+i*1.03;
   const joint=box(x,y,z+(z<0?-.04:.32),.65,.07,.07,shadow);
   joint.rotation.z=side*(i%2?.11:-.08);
  }
 };
 brokenSpandrel(-1,-2.07);
 brokenSpandrel(1,1.79);

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
 root.add(extra);return root;
}
