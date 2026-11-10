/* B5 throne hall: ancient ruined Gothic gate behind the Demon King.
 * Standalone visual prop, not a traversable portal or collision surface.
 * Coordinate system: X horizontal, Y up, Z depth. Ground is Y=0.
 * Canonical FRONT / camera side = -Z. Deep carved faces point toward -Z.
 * Canonical BACK = +Z. The gate is visual-only behind the Demon King.
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
 // Weathered structural stone with rounded bevel rings and gently
 // undulating faces. No sharp noise peaks; retain the original silhouette.
 const weatheredCore=(x,y,z,w,h,d,mat=stone)=>{
  const n=12,verts=[],indices=[];
  const outline=[[-.78,-1],[-.18,-1],[.66,-1],[1,-.76],[1,-.1],[1,.72],[.75,1],[.14,1],[-.72,1],[-1,.72],[-1,.06],[-1,-.74]];
  const rings=7;
  for(let k=0;k<rings;k++){
   const t=k/(rings-1),yy=(t-.5)*h;
   const bevel=(k===0||k===rings-1)?.10:(k===1||k===rings-2)?.035:0;
   for(let j=0;j<n;j++){
    const [px,pz]=outline[j];
    const wave=(k>0&&k<rings-1)?(.018*Math.sin(j*2.1+k*.9)+.012*Math.cos(j*.8-k*1.7)):0;
    const scale=1-bevel+wave;
    verts.push(px*w*.5*scale,yy,pz*d*.5*scale);
   }
  }
  for(let k=0;k<rings-1;k++)for(let j=0;j<n;j++){
   const q=(j+1)%n,a=k*n+j,b=k*n+q,c=(k+1)*n+j,e=(k+1)*n+q;
   indices.push(a,b,c,b,e,c);
  }
  for(let j=1;j<n-1;j++){indices.push(0,j+1,j);indices.push((rings-1)*n,(rings-1)*n+j,(rings-1)*n+j+1);}
  const geo=G(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();
  return add(geo,mat,x,y,z);
 };
 // Eroded fracture faces: uneven but broadly planar chipped ends.
 // The fractured cross-section is a real cap with bevelled rim, not spikes.
 const fracturedStone=(x,y,z,w,h,d,mat=stone,brokenEnd=1)=>{
  const nx=9,nz=7,verts=[],indices=[];
  const at=(i,j)=>j*nx+i;
  const xs=Array.from({length:nx},(_,i)=>i/(nx-1));
  const zs=Array.from({length:nz},(_,j)=>j/(nz-1));
  const top=[],bottom=[];
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
   const u=xs[i],v=zs[j],edge=Math.min(u,1-u,v,1-v);
   const erode=Math.min(1,edge*9);
   const chips=(Math.sin(i*2.17+j*1.3)+Math.sin(i*.83-j*2.4))*.024*h*erode;
   const fracture=brokenEnd*(u>.68?(u-.68)/.32:0)*(.12+.08*Math.sin(v*6.28))*h;
   const xx=(u-.5)*w,zz=(v-.5)*d;
   bottom.push([xx,-h/2,zz]);
   top.push([xx,h/2-fracture+chips,zz]);
  }
  for(const p of bottom)verts.push(...p);
  for(const p of top)verts.push(...p);
  const topOffset=nx*nz;
  for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){
   const a=topOffset+at(i,j),b=topOffset+at(i+1,j),c=topOffset+at(i,j+1),e=topOffset+at(i+1,j+1);
   indices.push(a,c,b,b,c,e);
  }
  const ring=[];
  for(let i=0;i<nx;i++)ring.push(at(i,0));
  for(let j=1;j<nz;j++)ring.push(at(nx-1,j));
  for(let i=nx-2;i>=0;i--)ring.push(at(i,nz-1));
  for(let j=nz-2;j>0;j--)ring.push(at(0,j));
  for(let k=0;k<ring.length;k++){
   const a=ring[k],b=ring[(k+1)%ring.length];
   indices.push(a,b,topOffset+a,b,topOffset+b,topOffset+a);
  }
  for(let j=1;j<nz-1;j++)for(let i=1;i<nx-1;i++){
   const a=at(i,j),b=at(i+1,j),c=at(i,j+1),e=at(i+1,j+1);
   indices.push(a,b,c,b,e,c);
  }
  const geo=G(new THREE.BufferGeometry());
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  return add(geo,mat,x,y,z);
 };
 // Continuous fluted pillar shaft: one closed mesh per pier.
 // Vertical grooves are cut into its front/back and side cross-sections,
 // not separate rods glued to the surface.
 const flutedShaft=(x,bottom,h,w=1.95,d=1.86)=>{
  const n=96,levels=85,verts=[],idx=[];
  for(let k=0;k<levels;k++){
   const t=k/(levels-1),y=bottom+t*h;
   for(let j=0;j<n;j++){
    const a=2*Math.PI*j/n,c=Math.cos(a),q=Math.sin(a);
    const norm=Math.max(Math.abs(c),Math.abs(q));
    const bx=c/norm*w*.5,bz=q/norm*d*.5;
    // Grooves run the entire height, following a softly weathered outline.
    const front=q<-.84;
    const back=q>.84;
    const side=Math.abs(c)>.84;
    const across=(front||back)?bx/(w*.5):bz/(d*.5);
    const grooves=(front||side)?Math.pow(Math.max(0,Math.cos(across*3*Math.PI)),8)*(front?.19:.07):0;
    const ripple=.025*Math.sin(t*19+a*3)+.014*Math.sin(t*31-a*5);
    const edge=1-.055*Math.pow(Math.abs(t-.5)*2,9);
    // Broad, irregular erosion pockets actually REMOVE shaft volume.
    // Four asymmetrical damaged regions; no added surface plates.
    const faceCoord=(Math.abs(q)>.84)?bx/(w*.5):bz/(d*.5);
    const onFace=Math.max(Math.abs(q),Math.abs(c));
    const scars=[
     [-.22,.25,.30,.11,.19],
     [.30,.42,.29,.13,.24],
     [-.10,.63,.35,.12,.21],
     [.23,.80,.25,.09,.17]
    ];
    let recess=0;
    if(front || side){
     for(let si=0;si<scars.length;si++){
      const [u,v,rx,ry,depth]=scars[si];
      const yy=t+(si%2===0?.012:-.016)*Math.sin(faceCoord*9+si);
      const du=(faceCoord-u)/rx,dv=(yy-v)/ry;
      const irregular=1+.17*Math.sin(faceCoord*13+t*31+si*2.1)+.09*Math.cos(faceCoord*21-t*17);
      const r=Math.sqrt(du*du+dv*dv)*irregular;
      // Rounded, chipped boundary and uneven eroded floor.
      const bowl=Math.max(0,Math.min(1,(1.15-r)/.55));
      const variation=.85+.15*Math.sin(faceCoord*18+t*27);
      recess=Math.max(recess,depth*(front?1.75:.45)*bowl*bowl*(3-2*bowl)*variation);
     }
    }
    const shrink=1+(ripple-grooves-recess)/Math.max(w,d);
    verts.push(x+bx*edge*shrink,y,bz*edge*shrink);
   }
  }
  for(let k=0;k<levels-1;k++)for(let j=0;j<n;j++){
   const a=k*n+j,b=k*n+(j+1)%n,c=(k+1)*n+j,d=(k+1)*n+(j+1)%n;
   idx.push(a,b,c,b,d,c);
  }
  for(let j=1;j<n-1;j++){idx.push(0,j+1,j);idx.push((levels-1)*n,(levels-1)*n+j,(levels-1)*n+j+1);}
  const g=G(new THREE.BufferGeometry());
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setIndex(idx);g.computeVertexNormals();
  return add(g,stone,0,0,0);
 };
 // Reference silhouette: horizontal broken lintel and two masonry piers.
 // There is NO large triangular / pointed arch spanning the gate.
 for(const side of [-1,1]){
  const x=side*3.75,h=side<0?9.8:7.1;
  weatheredCore(x,.7,0,2.65,1.4,2.5);
  flutedShaft(x,1.4,h);
  // Preserve the approved stepped stone bands and recessed Gothic relief.
  for(let y=2.3;y<h+1.4;y+=1.65){
   weatheredCore(x,y,0,2.14,.25,2.05,trim);
  }
  for(const z of [-1.03,1.03]){
   block(x,4.2,z,.93,3.6,.10,cut);
   for(const dx of [-.48,.48])block(x+dx,4.2,z+Math.sign(z)*.07,.14,3.75,.15,trim);
   for(const dx of [-.28,.28])block(x+dx,4.2,z+Math.sign(z)*.11,.075,3.25,.09,stone);
   block(x,6.05,z+Math.sign(z)*.06,.94,.18,.18,trim);
   block(x,3.7,z+Math.sign(z)*.11,.85,.12,.14,trim);
  }
  // Capital and plinth remain distinct architectural pieces.
  weatheredCore(x,1.4+h,0,2.7,.48,2.6,trim);
 }
 // Ruined lintel: closed, multi-section stone geometry with broad
 // missing bites, bevelled edges and an uneven fracture cap.
 // The broken beam rests over the piers rather than floating between them.
 const ruinedLintel=(x,y,z,w,h,d,seed=0)=>{
  const sections=25,ring=12,vertices=[],faces=[];
  const outline=[[-.88,-1],[-.28,-1],[.55,-1],[.94,-.77],[1,-.25],[1,.58],[.76,1],[.14,1],[-.62,1],[-1,.70],[-1,.09],[-.96,-.70]];
  for(let i=0;i<sections;i++){
   const t=i/(sections-1),xx=(t-.5)*w;
   const fracture=Math.max(0,(t-.77)/.23);
   const loss=(.13*Math.sin(t*17+seed)+.08*Math.sin(t*31-seed))*h;
   const notch=Math.exp(-Math.pow((t-.38-seed*.035)/.105,2))*.24*h;
   const endFall=fracture*(.12+.26*Math.sin(seed+1.4))*h;
   for(let j=0;j<ring;j++){
    const [vy,vz]=outline[j];
    const bevel=1-.06*Math.sin(t*8+j*1.7+seed);
    const yy=vy*h*.5*bevel-loss*(vy>.1?1:.22)-notch*(vy>.1?1:.12)-endFall*(vy>.1?1:.4);
    const zz=vz*d*.5*(1-.07*Math.sin(t*12+j*.9+seed));
    vertices.push(xx,yy,zz);
   }
  }
  for(let i=0;i<sections-1;i++)for(let j=0;j<ring;j++){
   const a=i*ring+j,b=i*ring+(j+1)%ring,c=(i+1)*ring+j,e=(i+1)*ring+(j+1)%ring;
   faces.push(a,b,c,b,e,c);
  }
  // end caps follow the irregular fractured cross-section.
  for(let j=1;j<ring-1;j++){
   faces.push(0,j+1,j);
   const end=(sections-1)*ring;faces.push(end,end+j,end+j+1);
  }
  const geo=G(new THREE.BufferGeometry());
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setIndex(faces);geo.computeVertexNormals();
  return add(geo,stone,x,y,z);
 };
 for(const [x,y,w,ang,seed] of [
  [-3.3,11.45,3.6,0,.4],[-.75,11.45,1.7,-.025,1.8],
  [2.45,9.05,2.7,-.045,2.7],[4.15,9.0,1.45,-.11,3.9]
 ]){
  const beam=ruinedLintel(x,y,0,w,.78,2.1,seed);
  beam.rotation.z=ang;
  // The old full-length rectangular cornice is intentionally removed:
  // worn partial mouldings follow the surviving stone below.
 }
 // Thick broken arch shoulders grow directly out of each pier.
 // The missing centre remains open, matching the ruined lintel silhouette.
 for(const side of [-1,1]){
  const x=side*3.75;
  const shoulder=weatheredCore(x-side*.63,8.55,0,1.65,1.48,1.88,stone);
  shoulder.rotation.z=side*.14;
  const upper=weatheredCore(x-side*1.42,9.18,0,1.72,1.28,1.88,stone);
  upper.rotation.z=side*.32;
  const broken=fracturedStone(x-side*1.91,9.46,0,1.22,1.06,1.88,cut,1);
  broken.rotation.z=side*.36;
 }
 // Integrated masonry transition from pier to ruined lintel.
 // A single tapered, chamfered volume per shoulder replaces the visual gap
 // between stacked blocks; the outer edge is fractured rather than spiky.
 const gothicHaunch=(x,y,z,side,width=2.6,height=2.25,depth=2.12)=>{
  // Single continuous sculpted support: Gothic recessed flutes and worn edges
  // are cut into the FRONT (-Z), not applied as separate decorative objects.
  const levels=49,across=57,points=[],faces=[];
  const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
  for(let k=0;k<levels;k++){
   const t=k/(levels-1),ease=smooth(t);
   const outer=x-side*(.78+1.06*ease)*width*.5;
   const inner=x+side*(.64+.30*t)*width*.5;
   const yy=y+t*height-.055*Math.sin(t*11+side)*t;
   for(let j=0;j<across;j++){
    const u=j/(across-1);
    const xx=outer+(inner-outer)*u;
    // Worn, softly rounded corners, with localized missing stone.
    const edge=Math.min(u,1-u);
    const edgeWear=(1-smooth(edge/.10))*
      (.065+.038*Math.sin(t*17+u*31+side)+.025*Math.sin(t*37-u*14));
    const topWear=(1-smooth((1-t)/.11))*.065*(.5+.5*Math.sin(u*21+side));
    const arch=.13*Math.sin(Math.PI*u)*Math.sin(Math.PI*t);
    const chip=.018*Math.sin(u*17+t*23)+.014*Math.sin(u*29-t*12);
    // Three deep, vertically flowing Gothic flute channels, interrupted by
    // erosion. The arch-shaped termination is sculpted into the same mesh.
    const fluteCenters=[.23,.50,.77];
    let recess=0;
    for(let m=0;m<fluteCenters.length;m++){
     const center=fluteCenters[m]+.035*Math.sin(t*3.8+m*.6);
     const distance=Math.abs(u-center);
     const channel=1-smooth((distance-.032)/.048);
     const archEnd=smooth((t-.10-.065*Math.abs(u-center)*7)/.10)*
       (1-smooth((t-.91+.035*Math.abs(u-center)*7)/.075));
     const damage=.76+.24*Math.sin(t*13+m*2.1);
     recess=Math.max(recess,.34*channel*archEnd*damage);
    }
    const erosion=Math.exp(-Math.pow((u-.39-.08*Math.sin(t*5))/.15,2))*
      Math.exp(-Math.pow((t-.58)/.22,2))*.17;
    const frontZ=z-depth*.43+recess+erosion+edgeWear*.50+topWear*.40;
    const localY=yy+arch+chip-edgeWear*.34-topWear;
    points.push(xx,localY,frontZ);
    points.push(xx,localY,z+depth*.43);
   }
  }
  for(let k=0;k<levels-1;k++)for(let j=0;j<across-1;j++){
   const q=(k*across+j)*2,r=q+2,n=q+across*2,m=n+2;
   faces.push(q,n,r,r,n,m); // front, outward toward -Z
   faces.push(q+1,r+1,n+1,r+1,m+1,n+1);
  }
  for(let k=0;k<levels-1;k++)for(const j of [0,across-1]){
   const a=(k*across+j)*2,b=((k+1)*across+j)*2;
   faces.push(a,a+1,b,a+1,b+1,b);
  }
  for(const k of [0,levels-1])for(let j=0;j<across-1;j++){
   const a=(k*across+j)*2,b=a+2;
   faces.push(a,b,a+1,b,b+1,a+1);
  }
  const geo=G(new THREE.BufferGeometry());
  geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  geo.setIndex(faces);geo.computeVertexNormals();
  return add(geo,stone,0,0,0);
 };
 // Capitals remain asymmetric in height; support stones emerge directly
 // from the shaft, overlapping the surviving beam and broken shoulders.
 for(const side of [-1,1]){
  const x=side*3.75,top=1.4+(side<0?9.8:7.1);
  gothicHaunch(x,top-1.65,0,side,2.55,1.78,2.08);
  // Deep front-facing recessed moulding on the supporting haunch.
  const front=-1.11;
  const fillet=weatheredCore(x-side*.52,top-.43,front,1.24,.17,.17,trim);
  fillet.rotation.z=side*.24;
  // Small broken course at the outer support edge.
  const scar=fracturedStone(x-side*1.42,top-.14,-.81,.73,.43,.52,cut,1);
  scar.rotation.z=side*.18;
 }
 // Fractured cornice / capital sculpt pass. Every stone sits within the
 // existing lintel silhouette; no new pointed apex or floating decoration.
 const chippedCap=(x,y,z,w,h,d,mat=stone)=>{
  const n=12,verts=[],idx=[];
  const outline=[[-.8,-1],[-.2,-1],[.55,-1],[.94,-.84],[1,-.22],[.91,.65],[.65,1],[.12,1],[-.65,.93],[-1,.69],[-1,.13],[-.95,-.68]];
  const rings=[[-.5,.88],[-.33,1],[.27,.98],[.5,.79]];
  for(let k=0;k<rings.length;k++){
   const [height,scale]=rings[k];
   for(let j=0;j<n;j++){
    const [u,v]=outline[j],rough=.024*Math.sin(j*2.3+k*1.8);
    verts.push(u*w*.5*(scale+rough),height*h+(k===3?.045*h*Math.sin(j*1.7):0),v*d*.5*(scale+rough));
   }
  }
  for(let k=0;k<rings.length-1;k++)for(let j=0;j<n;j++){
   const a=k*n+j,b=k*n+(j+1)%n,c=(k+1)*n+j,e=(k+1)*n+(j+1)%n;
   idx.push(a,b,c,b,e,c);
  }
  for(let j=1;j<n-1;j++){idx.push(0,j+1,j);idx.push(3*n,3*n+j,3*n+j+1);}
  const g=G(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setIndex(idx);g.computeVertexNormals();return add(g,mat,x,y,z);
 };
 // Worn mouldings and chipped voussoirs integrated into the surviving beam.
 for(const [x,y,w] of [[-3.3,11.45,3.6],[-.75,11.45,1.7],[2.45,9.05,2.7]]){
  const course=chippedCap(x,y-.23,-.72,w*.97,.31,.55,trim);
  course.rotation.z=x>0?-.045:0;
  chippedCap(x,y+.29,-.63,w*.90,.22,.62,stone);
  for(let j=0;j<Math.max(2,Math.floor(w/.72));j++){
   const px=x-w*.40+j*w*.8/Math.max(1,Math.floor(w/.72)-1);
   const fragment=chippedCap(px,y-.48,-.72,.48,.20,.43,j%3===0?cut:stone);
   fragment.rotation.z=(j%2?1:-1)*.055;
  }
 }
 // Heavy weathered capitals: overlapping carved stone plates, not rods.
 for(const side of [-1,1]){
  const x=side*3.75,h=side<0?9.8:7.1;
  for(const [dy,w,thick] of [[-.30,2.38,.28],[.06,2.65,.25],[.34,2.44,.19]]){
   chippedCap(x,1.4+h+dy,-.08,w,thick,2.45,dy===.06?trim:stone);
  }
  // chipped corners on the forward-facing (-Z) capital edge
  for(const dx of [-.88,.82]){
   chippedCap(x+dx,1.4+h+.16,-1.12,.49,.31,.38,cut);
  }
 }
 // A collapsed right cornice creates a distinct asymmetric ruin silhouette.
 fracturedStone(4.8,8.9,-.18,1.7,.5,2.2,cut,1).rotation.z=-.17;
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
 // Bevelled polygonal masonry, softened corners rather than spiky slabs.
 // Faceted weathered masonry: four bevelled rings, irregular edges,
 // flat top and side planes. Broad, shallow facets rather than spikes.
 const polygonStone=(x,y,z,w,h,d,mat=stone)=>{
  const n=12,verts=[],indices=[];
  const corners=[[-.76,-1],[-.16,-1],[.64,-1],[1,-.77],[1,-.18],[1,.68],[.73,1],[.12,1],[-.69,1],[-1,.74],[-1,.08],[-1,-.72]];
  const irregular=corners.map((p,j)=>[
   p[0]*(.965+.035*rand()),p[1]*(.965+.035*rand())
  ]);
  const rings=[
   {y:-h/2,inset:.085},{y:-h/2+Math.min(h*.20,.18),inset:0},
   {y:h/2-Math.min(h*.24,.20),inset:0},{y:h/2,inset:.12}
  ];
  for(let k=0;k<rings.length;k++){
   const ring=rings[k];
   for(let j=0;j<n;j++){
    const p=irregular[j],scale=1-ring.inset;
    const perturb=(k===1||k===2)?(rand()-.5)*Math.min(.045,w*.018):0;
    verts.push(p[0]*w*.5*scale+perturb,ring.y,p[1]*d*.5*scale+perturb);
   }
  }
  for(let k=0;k<rings.length-1;k++)for(let j=0;j<n;j++){
   const next=(j+1)%n,a=k*n+j,b=k*n+next,c=(k+1)*n+j,e=(k+1)*n+next;
   indices.push(a,b,c,b,e,c);
  }
  for(let j=1;j<n-1;j++){
   indices.push(0,j+1,j);
   indices.push(3*n,3*n+j,3*n+j+1);
  }
  const g=G(new THREE.BufferGeometry());
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setIndex(indices);g.computeVertexNormals();
  return add(g,mat,x,y,z);
 };
 for(const side of [-1,1]){
  const x=side*3.75;
  polygonStone(x,.36,0,3.1,.72,2.9,stone);
  polygonStone(x,1.05,0,2.65,.35,2.45,trim);
  // Small relief courses anchored to the pier, not free-standing sticks.
  for(let i=0;i<3;i++){
   const y=2.5+i*1.7;
   polygonStone(x,y,-.93,1.75,.24,.25,i%2?cut:trim);
  }
 }
 // Carved pier detail pass: recessed panels and chamfered masonry bands.
 // Keep the broken horizontal silhouette unchanged.
 for(const side of [-1,1]){
  const x=side*3.75;
  for(const z of [-1.09,1.09]){
   const facing=Math.sign(z);
   for(const y of [3.1,5.0]){
    // Three stepped layers give the inset an actual architectural depth.
    polygonStone(x,y,z,1.35,1.48,.11,trim);
    polygonStone(x,y,z+facing*.075,1.09,1.22,.085,cut);
    polygonStone(x,y,z+facing*.128,.74,.94,.07,stone);
    for(const dx of [-.46,.46]){
     block(x+dx,y,z+facing*.19,.085,1.05,.09,trim);
    }
    block(x,y,z+facing*.20,.87,.085,.1,trim);
   }
  }
  // Stone course divisions and shallow stepped corner chamfers.
  for(const y of [2.1,3.95,5.85,7.5]){
   polygonStone(x,y,-.01,2.16,.19,2.04,trim);
   block(x,y+.14,-1.04,1.62,.07,.13,cut);
  }
  for(const sx of [-.77,.77]){
   block(x+sx,4.65,-.88,.17,5.05,.16,trim);
   block(x+sx*.87,4.65,-1.02,.08,4.68,.12,stone);
  }
 }
 // FRONT (-Z) has deeper carved recesses than BACK (+Z).
 // Damage is now carved directly into the continuous flutedShaft mesh.
 // Former pentagonal fracturePlate overlays and protruding gouge bars removed.
 // Layered capstones, with small missing pieces on the surviving lintel.
 for(const [x,y,w] of [[-3.3,11.94,3.58],[-.75,11.94,1.66],[2.45,9.54,2.65]]){
  polygonStone(x,y,-.06,w,.21,2.26,trim);
  polygonStone(x,y+.17,-.08,w*.88,.12,2.03,stone);
 }
 // Settle the entire joined masonry structure into the ground as a single
 // tilted ruin. The beam stays connected to both pillars. Floor rubble is
 // created AFTER this grouping so it remains on the actual horizontal ground.
 const settledMasonry=new THREE.Group();
 settledMasonry.name='gate:leaning-masonry';
 const builtPieces=[...group.children];
 builtPieces.forEach(piece=>settledMasonry.attach(piece));
 group.add(settledMasonry);
 // Small believable lean; negative Y sinks both column bases into terrain.
 const lean=Number.isFinite(options.lean)?Math.max(-.09,Math.min(.09,options.lean)):.045;
 const burial=Number.isFinite(options.burial)?Math.max(.12,Math.min(.75,options.burial)):.38;
 settledMasonry.rotation.z=lean;
 settledMasonry.rotation.x=-.025;
 settledMasonry.position.y=-burial;
 group.userData.lean=lean;
 group.userData.burial=burial;
 // Broken masonry lies on the floor, broad flat stones and scattered rubble.
 for(const [x,z,w,h,d,ang] of [
  [-5.0,1.5,1.7,.65,1.2,.09],[-4.25,2.2,1.3,.46,1.0,-.08],
  [4.9,1.6,1.8,.64,1.3,-.14],[5.85,-.8,1.35,.45,1.1,.07],
  [2.9,2.4,1.2,.38,.85,-.12]
 ]){
  fracturedStone(x,h*.5,z,w,h,d,stone,1).rotation.z=ang;
 }
 const scale=Number.isFinite(options.scale)?Math.max(.1,Math.min(4,options.scale)):1;
 group.scale.setScalar(scale);
 group.userData.frontDirection=[0,0,-1];
 group.userData.backDirection=[0,0,1];
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.parent?.remove(group);group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
