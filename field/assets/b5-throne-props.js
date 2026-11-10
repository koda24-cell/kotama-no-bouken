import {createB5BrokenStair} from './b5-broken-stair.js';
/* B5 demon throne room only: geometry-first cathedral prop library.
 * Visual-only; do not use as collision meshes or spawn automatically.
 * Caller attaches returned group and disposes it on scene exit.
 */
export const B5_THRONE_PROP_KINDS = Object.freeze([
  'ruinedPillar','hangingBanner','grandChandelier','fracturedAltar',
  'gothicArch','candleSanctuary','brokenStair','shatteredRoseWindow'
]);
export function createB5ThroneProp(THREE, kind, options={}) {
  if(!B5_THRONE_PROP_KINDS.includes(kind)) throw new Error('Unknown throne prop: '+kind);
  if(kind==='brokenStair') return createB5BrokenStair(THREE,options);
  const group=new THREE.Group(); group.name='b5:throne:'+kind;group.userData.visualOnly=true;
  const gs=[],ms=[];
  const G=x=>(gs.push(x),x), M=x=>(ms.push(x),x);
  const stone=M(new THREE.MeshStandardMaterial({color:0x47444c,roughness:0.92,flatShading:true}));
  const dark=M(new THREE.MeshStandardMaterial({color:0x28252d,roughness:0.94,flatShading:true}));
  const iron=M(new THREE.MeshStandardMaterial({color:0x514b4c,metalness:0.65,roughness:0.55}));
  const fabric=M(new THREE.MeshStandardMaterial({color:0x50343b,roughness:0.9,side:THREE.DoubleSide}));
  const fire=M(new THREE.MeshBasicMaterial({color:0xffa455}));
  const cube=G(new THREE.BoxGeometry(1,1,1)),rod=G(new THREE.CylinderGeometry(0.08,0.08,1,6));
  const oct=G(new THREE.IcosahedronGeometry(1,0)),spike=G(new THREE.ConeGeometry(0.35,1,5));
  const mesh=(geo,mat,x,y,z,sx=1,sy=1,sz=1,parent=group)=>{
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;
  };
  let seed=(options.seed??505)>>>0;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const rubble=(n,r)=>{for(let i=0;i<n;i++){const a=rand()*Math.PI*2,d=rand()*r;
    const m=mesh(oct,stone,Math.cos(a)*d,rand()*0.4,Math.sin(a)*d,0.2+rand()*0.6,0.12+rand()*0.4,0.2+rand()*0.6);
    m.rotation.set(rand(),rand()*3,rand());}};
  const pillar=(x,z,h=11,broken=false)=>{
    mesh(cube,stone,x,0.5,z,2.5,1,2.5);
    const shaft=mesh(G(new THREE.CylinderGeometry(0.78,1.05,h,9)),stone,x,1+h/2,z);
    if(broken){shaft.scale.y=0.66;shaft.rotation.z=0.12;mesh(cube,dark,x+1.9,0.9,z,1.8,1.5,1.8).rotation.z=0.65;}
    mesh(cube,stone,x,1+h*(broken?0.66:1)+0.25,z,2.2,0.5,2.2).rotation.z=broken?0.12:0;
    for(let i=0;i<4;i++){const a=i*Math.PI/2;mesh(rod,iron,x+Math.cos(a)*0.9,2+h*0.42,z+Math.sin(a)*0.9,1,h*0.75,1);}
  };
  if(kind==='ruinedPillar'){pillar(0,0,13,true);rubble(13,4);}
  if(kind==='hangingBanner'){
    mesh(rod,iron,0,12,0,2.2,7,2.2);
    const geo=G(new THREE.BufferGeometry());
    const p=[0,11,0,4.2,11,0,4.1,4.2,0.6,3.2,1.4,0.2,2.1,2.7,0.5,1.2,1.0,0.2,0,3.7,0];
    geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    geo.setIndex([0,1,2,0,2,6,6,2,3,6,3,5,5,3,4]);geo.computeVertexNormals();
    mesh(geo,fabric,0,0,0);
    mesh(cube,iron,2.1,11.2,0,4.7,0.22,0.2);
  }
  if(kind==='grandChandelier'){
    const hoop=G(new THREE.TorusGeometry(3.6,0.18,7,28));
    const hoop2=G(new THREE.TorusGeometry(2.15,0.14,7,22));
    mesh(hoop,iron,0,8,0).rotation.x=Math.PI/2;
    mesh(hoop2,iron,0,6.8,0).rotation.x=Math.PI/2;
    for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a)*3.6,z=Math.sin(a)*3.6;
      mesh(rod,iron,x/2,10.5,z/2,1,6,1).rotation.z=(i%2?0.13:-0.13);
      mesh(rod,iron,x,8.45,z,1,1.4,1);
      mesh(spike,fire,x,9.4,z,0.45,0.65,0.45);}
    mesh(rod,iron,0,13,0,2.2,10,2.2);
  }
  if(kind==='fracturedAltar'){
    mesh(cube,stone,0,0.7,0,9,1.4,5);
    mesh(cube,dark,-1.2,2.0,0,4.9,1.2,3.7).rotation.z=-0.12;
    mesh(cube,stone,2.5,1.6,0.5,3.5,1,3.2).rotation.z=0.28;
    for(let i=0;i<5;i++){mesh(spike,stone,-3.8+i*1.9,2.7,-2.1,0.7,1.7,0.7);}
    rubble(18,7);
  }
  if(kind==='gothicArch'){
    pillar(-4,0,12,false);pillar(4,0,10,true);
    const left=mesh(cube,stone,-2.15,12.2,0,5.6,1.1,2.1);left.rotation.z=0.55;
    const right=mesh(cube,stone,2.15,12.2,0,5.6,1.1,2.1);right.rotation.z=-0.55;
    mesh(spike,dark,0,14.5,0,2.5,3.2,2.5);rubble(14,6);
  }
  if(kind==='candleSanctuary'){
    mesh(cube,stone,0,0.5,0,8,1,5);
    for(let i=0;i<36;i++){const x=(rand()-0.5)*7,z=(rand()-0.5)*4,h=0.25+rand()*1.6;
      mesh(G(new THREE.CylinderGeometry(0.12,0.16,h,6)),stone,x,1+h/2,z);
      mesh(spike,fire,x,1+h+0.18,z,0.28,0.36,0.28);}
  }
  if(kind==='brokenStair'){
    for(let i=0;i<9;i++){const x=(i-4)*1.45,y=i*0.52;
      const m=mesh(cube,stone,x,y,0,1.4,0.5,5.2);m.rotation.z=i>5?0.1*(i-5):0;}
    for(let i=0;i<4;i++)mesh(cube,stone,5.5+rand()*3,1+rand()*2,(rand()-0.5)*5,1.3,0.5,1.8).rotation.z=rand();
    rubble(12,9);
  }
  if(kind==='shatteredRoseWindow'){
    const hoop=G(new THREE.TorusGeometry(4.5,0.32,8,28,Math.PI*1.65));
    mesh(hoop,stone,0,8,0);
    for(let i=0;i<9;i++){const a=i*Math.PI*2/11;
      const beam=mesh(cube,iron,Math.cos(a)*1.9,8+Math.sin(a)*1.9,0,0.22,4.1,0.3);
      beam.rotation.z=a-Math.PI/2;}
    for(let i=0;i<8;i++){const a=rand()*Math.PI*2;
      const shard=mesh(oct,stone,Math.cos(a)*(2+rand()*3),rand()*3,Math.sin(a)*(1+rand()),0.35+rand(),0.25+rand(),0.25+rand());
      shard.rotation.z=rand()*3;}
  }
  // Second-pass geometry: pronounced broken profiles, hanging ornament and clustered wreckage.
  // This extends the original eight props instead of introducing unrelated assets.
  const fracturedSlab=G(new THREE.BufferGeometry());
  fracturedSlab.setAttribute('position',new THREE.Float32BufferAttribute([
    -1.7,0,-0.7, 1.6,0,-0.8, 2.3,0.5,0.2, 0.6,0.3,1.1,
    -1.4,0.4,0.8, -0.3,1.2,-0.1, 0.8,1.3,-0.2
  ],3));
  fracturedSlab.setIndex([0,1,5,1,6,5,1,2,6,2,3,6,3,4,5,3,5,6,4,0,5]);
  fracturedSlab.computeVertexNormals();
  const roughPiece=(x,y,z,s=1)=>{
    const m=mesh(fracturedSlab,stone,x,y,z,s,s*(0.65+rand()*0.5),s*(0.7+rand()*0.7));
    m.rotation.set(rand()*0.7,rand()*6.28,(rand()-0.5)*1.5);return m;
  };
  if(kind==='ruinedPillar'){
    // A clearly detached capital and large diagonal broken masonry, not hairline cracks.
    roughPiece(2.5,8.6,0,1.45).rotation.z=-0.7;
    roughPiece(-1.1,10.3,0.5,1.0);
    for(let i=0;i<7;i++)roughPiece((rand()-0.5)*5,0.4,(rand()-0.5)*5,0.5+rand()*0.9);
  }
  if(kind==='hangingBanner'){
    // A second torn sheet, detached cloth tails and heavy bottom ornaments.
    const tails=G(new THREE.BufferGeometry());
    tails.setAttribute('position',new THREE.Float32BufferAttribute([
      0,0,0, 1.2,0,0.15, 1.5,-3.5,0.4, 0.5,-5.7,0.6,
      2.0,0,0.1, 3.6,0,0.1, 3.1,-4.4,0.5, 2.7,-2.8,0.4
    ],3));
    tails.setIndex([0,1,2,0,2,3,4,5,6,4,6,7]);tails.computeVertexNormals();
    mesh(tails,fabric,0,4.2,0.3);
    for(let i=0;i<5;i++)mesh(spike,iron,i*0.8,11.35,0,0.38,0.8,0.38);
  }
  if(kind==='grandChandelier'){
    // Oversized serrated crown and a second tier of pendants.
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8,x=Math.cos(a)*2.15,z=Math.sin(a)*2.15;
      mesh(spike,iron,x,5.8,z,0.65,1.9,0.65).rotation.z=Math.PI;
      mesh(rod,iron,x,7.35,z,0.7,1.3,0.7);
    }
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      mesh(spike,iron,Math.cos(a)*3.6,7.4,Math.sin(a)*3.6,1.2,2.1,1.2).rotation.z=Math.PI;
    }
  }
  if(kind==='fracturedAltar'){
    roughPiece(-3.7,1.6,1.3,1.3);
    roughPiece(3.7,1.2,-0.8,1.5);
    for(let i=0;i<9;i++)roughPiece((rand()-0.5)*9,0.25,(rand()-0.5)*6,0.45+rand()*0.8);
  }
  if(kind==='gothicArch'){
    // A giant broken keystone with obvious voids and fallen ribs.
    roughPiece(0,14.4,0,1.8).rotation.z=0.55;
    for(let i=0;i<5;i++){
      const x=(i-2)*1.2;
      const rib=mesh(cube,stone,x,12.5+Math.abs(i-2)*0.3,-0.9,0.3,4.5,0.4);
      rib.rotation.z=(i-2)*0.22;
    }
    roughPiece(5,0.7,2,1.4);
  }
  if(kind==='candleSanctuary'){
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      const x=Math.cos(a)*3.1,z=Math.sin(a)*1.8;
      mesh(spike,iron,x,1.3,z,0.65,1.3,0.65).rotation.z=Math.PI;
    }
    roughPiece(-3,0.8,-1.5,0.8);roughPiece(2.8,0.8,1.5,0.8);
  }
  if(kind==='brokenStair'){
    for(let i=0;i<8;i++){
      roughPiece(4+(rand()-0.5)*6,-0.2+rand()*2,(rand()-0.5)*5,0.5+rand()*0.9);
    }
    const slab=mesh(fracturedSlab,stone,5.4,4.7,0,2.2,1.4,1.5);
    slab.rotation.z=-0.8;
  }
  if(kind==='shatteredRoseWindow'){
    // Large radial shards projecting from the broken outer circumference.
    for(let i=0;i<11;i++){
      const a=i*Math.PI*2/11;
      const x=Math.cos(a)*4.6,y=8+Math.sin(a)*4.6;
      const m=mesh(spike,stone,x,y,0,0.9,1.8,0.8);
      m.rotation.z=a-Math.PI/2;
    }
    for(let i=0;i<8;i++)roughPiece((rand()-0.5)*8,rand()*1.3,(rand()-0.5)*3,0.4+rand()*0.6);
  }
  // Third pass: true silhouette holes and bent metal, rather than surface-only marks.
  // A broken ring is an open arc with missing sections; a torn pillar has an irregular top.
  const brokenRing=(radius,start,sweep,tube=0.2)=>{
    const shape=G(new THREE.TorusGeometry(radius,tube,7,36,sweep));
    const m=mesh(shape,stone,0,0,0);m.rotation.z=start;return m;
  };
  const fracturedColumnGeo=G(new THREE.BufferGeometry());
  {
    const sides=9, p=[], idx=[], heights=[];
    for(let i=0;i<sides;i++)heights.push(0.9+0.55*Math.sin(i*2.2)+0.22*Math.cos(i*4.3));
    for(let i=0;i<sides;i++){
      const a=i*2*Math.PI/sides;
      const x=Math.cos(a),z=Math.sin(a);
      p.push(x,0,z,x,heights[i],z);
    }
    p.push(0,0,0);
    for(let i=0;i<sides;i++){
      const j=(i+1)%sides;
      idx.push(i*2,j*2,i*2+1,j*2,j*2+1,i*2+1);
      idx.push(sides*2,j*2,i*2);
    }
    fracturedColumnGeo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    fracturedColumnGeo.setIndex(idx);fracturedColumnGeo.computeVertexNormals();
  }
  if(kind==='ruinedPillar'){
    const fracture=mesh(fracturedColumnGeo,stone,0,7.2,0,1.1,2.8,1.1);
    fracture.rotation.z=0.14;
    for(let i=0;i<3;i++){
      const fallen=mesh(fracturedColumnGeo,stone,2+i*1.7,0.2,1.1+i*0.7,0.8,1.7,0.8);
      fallen.rotation.z=1.2+i*0.18;
    }
  }
  if(kind==='gothicArch'){
    // Detached, partially missing curved ribs make the damage legible at distance.
    const leftArc=brokenRing(3.8,0.15,Math.PI*0.64,0.28);
    leftArc.position.set(-0.5,11.2,-1.1);
    const rightArc=brokenRing(3.8,Math.PI*1.08,Math.PI*0.43,0.28);
    rightArc.position.set(0.5,11.2,-1.1);
    mesh(fracturedColumnGeo,stone,3.6,10.3,0,0.7,2.1,0.7).rotation.z=0.55;
  }
  if(kind==='shatteredRoseWindow'){
    // Multiple discontinuous concentric rings: visibly absent masonry sections.
    for(const [r,start,sweep] of [[3.3,0.2,2.2],[3.3,3.1,1.9],[2.0,1.0,1.8],[2.0,3.6,1.4]]){
      const arc=brokenRing(r,start,sweep,0.17);arc.position.y=8;arc.position.z=-0.25;
    }
  }
  if(kind==='grandChandelier'){
    // Additional bent arms with uneven length, not simply repeated vertical rods.
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6, r=2.7+(i%3)*0.34;
      const arm=mesh(rod,iron,Math.cos(a)*r,7.7,Math.sin(a)*r,1,2.5+(i%4)*0.3,1);
      arm.rotation.z=(i%2?0.35:-0.35);
      arm.rotation.x=(i%3-1)*0.22;
    }
  }
  if(kind==='brokenStair'){
    // Two snapped railing posts and an off-axis fallen beam.
    for(const [x,z,h] of [[-3.5,-2.7,3.7],[3.5,-2.7,2.1]]){
      const post=mesh(fracturedColumnGeo,stone,x,0.8,z,0.45,h,0.45);
      post.rotation.z=x>0?0.35:-0.2;
    }
    mesh(cube,iron,1.2,2.1,-3,0.35,0.35,7.5).rotation.z=0.45;
  }
  if(kind==='fracturedAltar'){
    // Detached slanted keystone and a recognizable deep altar split.
    mesh(fracturedColumnGeo,stone,-0.7,2.1,-0.3,1.0,1.4,0.85).rotation.z=-0.6;
    mesh(fracturedColumnGeo,dark,0.5,1.7,0.4,0.3,1.7,0.9).rotation.z=0.35;
  }
  // Fourth pass: clustered flying buttresses, suspended chainwork and large broken ribs.
  // Beams are oriented between endpoints; lengths follow their actual span.
  const beamBetween=(a,b,width=0.24,material=iron)=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
    const delta=end.clone().sub(start);
    const m=mesh(cube,material,(start.x+end.x)/2,(start.y+end.y)/2,(start.z+end.z)/2,width,delta.length(),width);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    return m;
  };
  if(kind==='gothicArch'){
    for(const side of [-1,1]){
      beamBetween([side*4,5,-0.7],[side*6.8,8.2,-2.2],0.55,stone);
      beamBetween([side*6.8,8.2,-2.2],[side*3.3,12.5,-0.8],0.45,stone);
      beamBetween([side*4.1,6.5,-0.8],[side*5.7,9.2,-2.0],0.3,iron);
      mesh(fracturedColumnGeo,stone,side*6.9,7.3,-2.2,0.7,2.1,0.7).rotation.z=side*0.2;
    }
  }
  if(kind==='grandChandelier'){
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,x=Math.cos(a)*3.6,z=Math.sin(a)*3.6;
      beamBetween([0,13,0],[x,8,z],0.12,iron);
      if(i%3===0)beamBetween([x,8,z],[x*0.6,5.5,z*0.6],0.16,iron);
    }
  }
  if(kind==='ruinedPillar'){
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3,x=Math.cos(a),z=Math.sin(a);
      beamBetween([x*0.8,2,z*0.8],[x*2.4,5.6,z*2.4],0.26,iron);
    }
  }
  if(kind==='fracturedAltar'){
    for(let i=0;i<7;i++){
      const x=-3.5+i*1.1;
      beamBetween([x,1.4,-2.3],[x+(i%2?0.45:-0.55),3.8+(i%3)*0.5,-2.7],0.18,iron);
    }
  }
  if(kind==='hangingBanner'){
    for(let i=0;i<4;i++){
      const x=i*1.1;
      beamBetween([x,11.2,0],[x+(i%2?0.4:-0.35),6.7-i*0.5,0.25],0.11,iron);
    }
  }
  if(kind==='brokenStair'){
    for(let i=0;i<5;i++){
      const x=-4+i*2;
      beamBetween([x,i*0.45,-2.8],[x+1.1,i*0.45+2.2,-3.2],0.28,stone);
    }
  }
  // Fifth pass: secondary ornament silhouettes, damaged balustrades and masonry layers.
  // Detail can be reduced for distant instances without altering the public API.
  const detail=options.detail==='low'?'low':'high';
  const ornamentalCrown=(x,y,z,scale=1)=>{
    mesh(cube,stone,x,y,z,2.1*scale,0.35*scale,1.6*scale);
    for(let i=0;i<5;i++){
      const px=x+(i-2)*0.43*scale;
      mesh(spike,iron,px,y+0.55*scale,z,0.32*scale,(i===2?1.5:0.9)*scale,0.32*scale);
    }
  };
  if(kind==='gothicArch'){
    ornamentalCrown(0,15.6,-0.4,1.7);
    for(const side of [-1,1]){
      const finial=mesh(fracturedColumnGeo,stone,side*5.8,9.1,-2.2,0.5,2.6,0.5);
      finial.rotation.z=side*0.24;
      for(let i=0;i<3;i++)mesh(spike,iron,side*(4.9+i*0.5),11.5-i*0.7,-2.1,0.45,1.4,0.45);
    }
  }
  if(kind==='ruinedPillar'){
    ornamentalCrown(0,10.6,0,1.0);
    if(detail==='high')for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      const x=Math.cos(a)*1.1,z=Math.sin(a)*1.1;
      beamBetween([x,2.2,z],[x*1.15,6.7,z*1.15],0.13,iron);
    }
  }
  if(kind==='hangingBanner'){
    // Hanging chains and asymmetrically broken ornamental end weights.
    for(let i=0;i<7;i++){
      const x=0.3+i*0.53;
      const y=11.0-(i%3)*0.3;
      mesh(spike,iron,x,y,0.12,0.3,0.65+(i%2)*0.4,0.3).rotation.z=Math.PI;
    }
    if(detail==='high')for(let i=0;i<8;i++){
      const y=9.8-i*0.58;
      beamBetween([0,y,0.25],[0.12+(i%2)*0.1,y-0.5,0.25],0.055,iron);
    }
  }
  if(kind==='grandChandelier'){
    ornamentalCrown(0,13.9,0,0.85);
    if(detail==='high')for(let i=0;i<24;i++){
      const a=i*Math.PI/12;
      const x=Math.cos(a)*3.65,z=Math.sin(a)*3.65;
      mesh(spike,iron,x,7.6-(i%3)*0.35,z,0.22,0.85+(i%4)*0.2,0.22).rotation.z=Math.PI;
    }
  }
  if(kind==='fracturedAltar'){
    ornamentalCrown(0,3.7,-1.5,1.5);
    for(let i=0;i<6;i++){
      const x=(i-2.5)*1.45;
      const h=1.2+(i%3)*0.6;
      mesh(fracturedColumnGeo,stone,x,1.3,-2.3,0.34,h,0.4).rotation.z=(i%2?0.3:-0.25);
    }
  }
  if(kind==='candleSanctuary'){
    // Tall reliquary-like silhouette and ring of raised candle stands.
    ornamentalCrown(0,3.4,0,1.15);
    mesh(fracturedColumnGeo,stone,0,1.05,0,0.65,2.4,0.65);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,x=Math.cos(a)*3.4,z=Math.sin(a)*2.0;
      mesh(rod,iron,x,1.7,z,1.4,1.5,1.4);
      mesh(spike,fire,x,2.7,z,0.35,0.55,0.35);
    }
  }
  if(kind==='brokenStair'){
    for(let i=0;i<7;i++){
      const x=-4.6+i*1.35,y=0.4+i*0.52;
      const post=mesh(fracturedColumnGeo,stone,x,y,-2.6,0.28,0.85+(i%3)*0.3,0.28);
      post.rotation.z=(i%2?0.18:-0.3);
    }
    ornamentalCrown(5.5,5.5,-2.5,0.75);
  }
  if(kind==='shatteredRoseWindow'){
    ornamentalCrown(0,13.4,0,0.9);
    // Additional empty spans: detached fragments form an interrupted outer tracery.
    for(let i=0;i<7;i++){
      const a=0.2+i*0.76,x=Math.cos(a)*5.1,y=8+Math.sin(a)*5.1;
      const m=mesh(fracturedColumnGeo,stone,x,y,-0.5,0.27,0.9,0.27);
      m.rotation.z=a;
    }
  }
  // Sixth pass: fractured vault canopy and asymmetric relief work.
  // Shared meshes within each prop instance; no dynamic lights or collisions.
  const vaultRib=(points,width=0.2,material=stone)=>{
    for(let i=1;i<points.length;i++)beamBetween(points[i-1],points[i],width,material);
  };
  if(kind==='gothicArch'){
    for(const side of [-1,1]){
      vaultRib([[side*4.1,9,-1.2],[side*3.2,12.1,-2.6],[side*1.6,14.6,-3.2],[0,15.3,-3.3]],0.32);
      vaultRib([[side*4.0,9.5,0.9],[side*2.9,12.4,1.9],[side*1.1,14.2,2.3]],0.25);
    }
    for(let i=0;i<5;i++)roughPiece((i-2)*1.1,13.7+(i%2)*0.7,-2.8,0.55+(i%3)*0.25);
  }
  if(kind==='fracturedAltar'){
    // Jagged rear retable: tiered sacred architecture without invented iconography.
    for(let i=0;i<5;i++){
      const x=(i-2)*1.65,h=2.4+((i+1)%3)*1.2;
      const m=mesh(fracturedColumnGeo,stone,x,2.0,-2.5,0.5,h,0.45);
      m.rotation.z=(i-2)*0.08;
      beamBetween([x,3,-2.8],[x+(i%2?0.4:-0.3),3+h*0.6,-2.8],0.16,iron);
    }
    vaultRib([[-4.5,3,-2.6],[-2.6,5.1,-2.8],[0,5.8,-2.9],[2.6,5.1,-2.8],[4.5,3,-2.6]],0.3);
  }
  if(kind==='shatteredRoseWindow'){
    // Off-axis fallen frame fragments make the broken circle less symmetric.
    vaultRib([[-4.1,5.1,0.5],[-2.3,7.3,0.8],[-0.6,9.2,0.4]],0.24,iron);
    vaultRib([[2.0,12.4,-0.4],[3.9,11.0,-0.7],[5.0,8.4,-0.2]],0.2,iron);
    for(let i=0;i<4;i++)roughPiece((i-1.5)*2.0,0.2,(i%2?1.3:-0.8),0.8+i*0.1);
  }
  if(kind==='grandChandelier'){
    // Multi-stage suspended skeletal crown, intentionally irregular and incomplete.
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5;
      const r=1.4+(i%3)*0.45;
      vaultRib([[0,12.8,0],[Math.cos(a)*r,10.2,Math.sin(a)*r],
        [Math.cos(a)*(r+1.4),8.2,Math.sin(a)*(r+1.4)]],0.11,iron);
    }
  }
  if(kind==='ruinedPillar'){
    // Large detached arch segment, suggesting an enormous collapsed roof.
    vaultRib([[-3.5,8.2,-1.7],[-2.1,10.5,-1.3],[0.1,11.8,-1.1],[2.0,10.8,-0.7]],0.44,stone);
    roughPiece(-3.5,7.8,-1.8,1.1);
  }
  if(kind==='brokenStair'){
    // Jagged collapsed balustrade with a clear gap and missing intermediate spans.
    vaultRib([[-4.5,1.6,-3.2],[-2.7,2.5,-3.2],[-1.5,3.1,-3.3]],0.3,stone);
    vaultRib([[1.0,4.4,-3.2],[3.2,5.5,-3.2],[4.9,6.1,-3.1]],0.3,stone);
    roughPiece(-0.1,0.9,-3.5,1.2);
  }
  // Seventh pass: asymmetric ruined statuary and architectural edge silhouettes.
  // All forms remain abstract: no new lore, heraldry or character likeness.
  const buttressCluster=(x,z,side=1)=>{
    mesh(fracturedColumnGeo,stone,x,1.0,z,0.75,4.4,0.75).rotation.z=side*0.28;
    beamBetween([x,2.2,z],[x+side*1.8,4.8,z-0.8],0.46,stone);
    mesh(spike,iron,x+side*1.8,5.4,z-0.8,0.7,1.6,0.7);
    roughPiece(x+side*1.2,0.1,z+0.7,0.7);
  };
  if(kind==='gothicArch'){
    buttressCluster(-7.0,-2.6,-1);
    buttressCluster(7.0,-2.6,1);
    for(let i=0;i<5;i++){
      const x=(i-2)*1.7;
      mesh(spike,stone,x,15.2-Math.abs(i-2)*0.9,-1.7,0.6,2.0,0.6);
    }
  }
  if(kind==='ruinedPillar'){
    buttressCluster(3.3,-2.8,1);
    buttressCluster(-3.5,2.0,-1);
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5;
      roughPiece(Math.cos(a)*2.6,0.2,Math.sin(a)*2.6,0.65+i*0.12);
    }
  }
  if(kind==='fracturedAltar'){
    buttressCluster(-5.4,-1.5,-1);
    buttressCluster(5.4,-1.5,1);
    for(let i=0;i<9;i++){
      const x=(i-4)*0.9;
      mesh(spike,stone,x,4.3-Math.abs(i-4)*0.22,-3.1,0.3,1.1+(i%3)*0.25,0.3);
    }
  }
  if(kind==='brokenStair'){
    buttressCluster(-5.6,-3.4,-1);
    buttressCluster(6.4,-3.5,1);
    roughPiece(3.1,2.0,-3.2,1.4);
  }
  if(kind==='shatteredRoseWindow'){
    // Fallen fragments on either side frame the scale of the ruined aperture.
    buttressCluster(-5.8,0.3,-1);
    buttressCluster(5.8,0.3,1);
  }
  if(kind==='hangingBanner'){
    // Separate dangling cloth tip, visibly split from the main fabric.
    const tear=G(new THREE.BufferGeometry());
    tear.setAttribute('position',new THREE.Float32BufferAttribute([
      2.0,3.4,0.6,3.0,3.1,0.5,2.7,0.4,0.8,2.4,1.2,0.7,
      2.2,-0.6,0.5
    ],3));
    tear.setIndex([0,1,2,0,2,3,3,2,4]);tear.computeVertexNormals();
    mesh(tear,fabric,0,0,0);
  }
  if(kind==='candleSanctuary'){
    // Tall off-axis broken shrine posts among candles.
    for(const [x,z,h] of [[-3.4,-1.8,3.2],[3.0,1.5,4.1],[-0.8,1.8,2.7]]){
      const post=mesh(fracturedColumnGeo,stone,x,1,z,0.35,h,0.35);
      post.rotation.z=x>0?0.21:-0.17;
    }
  }
  const scale=Number.isFinite(options.scale)?Math.max(0.1,Math.min(4,options.scale)):1;
  group.scale.setScalar(scale);
  let disposed=false;
  return {group,dispose(){if(disposed)return;disposed=true;
    if(group.parent)group.parent.remove(group);group.clear();
    gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}};
}
