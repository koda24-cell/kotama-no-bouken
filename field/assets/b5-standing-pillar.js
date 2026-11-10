/* B5 intact standing column, derived from the approved fallen pillar (PR #210).
 * Same 12-flute radial shaft, layered mouldings, square plinth and stone finish.
 * Decorative only; base is grounded at y=0. No debris or collision.
 */
export function createB5StandingPillar(THREE,options={}){
 const group=new THREE.Group();group.name='b5:throne:standingPillar';group.userData.visualOnly=true;
 const geometries=[],materials=[];
 const G=g=>(geometries.push(g),g),M=m=>(materials.push(m),m);
 const stone=M(new THREE.MeshStandardMaterial({color:0x66616b,roughness:.94,flatShading:true,side:THREE.DoubleSide}));
 const add=(geometry,x,y,z)=>{const m=new THREE.Mesh(geometry,stone);m.position.set(x,y,z);group.add(m);return m;};
 const height=Number.isFinite(options.height)?Math.max(4,Math.min(16,options.height)):8;
 const segments=48,rings=32,positions=[],indices=[];
 // Fallen original: radius 1.07 -> .95, 12 longitudinal flutes.
 // Reoriented onto vertical Y, with intact smooth crown rather than fracture.
 for(let j=0;j<=rings;j++){
  const t=j/rings;
  for(let k=0;k<segments;k++){
   const a=k*Math.PI*2/segments;
   const flute=.075*Math.cos(a*12);
   const r=1.07-.12*t+flute+.013*Math.sin(a*5+t*13);
   positions.push(Math.cos(a)*r,1.15+t*height,Math.sin(a)*r);
  }
 }
 for(let j=0;j<rings;j++)for(let k=0;k<segments;k++){
  const a=j*segments+k,b=j*segments+(k+1)%segments,c=(j+1)*segments+k,d=(j+1)*segments+(k+1)%segments;
  indices.push(a,c,b,b,c,d);
 }
 for(let k=1;k<segments-1;k++){
  indices.push(0,k,k+1);
  const last=rings*segments;indices.push(last,last+k+1,last+k);
 }
 const geo=G(new THREE.BufferGeometry());
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setIndex(indices);geo.computeVertexNormals();add(geo,0,0,0);
 const band=(y,radius,thickness)=>add(G(new THREE.CylinderGeometry(radius,radius,thickness,36)),0,y,0);
 for(const [offset,radius,thickness] of [[-.16,1.58,.17],[.04,1.50,.24],[.30,1.39,.18],[.52,1.28,.30]]){
  band(1.15+offset,radius,thickness);
  band(1.15+height-offset,radius,thickness);
 }
 // Same 2.8-wide square stone base as the fallen model, set upright.
 add(G(new THREE.BoxGeometry(2.8,.8,2.8)),0,.4,0);
 // Ornate Gothic capital: a stone bell, four pointed blind-arcade panels,
 // carved corner leaves, and stepped abacus supporting the upper slab.
 const top=1.15+height;
 const capital=add(G(new THREE.CylinderGeometry(1.46,.96,1.15,48,5)),0,top+.64,0);
 const lip=(y,r,th)=>band(y,r,th);
 lip(top+.13,1.18,.12);
 lip(top+1.12,1.51,.16);
 lip(top+1.36,1.64,.14);
 const dark=M(new THREE.MeshStandardMaterial({color:0x45414b,roughness:.97,flatShading:true}));
 const relief=(geometry,x,y,z)=>{const m=new THREE.Mesh(geometry,dark);m.position.set(x,y,z);group.add(m);return m;};
 // Four recessed lancet niches: narrow dark wells framed by stone ribs.
 for(let face=0;face<4;face++){
  const a=face*Math.PI/2,rad=1.36;
  for(const u of [-.47,0,.47]){
   const px=Math.sin(a)*rad+Math.cos(a)*u;
   const pz=Math.cos(a)*rad-Math.sin(a)*u;
   const well=relief(G(new THREE.BoxGeometry(.24,.49,.035)),px,top+.69,pz);
   well.rotation.y=a;
   const point=relief(G(new THREE.ConeGeometry(.14,.23,4)),px,top+1.035,pz);
   point.rotation.y=a+Math.PI/4;
  }
 }
 // Four foliage clusters are stone carvings, not separate floating spikes.
 for(let corner=0;corner<4;corner++){
  const a=Math.PI/4+corner*Math.PI/2;
  for(let leaf=0;leaf<3;leaf++){
   const r=1.16+leaf*.085,yy=top+.45+leaf*.21;
   const m=add(G(new THREE.SphereGeometry(.24,.11,12,8)),Math.cos(a)*r,yy,Math.sin(a)*r);
   m.rotation.y=-a;m.rotation.z=.34*(leaf-1);
  }
 }
 // Wide, tiered abacus with bevelled stone edges.
 const abacus=add(G(new THREE.BoxGeometry(3.35,.31,3.35)),0,top+1.51,0);
 const crown=add(G(new THREE.BoxGeometry(3.72,.22,3.72)),0,top+1.76,0);
 for(const y of [top+1.30,top+1.91]){
  add(G(new THREE.BoxGeometry(3.9,.09,3.9)),0,y,0);
 }

 const scale=Number.isFinite(options.scale)?Math.max(.1,Math.min(4,options.scale)):1;
 group.scale.setScalar(scale);
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.parent?.remove(group);group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
