// Floor 5 original gloom trial. No Nintendo assets or external textures.
// Three.js procedural module, 1 tile = 1 unit. For Claude/browser runtime.
export function createB5GloomPatch(THREE,{seed=1,animate=true}={}){
 const group=new THREE.Group();group.name='b5:gloom-floor-patch';
 group.userData={floor:5,variant:'gloom-floor-patch',seed,license:'original'};
 let state=(seed>>>0)||1;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const black=new THREE.MeshStandardMaterial({color:0x130d1b,roughness:.29,metalness:.13,side:THREE.DoubleSide});
 const rim=new THREE.MeshStandardMaterial({color:0x291328,roughness:.78,side:THREE.DoubleSide});
 const glow=new THREE.MeshStandardMaterial({color:0x8e183a,emissive:0x8e0b31,emissiveIntensity:1.5,roughness:.8});
 const tendrilMat=new THREE.MeshStandardMaterial({color:0x170c1b,roughness:.46,side:THREE.DoubleSide});
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
 for(let k=0;k<9;k++){
  const a=k*2.39996+random()*.4,points=[],rmax=.24+random()*.16;
  for(let j=0;j<7;j++){const t=j/6,r=.055+t*rmax,theta=a+.15*Math.sin(t*6+k);points.push(new THREE.Vector3(Math.cos(theta)*r,.063+.005*Math.sin(t*6),Math.sin(theta)*r))}
  const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),18,.0035+random()*.003,4,false),glow);
  tube.name='gloom-emissive-vein';group.add(tube);
 }
 // Distinct bent tapered tendrils, varying in height, rooted in puddle.
 for(let k=0;k<7;k++){
  const a=k*Math.PI*2/7+random()*.5,r=.17+random()*.18,height=.14+random()*.24;
  const path=new THREE.CatmullRomCurve3([
   new THREE.Vector3(Math.cos(a)*r,.04,Math.sin(a)*r),
   new THREE.Vector3(Math.cos(a)*(r+.04),height*.43,Math.sin(a)*(r+.04)),
   new THREE.Vector3(Math.cos(a+.22)*(r+.07),height*.78,Math.sin(a+.22)*(r+.07)),
   new THREE.Vector3(Math.cos(a+.55)*(r+.10),height,Math.sin(a+.55)*(r+.10))
  ]);
  const tube=new THREE.Mesh(new THREE.TubeGeometry(path,12,.017,6,false),tendrilMat);
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
  glow.emissiveIntensity=1.25+.42*Math.sin(timeSeconds*1.9+seed);
  for(const p of particles)p.mesh.position.y=.12+((timeSeconds*p.speed+p.offset)%1)*.45;
 }
 return {group,update};
}
