// Floor 5 original gloom trial. No Nintendo assets or external textures.
// Three.js procedural module, 1 tile = 1 unit. For Claude/browser runtime.
export function createB5GloomPatch(THREE,{seed=1,animate=true}={}){
 const group=new THREE.Group();group.name='b5:gloom-floor-patch';
 group.userData={floor:5,variant:'gloom-floor-patch',seed,license:'original'};
 let state=(seed>>>0)||1;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const black=new THREE.MeshStandardMaterial({color:0x07070b,roughness:.21,metalness:.06,side:THREE.DoubleSide});
 const rim=new THREE.MeshStandardMaterial({color:0x100b12,roughness:.78,side:THREE.DoubleSide});
 const glow=new THREE.MeshStandardMaterial({color:0x651025,emissive:0x8b0b25,emissiveIntensity:1.1,roughness:.8});
 const tendrilMat=new THREE.MeshStandardMaterial({color:0x08070b,roughness:.52,side:THREE.DoubleSide});
 // Jagged, non-circular puddle with three concentric elevation rings.
 const vertices=[],indices=[],rings=4,n=64;
 for(let j=0;j<rings;j++)for(let i=0;i<n;i++){
  const a=i*2*Math.PI/n;
  const noise=.055*Math.sin(a*5+seed)+.036*Math.sin(a*11+seed*.31)+.021*Math.sin(a*17+seed*.17);
  const radius=[.05,.27,.39,.47][j]*(1+noise);
  const y=[.042,.049,.025,.008][j]+.007*Math.sin(a*7+seed);
  vertices.push(Math.cos(a)*radius,y,Math.sin(a)*radius);
 }
 for(let j=0;j<rings-1;j++)for(let i=0;i<n;i++){
  const a=j*n+i,b=j*n+(i+1)%n,c=(j+1)*n+i,d=(j+1)*n+(i+1)%n;
  indices.push(a,c,b,b,c,d);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
 const pool=new THREE.Mesh(geo,black);pool.name='gloom-viscous-pool';group.add(pool);
 // Irregular raised shoreline, made from a tube rather than a flat decal.
 const outline=[];for(let i=0;i<=64;i++){const a=i*Math.PI*2/64;const noise=.055*Math.sin(a*5+seed)+.036*Math.sin(a*11+seed*.31)+.021*Math.sin(a*17+seed*.17);outline.push(new THREE.Vector3(Math.cos(a)*.47*(1+noise),.015,Math.sin(a)*.47*(1+noise)))}
 group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outline),128,.012,5,false),rim));
 // Organic branching red-purple veins on top of the pool.
 for(let k=0;k<7;k++){
  const a=k*2.39996+random()*.4,points=[],rmax=.18+random()*.18;
  for(let j=0;j<7;j++){const t=j/6,r=.055+t*rmax,theta=a+.15*Math.sin(t*6+k);points.push(new THREE.Vector3(Math.cos(theta)*r,.063+.005*Math.sin(t*6),Math.sin(theta)*r))}
  const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),18,.0025+random()*.002,4,false),glow);
  tube.name='gloom-emissive-vein';group.add(tube);
 }
 // Distinct bent tapered tendrils, varying in height, rooted in puddle.
 for(let k=0;k<10;k++){
  const a=k*Math.PI*2/10+random()*.5,r=.17+random()*.18,height=.19+random()*.35;
  const path=new THREE.CatmullRomCurve3([
   new THREE.Vector3(Math.cos(a)*r,.04,Math.sin(a)*r),
   new THREE.Vector3(Math.cos(a)*(r+.04),height*.43,Math.sin(a)*(r+.04)),
   new THREE.Vector3(Math.cos(a+.22)*(r+.07),height*.78,Math.sin(a+.22)*(r+.07)),
   new THREE.Vector3(Math.cos(a+.55)*(r+.10),height,Math.sin(a+.55)*(r+.10))
  ]);
  const tube=new THREE.Mesh(new THREE.TubeGeometry(path,20,.012,7,false),tendrilMat);
  // Tapered sheath: custom rings, thick rooted base and pointed tip.
  const verts=[],idx=[],segments=18,sides=9;
  for(let j=0;j<=segments;j++){
   const t=j/segments,p=path.getPoint(t),tan=path.getTangent(t),u=new THREE.Vector3(1,0,0).cross(tan).normalize();
   if(u.lengthSq()<.01)u.set(0,0,1);
   const v=new THREE.Vector3().crossVectors(tan,u).normalize();
   const rad=(.039+random()*.003)*Math.pow(1-t,.8)+.0008;
   for(let q=0;q<sides;q++){const ang=q*2*Math.PI/sides,rr=rad*(1+.15*Math.sin(ang*3+t*13));verts.push(p.x+rr*(u.x*Math.cos(ang)+v.x*Math.sin(ang)),p.y+rr*(u.y*Math.cos(ang)+v.y*Math.sin(ang)),p.z+rr*(u.z*Math.cos(ang)+v.z*Math.sin(ang)))}
  }
  for(let j=0;j<segments;j++)for(let q=0;q<sides;q++){const a=j*sides+q,b=j*sides+(q+1)%sides,c=(j+1)*sides+q,d=(j+1)*sides+(q+1)%sides;idx.push(a,b,c,b,d,c)}
  const tapered=new THREE.BufferGeometry();tapered.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));tapered.setIndex(idx);tapered.computeVertexNormals();
  tube.geometry.dispose();tube.geometry=tapered;
  tube.name='gloom-tendril';group.add(tube);
 }
 const particles=[];
 if(animate){
  const particleMat=new THREE.MeshBasicMaterial({color:0x912c61,transparent:true,opacity:.46,depthWrite:false});
  for(let i=0;i<14;i++){
   const m=new THREE.Mesh(new THREE.SphereGeometry(.009+random()*.009,6,4),particleMat);
   const a=random()*Math.PI*2,r=random()*.32;
   m.position.set(Math.cos(a)*r,.10+random()*.3,Math.sin(a)*r);group.add(m);
   particles.push({mesh:m,offset:random()*Math.PI*2,speed:.2+random()*.35});
  }
 }
 function update(timeSeconds){
  glow.emissiveIntensity=.8+.32*Math.sin(timeSeconds*1.9+seed);
  for(const p of particles)p.mesh.position.y=.12+((timeSeconds*p.speed+p.offset)%1)*.45;
 }
 return {group,update};
}
