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
   const yy=5.40+.56*(1-Math.abs(x)/3)+.28*(1-Math.abs(z)/2.5);
   const p=box(x,yy,z,.56,.13,.59,ix%4===0?trim:stone);
   p.rotation.z=.035*Math.sin(ix*1.8+iz);p.rotation.x=.03*Math.cos(iz*1.1+ix);
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
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.parent?.remove(group);
  group.clear(); gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}};
}
