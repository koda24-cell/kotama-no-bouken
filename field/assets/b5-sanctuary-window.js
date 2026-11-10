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
  // independent triangular stained glass panes, kept behind front masonry
  const center=[xc,(base+glassTop)/2],cz=.22;
  for(let j=0;j<points.length;j++){
   const a=points[j],b=points[(j+1)%points.length];
   const shape=new THREE.Shape();shape.moveTo(center[0],center[1]);shape.lineTo(a[0],a[1]);shape.lineTo(b[0],b[1]);shape.closePath();
   const pane=add(new THREE.ShapeGeometry(shape),glass[(i+j)%glass.length],0,0,cz);
   pane.material.side=THREE.DoubleSide;
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
 // Large rose-tracery circle in upper tympanum, stone ring + radial petals.
 const roseY=height*.85,roseR=Math.min(W*.40,height*.10);
 const arc=(radius,start,end,material,segments=48)=>{
  for(let i=0;i<segments;i++){
   const a=start+(end-start)*i/segments,b=start+(end-start)*(i+1)/segments;
   beam(V(Math.cos(a)*radius,roseY+Math.sin(a)*radius,-.61),V(Math.cos(b)*radius,roseY+Math.sin(b)*radius,-.61),.095,material,7);
  }
 };
 arc(roseR,0,Math.PI*2,trim);
 arc(roseR*.40,0,Math.PI*2,trim);
 for(let i=0;i<10;i++){
  const a=i*Math.PI/5;
  beam(V(Math.cos(a)*roseR*.40,roseY+Math.sin(a)*roseR*.40,-.61),V(Math.cos(a)*roseR,roseY+Math.sin(a)*roseR,-.61),.09,trim);
 }
 const disk=add(new THREE.CircleGeometry(roseR*.98,60),glass[0],0,roseY,.16);
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
