/* B5 Demon King's sanctuary: ruined Gothic wall bay.
 * FRONT faces negative Z. Geometry-only decorative asset; no collision.
 * createB5RuinedGothicWall(THREE,{scale,detail}) -> {group,dispose}
 */
export function createB5RuinedGothicWall(THREE,options={}) {
 const group=new THREE.Group();group.name='b5:throne:ruinedGothicWall';
 group.userData.visualOnly=true;group.userData.frontDirection=[0,0,-1];
 const geos=[],mats=[],G=g=>(geos.push(g),g),M=m=>(mats.push(m),m);
 const stone=M(new THREE.MeshStandardMaterial({color:0x686570,roughness:.95,flatShading:true,side:THREE.DoubleSide}));
 const highlight=M(new THREE.MeshStandardMaterial({color:0x85808b,roughness:.96,flatShading:true,side:THREE.DoubleSide}));
 const recess=M(new THREE.MeshStandardMaterial({color:0x353440,roughness:1,side:THREE.DoubleSide}));
 const add=(g,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(G(g),m);o.position.set(x,y,z);group.add(o);return o;};
 const block=(x,y,z,w,h,d,m=stone)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const V=(x,y,z)=>new THREE.Vector3(x,y,z);
 const beam=(a,b,r,mat=highlight)=>{const d=b.clone().sub(a),o=add(new THREE.CylinderGeometry(r,r,d.length(),9),mat);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o;};
 // Wall fabric: course masonry with a large asymmetrical collapsed upper edge.
 const width=10.5,height=9.2,depth=1.15;
 for(let row=0;row<12;row++){
  const y=.32+row*.69,offset=row%2?.43:0;
  for(let col=0;col<12;col++){
   const x=-5.15+col*.91+offset;
   const top=height-1.5+Math.sin(x*1.5)*.32-(x>1.5?Math.max(0,x-1.5)*.48:0);
   if(y>top || (x>2.5&&y>5.5&&row%3===0))continue;
   const chipped=.07*Math.sin(col*8.1+row*4.3);
   const b=block(x,y,.23,.88+chipped,.64,.98,stone);
   b.rotation.z=.008*Math.sin(col*3+row*7);
  }
 }
 // Inset blind lancet niches: recesses read as cavities, not glued-on pentagons.
 for(const cx of [-2.95,0,2.95]){
  block(cx,3.95,-.37,1.54,4.9,.12,recess);
  const pts=[[cx-.78,6.22],[cx,7.3],[cx+.78,6.22]];
  for(let i=0;i<2;i++)beam(V(pts[i][0],pts[i][1],-.69),V(pts[i+1][0],pts[i+1][1],-.69),.18);
  for(const side of [-1,1]){
   block(cx+side*.84,3.83,-.73,.24,4.72,.44,highlight);
   block(cx+side*1.13,3.8,-.56,.16,5.0,.33,stone);
  }
  // layered carved pointed trefoil at niche crown
  for(const side of [-1,1]){
   const x=cx+side*.37;
   beam(V(cx,6.86,-.80),V(x,6.28,-.80),.08,highlight);
  }
  block(cx,1.25,-.75,1.7,.25,.62,highlight);
 }
 // Strong engaged piers connect wall, arch ribs and floor into one structure.
 for(const x of [-4.55,-1.47,1.47,4.55]){
  block(x,3.4,-.85,.62,6.8,.90);
  for(let i=0;i<3;i++)block(x,1.5+i*2.0,-1.26,.79,.17,.99,highlight);
  for(const dx of [-.19,0,.19])block(x+dx,3.55,-1.36,.07,5.6,.12,highlight);
  block(x,6.9,-.82,.99,.52,1.12);
  block(x,.46,-.82,1.1,.90,1.18);
 }
 // Continuous upper moulding, with a collapsed right-hand stretch.
 for(let i=0;i<22;i++){
  const x=-5.0+i*.47;
  if(i>15&&i<21)continue;
  block(x,7.75+.10*Math.sin(i*1.7),-.55,.46,.25,.87,highlight);
 }
 // Broad recessed fracture pocket on the right: uneven stone contours,
 // not pointed outward-facing inserts.
 const fracture=add(new THREE.DodecahedronGeometry(1,1),recess,3.9,5.8,-.57);
 fracture.scale.set(.68,1.25,.08);fracture.rotation.z=-.3;
 // Worn stone chips along the broken rim, and scattered masonry at the foot.
 for(let i=0;i<21;i++){
  const a=i*2.3999,rad=.23+(i%5)*.13;
  const x=3.9+Math.cos(a)*rad,y=5.8+Math.sin(a)*rad*1.3;
  const rock=add(new THREE.DodecahedronGeometry(.24+(i%4)*.05,1),stone,x,y,-.68);
  rock.scale.set(1.1,.66,.38);rock.rotation.z=a;
 }
 for(let i=0;i<19;i++){
  const x=-4.8+(i*7%19)*.52,z=-.8-(i%5)*.32;
  const rock=add(new THREE.DodecahedronGeometry(.28+(i%4)*.10,1),stone,x,.24,z);
  rock.scale.set(1.3,.56,1.02);rock.rotation.set(.14*i,.23*i,.31*i);
 }
 const scale=Number.isFinite(options.scale)?Math.max(.1,Math.min(3,options.scale)):1;group.scale.setScalar(scale);
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.parent?.remove(group);group.clear();geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}};
}
