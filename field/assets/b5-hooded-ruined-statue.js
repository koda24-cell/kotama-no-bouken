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
 // Hood with a deep black facial recess, framed by heavy stone cowl.
 const hood=add(new THREE.SphereGeometry(.69,18,12,0,Math.PI*2,0,Math.PI),stone,0,5.37,-.06);
 hood.scale.set(1.12,1.15,.92);
 const opening=add(new THREE.SphereGeometry(.48,16,10),dark,0,5.30,-.60);
 opening.scale.set(.82,1.04,.24);
 for(const side of [-1,1]){
  rod([[side*.37,5.83,-.48],[side*.55,5.56,-.62],[side*.43,5.15,-.69],[side*.25,4.94,-.66]],.115,pale);
 }
 rod([[-.39,5.84,-.50],[0,5.94,-.59],[.39,5.84,-.50]],.10,pale);
 // One shoulder is broken away, with irregular inset fracture facets.
 rock(-.71,4.66,.02,.43,.44,.45,2);
 rock(-.93,4.30,-.05,.29,.32,.31,5);
 rock(.68,4.63,.02,.40,.23,.39,7,dark);
 for(let i=0;i<7;i++){
  const a=i*2.4;
  rock(.63+Math.cos(a)*.20,4.53+Math.sin(a)*.16,-.14,.13,.13,.13,i,pale);
 }
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
