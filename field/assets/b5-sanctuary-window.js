/**
 * B5 demon throne sanctuary: monumental ruined Gothic stained-glass window.
 * FRONT = -Z. Floor Y=0. Visual-only, independent from dungeon collision.
 * Geometry-first asset; stained-glass colors are placeholders for art pass.
 */
export function createB5SanctuaryWindow(THREE, options={}) {
 const group=new THREE.Group();group.name='b5:throne:sanctuaryWindow';
 group.userData.visualOnly=true;group.userData.frontDirection=[0,0,-1];
 const geometries=[],materials=[];
 const G=g=>(geometries.push(g),g);
 const M=m=>(materials.push(m),m);
 const stone=M(new THREE.MeshStandardMaterial({color:0x5b5963,roughness:.96,flatShading:true,side:THREE.DoubleSide}));
 const trim=M(new THREE.MeshStandardMaterial({color:0x77727c,roughness:.92,flatShading:true,side:THREE.DoubleSide}));
 const dark=M(new THREE.MeshStandardMaterial({color:0x292c3b,roughness:1,side:THREE.DoubleSide}));
 const glassColors=[0x9cdbf5,0x4c80b7,0x9abdc9,0xe0c88f,0x56669b,0x77bdba];
 const glass=glassColors.map(color=>M(new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.30,transparent:true,opacity:.79,roughness:.22,metalness:0,side:THREE.DoubleSide,depthWrite:false})));
 const add=(geo,mat,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(G(geo),mat);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
 const beam=(a,b,r,mat=stone,sides=8)=>{
  const d=new THREE.Vector3().subVectors(b,a);
  const obj=add(new THREE.CylinderGeometry(r,r,d.length(),sides),mat);
  obj.position.copy(a).add(b).multiplyScalar(.5);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
  return obj;
 };
 const V=(x,y,z=-.24)=>new THREE.Vector3(x,y,z);
 const slab=(x,y,z,w,h,d,mat=stone)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
 const width=Number.isFinite(options.width)?Math.max(5,Math.min(18,options.width)):9.4;
 const height=Number.isFinite(options.height)?Math.max(10,Math.min(26,options.height)):18.5;
 const W=width/2, base=.55, spring=height*.66, apex=height;
 const archY=x=>spring+(apex-spring)*Math.sqrt(Math.max(0,1-Math.pow(x/W,2)))*(.88+.12*(1-Math.abs(x/W)));
 // Massive battered outer jambs, layered moulding and recessed lancet face.
 for(const side of [-1,1]){
  slab(side*(W+.31),height*.35,0,.84,height*.70,1.45);
  slab(side*(W+.72),height*.28,.35,.54,height*.56,1.1,dark);
  for(let k=0;k<4;k++)slab(side*(W+.29),1.6+k*3.0,-.63,1.18,.20,1.6,trim);
  // broken front corner stones (broad chipped blocks, not needles)
  for(let k=0;k<3;k++){
   const y=2.0+k*4.2,rock=add(new THREE.DodecahedronGeometry(.43+k*.07,1),stone,side*(W+.58),y,-.68);
   rock.scale.set(1.1,.66,.65);
  }
 }
 // Tall broken outer arch: three nested ribs, each with missing courses.
 for(let layer=0;layer<3;layer++){
  const z=-.52-layer*.16,rad=.23-layer*.045,offset=layer*.24;
  const steps=40;
  for(let side of [-1,1])for(let i=0;i<steps;i++){
   const t0=i/steps,t1=(i+1)/steps;
   // one absent upper-right section and smaller chipped gaps
   if(side===1&&i>=28&&i<=34)continue;
   if(layer===0&&side===-1&&i>=8&&i<=9)continue;
   const x0=side*(W-offset)*(1-t0),x1=side*(W-offset)*(1-t1);
   beam(V(x0,archY(x0)-offset,z),V(x1,archY(x1)-offset,z),rad,layer===1?trim:stone,7);
  }
 }
 // Solid spandrels on both sides make this a wall-window asset, not a free arch.
 for(const side of [-1,1]){
  for(let j=0;j<7;j++){
   const x=side*(W+.7),y=spring+1.0+j*.60;
   const rock=add(new THREE.DodecahedronGeometry(.54,1),stone,x,y,.25);
   rock.scale.set(1.45,.60,1.15);
  }
 }
 // Four tall lancets with arched heads, separated by heavy carved mullions.
 const n=4, inner=W-.42, slot=(inner*2)/n;
 for(let i=0;i<n;i++){
  const x0=-inner+i*slot+.09,x1=x0+slot-.18,xc=(x0+x1)/2;
  const glassTop=Math.min(archY(xc)-.78,height*.82);
  const points=[[x0,base+.52],[x1,base+.52],[x1,glassTop-.72],[xc,glassTop],[x0,glassTop-.72]];
  // Leaded glass mosaic: alternating small diamond and lancet-shaped panes,
  // with a luminous central axis rather than four flat color triangles.
  const bottom=base+.52,top=glassTop-.72,cz=.22;
  const rows=15,cols=5;
  const lead=(ax,ay,bx,by)=>beam(V(ax,ay,-.29),V(bx,by,-.29),.022,dark,6);
  for(let row=0;row<rows;row++){
   const ya=bottom+(top-bottom)*row/rows;
   const yb=bottom+(top-bottom)*(row+1)/rows;
   const shift=row%2===0?0:.11;
   for(let col=0;col<cols;col++){
    const xa=x0+(x1-x0)*col/cols;
    const xb=x0+(x1-x0)*(col+1)/cols;
    const mid=(xa+xb)/2+shift*(col%2?1:-1);
    const midY=(ya+yb)/2;
    const vertices=[[xa,ya],[xb,ya],[mid,midY],[xb,yb],[xa,yb]];
    for(let p=0;p<3;p++){
     const v0=vertices[0],v1=vertices[p+1],v2=vertices[p+2];
     const shape=new THREE.Shape();
     shape.moveTo(v0[0],v0[1]);shape.lineTo(v1[0],v1[1]);shape.lineTo(v2[0],v2[1]);shape.closePath();
     add(new THREE.ShapeGeometry(shape),glass[(i*2+row+col*3+p)%glass.length],0,0,cz);
    }
    lead(xa,ya,mid,midY);lead(mid,midY,xb,yb);
    lead(xa,ya,xa,yb);
   }
  }
  // Gothic tracery at the lancet crown.
  const head=new THREE.Shape();
  head.moveTo(x0,top);head.lineTo(x1,top);head.lineTo(xc,glassTop);head.closePath();
  add(new THREE.ShapeGeometry(head),glass[(i+3)%glass.length],0,0,cz);
  for(const dx of [-.28,0,.28]){
   lead(xc+dx,top,xc,glassTop);
  }
  // strong continuous Gothic lancet frames
  beam(V(x0,base+.45),V(x0,glassTop-.72),.15,trim);
  beam(V(x1,base+.45),V(x1,glassTop-.72),.15,trim);
  beam(V(x0,glassTop-.72),V(xc,glassTop),.15,trim);
  beam(V(xc,glassTop),V(x1,glassTop-.72),.15,trim);
  for(let j=1;j<4;j++){
   const y=base+.55+(glassTop-base-1.3)*j/4;
   beam(V(x0+.1,y,-.30),V(x1-.1,y,-.30),.047,dark,6);
  }
 }
 // Central sanctuary emblem: a luminous ancient tree within a pointed
 // stone mandorla. Abstract architectural symbol, not assigned game lore.
 // It deliberately breaks the regular mosaic grid and spans two lancets.
 const emblemY=height*.43,emblemW=width*.235,emblemH=height*.245;
 const ornamentZ=-.84;
 const curve=(points,r,mat=trim)=>{
  for(let k=1;k<points.length;k++)beam(V(points[k-1][0],points[k-1][1],ornamentZ),V(points[k][0],points[k][1],ornamentZ),r,mat,8);
 };
 const outlineLeft=[],outlineRight=[];
 for(let k=0;k<=32;k++){
  const t=k/32,yy=emblemY-emblemH+2*emblemH*t;
  const half=emblemW*Math.pow(Math.max(0,1-Math.pow(2*t-1,2)),.70)*(1-.24*t);
  outlineLeft.push([-half,yy]);outlineRight.push([half,yy]);
 }
 curve(outlineLeft,.115,trim);curve(outlineRight,.115,trim);
 const motifShape=new THREE.Shape();
 motifShape.moveTo(0,emblemY-emblemH);
 for(const [x,y] of outlineRight)motifShape.lineTo(x,y);
 for(let k=outlineLeft.length-1;k>=0;k--)motifShape.lineTo(outlineLeft[k][0],outlineLeft[k][1]);
 motifShape.closePath();
 add(new THREE.ShapeGeometry(motifShape),glass[1],0,0,-.20);
 // Curved, branching ancient tree. Cubic Bezier paths make it read as
 // carved organic foliage rather than a stick-figure emblem.
 const bezier=(p0,p1,p2,p3,segments=16)=>{
  const pts=[];
  for(let k=0;k<=segments;k++){
   const t=k/segments,u=1-t;
   pts.push([
    u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],
    u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]
   ]);
  }
  return pts;
 };
 const trunk=bezier([0,emblemY-emblemH*.83],[-.13,emblemY-emblemH*.34],[.18,emblemY+emblemH*.05],[0,emblemY+emblemH*.58],24);
 curve(trunk,.12,trim);
 for(const side of [-1,1]){
  // Asymmetry between branches gives the tree an ancient living silhouette.
  for(const [at,reach,rise] of [[-.25,.63,.31],[-.02,.93,.43],[.20,.82,.35],[.41,.52,.19]]){
   const x=side*emblemW*reach,y=emblemY+emblemH*at;
   const branch=bezier([0,y],[side*emblemW*.25,y+emblemH*.04],[x*.65,y+emblemH*rise*.95],[x,y+emblemH*rise],18);
   curve(branch,.047,trim);
   for(const k of [10,15]){
    const p=branch[k],tip=[p[0]+side*emblemW*.15,p[1]+emblemH*.14];
    curve(bezier(p,[p[0]+side*.10,p[1]+.20],[tip[0]-side*.08,tip[1]-.09],tip,8),.023,trim);
   }
  }
  curve(bezier([0,emblemY-emblemH*.66],[side*.30,emblemY-emblemH*.79],[side*emblemW*.33,emblemY-emblemH*.91],[side*emblemW*.56,emblemY-emblemH*.90],12),.064,trim);
 }
 // Uneven leaf-shaped glass jewels, with leaded vein engravings.
 for(let i=0;i<22;i++){
  const angle=i*2.39996,rad=Math.sqrt((i+.5)/22);
  const x=Math.cos(angle)*emblemW*.78*rad;
  const y=emblemY+emblemH*(.12+.70*rad)+Math.sin(angle)*emblemH*.09;
  if(Math.abs(x)>emblemW*.85||y>emblemY+emblemH*.85)continue;
  const size=.11+(i%4)*.025;
  const leaf=new THREE.Shape();
  leaf.moveTo(x,y-size);
  leaf.quadraticCurveTo(x+size*.7,y,x,y+size);
  leaf.quadraticCurveTo(x-size*.7,y,x,y-size);
  add(new THREE.ShapeGeometry(leaf),glass[(i+2)%glass.length],0,0,-.69);
  curve([[x,y-size*.7],[x,y+size*.7]],.014,dark);
 }
 // The outer mandorla receives two concentric sculpted ribs and ornamental
 // pointed cusps, creating depth rather than a flat circular outline.
 for(const multiplier of [1.10,1.22]){
  const left=outlineLeft.map(([x,y])=>[x*multiplier,emblemY+(y-emblemY)*multiplier]);
  const right=outlineRight.map(([x,y])=>[x*multiplier,emblemY+(y-emblemY)*multiplier]);
  curve(left,multiplier>1.2?.105:.065,multiplier>1.2?stone:trim);
  curve(right,multiplier>1.2?.105:.065,multiplier>1.2?stone:trim);
 }
 for(const side of [-1,1]){
  for(const t of [.18,.40,.62,.83]){
   const idx=Math.round(t*32),p=outlineLeft[idx],q=outlineRight[idx];
   const edge=side<0?p:q;
   const x=edge[0]*1.10,y=emblemY+(edge[1]-emblemY)*1.10;
   const tip=[x+side*.18,y+.25];
   curve(bezier([x,y],[x+side*.12,y+.08],[tip[0]-side*.07,tip[1]-.06],tip,8),.048,stone);
  }
 }
 // Rose-like halo above the tree canopy, with fine engraved radial rays.
 const haloY=emblemY+emblemH*.60,haloR=.40;
 for(let i=0;i<32;i++){
  const a=i*Math.PI*2/32,b=(i+1)*Math.PI*2/32;
  curve([[Math.cos(a)*haloR,haloY+Math.sin(a)*haloR],[Math.cos(b)*haloR,haloY+Math.sin(b)*haloR]],.05,trim);
 }
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6;
  curve([[Math.cos(a)*haloR*.65,haloY+Math.sin(a)*haloR*.65],[Math.cos(a)*haloR*.92,haloY+Math.sin(a)*haloR*.92]],.022,trim);
 }
 // Carved quatrefoils surrounded by a second cusped stone frame.
 for(const side of [-1,1]){
  for(const cy of [height*.71,height*.77]){
   const cx=side*width*.43;
   for(const radius of [.22,.36]){
    for(let petal=0;petal<4;petal++){
     const a=petal*Math.PI/2,pts=[];
     for(let k=0;k<=16;k++){
      const t=k*Math.PI*2/16;
      pts.push([cx+Math.cos(a)*radius+Math.cos(t)*radius*.78,cy+Math.sin(a)*radius+Math.sin(t)*radius*.78]);
     }
     curve(pts,radius>.3?.065:.045,stone);
    }
   }
  }
 }
 // Cathedral rose window: layered stone circles, 12 petal tracery,
 // colored radial glass wedges and a gilded central medallion.
 const roseY=height*.85,roseR=Math.min(W*.40,height*.10);
 const arc=(radius,start,end,material,segments=72,z=-.62,thickness=.085)=>{
  for(let i=0;i<segments;i++){
   const a=start+(end-start)*i/segments,b=start+(end-start)*(i+1)/segments;
   beam(V(Math.cos(a)*radius,roseY+Math.sin(a)*radius,z),V(Math.cos(b)*radius,roseY+Math.sin(b)*radius,z),thickness,material,7);
  }
 };
 for(const radius of [roseR,roseR*.79,roseR*.39,roseR*.19])arc(radius,0,Math.PI*2,trim);
 const petals=12;
 for(let i=0;i<petals;i++){
  const a=i*Math.PI*2/petals,b=(i+1)*Math.PI*2/petals,mid=(a+b)/2;
  const inner=roseR*.40,outer=roseR*.77;
  const shape=new THREE.Shape();
  shape.moveTo(Math.cos(a)*inner,roseY+Math.sin(a)*inner);
  shape.lineTo(Math.cos(a)*outer,roseY+Math.sin(a)*outer);
  shape.lineTo(Math.cos(mid)*roseR*.97,roseY+Math.sin(mid)*roseR*.97);
  shape.lineTo(Math.cos(b)*outer,roseY+Math.sin(b)*outer);
  shape.lineTo(Math.cos(b)*inner,roseY+Math.sin(b)*inner);
  shape.closePath();
  add(new THREE.ShapeGeometry(shape),glass[(i*5+2)%glass.length],0,0,.16);
  beam(V(Math.cos(a)*inner,roseY+Math.sin(a)*inner,-.65),V(Math.cos(a)*outer,roseY+Math.sin(a)*outer,-.65),.065,trim);
  beam(V(Math.cos(a)*outer,roseY+Math.sin(a)*outer,-.65),V(Math.cos(mid)*roseR*.97,roseY+Math.sin(mid)*roseR*.97,-.65),.065,trim);
  beam(V(Math.cos(mid)*roseR*.97,roseY+Math.sin(mid)*roseR*.97,-.65),V(Math.cos(b)*outer,roseY+Math.sin(b)*outer,-.65),.065,trim);
 }
 const medallion=add(new THREE.CircleGeometry(roseR*.36,48),glass[3],0,roseY,.19);
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4;
  beam(V(0,roseY,-.67),V(Math.cos(a)*roseR*.34,roseY+Math.sin(a)*roseR*.34,-.67),.045,trim);
 }
 // Ruined bottom sill and masonry grounded on floor.
 slab(0,.36,0,width+2.4,.72,1.65,stone);
 slab(0,.79,-.61,width+.6,.20,1.8,trim);
 for(const [x,y,z,r] of [[-W-.5,.35,-1.05,.64],[W+.6,.38,-.8,.69],[W+.9,.27,.1,.45],[-W-.8,.29,.6,.47]]){
  const rock=add(new THREE.DodecahedronGeometry(r,1),stone,x,y,z);rock.scale.set(1.22,.68,1.02);
 }
 const scale=Number.isFinite(options.scale)?Math.max(.1,Math.min(3,options.scale)):1;
 group.scale.setScalar(scale);
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.parent?.remove(group);group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
