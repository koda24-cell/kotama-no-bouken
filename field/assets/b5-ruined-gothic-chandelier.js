/** Standalone visual-only ruined Gothic chandelier. Y-up; no game logic changes. */
export function createRuinedChandelier(T){
 const root=new T.Group();root.name='b5:ruined-gothic-chandelier';root.userData.visualOnly=true;
 const stone=new T.MeshStandardMaterial({color:0x888888,roughness:1,flatShading:true,side:T.DoubleSide});
 const dark=new T.MeshStandardMaterial({color:0x666666,roughness:1,flatShading:true,side:T.DoubleSide});
 const meshes=[];
 function mesh(g,m=stone){const o=new T.Mesh(g,m);root.add(o);meshes.push(o);return o}
 function beam(a,b,r1,r2=r1,m=stone,n=8){const A=new T.Vector3(...a),B=new T.Vector3(...b),d=B.clone().sub(A);const o=mesh(new T.CylinderGeometry(r2,r1,d.length(),n),m);o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o}
 function ring(radius,y,thick=.12,start=0,end=Math.PI*2){const points=[];const n=Math.ceil((end-start)/.11);for(let i=0;i<=n;i++){const a=start+(end-start)*i/n;points.push(new T.Vector3(Math.cos(a)*radius,y,Math.sin(a)*radius))}return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),n*2,thick,7,false))}
 function prism(x,y,z,r,h,vertices=8){const o=mesh(new T.CylinderGeometry(r*.76,r,h,vertices));o.position.set(x,y,z);return o}
 function chip(x,y,z,sx,sy,sz,seed){const v=[],idx=[],n=7;for(let level=0;level<3;level++){for(let i=0;i<n;i++){const a=2*Math.PI*i/n;const jitter=1+.2*Math.sin(seed*3+i*5);const scale=[.78,1,.55][level];v.push(Math.cos(a)*sx*scale*jitter,level===0?0:level===1?sy*.52:sy*(.8+.13*Math.sin(i+seed)),Math.sin(a)*sz*scale*jitter)}}for(let k=0;k<2;k++)for(let i=0;i<n;i++){const a=k*n+i,b=k*n+(i+1)%n,c=(k+1)*n+i,d=(k+1)*n+(i+1)%n;idx.push(a,c,b,b,c,d)}for(let i=1;i<n-1;i++)idx.push(0,i+1,i);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();const o=mesh(g);o.position.set(x,y,z);o.rotation.y=seed*.43;return o}
 // Ceiling attachment and segmented suspension chains, one broken link at the left.
 prism(0,7.7,0,.34,.38,10);
 for(let i=0;i<7;i++)beam([0,7.4-i*.32,0],[0,7.12-i*.32,0],.105,.092,dark,6);
 // Gothic tapered finial and central boss.
 prism(0,5.05,0,.32,.78,10);prism(0,4.57,0,.52,.28,12);
 for(let j=0;j<3;j++)ring([2.25,1.74,1.12][j],[3.05,3.54,4.05][j],[.13,.105,.09][j]);
 // Twelve radiating structural arms; 2 deliberately broken and partially collapsed.
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,c=Math.cos(a),s=Math.sin(a),end=i===3?.64:i===8?.78:1;
  const r=2.25*end;
  beam([.30*c,4.68,.30*s],[1.22*c,3.73,1.22*s],.17,.12);
  beam([1.22*c,3.73,1.22*s],[r*c,3.05+(1-end)*.22,r*s],.14,.095);
  if(i!==3&&i!==8){
   // Raised pointed Gothic canopy above each candle plate.
   beam([1.7*c,3.34,1.7*s],[2.23*c,3.76,2.23*s],.075,.045);
   beam([2.23*c,3.76,2.23*s],[1.83*c,4.10,1.83*s],.068,.035);
   prism(2.25*c,3.10,2.25*s,.22,.17,9);
   prism(2.25*c,3.27,2.25*s,.105,.25,7);
  }else{
   // Broken arm ends are irregular fracture faces, not clean round caps.
   chip(r*c,3.05,r*s,.28,.23,.26,i);
  }
  // Interior tracery spandrels connect arm pairs.
  if(i%2===0){const b=a+Math.PI/6;beam([1.23*c,3.74,1.23*s],[1.23*Math.cos(b),3.74,1.23*Math.sin(b)],.062,.062,dark)}
 }
 // Gothic drop finials on the ring and a central pointed pendentive.
 for(let i=0;i<12;i++){const a=i*Math.PI/6;beam([2.25*Math.cos(a),2.98,2.25*Math.sin(a)],[2.25*Math.cos(a),2.63-(i%3)*.12,2.25*Math.sin(a)],.085,.008)}
 beam([0,4.5,0],[0,3.08,0],.20,.13);prism(0,2.89,0,.24,.35,9);beam([0,2.72,0],[0,2.28,0],.13,.015);

 // Vine-inspired wrought-iron tracery: 50 distinct sculpted strands x 100
 // sampled spatial coordinates = exactly 5,000 ADDITIONAL control points.
 // Original radial frame and damaged geometry remain unchanged.
 const vineMetal=new T.MeshStandardMaterial({color:0x494b4b,metalness:.62,roughness:.44,side:T.DoubleSide});
 const vinePointCount=100,vineStrandCount=50;
 root.userData.addedVineCoordinates=vinePointCount*vineStrandCount;
 for(let strand=0;strand<vineStrandCount;strand++){
   const sector=strand%12,layer=Math.floor(strand/12);
   const theta=(sector+.5)*Math.PI/6;
   const direction=layer%2===0?1:-1;
   const anchorRadius=[1.40,1.73,1.97,1.53,2.09][layer];
   const anchorHeight=[3.58,3.76,3.36,3.95,3.17][layer];
   const spread=[.23,.30,.19,.34,.25][layer];
   const samples=[];
   for(let k=0;k<vinePointCount;k++){
     const t=k/(vinePointCount-1);
     // Curled vine tendril with an elongated S-bend, tapering into a tight spiral.
     const bend=Math.sin(t*Math.PI*1.8+layer*.43)*spread*(.45+.55*t);
     const spiralT=Math.max(0,(t-.60)/.40);
     const spiral=spiralT*spiralT;
     const angle=theta+direction*(bend+spiral*2.25);
     const radius=anchorRadius+(.27*Math.sin(t*Math.PI))-.28*spiral;
     const y=anchorHeight+.31*Math.sin(t*Math.PI*1.45+layer*.34)
       +direction*.10*Math.sin(t*Math.PI*3)+.17*spiral;
     samples.push(new T.Vector3(radius*Math.cos(angle),y,radius*Math.sin(angle)));
   }
   // The 100 spatial samples are the actual path vertices driving the curve.
   const curve=new T.CatmullRomCurve3(samples,false,'centripetal',.45);
   const tube=mesh(new T.TubeGeometry(curve,120,layer===4?.021:.030,5,false),vineMetal);
   tube.name='vine-tracery-'+String(strand).padStart(2,'0');
 }
 // Fallen detached ring fragments and chipped stone pieces rest on y=0.
 for(let i=0;i<9;i++){const a=i*2.399,r=.75+(i%4)*.46;chip(Math.cos(a)*r,0,Math.sin(a)*r,.25+(i%3)*.11,.15+(i%4)*.07,.27+(i%2)*.13,i+4)}
 // Bent broken arc rests on floor, not suspended.
 for(let i=0;i<6;i++){const a=.3+i*.12,b=a+.12;beam([1.2*Math.cos(a),.12,1.2*Math.sin(a)],[1.2*Math.cos(b),.12,1.2*Math.sin(b)],.105,.10,dark)}
 return {group:root,dispose(){for(const o of meshes)o.geometry.dispose();stone.dispose();dark.dispose()}};
}
