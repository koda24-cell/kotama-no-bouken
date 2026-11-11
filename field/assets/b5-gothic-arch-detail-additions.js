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
 root.add(extra);return root;
}
