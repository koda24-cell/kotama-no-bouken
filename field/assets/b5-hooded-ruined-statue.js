/* B5 throne hall: ruined hooded guardian statue.
 * FRONT = -Z; geometry-only, no collision or gameplay changes.
 */
export function createB5HoodedStatue(THREE, options={}) {
 const group=new THREE.Group();group.name='b5:throne:hoodedGuardian';
 group.userData.visualOnly=true;group.userData.frontDirection=[0,0,-1];
 const gs=[],ms=[],G=g=>(gs.push(g),g),M=m=>(ms.push(m),m);
 const stone=M(new THREE.MeshStandardMaterial({color:0x77737b,roughness:.98,flatShading:true,side:THREE.DoubleSide}));
 const pale=M(new THREE.MeshStandardMaterial({color:0x99939a,roughness:.96,flatShading:true,side:THREE.DoubleSide}));
 const dark=M(new THREE.MeshStandardMaterial({color:0x27242e,roughness:1,side:THREE.DoubleSide}));
 const add=(geo,mat,x=0,y=0,z=0)=>{const o=new THREE.Mesh(G(geo),mat);o.position.set(x,y,z);group.add(o);return o;};
 const box=(x,y,z,w,h,d,mat=stone)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
 const rock=(x,y,z,sx,sy,sz,seed=0,mat=stone)=>{
  const o=add(new THREE.DodecahedronGeometry(1,1),mat,x,y,z);
  o.scale.set(sx,sy,sz);o.rotation.set(seed*.19,seed*.31,seed*.23);return o;
 };
 const rod=(pts,r,mat=stone)=>{
  const path=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
  return add(new THREE.TubeGeometry(path,Math.max(12,pts.length*6),r,7,false),mat);
 };
 // Broad worn pedestal and damaged plinth.
 box(0,.32,0,3.2,.64,2.45);box(0,.77,0,2.85,.26,2.15,pale);
 box(0,1.0,0,2.52,.22,1.93);
 for(let i=0;i<14;i++){
  const a=i*2.3999,r=1.3+(i%4)*.19;
  rock(Math.cos(a)*r,.15,Math.sin(a)*r, .20+(i%3)*.10,.15,.22,i);
 }
 // Robed body: tapered irregular silhouette, more sculptural than boxes.
 const pts=[
  [0,1.05],[1.02,1.05],[.97,1.65],[.81,2.5],[.67,3.30],
  [.78,4.05],[.71,4.65],[.48,5.20],[.34,5.56],[0,5.65]
 ].map(([r,y])=>new THREE.Vector2(r,y));
 const robe=add(new THREE.LatheGeometry(pts,15,0,Math.PI*2),stone);
 robe.scale.z=.77;
 // Overlapping folds and curved drapery ridges.
 for(let i=0;i<11;i++){
  const a=i*Math.PI*2/11;
  const rad=(y)=>.88-.10*(y-1.1);
  rod([[rad(1.25)*Math.cos(a),1.25,rad(1.25)*Math.sin(a)*.77],
       [rad(2.4)*Math.cos(a+.10),2.4,rad(2.4)*Math.sin(a+.10)*.77],
       [rad(3.6)*Math.cos(a-.05),3.6,rad(3.6)*Math.sin(a-.05)*.77],
       [.52*Math.cos(a+.09),4.65,.42*Math.sin(a+.09)]],.045,i%3===0?pale:stone);
 }
 // Hood is a true deep, thick sculpted cowl. The front opening lies
 // behind its heavy rolled stone lip, with a curved back silhouette.
 const hoodGeo=(()=>{
  const segments=32,levels=13,verts=[],idx=[];
  for(let j=0;j<=levels;j++){
   const t=j/levels,theta=t*Math.PI;
   const ry=.83*(1-.08*Math.sin(theta*3)),rx=.70*(1+.075*Math.sin(theta*2));
   for(let k=0;k<segments;k++){
    const a=k*2*Math.PI/segments;
    const x=Math.sin(theta)*Math.cos(a)*rx;
    const y=5.36+Math.cos(theta)*ry;
    const z=-.08+.66*Math.sin(theta)*Math.sin(a);
    verts.push(x,y,z);
   }
  }
  for(let j=0;j<levels;j++)for(let k=0;k<segments;k++){
   const a=j*segments+k,b=j*segments+(k+1)%segments,c=(j+1)*segments+k,d=(j+1)*segments+(k+1)%segments;
   idx.push(a,c,b,b,c,d);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setIndex(idx);g.computeVertexNormals();return g;
 })();
 add(hoodGeo,stone);
 const opening=add(new THREE.SphereGeometry(.49,20,14),dark,0,5.34,-.685);
 opening.scale.set(.80,1.04,.19);
 // A profiled continuous rim gives real cowl thickness and curved corners.
 for(const side of [-1,1]){
  rod([[side*.21,6.02,-.45],[side*.48,5.90,-.55],[side*.59,5.63,-.63],[side*.53,5.29,-.73],[side*.36,5.02,-.77],[side*.22,4.94,-.66]],.15,pale);
  rod([[side*.52,5.84,-.39],[side*.70,5.61,-.34],[side*.66,5.27,-.31],[side*.52,5.03,-.40]],.09,stone);
 }
 rod([[-.27,6.03,-.48],[0,6.13,-.51],[.27,6.03,-.48]],.15,pale);
 // Overlapping chiseled fabric surfaces emerge from the hood and settle
 // into the robe. These are continuous curved sheets, not floating bands.
 for(const side of [-1,1]){
  const points=[],faces=[],rows=13,cols=6;
  for(let j=0;j<=rows;j++){
   const t=j/rows,y=5.03-t*3.15;
   for(let k=0;k<=cols;k++){
    const u=k/cols;
    const x=side*(.30+.64*u+.08*Math.sin(t*8+u*3));
    const z=-.39-.24*Math.sin(t*Math.PI)*Math.sin(u*Math.PI)+.10*u;
    points.push(x,y,z+.026*Math.sin(t*25+u*8));
   }
  }
  for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){
   const a=j*(cols+1)+k,b=a+1,c=a+(cols+1),d=c+1;
   faces.push(a,c,b,b,c,d);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  g.setIndex(faces);g.computeVertexNormals();
  add(g,stone);
 }
 // Shoulder fracture is carved as a broad recessed irregular surface,
 // not a cluster of fitted-on pebbles. The missing arm lies below.
 rock(-.71,4.66,.02,.43,.44,.45,2);
 rock(-.93,4.30,-.05,.29,.32,.31,5);
 const fracturePts=[
  [.41,4.96,-.31],[.77,5.03,-.18],[.98,4.79,-.06],
  [1.03,4.43,.08],[.77,4.28,-.18],[.48,4.40,-.28],
  [.58,4.70,-.46]
 ];
 const fractureVerts=[];
 for(const p of fracturePts)fractureVerts.push(...p);
 fractureVerts.push(.70,4.66,-.12); // irregular recessed center
 const faceCenter=fracturePts.length;
 const faces=[];
 for(let i=0;i<fracturePts.length;i++)faces.push(i,(i+1)%fracturePts.length,faceCenter);
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(fractureVerts,3));
 g.setIndex(faces);g.computeVertexNormals();
 add(g,pale);
 // A small partial fractured edge follows the outline without adding spikes.
 rod([[.43,4.95,-.31],[.77,5.02,-.18],[.98,4.79,-.06]],.05,stone);
 // Remaining arm draped over front; opposite arm is broken on the ground.
 rod([[-.70,4.62,-.12],[-.92,3.99,-.25],[-.74,3.28,-.51],[-.52,2.75,-.60]],.25);
 rod([[-.53,2.75,-.60],[-.28,2.56,-.66]],.18,pale);
 rock(1.17,.30,-1.05,.52,.23,.27,11);
 rock(1.48,.19,-1.22,.30,.18,.26,13);
 // Sculpted chips on the robe hem and damaged pedestal.
 for(let i=0;i<9;i++){
  const a=i*2.3999;
  rock(Math.cos(a)*.91,1.17,Math.sin(a)*.72,.16,.20,.17,i+20);
 }
 const scale=Number.isFinite(options.scale)?Math.max(.1,Math.min(3,options.scale)):1;
 group.scale.setScalar(scale);
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.parent?.remove(group);group.clear();gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}};
}
