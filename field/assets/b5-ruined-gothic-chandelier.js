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

 // Six-fold rotational construction: one clean 60-degree forged-iron panel
 // copied around the vertical axis. Pinterest reference candidate:
 // https://www.pinterest.com/pin/499829258661066635/
 // Image pixels were NOT accessible in this environment, so this is a
 // hand-authored vector silhouette, NOT a traced image contour.
 const vineMetal=new T.MeshStandardMaterial({color:0x494b4b,metalness:.62,roughness:.44,side:T.DoubleSide});
 root.userData.vineSilhouettePass='sixfold-geometric-panel-v5';
 root.userData.symmetrySegments=6;
 root.userData.referenceOutlineStatus='manual-vector-proxy-not-image-traced';
 // A profile is defined in the radial / vertical plane: [radius, height].
 // Symmetric arch shoulders, a broad horizontal candle arm, and two
 // descending scrolls form a crisp, readable 1/6 module.
 const profilePaths=[
   {name:'main-shoulder',width:.105,pts:[[.24,5.10],[.52,5.03],[.88,4.91],[1.25,4.71],[1.63,4.47],[1.97,4.18],[2.34,3.93],[2.78,3.75],[3.23,3.66],[3.68,3.66],[4.12,3.70]]},
   {name:'outer-hook',width:.078,pts:[[4.12,3.70],[4.32,3.81],[4.38,4.03],[4.26,4.17],[4.08,4.14],[4.03,3.99]]},
   {name:'lower-sweep',width:.084,pts:[[2.34,3.93],[2.60,3.57],[2.91,3.23],[3.18,2.91],[3.37,2.57],[3.43,2.25],[3.31,2.03],[3.09,2.03],[3.01,2.21]]},
   {name:'inner-scroll',width:.061,pts:[[1.63,4.47],[1.71,4.14],[1.85,3.84],[2.02,3.62],[2.23,3.51],[2.40,3.58],[2.43,3.74],[2.31,3.84]]},
   {name:'lower-lobe',width:.076,pts:[[3.43,2.25],[3.57,1.99],[3.63,1.74],[3.53,1.55],[3.33,1.53],[3.20,1.70]]},
   {name:'crown-scroll',width:.064,pts:[[.35,5.14],[.64,5.34],[.98,5.44],[1.28,5.41],[1.46,5.28],[1.43,5.11],[1.29,5.07]]}
 ];
 // Catmull-Rom interpolates the exact same profile for each sector.
 // Tiny fixed tangential offsets separate silhouettes in oblique views,
 // but no random wobble, sinusoidal noise or irregular dents are used.
 for(let sector=0;sector<6;sector++){
   const theta=sector*Math.PI/3;
   const panel=new T.Group();panel.name='geometric-sector-'+sector;
   panel.rotation.y=theta;root.add(panel);
   for(let k=0;k<profilePaths.length;k++){
     const def=profilePaths[k];
     const tangential=[0,.12,-.10,.08,-.08,.05][k];
     const points=def.pts.map(([r,y])=>new T.Vector3(r,y,tangential));
     const geometry=new T.TubeGeometry(new T.CatmullRomCurve3(points,false,'centripetal',.3),Math.max(96,points.length*14),def.width,8,false);
     const obj=new T.Mesh(geometry,vineMetal);obj.name=def.name;panel.add(obj);meshes.push(obj);
   }
   // Two clean straight connectors establish a repeatable Gothic truss.
   for(const [a,b] of [
     [[1.25,4.71,0],[1.25,3.72,0]],
     [[2.78,3.75,0],[2.78,3.18,0]]
   ]){
     const A=new T.Vector3(...a),B=new T.Vector3(...b),d=B.clone().sub(A);
     const o=new T.Mesh(new T.CylinderGeometry(.046,.046,d.length(),8),vineMetal);
     o.position.copy(A).add(B).multiplyScalar(.5);
     o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());
     o.name='panel-truss';panel.add(o);meshes.push(o);
   }
 }
 // A clean, slender top stem preserves the tall vertical silhouette.
 const stem=mesh(new T.CylinderGeometry(.12,.16,.94,10),vineMetal);
 stem.position.set(0,5.73,0);stem.name='upper-silhouette-stem';
 // Fallen detached ring fragments and chipped stone pieces rest on y=0.
 for(let i=0;i<9;i++){const a=i*2.399,r=.75+(i%4)*.46;chip(Math.cos(a)*r,0,Math.sin(a)*r,.25+(i%3)*.11,.15+(i%4)*.07,.27+(i%2)*.13,i+4)}
 // Bent broken arc rests on floor, not suspended.
 for(let i=0;i<6;i++){const a=.3+i*.12,b=a+.12;beam([1.2*Math.cos(a),.12,1.2*Math.sin(a)],[1.2*Math.cos(b),.12,1.2*Math.sin(b)],.105,.10,dark)}
 return {group:root,dispose(){for(const o of meshes)o.geometry.dispose();stone.dispose();dark.dispose();vineMetal.dispose()}};
}
