/* B5 fallen cathedral column. Reference-driven geometry, ground plane y=0.
 * Purely decorative: no collision, map placement, or game-state changes.
 */
export function createB5FallenPillar(THREE,options={}){
  const group=new THREE.Group();group.name='b5:throne:ruinedPillar';group.userData.visualOnly=true;
  const geometries=[],materials=[];
  const G=g=>(geometries.push(g),g),M=m=>(materials.push(m),m);
  const stone=M(new THREE.MeshStandardMaterial({color:0x66616b,roughness:0.94,flatShading:true,side:THREE.DoubleSide}));
  const shadow=M(new THREE.MeshStandardMaterial({color:0x494650,roughness:0.98,flatShading:true}));
  const mesh=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);group.add(m);return m;};
  let seed=(options.seed??505)>>>0;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const centerY=1.45;
  // Fluted shaft along X. The last two rings fracture at varying axial positions.
  // Different radial sectors end at different positions, creating a real jagged silhouette.
  const segments=32, rings=12, length=6.5, positions=[],indices=[];
  for(let j=0;j<=rings;j++){
    const t=j/rings;
    for(let k=0;k<segments;k++){
      const a=k*Math.PI*2/segments;
      const flute=0.075*Math.cos(a*12);
      const wear=(rand()-0.5)*0.027;
      const r=1.07-0.12*t+flute+wear;
      const jag=(j===rings?(rand()-0.5)*0.9:j===rings-1?(rand()-0.5)*0.15:0);
      positions.push(0.95+length*t+jag,centerY+Math.cos(a)*r,Math.sin(a)*r);
    }
  }
  for(let j=0;j<rings;j++)for(let k=0;k<segments;k++){
    const a=j*segments+k,b=j*segments+(k+1)%segments,c=(j+1)*segments+k,d=(j+1)*segments+(k+1)%segments;
    indices.push(a,b,c,b,d,c);
  }
  // Fractured end face: irregular inner ring, not a flat cylinder cap.
  const endStart=positions.length/3;
  for(let k=0;k<segments;k++){
    const a=k*Math.PI*2/segments;
    positions.push(0.95+length+(rand()-0.5)*0.38,centerY+Math.cos(a)*0.45,Math.sin(a)*0.45);
    const n=(k+1)%segments;
    indices.push(rings*segments+k,rings*segments+n,endStart+k,
      rings*segments+n,endStart+n,endStart+k);
  }
  const shaft=G(new THREE.BufferGeometry());
  shaft.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  shaft.setIndex(indices);shaft.computeVertexNormals();
  mesh(shaft,stone,0,0,0);
  // Layered classical moulding: multiple circular stone rings on the column axis.
  const ring=(x,radius,depth)=>{
    const m=mesh(G(new THREE.CylinderGeometry(radius,radius,depth,28)),stone,x,centerY,0);
    m.rotation.z=Math.PI/2;return m;
  };
  ring(0.9,1.28,0.30);ring(0.65,1.39,0.18);ring(0.4,1.50,0.24);
  ring(0.17,1.58,0.17);
  // Worn square base with its lower edge resting on the same ground.
  const base=mesh(G(new THREE.BoxGeometry(0.8,2.8,2.8)),stone,-0.34,1.4,0);
  base.rotation.y=-0.035;
  // Irregular rubble with bottom vertices at y=0: never float above the ground.
  const rubbleGeo=G(new THREE.IcosahedronGeometry(1,1));
  const rock=(x,z,sx,sy,sz)=>{
    const m=mesh(rubbleGeo,rand()>0.7?shadow:stone,x,sy,z);
    m.scale.set(sx,sy,sz);m.rotation.y=rand()*Math.PI*2;return m;
  };
  // Rocks support the shaft visually, concentrating under the broken tip and sides.
  for(let i=0;i<23;i++){
    const nearEnd=i<13;
    const x=nearEnd?5.3+rand()*3.0:0.5+rand()*6.4;
    const z=(rand()-0.5)*(nearEnd?3.9:3.0);
    const sx=0.23+rand()*(nearEnd?0.75:0.46);
    const sy=0.12+rand()*(nearEnd?0.46:0.26);
    const sz=0.23+rand()*(nearEnd?0.70:0.44);
    rock(x,z,sx,sy,sz);
  }
  // Detached large fragments are clustered at the actual break, not suspended.
  for(let i=0;i<5;i++){
    const x=7.1+rand()*1.25,z=(rand()-0.5)*2.3;
    rock(x,z,0.35+rand()*0.45,0.24+rand()*0.32,0.3+rand()*0.5);
  }
  const scale=Number.isFinite(options.scale)?Math.max(0.1,Math.min(4,options.scale)):1;
  group.scale.setScalar(scale);
  let disposed=false;
  return {group,dispose(){if(disposed)return;disposed=true;
    if(group.parent)group.parent.remove(group);group.clear();
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }};
}
