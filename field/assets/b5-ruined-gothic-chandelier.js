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

 // Pinterest reference study (pin IDs 504614333272681285,
 // 755127062554384715, 1017813584553469412): emphasize forged-vine
 // silhouettes, open negative spaces, and upward branching candle arms.
 // Exactly 50 vines x 100 sampled control coordinates = 5,000 points.
 const vineMetal=new T.MeshStandardMaterial({color:0x494b4b,metalness:.62,roughness:.44,side:T.DoubleSide});
 const vinePointCount=100,vineStrandCount=50;
 root.userData.addedVineCoordinates=vinePointCount*vineStrandCount;
 root.userData.vineSilhouettePass='pinterest-outer-leaf-scroll-v3';
 for(let strand=0;strand<vineStrandCount;strand++){
   const bay=strand%10,layer=Math.floor(strand/10);
   const theta=(bay+.5)*Math.PI/5;
   const handed=bay%2===0?1:-1;
   const samples=[];
   for(let k=0;k<vinePointCount;k++){
     const t=k/(vinePointCount-1);
     // Broad open S-stem (first 68%), then a small terminal curl.
     // Separate height bands avoid the previous tangled horizontal nest.
     const curl=Math.max(0,(t-.68)/.32);
     const thetaOffset=handed*(.045*Math.sin(t*Math.PI*1.4)+.19*Math.sin(t*Math.PI*.8)+curl*curl*1.85);
     const phi=theta+thetaOffset;
     const outward=[.39,.64,.48,.78,.55][layer];
     const radial=2.00+outward*Math.sin(t*Math.PI*.83)-.15*curl;
     const base=[3.02,3.30,3.57,3.86,4.12][layer];
     const lift=[.62,.76,.57,.83,.68][layer];
     const y=base+lift*Math.sin(t*Math.PI*.80)+.22*t-.10*curl;
     samples.push(new T.Vector3(radial*Math.cos(phi),y,radial*Math.sin(phi)));
   }
   const curve=new T.CatmullRomCurve3(samples,false,'centripetal',.45);
   const tube=mesh(new T.TubeGeometry(curve,135,layer===3?.039:.033,6,false),vineMetal);
   tube.name='pinterest-vine-'+String(strand).padStart(2,'0');
 }
 // Five large, widely spaced sweeping branches create the primary
 // silhouette at viewing distance. Their curled tips stay distinct.
 for(let i=0;i<5;i++){
   const a=(i+.25)*Math.PI*2/5,points=[];
   for(let j=0;j<=120;j++){
     const t=j/120,tip=Math.max(0,(t-.76)/.24);
     const radius=.82+1.65*Math.sin(t*Math.PI*.63)-.27*tip;
     const phi=a+.10*Math.sin(t*Math.PI)+tip*tip*.65;
     const y=4.35+1.55*Math.sin(t*Math.PI*.78)+.24*t;
     points.push(new T.Vector3(radius*Math.cos(phi),y,radius*Math.sin(phi)));
   }
   const o=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),140,.067,7,false),vineMetal);
   o.name='major-branch-'+i;
 }
 // Distinct forged leaves near the outer edge: flat tapered blade shapes
 // with a central ridge, not more circular rings.
 for(let i=0;i<20;i++){
   const a=(i+.35)*Math.PI/10;
   const r=2.42+(i%3)*.10,y=3.40+(i%5)*.26;
   const c=Math.cos(a),s=Math.sin(a),w=.105,h=.34;
   const verts=[r*c,y,r*s,(r+w)*c,y+h*.45,(r+w)*s,(r+.08)*c,y+h,(r+.08)*s,(r-w)*c,y+h*.45,(r-w)*s,
     (r+.04)*c,y+h*.45+.075,(r+.04)*s];
   const geo=new T.BufferGeometry();
   geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));
   geo.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]);
   geo.computeVertexNormals();
   const leaf=mesh(geo,vineMetal);leaf.name='forged-leaf-'+i;
 }
 // Fallen detached ring fragments and chipped stone pieces rest on y=0.
 for(let i=0;i<9;i++){const a=i*2.399,r=.75+(i%4)*.46;chip(Math.cos(a)*r,0,Math.sin(a)*r,.25+(i%3)*.11,.15+(i%4)*.07,.27+(i%2)*.13,i+4)}
 // Bent broken arc rests on floor, not suspended.
 for(let i=0;i<6;i++){const a=.3+i*.12,b=a+.12;beam([1.2*Math.cos(a),.12,1.2*Math.sin(a)],[1.2*Math.cos(b),.12,1.2*Math.sin(b)],.105,.10,dark)}
 return {group:root,dispose(){for(const o of meshes)o.geometry.dispose();stone.dispose();dark.dispose();vineMetal.dispose()}};
}
