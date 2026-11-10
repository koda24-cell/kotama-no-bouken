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
  // A gently sloping, weathered break: coherent shear plane rather than random spikes.
  // The lower lip is shorter, as if the upper mass slid away during collapse.
  const segments=32, rings=12, length=6.5, positions=[],indices=[];
  for(let j=0;j<=rings;j++){
    const t=j/rings;
    for(let k=0;k<segments;k++){
      const a=k*Math.PI*2/segments;
      const flute=0.075*Math.cos(a*12);
      const wear=(rand()-0.5)*0.027;
      const r=1.07-0.12*t+flute+wear;
      const shear=0.40*Math.cos(a)+0.12*Math.sin(a);
      const worn=0.055*Math.sin(a*3+0.4)+0.025*Math.cos(a*7);
      const endX=0.95+length*t+(j===rings?shear+worn:j===rings-1?0.10*(shear+worn):0);
      positions.push(endX,centerY+Math.cos(a)*r,Math.sin(a)*r);
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
    const shear=0.40*Math.cos(a)+0.12*Math.sin(a);
    positions.push(0.95+length-0.13+shear*0.52+0.025*Math.sin(a*3),centerY+Math.cos(a)*0.45,Math.sin(a)*0.45);
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
  // Grounded rock geometry: every rock has a flat irregular footprint at y=0.
  // No spheres or tilted polyhedra with invisible floating bottoms.
  const rock=(x,z,sx,height,sz)=>{
    const sides=7,verts=[],triangles=[];
    const phase=rand()*Math.PI*2;
    const radii=Array.from({length:sides},()=>0.78+rand()*0.22);
    for(let i=0;i<sides;i++){
      const a=phase+i*Math.PI*2/sides;
      verts.push(Math.cos(a)*sx*radii[i],0,Math.sin(a)*sz*radii[i]);
    }
    // Broad fractured crown; all vertices above a continuous grounded perimeter.
    const crown=verts.length/3;
    for(let i=0;i<sides;i++){
      const a=phase+i*Math.PI*2/sides;
      verts.push(Math.cos(a)*sx*0.32,height*(0.75+rand()*0.25),Math.sin(a)*sz*0.32);
    }
    const top=verts.length/3;
    verts.push((rand()-0.5)*sx*0.2,height,(rand()-0.5)*sz*0.2);
    for(let i=0;i<sides;i++){
      const n=(i+1)%sides;
      triangles.push(i,n,crown+i,n,crown+n,crown+i,crown+i,crown+n,top);
    }
    const geo=G(new THREE.BufferGeometry());
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    geo.setIndex(triangles);geo.computeVertexNormals();
    return mesh(geo,rand()>0.72?shadow:stone,x,0,z);
  };
  // First layer: large foundation stones, all planted on the floor.
  const foundations=[
    [6.6,-1.28,0.88,0.70,0.78],[7.25,1.1,0.82,0.65,0.73],
    [7.85,-0.18,0.90,0.75,0.85],[5.4,1.1,0.75,0.48,0.65],
    [3.4,-1.0,0.62,0.42,0.56],[1.1,1.55,0.55,0.40,0.55]
  ];
  foundations.forEach(args=>rock(...args));
  // Smaller chips spread outward from the impact, still anchored at y=0.
  for(let i=0;i<25;i++){
    const nearBreak=i<18;
    const x=nearBreak?5.3+rand()*3.6:0.4+rand()*6.2;
    const z=(rand()-0.5)*(nearBreak?4.4:3.8);
    const sx=0.18+rand()*(nearBreak?0.40:0.25);
    const sz=0.17+rand()*(nearBreak?0.37:0.25);
    const h=0.12+rand()*(nearBreak?0.31:0.20);
    rock(x,z,sx,h,sz);
  }
  const scale=Number.isFinite(options.scale)?Math.max(0.1,Math.min(4,options.scale)):1;
  group.scale.setScalar(scale);
  let disposed=false;
  return {group,dispose(){if(disposed)return;disposed=true;
    if(group.parent)group.parent.remove(group);group.clear();
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }};
}
