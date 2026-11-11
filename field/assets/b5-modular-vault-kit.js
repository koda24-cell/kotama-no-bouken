/**
 * B5 modular ruined Gothic vault kit. Original, additive, standalone preview
 * geometry; no dungeon collision or runtime changes.
 * Each kind exports independently through tools/b5-vault-render.
 * Three.js coordinates: Y up; FRONT looks from -Z.
 */
export const B5_VAULT_KINDS=['basic-vault','collapsed-vault','royal-vault','vault-support','fallen-vault-rubble'];
export function createB5VaultAsset(THREE,kind='basic-vault'){
 if(!B5_VAULT_KINDS.includes(kind))throw new Error('Unknown B5 vault kind: '+kind);
 const group=new THREE.Group(); group.name='b5:modular:'+kind;
 group.userData.visualOnly=true;group.userData.frontDirection=[0,0,-1];
 const gs=[],ms=[],G=g=>(gs.push(g),g),M=m=>(ms.push(m),m);
 const stone=M(new THREE.MeshStandardMaterial({color:0x77747a,roughness:1,flatShading:true,side:THREE.DoubleSide}));
 const trim=M(new THREE.MeshStandardMaterial({color:0x99959a,roughness:1,flatShading:true,side:THREE.DoubleSide}));
 const dark=M(new THREE.MeshStandardMaterial({color:0x5c585f,roughness:1,flatShading:true,side:THREE.DoubleSide}));
 const add=(g,m=stone)=>{const o=new THREE.Mesh(G(g),m);group.add(o);return o;};
 const box=(x,y,z,w,h,d,m=stone)=>{
  const o=add(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);return o;
 };
 const beam=(a,b,r=.12,m=stone)=>{
  const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.clone().sub(va);
  if(delta.length()<1e-5)return;
  const mesh=add(new THREE.CylinderGeometry(r,r,delta.length(),8),m);
  mesh.position.copy(va).add(vb).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  return mesh;
 };
 const chip=(x,y,z,w,h,d,seed=0)=>{
  const o=add(new THREE.DodecahedronGeometry(1,1),stone);
  o.position.set(x,y,z);o.scale.set(w,h,d);
  o.rotation.set(seed*.27,seed*.13,seed*.22);return o;
 };
 // Broad planar fracture facets: deliberately avoid rounded dodecahedrons.
 // Each rock has an irregular multi-plane perimeter, chipped sidewall and a
 // broken plateau, with local ground at y=0.
 const fractureStone=(x,z,w,d,h,seed=0,material=stone)=>{
  const n=9,vertices=[],indices=[];
  const rnd=(i,j)=>.5*Math.sin((i+1)*7.23+(seed+3)*2.19+j*3.1)
   +.5*Math.cos((i+5)*3.93-(seed+1)*1.72+j*6.1);
  for(let level=0;level<3;level++){
   const scale=level===0?.89:level===1?1:.62;
   for(let i=0;i<n;i++){
    const a=i*2*Math.PI/n,r=scale*(1+.20*rnd(i,0));
    vertices.push(w*.5*r*Math.cos(a),level===0?0:level===1?h*(.37+.13*rnd(i,1)):h*(.77+.16*rnd(i,2)),d*.5*r*Math.sin(a));
   }
  }
  for(let level=0;level<2;level++)for(let i=0;i<n;i++){
   const j=(i+1)%n,a=level*n+i,b=level*n+j,c=(level+1)*n+i,e=(level+1)*n+j;
   indices.push(a,c,b,b,c,e);
  }
  // The top forms broad triangular fractured planes rather than a dome.
  const topIndex=vertices.length/3;
  vertices.push(-.08*w,h*.87,.04*d);
  for(let i=0;i<n;i++)indices.push(2*n+i,topIndex,2*n+(i+1)%n);
  for(let i=1;i<n-1;i++)indices.push(0,i+1,i);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  const o=add(geo,material);o.position.set(x,0,z);o.rotation.y=seed*.67;
  return o;
 };
 const segmentOrnament=(x,y,z,r=.3)=>{
  // One cusped Gothic quatrefoil is an actual raised carved stone form.
  for(let petal=0;petal<4;petal++){
   const a=petal*Math.PI/2,pts=[];
   for(let i=0;i<=10;i++){
    const t=i/10*Math.PI*2;
    pts.push([x+r*.42*Math.cos(a)+r*.30*Math.cos(t),
      y+r*.42*Math.sin(a)+r*.30*Math.sin(t),z]);
   }
   for(let i=1;i<pts.length;i++)beam(pts[i-1],pts[i],.023,trim);
  }
 };
 const arch=(z,side=1,detail=true,broken=false)=>{
  // Radial rising ribs connect the left and right supporting masonry.
  for(let layer=0;layer<(detail?3:2);layer++){
   for(let i=0;i<28;i++){
    if(broken&&(i>=17&&i<=23||i===5))continue;
    const x0=-3.0+6*i/28,x1=-3+6*(i+1)/28;
    const top=x=>4.5+2.0*(1-Math.pow(Math.abs(x)/3,1.55));
    beam([x0,top(x0)-layer*.16,z-layer*.10],
         [x1,top(x1)-layer*.16,z-layer*.10],.13-layer*.026,layer===1?trim:stone);
   }
  }
 };
 const stonePier=(x,z,broken=false)=>{
  const H=broken?4.0:4.9;
  box(x,H/2,z,.76,H,.78,stone);
  for(let i=0;i<3;i++)box(x,1.05+i*1.36,z-.30,.95,.16,.89,trim);
  // Gothic flute carvings, recessed impression by dark grooves
  for(const dx of [-.23,0,.23])box(x+dx,H*.53,z-.408,.055,H*.67,.028,dark);
  box(x,H-.18,z,1.05,.38,1.02,stone);
  for(let i=0;i<3;i++)chip(x+(-.35+i*.24),H+.02,z-.13,.21,.16,.22,i+Math.floor(x*3));
 };
 const rubble=()=>{
  // Scattered grounded asymmetric chipped blocks, no pebble silhouettes.
  for(let i=0;i<30;i++){
   const a=i*2.399963,r=1.04+(i%7)*.28;
   const x=Math.cos(a)*r,z=Math.sin(a)*r-.2;
   const w=.29+(i%5)*.14,h=.13+(i%4)*.075,d=.24+(i%3)*.16;
   fractureStone(x,z,w,d,h,i);
  }
 };
 if(kind==='vault-support'){
  stonePier(0,0);
  for(const sign of [-1,1]){
   for(let i=0;i<14;i++){
    const t=i/14,a=[sign*.36,4.48,0],b=[sign*(.36+2.2*t),4.48+1.55*t-.82*t*t,0];
    const next=[sign*(.36+2.2*(t+1/14)),4.48+1.55*(t+1/14)-.82*Math.pow(t+1/14,2),0];
    beam(b,next,.17,stone);
   }
  }
  for(let s of [-1,1])for(let i=0;i<4;i++)box(s*.38,3.9+i*.22,-.48,.22,.12,.12,trim);
  chip(.38,.18,-.47,.42,.18,.35,8);
 }else if(kind==='fallen-vault-rubble'){
  rubble();
  for(let i=0;i<7;i++){
   const x=-2.7+i*.82,z=.10+Math.sin(i*2.1)*1.0;
   const obj=box(x,.16,z,.72,.32,.49,i%3?stone:trim);
   obj.rotation.y=.19*i;obj.rotation.z=(i%2?-.16:.12);
  }
  // A fallen carved rib with multiple disrupted segments.
  for(let i=0;i<13;i++){
   if(i===5||i===9)continue;
   const x=-2.6+i*.42,y=.26+.18*Math.sin(i*.45),z=-1.1+.17*Math.sin(i*.41);
   beam([x,y,z],[x+.39,y+.06,z+.05],.16,i%3?stone:trim);
  }
  for(let i=0;i<5;i++)fractureStone(-2.4+i*.9,1.8,.52,.4,.19,i+15);
  // Large broken architectural fragments, distinct from natural rocks.
  for(let i=0;i<4;i++){
   const x=-1.9+i*1.12,z=.45+(i%2)*.75;
   const slab=box(x,.17,z,.94,.34,.74,i%2?trim:stone);
   slab.rotation.y=i*.26;slab.rotation.z=(i%2?.11:-.08);
   for(let j=0;j<3;j++)box(x-.28+j*.26,.35,z-.37,.09,.075,.08,trim);
  }
  // A toppled fluted column section with a visibly broken end.
  const fallen=box(1.73,.23,1.29,1.62,.42,.56,stone);
  fallen.rotation.y=.26;
  for(let i=0;i<4;i++)beam([1.06+i*.0,.26,1.08+(i-1.5)*.13],[2.35,.26,1.08+(i-1.5)*.13],.037,trim);
  fractureStone(2.38,1.35,.65,.58,.27,66);
 }else{
  const broken=kind==='collapsed-vault',royal=kind==='royal-vault';
  for(const x of [-3.25,3.25])for(const z of [-2.5,2.5])stonePier(x,z,broken&&x>0&&z>0);
  arch(-2.5,1,true,broken);arch(2.5,1,true,broken);
  // Transverse crossing ribs sit under the stone vault surface.
  for(const x of [-3,0,3]){
   for(let i=0;i<24;i++){
    if(broken&&x>=0&&i>12&&i<20)continue;
    const z0=-2.5+i*5/24,z1=-2.5+(i+1)*5/24;
    const y=z=>4.55+1.72*(1-Math.pow(Math.abs(z)/2.5,1.8));
    beam([x,y(z0),z0],[x,y(z1),z1],royal?.16:.12,i%5===0?trim:stone);
   }
  }
  // Vault webbing in large dressed stone courses; the missing quadrant
  // exposes the rib structure for ruined variants.
  for(let ix=0;ix<10;ix++)for(let iz=0;iz<8;iz++){
   const x=-2.95+(ix+.5)*5.9/10,z=-2.42+(iz+.5)*4.84/8;
   if(broken&&(ix>5&&iz>2||ix===3&&iz===6))continue;
   // Each web stone follows a shallow groin-vault curve rather than forming
   // a level checkerboard. Alternating courses meet without overlapping.
   const profileX=1-Math.pow(Math.abs(x)/3,1.55);
   const profileZ=1-Math.pow(Math.abs(z)/2.5,1.8);
   const yy=5.13+.66*Math.max(0,profileX)+.42*Math.max(0,profileZ);
   const p=box(x,yy,z,.535,.19,.565,ix%4===0?trim:stone);
   p.rotation.z=-.20*Math.sign(x)*Math.pow(Math.abs(x)/3,.55);
   p.rotation.x=.15*Math.sign(z)*Math.pow(Math.abs(z)/2.5,.65);
  }
  if(broken){
   for(let i=0;i<10;i++){
    const x=1.25+i*.18,z=.08+Math.sin(i*2.1)*.6,y=5.65+.16*Math.sin(i*1.7);
    chip(x,y,z,.2,.14,.25,i);
   }
   rubble();
  }
  if(royal){
   // Additional carved rib mouldings, cusps and a restrained keystone.
   for(const z of [-2.63,2.37]){
    for(let i=0;i<18;i++){
     const x=-2.8+i*5.6/18,x2=-2.8+(i+1)*5.6/18;
     const yy=t=>4.63+2.0*(1-Math.pow(Math.abs(t)/3,1.55));
     beam([x,yy(x)+.19,z],[x2,yy(x2)+.19,z],.062,trim);
    }
   }
   for(const x of [-3.13,3.13])for(let i=0;i<5;i++){
    const z=-1.95+i*.96;
    box(x,4.53,z,.21,.31,.23,trim);
    chip(x,4.85,z,.21,.14,.20,i+11);
   }
   const keystone=chip(0,6.65,-2.62,.34,.39,.32,0);
   keystone.rotation.set(0,0,.13);
   // Additional moulded arc bands follow the original vault outline.
   // Gothic cusps and quatrefoils occupy the spandrels, not empty air.
   for(const z of [-2.74,2.28]){
    const archTop=x=>4.5+2*(1-Math.pow(Math.abs(x)/3,1.55));
    for(let side of [-1,1]){
     for(let j=0;j<16;j++){
      const x0=side*(.45+j*2.35/16),x1=side*(.45+(j+1)*2.35/16);
      beam([x0,archTop(x0)+.34,z],[x1,archTop(x1)+.34,z],.048,trim);
     }
     for(let j=0;j<3;j++){
      const cx=side*(1.10+j*.74),cy=5.44-.24*j;
      segmentOrnament(cx,cy,z-.035,.22-j*.014);
     }
    }
    segmentOrnament(0,6.26,z-.035,.30);
    for(let i=0;i<5;i++){
     const x=-2.48+i*1.24;
     const y=archTop(x)-.44;
     // Shallow layered stone hanging cusps with triangular supports.
     beam([x-.18,y+.20,z],[x,y-.16,z],.055,trim);
     beam([x,y-.16,z],[x+.18,y+.20,z],.055,trim);
    }
   }
   // Ceiling webbing carries additional staggered carved stone ribs.
   for(const x of [-2.45,-1.12,1.12,2.45]){
    for(let iz=0;iz<18;iz++){
     const z=-2.33+iz*4.66/18,next=-2.33+(iz+1)*4.66/18;
     const y=5.92+.22*(1-Math.abs(x)/3);
     beam([x,y,z],[x,y,next],.044,trim);
    }
   }
   // Capitals with visible stepped dentils instead of plain block ends.
   for(const x of [-3.24,3.24])for(const z of [-2.5,2.5]){
    for(let i=0;i<5;i++){
     box(x-.34+i*.17,4.83,z-.48,.115,.18,.16,trim);
    }
   }
  }
 }
 // Reference-sheet pass: structural ribs converge at the Gothic boss,
 // and the upper shell reads as a vault rather than flat stacked tiles.
 // Preserve all prior geometry: these are independent additive meshes.
 const curveRib=(points,width,material=stone)=>{
  for(let k=0;k<points.length-1;k++)beam(points[k],points[k+1],width,material);
 };
 const traceryLobe=(cx,cy,cz,r,material=trim)=>{
  // Pointed, open quatrefoil: Gothic cusps instead of circular beads.
  for(let p=0;p<4;p++){
   const a=p*Math.PI/2,centerX=cx+Math.cos(a)*r*.48,centerY=cy+Math.sin(a)*r*.48;
   const pts=[];
   for(let k=0;k<=12;k++){
    const t=(k/12)*2*Math.PI;
    pts.push([centerX+Math.cos(t)*r*.30,
      centerY+Math.sin(t)*r*.30,cz]);
   }
   curveRib(pts,.026,material);
  }
  for(let p=0;p<4;p++){
   const a=p*Math.PI/2,b=(p+1)*Math.PI/2;
   curveRib([
     [cx+Math.cos(a)*r*.87,cy+Math.sin(a)*r*.87,cz],
     [cx+Math.cos((a+b)/2)*r*.73,cy+Math.sin((a+b)/2)*r*.73,cz],
     [cx+Math.cos(b)*r*.87,cy+Math.sin(b)*r*.87,cz]],.034,material);
  }
 };
 if(['basic-vault','collapsed-vault','royal-vault'].includes(kind)){
  const damaged=kind==='collapsed-vault',luxury=kind==='royal-vault';
  // Four diagonal ribs originate at real corner capitals and end at the
  // central vault boss. A single arc radius is not reused for all ribs.
  for(const sx of [-1,1])for(const sz of [-1,1]){
   const points=[];
   for(let i=0;i<=24;i++){
    if(damaged&&sx===1&&sz===1&&i>=12)break;
    const t=i/24;
    points.push([sx*(3.17*(1-t)),4.79+1.69*Math.sin(t*Math.PI*.50),
      sz*(2.41*(1-t))]);
   }
   curveRib(points,luxury?.095:.11,luxury?trim:stone);
   if(luxury){
    const parallel=points.map(p=>[p[0]*.96,p[1]+.135,p[2]*.97]);
    curveRib(parallel,.042,trim);
   }
  }
  // Interior groin rib: curve between the four springers and boss.
  for(const sx of [-1,1])for(const sz of [-1,1]){
   if(damaged&&sx===1&&sz===1)continue;
   curveRib([[sx*2.98,4.88,sz*2.34],[sx*2.13,5.68,sz*1.54],
     [sx*1.03,6.28,sz*.78],[0,6.49,0]],luxury?.072:.085,stone);
  }
  if(luxury){
   // Monumental carved rosette and descending Gothic blind-arcade along
   // each visible spandrel. The shapes occupy previously plain empty spans.
   for(const z of [-2.77,2.45]){
    traceryLobe(0,6.02,z,.43);
    for(const sx of [-1,1]){
     traceryLobe(sx*1.60,5.23,z,.25);
     for(let j=0;j<3;j++){
      const cx=sx*(.83+j*.54);
      curveRib([[cx-.22,5.03,z],[cx-.18,5.32,z],
        [cx,5.48,z],[cx+.18,5.32,z],[cx+.22,5.03,z]],.049,trim);
     }
    }
   }
   // Central boss has a layered stone pendant and faceted spurs,
   // supported directly beneath the crossing ribs.
   box(0,6.48,0,.53,.28,.53,trim);
   for(let j=0;j<8;j++){
    const a=j*Math.PI/4;
    beam([0,6.47,0],[Math.cos(a)*.55,6.49,Math.sin(a)*.55],.045,trim);
   }
   chip(0,6.27,0,.31,.34,.31,21);
   for(const x of [-3.21,3.21])for(const z of [-2.50,2.50]){
    for(let i=0;i<3;i++){
     const yy=4.76+i*.19;
     box(x,yy,z-.42,1.02-i*.12,.12,1.00-i*.10,i===1?trim:stone);
    }
    // Fan-shaped rib sockets visibly grow from the enlarged capital.
    for(const side of [-1,1]){
     beam([x,4.97,z],[x+side*.50,5.35,z],.095,trim);
    }
   }
  }
  if(damaged){
   // Larger asymmetrical collapsed upper-edge fragments, with broad
   // contact surfaces; edges remain organically jagged in the silhouette.
   for(let j=0;j<7;j++){
    const x=1.03+j*.31,z=.85+(j%2)*.36;
    const y=5.92-(j%3)*.12;
    const r=chip(x,y,z,.22+(j%3)*.10,.18,.27,j+20);
    r.rotation.z=(j%2?.24:-.17);
   }
  }
 }
 if(kind==='vault-support'){
  // Rib support is a fan springing from the top of the intact column;
  // the lobe mouldings read as part of the capital, not separate beads.
  for(const sx of [-1,1])for(const sz of [-1,1]){
   curveRib([[sx*.29,4.81,sz*.14],[sx*.72,5.14,sz*.24],
     [sx*1.45,5.62,sz*.32],[sx*2.15,5.70,sz*.35]],.095,trim);
  }
  for(let j=0;j<4;j++){
   const a=j*Math.PI/2;
   box(Math.cos(a)*.34,4.60,Math.sin(a)*.34,.25,.42,.25,trim);
  }
 }
 if(kind==='fallen-vault-rubble'){
  // Recognisable shattered cathedral ribs: angular thick segments whose
  // fractured ends bear carved moulding, and a partial floral tracery.
  for(let j=0;j<7;j++){
   const x=-2.25+j*.69,z=.24+(j%3)*.34;
   const a=box(x,.18,z,.58,.33,.34,j%3?stone:trim);
   a.rotation.y=.19+j*.23;a.rotation.z=j%2?.07:-.09;
   // Three stone flutes on a surviving sculpted fragment.
   for(let k=0;k<3;k++){
    box(x-.19+k*.17,.345,z-.16,.065,.05,.052,trim);
   }
  }
  // Lost rose tracery lies flat; separate segments imply a fractured ring.
  for(let j=0;j<13;j++){
   if(j===3||j===4||j===10)continue;
   const a=j*2*Math.PI/16,b=(j+1)*2*Math.PI/16;
   beam([1.58+.50*Math.cos(a),.16,1.36+.50*Math.sin(a)],
        [1.58+.50*Math.cos(b),.16,1.36+.50*Math.sin(b)],.075,trim);
  }
  for(let j=0;j<10;j++){
   const a=j*2.3999,r=1.45+(j%3)*.24;
   fractureStone(Math.cos(a)*r,Math.sin(a)*r,.35+(j%2)*.20,.25+(j%3)*.09,.12+j%4*.055,j+70);
  }
 }
 // PASS 2026-11-12: reinforce existing masonry with architectural
 // attachments rather than replacing approved silhouettes.
 const carvedPierCapital=(x,z)=>{
  // The crown rises in three continuous courses, then flares into the
  // radial springers. Deep inset tracery faces are on FRONT (-Z).
  for(let layer=0;layer<4;layer++){
   const y=4.68+layer*.13;
   box(x,y,z,.91+layer*.10,.12,.88+layer*.09,layer%2?trim:stone);
  }
  for(const sx of [-1,1]){
   curveRib([[x+sx*.17,4.87,z-.51],[x+sx*.39,5.05,z-.51],
     [x+sx*.52,5.27,z-.48],[x+sx*.66,5.34,z-.43]],.052,trim);
  }
  for(let k=0;k<3;k++){
   const dx=(k-1)*.24;
   curveRib([[x+dx-.10,4.72,z-.58],[x+dx-.08,4.85,z-.58],
      [x+dx,4.93,z-.58],[x+dx+.08,4.85,z-.58],
      [x+dx+.10,4.72,z-.58]],.018,dark);
  }
 };
 // Gothic voussoir stone: a quadrangular chamfered stone with slanted
 // fracture edge. Useful as a connecting mass beneath broken rib ends.
 const voussoir=(x,y,z,w,h,d,seed=0)=>{
  const verts=[],faces=[];
  const levels=[[-h*.5,1.0],[h*.5,.85]];
  for(const [yy,r] of levels){
   for(const [dx,dz] of [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]){
    verts.push(dx*w*r + .055*Math.sin(seed*2.3+yy+dx*3),
       yy+.045*Math.cos(seed+dx*7+dz*4),dz*d*r);
   }
  }
  for(const side of [[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[0,3,2,1],[4,5,6,7]]){
   faces.push(side[0],side[1],side[2],side[0],side[2],side[3]);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setIndex(faces);g.computeVertexNormals();
  const o=add(g,stone);o.position.set(x,y,z);return o;
 };
 if(kind==='royal-vault'){
  // Visible weight and readable Gothic capitals, rather than tiny
  // beads that disappear at typical gameplay camera distances.
  for(const x of [-3.25,3.25])for(const z of [-2.5,2.5]){
   carvedPierCapital(x,z);
  }
  // Curved ribs fan from each capital into the nave. Multiple layers add
  // depth while keeping the central crossing boss intact.
  for(const sx of [-1,1])for(const sz of [-1,1]){
   for(let band=0;band<3;band++){
    const pts=[];
    for(let j=0;j<=20;j++){
     const t=j/20;
     pts.push([
      sx*(3.24-3.24*t),
      4.97+1.46*Math.sin(t*Math.PI*.5)+band*.075,
      sz*(2.50-2.50*t)+band*.075*sz]);
    }
    curveRib(pts,band===0?.095:.034,band===1?trim:stone);
   }
  }
  // Gothic spandrel carvings: shallow lancets beneath the roof ridge,
  // anchored at their bottom edges rather than hovering in the void.
  for(const z of [-2.78,2.46]){
   for(const sx of [-1,1]){
    for(let j=0;j<3;j++){
     const x=sx*(.72+j*.73);
     const top=5.71-j*.13;
     curveRib([[x-.21,5.10,z],[x-.19,top-.17,z],
      [x,top,z],[x+.19,top-.17,z],[x+.21,5.10,z]],.048,trim);
     box(x,5.09,z,.43,.09,.16,stone);
    }
   }
  }
 }
 if(kind==='collapsed-vault'){
  // Structural support below the existing detached-looking stones.
  // A deliberately discontinuous broken web connects them to the roof
  // but preserves the hole through which the abyss is visible.
  for(let j=0;j<5;j++){
   const x=1.01+j*.31,z=.81+(j%2)*.33;
   voussoir(x,5.78,z,.50,.27,.43,j+4);
  }
  for(let j=0;j<7;j++){
   const x=1.03+j*.31,z=.85+(j%2)*.36;
   beam([x,5.68,z],[x+.12,5.91,z],.085,stone);
  }
  // Endstones step down to the surviving right pier capital.
  for(let j=0;j<4;j++){
   voussoir(2.16+j*.24,5.60-j*.23,1.21+j*.19,.46,.25,.41,j+25);
  }
 }
 if(kind==='fallen-vault-rubble'){
  // Stone blocks excavated from a collapsed vault: fractured cuboid
  // sections with chipped ends, not tubular pebbles.
  for(let j=0;j<11;j++){
   const a=j*2.399963,r=1.02+(j%4)*.34;
   const x=Math.cos(a)*r,z=Math.sin(a)*r;
   const h=.18+(j%3)*.07;
   const o=voussoir(x,h*.5,z,.46+(j%4)*.17,h,.35+(j%3)*.14,j+36);
   o.rotation.y=j*.47;
   fractureStone(x+.22,z+.13,.21,.25,.09,j+39,dark);
  }
  // Broken rib sections retain paired carved mouldings on their outer
  // side, providing a recognizable architectural origin.
  for(let j=0;j<5;j++){
   const x=-2.10+j*.87,z=-1.32+(j%2)*.31;
   const o=voussoir(x,.17,z,.74,.35,.39,j+60);
   o.rotation.y=.15*j;
   for(const offset of [-.11,.11]){
    beam([x-.30,.37,z+offset],[x+.30,.37,z+offset],.035,trim);
   }
  }
 }
 // PASS: true faceted stone ribs, with a tapered six-vertex Gothic
 // section, in place of yet more round pipes. All prior meshes preserved.
 const gothicRib=(points,halfWidth=.16,depth=.24,material=stone)=>{
  const verts=[],indices=[];
  // Cross-section across the span: a broad shoulder, bevelled cheeks,
  // and a pointed downward arris. Reorient per segment tangent in XZ.
  const section=[[-1,0],[-.78,-.30],[-.35,-.62],[0,-1],
                 [.35,-.62],[.78,-.30],[1,0]];
  for(let i=0;i<points.length;i++){
   const p=new THREE.Vector3(...points[i]);
   const prev=new THREE.Vector3(...points[Math.max(0,i-1)]);
   const next=new THREE.Vector3(...points[Math.min(points.length-1,i+1)]);
   const tangent=next.sub(prev).normalize();
   let lateral=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
   if(lateral.lengthSq()<.1)lateral.set(1,0,0);
   for(const [u,v] of section){
    const pt=p.clone().addScaledVector(lateral,u*halfWidth);
    pt.y+=v*depth;
    verts.push(pt.x,pt.y,pt.z);
   }
  }
  const n=section.length;
  for(let i=0;i<points.length-1;i++)for(let k=0;k<n-1;k++){
   const a=i*n+k,b=(i+1)*n+k;
   indices.push(a,b,a+1,a+1,b,b+1);
  }
  // Closed top surface, ensuring substantial stone mass rather than a
  // dangling open moulding. Flat-shaded bevels reveal the section.
  for(let i=0;i<points.length-1;i++){
   const a=i*n,b=(i+1)*n;
   indices.push(a,a+n-1,b,b,a+n-1,b+n-1);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setIndex(indices);g.computeVertexNormals();
  return add(g,material);
 };
 if(['basic-vault','collapsed-vault','royal-vault'].includes(kind)){
  const damaged=kind==='collapsed-vault',luxury=kind==='royal-vault';
  // Diagonal load-bearing Gothic arrises converge at the central boss.
  // Do not span the collapsed north-east opening.
  for(const sx of [-1,1])for(const sz of [-1,1]){
   if(damaged&&sx===1&&sz===1)continue;
   const pts=[];
   for(let i=0;i<=20;i++){
    const t=i/20;
    pts.push([sx*(3.10*(1-t)),4.91+1.55*Math.sin(t*Math.PI/2),
              sz*(2.40*(1-t))]);
   }
   gothicRib(pts,luxury?.19:.16,luxury?.30:.25,luxury?trim:stone);
  }
  // Transverse voussoir ribs: shaped as load-bearing sections rather
  // than an evenly spaced set of cylinders.
  for(const z of [-2.47,2.47]){
   const pts=[];
   for(let i=0;i<=32;i++){
    const x=-3+6*i/32;
    const y=4.54+1.98*(1-Math.pow(Math.abs(x)/3,1.55));
    pts.push([x,y,z]);
   }
   gothicRib(pts,luxury?.21:.17,luxury?.28:.24,stone);
  }
  // Cross-vault groin seams, thicker near the springing and recessed
  // into the roof rather than hovering above the existing tile courses.
  for(const x of [-2.96,2.96]){
   const pts=[];
   for(let i=0;i<=20;i++){
    const z=-2.35+i*4.7/20;
    const y=4.66+1.62*(1-Math.pow(Math.abs(z)/2.5,1.8));
    pts.push([x,y,z]);
   }
   if(!damaged||x<0)gothicRib(pts,.13,.19,stone);
  }
 }
 if(kind==='vault-support'){
  // A faceted, weight-bearing fan with a pointed underside makes the
  // standalone support read as masonry instead of four metal rods.
  for(const sx of [-1,1])for(const sz of [-1,1]){
   gothicRib([[sx*.18,4.93,sz*.15],[sx*.48,5.18,sz*.22],
     [sx*1.02,5.55,sz*.31],[sx*1.62,5.72,sz*.35],
     [sx*2.15,5.70,sz*.35]],.14,.22,stone);
  }
  // Sculpted crown blocks overlap the springer sockets, removing the
  // visual gap between the square pier and its flared Gothic support.
  for(const y of [4.69,4.83,4.97]){
   const scale=1+(y-4.69)*.60;
   box(0,y,0,scale,.12,scale,stone);
  }
 }
 // PASS 2026-11-12 04:37 JST: actual stone vault webs, not extra rods.
 // Broad, curved ashlar surfaces join the ribs into structural masonry.
 const ashlarWeb=(xa,xb,za,zb,seed=0)=>{
  const nx=4,nz=4,vertices=[],indices=[];
  const roof=(x,z)=>5.37+.62*(1-Math.pow(Math.abs(x)/3.30,1.6))
    +.24*(1-Math.pow(Math.abs(z)/2.65,1.7));
  const irregular=(u,v)=>.035*Math.sin((seed+3)*2.7+u*7.2+v*5.3);
  for(let k=0;k<2;k++)for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){
   const u=ix/nx,v=iz/nz;
   const x=xa+(xb-xa)*u,z=za+(zb-za)*v;
   vertices.push(x,roof(x,z)-k*.23+irregular(u,v),z);
  }
  const stride=(nx+1)*(nz+1);
  for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
   const a=iz*(nx+1)+ix,b=a+1,c=a+nx+1,d=c+1;
   indices.push(a,c,b,b,c,d);
   const A=a+stride,B=b+stride,C=c+stride,D=d+stride;
   indices.push(A,B,C,B,D,C);
  }
  // close four outer edges: this is a thick slab with curved surfaces.
  for(let side=0;side<4;side++){
   const edge=[];
   for(let t=0;t<=(side<2?nx:nz);t++){
    edge.push(side===0?t:side===1?nz*(nx+1)+t:side===2?t*(nx+1):t*(nx+1)+nx);
   }
   for(let j=0;j<edge.length-1;j++){
    const a=edge[j],b=edge[j+1],A=a+stride,B=b+stride;
    indices.push(a,b,A,b,B,A);
   }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setIndex(indices);g.computeVertexNormals();
  return add(g,seed%5===0?trim:stone);
 };
 if(['basic-vault','collapsed-vault','royal-vault'].includes(kind)){
  const ruined=kind==='collapsed-vault',regal=kind==='royal-vault';
  // A staggered set of large curved voussoirs. Keep the missing
  // north-east quarter truly open, instead of filling it with tiles.
  for(let row=0;row<5;row++){
   const z0=-2.38+row*.94,z1=z0+.89;
   for(let col=0;col<6;col++){
    const x0=-2.96+col*.985+(row%2?.09:0);
    const x1=Math.min(2.96,x0+.93);
    if(x0>=2.95)continue;
    if(ruined && (col>=4&&row>=2 || col===3&&row===4))continue;
    ashlarWeb(x0,x1,z0,z1,row*11+col);
   }
  }
  // Curved stone courses become visible at the gable. Individual
  // keystones have mass, unlike the former flat floating tiles.
  for(const z of [-2.49,2.49])for(let i=0;i<12;i++){
   if(ruined&&z>0&&i>=7)continue;
   const x=-2.78+i*.49;
   const y=4.58+1.91*(1-Math.pow(Math.abs(x)/3,1.55));
   const p=voussoir(x,y-.14,z,.49,.27,.35,i+14);
   p.rotation.z=(i-5.5)*-.028;
  }
  if(regal){
   // Raised, joined architrave courses beneath the front ornament:
   // strong masonry mass, not another floating decorative pipe.
   for(const z of [-2.82,2.58])for(let i=0;i<10;i++){
    const x=-2.70+i*.60;
    const y=4.61+1.91*(1-Math.pow(Math.abs(x)/3,1.55));
    const p=voussoir(x,y+.17,z,.54,.29,.37,i+41);
    p.rotation.z=(i-4.5)*-.027;
   }
  }
 }
 if(kind==='vault-support'){
  // Springing blocks widen progressively into the diagonal ribs.
  for(const sx of [-1,1])for(const sz of [-1,1]){
   for(let j=0;j<4;j++){
    const t=(j+.5)/4;
    const p=voussoir(sx*(.39+t*.76),4.94+t*.49,
      sz*(.24+t*.15),.42+t*.12,.22,.46,j+13);
    p.rotation.z=-sx*.18;
   }
  }
 }
 if(kind==='fallen-vault-rubble'){
  // A heavy fallen arch section: irregular fractured ends and broad
  // masonry faces, deliberately touching the ground.
  for(let j=0;j<5;j++){
   const x=-2.35+j*1.10,z=1.68+(j%2)*.24;
   const p=voussoir(x,.24,z,.82,.46,.58,j+75);
   p.rotation.y=j*.21;p.rotation.z=(j%2?.07:-.05);
   fractureStone(x+.35,z+.16,.43,.39,.18,j+89);
  }
 }
 // PASS 2026-11-12 05:32 JST: continuous faceted Gothic arch masonry.
 // The earlier render revealed thin tubular arches and floating keystones.
 // This additive pass creates a single connected, thick stone arch belt
 // with an actual pointed apex and tapered voussoir faces.
 const pointedArchBelt=(z,broken=false,royal=false)=>{
  const cross=[[-.29,-.14],[-.23,.19],[.23,.19],[.29,-.14]];
  const segments=24, verts=[],indices=[];
  // The left and right halves meet at the pointed crown, not a round hump.
  const sample=t=>{
   const x=-3.12+6.24*t;
   const h=4.84+1.68*(1-Math.pow(Math.abs(x)/3.12,1.38));
   return [x,h];
  };
  for(let i=0;i<=segments;i++){
   const [x,y]=sample(i/segments);
   const width=.33+(1-Math.abs(x)/3.12)*.10;
   const height=.40+(1-Math.abs(x)/3.12)*.08;
   for(const [u,v] of cross)verts.push(x,y+v*height/.4,z+u*width/.33);
  }
  for(let i=0;i<segments;i++){
   // Broken upper right arch has actual gaps, not decorative fragments.
   if(broken&&i>=16&&i<=20)continue;
   const a=i*4,b=(i+1)*4;
   for(let j=0;j<4;j++){
    const k=(j+1)%4;
    indices.push(a+j,b+j,a+k,a+k,b+j,b+k);
   }
   // A stone course joint is visible in the face, with no added pipes.
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setIndex(indices);g.computeVertexNormals();
  add(g,royal?trim:stone);
  // Substantial springing wedges mechanically connect the arch to piers.
  for(const sx of [-1,1]){
   for(let j=0;j<4;j++){
    const x=sx*(3.05-j*.17);
    const y=4.91+j*.13;
    const block=voussoir(x,y,z,.40,.37,.65,j+(sx>0?90:80));
    block.rotation.z=sx*(.08+j*.035);
   }
  }
  if(royal){
   // Deep, raised crown stone, and three concentric carved stepped
   // mouldings that hug the arch rather than floating in open space.
   voussoir(0,6.49,z,.53,.53,.75,116);
   for(const sx of [-1,1])for(let j=0;j<5;j++){
    const x=sx*(.42+j*.47),y=4.84+1.68*(1-Math.pow(Math.abs(x)/3.12,1.38));
    const p=voussoir(x,y+.21,z-sx*.025,.38,.16,.77,j+100);
    p.rotation.z=-sx*.12;
   }
  }
 };
 if(['basic-vault','collapsed-vault','royal-vault'].includes(kind)){
  const ruined=kind==='collapsed-vault',regal=kind==='royal-vault';
  pointedArchBelt(-2.53,false,regal);
  pointedArchBelt(2.53,ruined,regal);
  // Triangular gussets are seated directly over each pier capital;
  // they bridge the vertical pier and the diagonal groin rib.
  for(const sx of [-1,1])for(const sz of [-1,1]){
   if(ruined&&sx===1&&sz===1)continue;
   const x=sx*3.20,z=sz*2.45;
   for(let j=0;j<3;j++){
    const t=(j+.5)/3;
    const p=voussoir(x-sx*t*.61,4.94+t*.45,z-sz*t*.45,
      .48,.32,.52,j+121);
    p.rotation.z=-sx*.19;
   }
  }
 }
 if(kind==='vault-support'){
  // Full masonry springer replaces the visual impression of disconnected
  // thin rods at the standalone pier's crown.
  for(const sx of [-1,1])for(let j=0;j<5;j++){
   const t=(j+.5)/5;
   const p=voussoir(sx*(.31+t*1.22),4.94+1.02*t-.38*t*t,
      0,.48,.31,.73,j+130);
   p.rotation.z=-sx*.20;
  }
 }
 // PASS 2026-11-12 06:33 JST: fractured vault masonry with a genuine
 // irregular silhouette and broken, non-rounded cut faces.
 // These are new connected masses; no original geometry is removed.
 const fracturePanel=(outline,thickness=.24,material=stone)=>{
  // Irregular planar masonry shard: polygon top and bottom with all side
  // walls closed. This reads as a broken roof course rather than pebbles.
  const verts=[],faces=[],n=outline.length;
  for(const yoff of [0,-thickness])for(const p of outline)
   verts.push(p[0],p[1]+yoff,p[2]);
  for(let i=1;i<n-1;i++){
   faces.push(0,i,i+1);
   faces.push(n,n+i+1,n+i);
  }
  for(let i=0;i<n;i++){
   const j=(i+1)%n;
   faces.push(i,j,n+i,j,n+j,n+i);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setIndex(faces);g.computeVertexNormals();
  return add(g,material);
 };
 if(kind==='collapsed-vault'){
  // A visibly torn diagonal edge along the surviving left side of the
  // northeast hole. Shards overlap existing roof web, so their roots are
  // structurally embedded, but their jagged tips remain exposed.
  const rim=[
   [[.46,5.91,.36],[.93,5.99,.36],[1.10,5.93,.75],
    [.91,5.87,1.02],[.55,5.92,.89],[.33,5.90,.67]],
   [[.94,5.97,.91],[1.47,5.96,.86],[1.63,5.89,1.24],
    [1.34,5.88,1.55],[1.03,5.92,1.39],[.84,5.94,1.16]],
   [[1.51,5.89,1.40],[1.94,5.83,1.39],[2.12,5.69,1.73],
    [1.88,5.77,2.02],[1.59,5.86,1.85],[1.40,5.88,1.64]],
   [[2.05,5.73,1.80],[2.42,5.56,1.85],[2.60,5.40,2.15],
    [2.39,5.51,2.37],[2.11,5.68,2.20],[1.96,5.71,2.01]]
  ];
  rim.forEach((poly,i)=>fracturePanel(poly,.29+(i%2)*.08,i%3?stone:trim));
  // The exposed thickness is emphasized with occasional snapped blocks,
  // deliberately uneven rather than a repeated rounded bead chain.
  for(let j=0;j<5;j++){
   const x=.68+j*.42,z=1.04+j*.23;
   const p=voussoir(x,5.73-j*.085,z,.37+j%2*.10,.30,.42,j+173);
   p.rotation.z=-.10-j*.035;
  }
 }
 if(kind==='royal-vault'){
  // A real three-dimensional stone fan between capital and diagonal rib.
  // Wide rooted facets converge into a thinner upper socket, reducing
  // the 'loose metal pipes on square posts' appearance.
  for(const sx of [-1,1])for(const sz of [-1,1]){
   const x=sx*3.23,z=sz*2.48;
   fracturePanel([
    [x-sx*.04,4.84,z-sz*.02],
    [x-sx*.47,5.13,z-sz*.20],
    [x-sx*.78,5.44,z-sz*.42],
    [x-sx*.56,5.47,z-sz*.51],
    [x-sx*.20,5.18,z-sz*.33],
    [x+sx*.12,4.91,z-sz*.14]
   ],.20,trim);
  }
 }
 if(kind==='fallen-vault-rubble'){
  // Distinct, broad broken roof plates are grounded: base is y=0,
  // with raised jagged upper profiles and exposed fracture side walls.
  const plates=[
   [[-2.7,.18,-.66],[-2.13,.30,-.80],[-1.79,.22,-.45],
    [-2.03,.11,-.11],[-2.55,.09,-.19]],
   [[.28,.24,-1.92],[.93,.32,-1.83],[1.22,.21,-1.38],
    [.86,.13,-1.19],[.41,.11,-1.43]],
   [[-1.21,.28,1.43],[-.62,.36,1.30],[-.30,.22,1.69],
    [-.72,.13,1.99],[-1.17,.11,1.87]]
  ];
  plates.forEach((poly,i)=>{
   // Build from ground so no visual floating even when the top varies.
   fracturePanel(poly,.11, i===1?trim:stone);
   for(let k=0;k<poly.length;k++){
    const a=poly[k],b=poly[(k+1)%poly.length];
    if(k%2===0)beam([a[0],.08,a[2]],[b[0],.08,b[2]],.034,dark);
   }
  });
 }
 // PASS: tapered stone buttresses physically join the standalone pier to
 // the springing fan. Broad closed masonry faces replace an unsupported
 // collection of thin diagonal struts without removing legacy geometry.
 if(kind==='vault-support'){
  const buttress=(sx,sz)=>{
   const stations=[
    {x:.29,y:4.48,z:.24,w:.40,d:.37},
    {x:.58,y:4.96,z:.31,w:.38,d:.32},
    {x:1.04,y:5.36,z:.36,w:.30,d:.27},
    {x:1.55,y:5.60,z:.38,w:.23,d:.22}
   ];
   const verts=[],indices=[];
   for(const q of stations){
    const x=sx*q.x,z=sz*q.z;
    for(const [u,v] of [[-1,-1],[1,-1],[1,1],[-1,1]])
     verts.push(x+u*q.w/2,q.y+(v>0?.10:-.13),z+v*q.d/2);
   }
   for(let i=0;i<stations.length-1;i++)for(let j=0;j<4;j++){
    const a=i*4+j,b=i*4+(j+1)%4,c=(i+1)*4+j,d=(i+1)*4+(j+1)%4;
    indices.push(a,b,c,b,d,c);
   }
   indices.push(0,2,1,0,3,2);
   const k=(stations.length-1)*4;
   indices.push(k,k+1,k+2,k,k+2,k+3);
   const g=new THREE.BufferGeometry();
   g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
   g.setIndex(indices);g.computeVertexNormals();
   add(g,stone);
  };
  for(const sx of [-1,1])for(const sz of [-1,1])buttress(sx,sz);
 }
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.parent?.remove(group);
  group.clear(); gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}};
}
