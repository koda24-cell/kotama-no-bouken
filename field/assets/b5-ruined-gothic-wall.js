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
 // Chipped masonry with chamfered edges and irregular faceted corners.
 const wornStone=(x,y,z,w,h,d,seed=0,material=stone)=>{
  const verts=[],indices=[];
  const nx=5,ny=4;
  for(let face=0;face<6;face++){
   const start=verts.length/3;
   for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
    const u=i/nx*2-1,v=j/ny*2-1;
    const edge=Math.min(i,nx-i,j,ny-j);
    const chip=(edge===0?.055:.012)*(1+.7*Math.sin(seed*4.13+i*3.3+j*7.1+face*2.4));
    const px=u*(w/2-chip),py=v*(h/2-chip),pz=d/2-chip;
    let a,b,c;
    if(face===0){a=px;b=py;c=pz}
    else if(face===1){a=-px;b=py;c=-pz}
    else if(face===2){a=px;b=h/2-chip;c=py*d/h}
    else if(face===3){a=px;b=-h/2+chip;c=-py*d/h}
    else if(face===4){a=w/2-chip;b=py;c=px*d/w}
    else {a=-w/2+chip;b=py;c=-px*d/w}
    const wear=.018*Math.sin(i*9.1+j*6.7+seed+face*3);
    verts.push(a+(face>=4?wear:0),b,c+(face<2?wear:0));
   }
   for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const q=start+j*(nx+1)+i,r=q+nx+1;
    indices.push(q,q+1,r,q+1,r+1,r);
   }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  return add(geo,material,x,y,z);
 };
 const V=(x,y,z)=>new THREE.Vector3(x,y,z);
 const beam=(a,b,r,mat=highlight)=>{const d=b.clone().sub(a),o=add(new THREE.CylinderGeometry(r,r,d.length(),9),mat);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o;};
 // Irregular ancient ashlar, with staggered non-uniform courses and
 // a genuine broken silhouette rather than a regular brick grid.
 const width=10.5,height=9.2,depth=1.15;
 const rowHeights=[.74,.58,.92,.64,.81,.55,.99,.70,.61,.87,.62,.78];
 let bottom=0;
 const hash=n=>{const x=Math.sin(n*127.1+19.7)*43758.5453;return x-Math.floor(x);};
 for(let row=0;row<rowHeights.length;row++){
  const h=rowHeights[row],y=bottom+h/2;bottom+=h;
  let x=-5.4+(row%2?-.22:.14),col=0;
  while(x<5.3){
   const w=.66+hash(row*37+col*11)*.92;
   const center=x+w/2;
   const edge=7.95-.20*Math.sin(center*1.2)
     -Math.max(0,center-1.05)*.98
     -Math.max(0,-center-3.5)*.44
     -(center>2.3&&center<4.3?.62:0);
   const voidPocket=center>1.65&&center<4.5&&y>4.05&&y<6.9
     &&center+.57*y>5.0;
   const fallen=center>3.5&&y>2.6&&hash(row*19+col*3)>.54;
   if(y+h*.42<edge&&!voidPocket&&!fallen){
    const stoneWidth=Math.min(w-.035,5.25-center);
    if(stoneWidth>.12){
     const blockY=y+.035*(hash(row*9+col*31)-.5);
     const rock=wornStone(center,blockY,.23,stoneWidth,h-.045,.98,row*31+col*7);
     rock.rotation.z=(hash(row*17+col*13)-.5)*.035;
     rock.rotation.y=(hash(row*7+col*19)-.5)*.025;
    }
   }
   x+=w;col++;
  }
 }
 // Broken masonry profiles at the collapsed right edge, embedded in the
 // wall thickness instead of glued to its front surface.
 for(let i=0;i<13;i++){
  const x=1.55+i*.23,y=6.85-i*.22+Math.sin(i*1.7)*.20;
  const shard=add(new THREE.DodecahedronGeometry(.25+(i%3)*.11,1),stone,x,y,.16);
  shard.scale.set(1.05,.73,.91);shard.rotation.set(i*.13,i*.17,i*.29);
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
  // Raised sculpted quatrefoil and inset arch ribs.
  for(const side of [-1,1]){
   const center=V(cx+side*.32,5.96,-.95);
   for(let j=0;j<4;j++){
    const a=j*Math.PI/2,pts=[];
    for(let k=0;k<=12;k++){
     const t=k*Math.PI/6;
     pts.push(V(center.x+Math.cos(a)*.12+Math.cos(t)*.12,center.y+Math.sin(a)*.12+Math.sin(t)*.12,center.z));
    }
    for(let k=1;k<pts.length;k++)beam(pts[k-1],pts[k],.032,highlight);
   }
  }
 }
 // Strong engaged piers connect wall, arch ribs and floor into one structure.
 for(const x of [-4.55,-1.47,1.47,4.55]){
  if(x>4)continue; // missing rightmost pier exposes the silhouette collapse
  block(x,3.4,-.85,.62,6.8,.90);
  for(let i=0;i<3;i++)block(x,1.5+i*2.0,-1.26,.79,.17,.99,highlight);
  for(const dx of [-.19,0,.19])block(x+dx,3.55,-1.36,.07,5.6,.12,highlight);
  wornStone(x,6.9,-.82,.99,.52,1.12,Math.round(x*13),highlight);
  wornStone(x,.46,-.82,1.1,.90,1.18,Math.round(x*17));
 }
 // Continuous upper moulding, with a collapsed right-hand stretch.
 for(let i=0;i<22;i++){
  const x=-5.0+i*.47;
  if(i>13)continue;
  wornStone(x,7.75+.10*Math.sin(i*1.7),-.55,.46,.25,.87,i,highlight);
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
