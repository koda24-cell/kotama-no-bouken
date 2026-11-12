/** Floor 2 frozen ancient waterwheel courtyard. Standalone additive Three.js asset. */
export function createB2FrozenWaterwheelScene(THREE) {
 const root=new THREE.Group();root.name='B2 Frozen Ancient Waterwheel Courtyard';
 const stone=new THREE.MeshStandardMaterial({color:0xa0a6ab,roughness:1});
 const darkStone=new THREE.MeshStandardMaterial({color:0x6c7981,roughness:1});
 const wood=new THREE.MeshStandardMaterial({color:0x6d5b4e,roughness:1});
 const ice=new THREE.MeshStandardMaterial({color:0x9ecbdc,roughness:.26,metalness:.04,transparent:true,opacity:.82});
 const water=new THREE.MeshStandardMaterial({color:0x486f84,roughness:.23,metalness:.1});
 const meshes=[];
 function add(geo,mat,x=0,y=0,z=0,rot){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);if(rot)m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;root.add(m);meshes.push(m);return m}
 function box(x,y,z,w,h,d,mat=stone,rot){return add(new THREE.BoxGeometry(w,h,d),mat,x,y,z,rot)}
 function beam(a,b,r,mat=wood,r2=r){const d=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const mid=new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5);const m=add(new THREE.CylinderGeometry(r2,r,d.length(),8),mat,...mid.toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m}
 // Traversable-looking stone foreground and excavated channel (decorative, no collision logic).
 box(0,-.32,0,18,.55,12,darkStone);
 box(-5,-.03,0,6,.12,11,stone);box(5,-.03,0,6,.12,11,stone);
 box(0,-.15,0,4.1,.1,11,water);
 for(let i=0;i<15;i++){const z=-5.15+i*.73;box(-2.12,.12,z,.28,.34,.69,stone);box(2.12,.12,z,.28,.34,.69,stone)}
 // Broken mill foundations, buttresses and ruined wall piers.
 for(const x of [-3.25,3.25]) {
  box(x,1.05,0,1.3,2.1,1.65,darkStone);
  box(x,2.25,0,1.58,.42,1.9,stone);
  for(let i=0;i<4;i++)box(x+(i-1.5)*.22,1.38,.87,.12,.9,.14,stone);
  beam([x,2.4,-.6],[x,3.45,-1.6],.2,stone);
 }
 // Wheel axis runs X; wheel lies in YZ plane and has physically separate rims.
 const cx=0,cy=3.7,cz=0,R=2.55,spokes=14;
 beam([-3.65,cy,cz],[3.65,cy,cz],.3,wood);
 for(const x of [-.42,.42]){
  for(let i=0;i<spokes;i++){
   const a=i*Math.PI*2/spokes,b=(i+1)*Math.PI*2/spokes;
   const p=[x,cy+R*Math.cos(a),cz+R*Math.sin(a)];
   const q=[x,cy+R*Math.cos(b),cz+R*Math.sin(b)];
   beam(p,q,.115,wood);
   beam([x,cy,cz],p,.095,wood);
  }
 }
 for(let i=0;i<spokes;i++){
  const a=(i+.5)*Math.PI*2/spokes;
  const y=cy+R*Math.cos(a),z=cz+R*Math.sin(a);
  const paddle=box(0,y,z,1.23,.16,.58,wood);
  paddle.rotation.x=-a;
  if(i%4===0){box(.05,y+.16,z,1.15,.19,.51,ice,[a*.14,0,0])}
 }
 // Broad irregular ice wedges, unequal icicles and natural stalactite clusters.
 for(let i=0;i<12;i++){
  const a=i*2.399,rr=2.1+(.2*Math.sin(i*3.1));
  const y=cy+rr*Math.cos(a),z=rr*Math.sin(a);
  const h=.45+(i%5)*.24;
  add(new THREE.ConeGeometry(.13+(i%3)*.07,h,5),ice,Math.sin(i)*.45,y-h*.3,z);
 }
 for(let i=0;i<20;i++){
  const x=-8+(i%10)*1.72,z=-4.5+Math.floor(i/10)*8.7;
  const h=.3+((i*7)%9)*.18;
  add(new THREE.ConeGeometry(.24+(i%3)*.12,h,5),ice,x,h/2,z,[Math.sin(i)*.13,0,Math.cos(i)*.1]);
 }
 // Irregular masonry rubble on ground (not identical rounded pebbles).
 for(let i=0;i<24;i++){
  const x=(i%8-3.5)*1.9+Math.sin(i*8)*.28;
  const z=(Math.floor(i/8)-1)*4+Math.cos(i*5)*.3;
  const size=.22+(i%5)*.12;
  const m=add(new THREE.DodecahedronGeometry(size,0),i%3===0?stone:darkStone,x,size*.48,z);
  m.scale.set(1.4,.52,.8);m.rotation.set(i*.37,i*.67,i*.13);
 }
 // Deep backdrop: ruined arcades with open archways rather than a solid enclosing box.
 for(const z of [-5.25,5.25]){
  for(const x of [-7,-4.5,4.5,7]){
   box(x,1.8,z,.65,3.6,.75,stone);
   box(x,3.78,z,.98,.4,1.02,darkStone);
  }
  for(const x of [-5.75,5.75]){
   beam([x-1.1,3.3,z],[x,4.4,z],.24,stone);
   beam([x,4.4,z],[x+1.1,3.3,z],.24,stone);
  }
 }

 // PASS 2: irregular frozen mechanical decay and architectural depth. Preserve original geometry.
 const iron=new THREE.MeshStandardMaterial({color:0x515d65,roughness:.83,metalness:.26});
 const frost=new THREE.MeshStandardMaterial({color:0xc5e2e8,roughness:.45,transparent:true,opacity:.88});
 // Uneven broken wheel paddles, iron fasteners and frost accumulation.
 for(let i=0;i<spokes;i++){
  const a=(i+.5)*Math.PI*2/spokes,y=cy+R*Math.cos(a),z=cz+R*Math.sin(a);
  for(const x of [-.55,.55]){
   const rivet=add(new THREE.IcosahedronGeometry(.09,0),iron,x,y,z);
   rivet.scale.set(.45,1,1);
  }
  if(i===2||i===8||i===11){
   const split=add(new THREE.TetrahedronGeometry(.25+(i%3)*.1),wood,Math.sin(i)*.3,y+.22,z+.1);
   split.rotation.set(i*.3,i*.2,i*.55);
  }
  if(i%3===1){
   const icePatch=add(new THREE.IcosahedronGeometry(.24+(i%4)*.09,0),ice,-.36+(i%2)*.7,y,z);
   icePatch.scale.set(.85,1.8,.6);icePatch.rotation.set(i*.2,0,i*.3);
  }
 }
 // Staggered masonry joints and projecting caps on both wheel supports.
 for(const x of [-3.25,3.25]){
  for(let level=0;level<4;level++){
   for(let k=0;k<3;k++){
    const offset=(level%2)*.16;
    box(x-.49+k*.48+offset,.37+level*.47,.86,.42,.075,.19,level%2?stone:darkStone);
   }
  }
  box(x,2.63,-.05,1.72,.19,1.98,darkStone);
  for(const side of [-1,1]){
   beam([x+side*.68,.25,-.7],[x+side*.85,1.9,-.95],.13,stone);
  }
 }
 // Pointed arcade stone ribs: actual segmented masonry arch instead of two long poles.
 for(const z of [-5.25,5.25]){
  for(const x of [-5.75,5.75]){
   const left=[x-1.07,3.27,z],apex=[x,4.45,z],right=[x+1.07,3.27,z];
   for(const [p,q] of [[left,apex],[apex,right]]){
    for(let k=0;k<5;k++){
     const t=k/5,u=(k+1)/5;
     const a=p.map((v,j)=>v+(q[j]-v)*t),b=p.map((v,j)=>v+(q[j]-v)*u);
     beam(a,b,.25+(k%2)*.018,k%3?stone:darkStone);
    }
   }
   box(x,4.46,z,.34,.23,.84,darkStone);
  }
 }
 // Jagged overhanging cave ledges, ice shelves and varied hanging ice clusters.
 for(let side of [-1,1]){
  for(let i=0;i<9;i++){
   const x=side*(5.8+(i%3)*1.05),z=-4.8+i*1.18;
   const ledge=add(new THREE.DodecahedronGeometry(.6+(i%4)*.15,0),darkStone,x,5.7+Math.sin(i)*.35,z);
   ledge.scale.set(1.65,.45,1.3);ledge.rotation.set(i*.1,i*.31,i*.07);
   for(let j=0;j<2+(i%3);j++){
    const h=.55+((i*3+j*5)%8)*.24;
    const spike=add(new THREE.ConeGeometry(.13+j*.06,h,5),j%3?ice:frost,x+(j-1)*.28,5.43-h*.48,z+Math.sin(j+i)*.27);
    spike.rotation.z=Math.PI+Math.sin(i+j)*.11;
   }
  }
 }
 // Broad, fractured ice sheets around water's edge, with irregular boundaries.
 for(let i=0;i<18;i++){
  const x=(i%2?1:-1)*(1.75+(i%4)*.21),z=-4.6+i*.52;
  const shard=add(new THREE.TetrahedronGeometry(.36+(i%4)*.12),i%3?ice:frost,x,.17,z);
  shard.scale.set(1.6,.22,1.15);shard.rotation.set(.13,i*.49,.05);
 }
 // Broken stone lintels grounded on ruined floor rather than floating.
 for(let i=0;i<7;i++){
  const x=-7.3+i*2.25,z=i%2?4.8:-4.6;
  const block=box(x,.22,z,.72+(i%3)*.25,.33,.42,darkStone,[i*.09,i*.28,i*.07]);
  block.position.y=.18;
 }


 // PASS 3: genuine curved stone arch voussoirs (extruded wedge geometry).
 function curvedVoussoir(x0,z0,side,t0,t1,material){
  // Curved pointed arch: each side is a quadratic Bezier, meeting at the crown.
  const base=side<0?x0-1.07:x0+1.07,top=x0;
  function pt(t){const u=1-t;return [u*u*base+2*u*t*(base+side*.10)+t*t*top, u*u*3.27+2*u*t*4.04+t*t*4.45]}
  const pts=[];const steps=6;
  for(let i=0;i<=steps;i++)pts.push(pt(t0+(t1-t0)*i/steps));
  const outline=[...pts.map(p=>[p[0],p[1]+.21]),...pts.slice().reverse().map(p=>[p[0],p[1]-.21])];
  const shape=new THREE.Shape();shape.moveTo(...outline[0]);for(let i=1;i<outline.length;i++)shape.lineTo(...outline[i]);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:.65,bevelEnabled:true,bevelThickness:.045,bevelSize:.025,bevelSegments:1,curveSegments:8});
  const m=add(g,material,0,0,z0-.325);return m;
 }
 for(const z of [-5.25,5.25])for(const x of [-5.75,5.75]){
  for(const side of [-1,1])for(let j=0;j<7;j++){
   // Slight gaps and alternating stone tint make individual radial joints visible.
   const t0=j/7+.003,t1=(j+1)/7-.003;
   curvedVoussoir(x,z,side,t0,t1,(j+Math.round(x))%3?stone:darkStone);
  }
  // Crown cap and corbel tie the curved arch into its masonry supports.
  box(x,4.43,z,.44,.32,.83,stone);
  for(const dx of [-1.06,1.06])box(x+dx,3.24,z,.6,.37,.85,darkStone);
 }
 // Uneven rim outline: warped plank segments, missing edge teeth and ice that bridges gaps.
 // Original wheel spokes and circular frame remain as a structural core.
 for(const side of [-.42,.42]){
  for(let i=0;i<spokes;i++){
   const a=i*Math.PI*2/spokes;
   const outer=R+((i*7)%5)*.065;
   const x=side+(i%3-1)*.025;
   if(i===3||i===9){
    const chip=add(new THREE.TetrahedronGeometry(.19),wood,x,cy+outer*Math.cos(a),outer*Math.sin(a));
    chip.rotation.set(i*.33,i*.2,i*.4);
    continue;
   }
   const p=[x,cy+(outer-.12)*Math.cos(a), (outer-.12)*Math.sin(a)];
   const q=[x,cy+(outer+.18+(i%4)*.055)*Math.cos(a+.065), (outer+.18+(i%4)*.055)*Math.sin(a+.065)];
   beam(p,q,.09+(i%3)*.025,i%4===0?darkStone:wood);
   if(i%5===0){
    const c=add(new THREE.IcosahedronGeometry(.35+(i%3)*.12,0),ice,x,cy+R*Math.cos(a),R*Math.sin(a));
    c.scale.set(.65,1.2,.8);c.rotation.x=a;
   }
  }
 }
 // Interlock cave outcrops with ruined wall piers; remove isolated-rock appearance.
 for(const z of [-5.25,5.25])for(const side of [-1,1]){
  for(let i=0;i<6;i++){
   const x=side*(4.1+i*.78);
   const h=2.15+(i%4)*.57;
   const rock=add(new THREE.DodecahedronGeometry(1,1),darkStone,x,h*.52,z+(side*.35));
   rock.scale.set(.8+(i%3)*.2,h*.68,.78+(i%2)*.2);
   rock.rotation.set(.05*i,.21*i,.11*side);
   const glaze=add(new THREE.DodecahedronGeometry(.55,0),ice,x,h*.88,z+side*.7);
   glaze.scale.set(.85,.35,.6);
  }
 }


 // PASS 4: large readable silhouettes, fractured wooden paddles, continuous masonry,
 // and massive fused ice bodies. Additive: previous meshes remain unchanged.
 const oldTimber=new THREE.MeshStandardMaterial({color:0x514b47,roughness:1});
 const paleIce=new THREE.MeshStandardMaterial({color:0x84b8cd,roughness:.33,transparent:true,opacity:.92});
 function irregularPrism(points,depth,mat){
  const shape=new THREE.Shape();
  shape.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)shape.lineTo(points[i][0],points[i][1]);
  shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelThickness:.025,bevelSize:.022,bevelSegments:1});
  return add(g,mat);
 }
 // Broken, large plank silhouette: several paddles have jagged missing outer thirds.
 // Deliberately overlay fractured planks across the earlier simple wheel paddles.
 for(const i of [1,2,7,8,10,11]){
  const a=(i+.5)*Math.PI*2/spokes;
  const y=cy+R*Math.cos(a),z=cz+R*Math.sin(a);
  const intact=i%3===0;
  const plank=irregularPrism([
   [-.67,y-.12],[-.67,y+.10],[-.28,y+.20],
   [.08,y+(intact?.16:.035)],[.32,y+(intact?.10:-.16)],
   [.67,y+(intact?.08:-.28)],[.67,y-.12]
  ],.17,oldTimber);
  plank.position.z=z-.085;
  plank.rotation.x=-a*.12;
  if(!intact){
   const snapped=add(new THREE.TetrahedronGeometry(.29,0),oldTimber,(i%2?-.45:.46),y-.27,z);
   snapped.rotation.set(a*.2,i*.4,a*.5);
  }
 }
 // Broad continuous stone arch backing: narrow voussoir seams remain visible on its face.
 // This softens the old straight-beam silhouette without deleting original support geometry.
 for(const z of [-5.25,5.25])for(const x of [-5.75,5.75]){
  for(const side of [-1,1]){
   const pts=[];
   for(let k=0;k<=18;k++){
    const t=k/18,u=1-t;
    const bx=x+side*1.07;
    const xx=u*u*bx+2*u*t*(bx+side*.10)+t*t*x;
    const yy=u*u*3.25+2*u*t*4.05+t*t*4.45;
    pts.push([xx,yy]);
   }
   const outline=[...pts.map(p=>[p[0],p[1]+.13]),...pts.slice().reverse().map(p=>[p[0],p[1]-.13])];
   const m=irregularPrism(outline,.86,stone);
   m.position.z=z-.43;
  }
  // Tapered spandrel mass links the arch to adjacent ruin, rather than floating trim.
  for(const side of [-1,1]){
   const x0=x+side*1.02;
   const pier=add(new THREE.DodecahedronGeometry(.64,1),darkStone,x0,3.33,z);
   pier.scale.set(.75,1.2,.8);pier.rotation.z=side*.12;
  }
 }
 // Fused jagged ice masses: asymmetric multi-section meshes, not identical cones.
 function iceMass(cx0,cz0,baseY,height,rx,rz,seed,mat){
  const rings=6,segments=9,positions=[],indices=[];
  for(let j=0;j<rings;j++){
   const t=j/(rings-1);
   const spread=[1,1.13,.89,.63,.34,.035][j];
   const centerX=cx0+Math.sin(seed*1.31+j*.83)*rx*.19*t;
   const centerZ=cz0+Math.cos(seed*.91+j*.71)*rz*.16*t;
   for(let k=0;k<segments;k++){
    const a=2*Math.PI*k/segments;
    const noise=1+.20*Math.sin(k*2.37+seed)+.13*Math.cos(k*3.4+j*1.4+seed);
    positions.push(centerX+Math.cos(a)*rx*spread*noise,
      baseY+height*t+Math.sin(k*2.1+seed)*.035,
      centerZ+Math.sin(a)*rz*spread*noise);
   }
  }
  for(let j=0;j<rings-1;j++)for(let k=0;k<segments;k++){
   const a=j*segments+k,b=j*segments+(k+1)%segments,c=(j+1)*segments+k,d=(j+1)*segments+(k+1)%segments;
   indices.push(a,b,c,b,d,c);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  return add(geo,mat);
 }
 // Ice grows out of the wall, bridges across masonry and climbs the wheel supports.
 for(const side of [-1,1]){
  for(let i=0;i<4;i++){
   const x=side*(3.6+i*.78),z=(i-1.5)*1.25;
   iceMass(x,z,.03,1.55+i*.56,.45+i*.11,.48+i*.06,3+i*2,paleIce);
   iceMass(x+side*.29,z+.22,.35,.7+i*.28,.44,.52,7+i,ice);
  }
 }
 // One large frozen spillway cluster rises from the channel near the wheel.
 iceMass(1.32,1.55,-.08,2.35,.85,.94,11,paleIce);
 iceMass(.76,1.88,-.08,1.65,.64,.75,15,ice);
 iceMass(1.91,1.85,-.08,1.43,.55,.62,19,paleIce);
 // A jagged frozen curtain is attached to the rear arch and cave rock.
 for(let i=0;i<5;i++){
  iceMass(-5.1+i*.49,-4.88,2.5,1.25+(i%3)*.62,.35,.42,25+i, i%2?ice:paleIce);
 }

 return {group:root,dispose(){for(const m of meshes){m.geometry.dispose()}for(const mat of [stone,darkStone,wood,ice,water,iron,frost,oldTimber,paleIce])mat.dispose()}};
}
