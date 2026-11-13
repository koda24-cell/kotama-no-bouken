// Stage 5 Gothic gate companion assets: independent, tile-friendly pieces.
// Three.js procedural meshes. No mutation of the approved Gothic gate.
// Unit scale: one grid cell = 1 unit; each asset centered at local origin.
// Usage: import {createB5GateCompanion} from './b5-gate-companion-assets.js';
// const piece=createB5GateCompanion(THREE,'broken-pillar',42); scene.add(piece);
export const B5_GATE_COMPANION_VARIANTS=[
 'standing-pillar','broken-pillar','fallen-column','capital-fragment',
 'shaft-fragment','rubble-cluster','rubble-scatter'
];
export function createB5GateCompanion(THREE,variant='broken-pillar',seed=1){
 if(!B5_GATE_COMPANION_VARIANTS.includes(variant))throw Error('Unknown companion variant: '+variant);
 const group=new THREE.Group();
 group.name='b5:gateCompanion:'+variant;
 group.userData={floor:5,asset:'gothic-gate-companion',variant,seed,tileSize:1};
 const stone=new THREE.MeshStandardMaterial({color:0x79727f,roughness:1,flatShading:true});
 const light=new THREE.MeshStandardMaterial({color:0x928998,roughness:1,flatShading:true});
 const dark=new THREE.MeshStandardMaterial({color:0x514b58,roughness:1,flatShading:true});
 const rng=(()=>{let s=(seed>>>0)||1;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}})();
 function mesh(g,m,name,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.name='b5:companion:'+name;o.position.set(x,y,z);group.add(o);return o}
 function box(w,h,d,x,y,z,mat=stone,name='cut-stone'){
  // Rounded octagonal bevelled stone outline, avoiding sharp box silhouettes.
  const bevel=Math.min(w,h,d)*.14;
  const shape=new THREE.Shape();
  const x0=-w/2,x1=w/2,z0=-d/2,z1=d/2;
  shape.moveTo(x0+bevel,z0);shape.lineTo(x1-bevel,z0);
  shape.quadraticCurveTo(x1,z0,x1,z0+bevel);
  shape.lineTo(x1,z1-bevel);shape.quadraticCurveTo(x1,z1,x1-bevel,z1);
  shape.lineTo(x0+bevel,z1);shape.quadraticCurveTo(x0,z1,x0,z1-bevel);
  shape.lineTo(x0,z0+bevel);shape.quadraticCurveTo(x0,z0,x0+bevel,z0);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:h,steps:1,
   bevelEnabled:true,bevelThickness:Math.min(bevel*.22,h*.12),
   bevelSize:bevel*.12,bevelSegments:2,curveSegments:3});
  geo.rotateX(-Math.PI/2);
  return mesh(geo,mat,name,x,y-h/2,z);
 }
 function fracturedBlock(w,h,d,x,y,z,index){
  const v=[],idx=[],n=8;
  for(let ring=0;ring<2;ring++)for(let i=0;i<n;i++){
   const a=2*Math.PI*i/n;const jitter=.79+rng()*.19;
   v.push(Math.cos(a)*w*.5*jitter,ring===0?0:h*(.82+rng()*.18),Math.sin(a)*d*.5*jitter);
  }
  for(let i=1;i<n-1;i++)idx.push(0,i+1,i,n,n+i,n+i+1);
  for(let i=0;i<n;i++){const j=(i+1)%n;idx.push(i,j,n+j,i,n+j,n+i)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();
  const o=mesh(g,index%4===0?light:index%5===0?dark:stone,'fractured-block',x,y,z);
  o.rotation.y=rng()*Math.PI*2;return o;
 }
 function shaft(radius,height,x=0,y=0,z=0,broken=false){
  const segments=48,rings=25,verts=[],faces=[];
  for(let j=0;j<rings;j++){
   const t=j/(rings-1);
   for(let i=0;i<segments;i++){
    const a=i*2*Math.PI/segments;
    const flute=1-.095*Math.pow(Math.cos(a*8),12);
    const chip=broken&&j===rings-1?(.69+rng()*.30):1;
    const age=broken?1:0.65;
    const scar=(Math.abs(t-.42)<.075&&Math.abs(Math.atan2(Math.sin(a-2.45),Math.cos(a-2.45)))<.18)?-.052*age:0;
    const scar2=(Math.abs(t-.73)<.05&&Math.abs(Math.atan2(Math.sin(a-4.35),Math.cos(a-4.35)))<.13)?-.037*age:0;
    const r=radius*flute*chip*(.985+rng()*.025)+scar+scar2;
    const yy=y+height*t+(broken&&j===rings-1?(rng()-.5)*.12:0);
    verts.push(x+r*Math.cos(a),yy,z+r*Math.sin(a));
   }
  }
  for(let j=0;j<rings-1;j++)for(let i=0;i<segments;i++){
   const a=j*segments+i,b=j*segments+(i+1)%segments,c=(j+1)*segments+i,d=(j+1)*segments+(i+1)%segments;
   faces.push(a,b,d,a,d,c);
  }
  for(let i=1;i<segments-1;i++){faces.push(0,i+1,i);const k=(rings-1)*segments;faces.push(k,k+i,k+i+1)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(faces);g.computeVertexNormals();
  return mesh(g,stone,broken?'fractured-fluted-shaft':'fluted-shaft');
 }
 function pillar(height,broken){
  box(.63,.11,.63,0,.055,0,dark,'foundation');
  box(.54,.11,.54,0,.16,0,light,'plinth');
  shaft(.205,height,0,.22,0,broken);
  if(!broken){
   box(.47,.09,.47,0,.22+height+.04,0,light,'capital-abacus');
   for(let i=0;i<4;i++){
    const a=i*Math.PI/2;
    const o=box(.13,.18,.09,Math.cos(a)*.2,.22+height-.045,Math.sin(a)*.2,stone,'capital-leaf');
    o.rotation.y=-a;
   }
  }else{
   for(let i=0;i<4;i++){
    const a=i*Math.PI/2;
    fracturedBlock(.10,.10,.10,Math.cos(a)*.23,.03,Math.sin(a)*.24,i);
   }
  }
 }
 // Profiled square stone: four stepped bevel rings across top/bottom edges.
 // The rounded corners and horizontal bands are real geometry, not a texture.
 function profiledSquare(w,h,d,x,y,z,mat,name){
  const shape=new THREE.Shape(),c=Math.min(w,d)*.105;
  shape.moveTo(-w/2+c,-d/2);shape.lineTo(w/2-c,-d/2);
  shape.quadraticCurveTo(w/2,-d/2,w/2,-d/2+c);
  shape.lineTo(w/2,d/2-c);shape.quadraticCurveTo(w/2,d/2,w/2-c,d/2);
  shape.lineTo(-w/2+c,d/2);shape.quadraticCurveTo(-w/2,d/2,-w/2,d/2-c);
  shape.lineTo(-w/2,-d/2+c);shape.quadraticCurveTo(-w/2,-d/2,-w/2+c,-d/2);
  const g=new THREE.ExtrudeGeometry(shape,{depth:h,steps:2,curveSegments:5,
   bevelEnabled:true,bevelSegments:4,
   bevelSize:Math.min(w,d)*.045,bevelThickness:Math.min(h*.23,.025)});
  g.rotateX(-Math.PI/2);
  const body=mesh(g,mat,name,x,y-h/2,z);
  // Thin carved setbacks at both lips create readable edge facets.
  for(const sign of [-1,1]){
   const lip=box(w*.955,Math.min(h*.14,.025),d*.955,x,
    y+sign*(h*.5-Math.min(h*.10,.016)),z,sign>0?light:dark,name+'-edge-moulding');
   lip.userData.isEdgeMoulding=true;
  }
  return body;
 }
 if(variant==='standing-pillar'){
  // Taller architectural silhouette: stepped pedestal, fluted shaft,
  // layered Gothic capital, chamfered crown and sculpted corner supports.
  // Keep this entirely isolated from the approved gate and other variants.
  profiledSquare(.78,.10,.78,0,.05,0,dark,'foundation-course');
  profiledSquare(.71,.09,.71,0,.145,0,stone,'pedestal-lower');
  profiledSquare(.62,.10,.62,0,.24,0,light,'pedestal-moulding');
  profiledSquare(.51,.20,.51,0,.39,0,stone,'pedestal-core');
  profiledSquare(.57,.07,.57,0,.525,0,light,'pedestal-upper');
  const baseY=.56,shaftH=1.53;
  shaft(.205,shaftH,0,baseY,0,false);
  // Eight vertical recessed grooves; actual raised border ribs on the shaft.
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4;
   const rib=mesh(new THREE.CylinderGeometry(.022,.026,shaftH*.93,5),
    i%2?light:stone,'vertical-flute-ridge',
    Math.cos(a)*.19,baseY+shaftH*.5,Math.sin(a)*.19);
   rib.rotation.y=a;
  }
  // Recessed dark fracture traces: thin irregular ribbons hugging the
  // fluted surface. Multiple branching scars, not decorative straight lines.
  const crackMat=new THREE.MeshStandardMaterial({color:0x38343f,roughness:1,side:THREE.DoubleSide});
  function crack(points,label){
   const vertices=[],triangles=[];
   for(let i=0;i<points.length;i++){
    const [a,y,width]=points[i],r=.205*(1-.095*Math.pow(Math.cos(a*8),12))+.004;
    for(const offset of [-width/2,width/2]){
     const aa=a+offset;
     vertices.push(Math.cos(aa)*r,y,Math.sin(aa)*r);
    }
    if(i){const j=2*i;triangles.push(j-2,j-1,j,j-1,j+1,j)}
   }
   const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
   geo.setIndex(triangles);geo.computeVertexNormals();
   mesh(geo,crackMat,label);
  }
  for(let k=0;k<4;k++){
   const a=.32+k*1.49,start=baseY+.24+k*.22;
   const pts=[];
   for(let j=0;j<9;j++){
    const t=j/8;
    pts.push([a+t*.29+Math.sin(j*2.4+k)*.028,
      start+t*(.27+k%2*.09),.020+(j%3)*.005]);
   }
   crack(pts,'shaft-weathered-fracture');
   if(k%2===0)crack(pts.slice(3,7).map(([a,y,w],j)=>[a-.06-j*.035,y+j*.012,w*.68]),
    'shaft-branch-fracture');
  }
  const crownY=baseY+shaftH;
  profiledSquare(.45,.085,.45,0,crownY+.045,0,light,'capital-neck');
  profiledSquare(.54,.09,.54,0,crownY+.135,0,stone,'capital-lower-moulding');
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,dist=.235;
   const leaf=mesh(new THREE.ConeGeometry(.095,.30,5),i%2?stone:light,
    'gothic-capital-carved-leaf',Math.cos(a)*dist,crownY+.235,Math.sin(a)*dist);
   leaf.rotation.z=-Math.cos(a)*.30;
   leaf.rotation.x=Math.sin(a)*.30;
  }
  profiledSquare(.67,.105,.67,0,crownY+.35,0,light,'capital-abacus');
  profiledSquare(.75,.065,.75,0,crownY+.425,0,dark,'capital-crown-top');
  // Corner scroll bosses and shallow fracture chips for aged silhouette.
  for(let i=0;i<4;i++){
   const x=(i%2?.305:-.305),z=(i<2?.305:-.305);
   const boss=mesh(new THREE.SphereGeometry(.077,7,5),stone,
    'capital-corner-boss',x,crownY+.31,z);
   boss.scale.set(1,.62,1);
  }
  group.userData.standingPillarDetail={shaftHeight:shaftH,shaftCircumferenceVertices:48,shaftHeightRings:25,fractureTraces:6,fluteRibs:8,
   capitalLeaves:8,capitalCornerBosses:4};
 }
 if(variant==='broken-pillar')pillar(.69,true);
 if(variant==='fallen-column'){
  shaft(.18,.82,0,.19,0,true);
  const o=group.children[group.children.length-1];
  o.rotation.z=Math.PI/2;o.position.set(-.36,.19,0);
  fracturedBlock(.28,.20,.28,.33,.02,.1,1);
  fracturedBlock(.18,.13,.22,-.4,.02,-.23,2);
 }
 if(variant==='capital-fragment'){
  box(.54,.15,.48,0,.14,0,light,'broken-capital');
  for(let i=0;i<5;i++)fracturedBlock(.15,.16,.17,(rng()-.5)*.35,.21,(rng()-.5)*.35,i);
 }
 if(variant==='shaft-fragment'){
  shaft(.20,.49,0,.04,0,true);
  fracturedBlock(.20,.11,.24,.27,.02,.12,3);
 }
 if(variant==='rubble-cluster'||variant==='rubble-scatter'){
  const count=variant==='rubble-cluster'?17:11;
  for(let i=0;i<count;i++){
   const a=rng()*Math.PI*2;
   const r=(variant==='rubble-cluster'?.08:.17)+Math.sqrt(rng())*(variant==='rubble-cluster'?.34:.30);
   const w=.09+rng()*.17,h=.06+rng()*.15,d=.10+rng()*.19;
   const o=fracturedBlock(w,h,d,Math.cos(a)*r,0,Math.sin(a)*r,i);
   o.rotation.z=(rng()-.5)*.3;
  }
 }
 return group;
}
