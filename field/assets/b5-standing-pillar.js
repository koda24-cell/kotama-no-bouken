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
 add(G(new THREE.BoxGeometry(2.8,.8,2.8)),0,1.15+height+.72,0);
 const scale=Number.isFinite(options.scale)?Math.max(.1,Math.min(4,options.scale)):1;
 group.scale.setScalar(scale);
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.parent?.remove(group);group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
