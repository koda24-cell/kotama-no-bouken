/* B5 throne-room ruined ceremonial stairs, visual only.
 * X is the ascending axis; Y is up; Z is the width. Floor Y=0.
 * This is NOT traversable terrain or a floor transition.
 */
export function createB5BrokenStair(THREE,options={}){
 const group=new THREE.Group();group.name='b5:throne:brokenStair';group.userData.visualOnly=true;
 const geos=[],mats=[];const G=g=>(geos.push(g),g),M=m=>(mats.push(m),m);
 const stone=M(new THREE.MeshStandardMaterial({color:0x5b5761,roughness:0.94,flatShading:true}));
 const shade=M(new THREE.MeshStandardMaterial({color:0x3e3a44,roughness:0.97,flatShading:true}));
 const add=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);group.add(o);return o;};
 let seed=(options.seed??1187)>>>0;
 const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const steps=7,run=1.65,rise=0.22,width=17.5;
 // Each successive step has its own SOLID backing down to the floor.
 // No floating treads: every step is supported by continuous masonry.
 for(let i=0;i<steps;i++){
   const h=(i+1)*rise,x=(i+0.5)*run-steps*run/2;
   const g=G(new THREE.BoxGeometry(run+0.015,h,width));
   add(g,stone,x,h/2,0);
   // Thin surface slab with a visible chipped outer corner on selected steps.
   const chip=(i===2||i===5||i===6);
   const profile=chip?[
      [-run/2,0,-width/2],[run/2,0,-width/2],
      [run/2,0,width/2-1.15],[run/2-0.65,0,width/2],
      [-run/2,0,width/2]
   ]:[[-run/2,0,-width/2],[run/2,0,-width/2],[run/2,0,width/2],[-run/2,0,width/2]];
   const verts=[],indices=[];
   for(const y of [0,0.14])for(const [px,pz] of profile)verts.push(px,y,pz);
   const n=profile.length;
   for(let j=1;j<n-1;j++){indices.push(0,j,j+1,n,n+j+1,n+j);}
   for(let j=0;j<n;j++){const k=(j+1)%n;indices.push(j,k,n+k,j,n+k,n+j);}
   const geo=G(new THREE.BufferGeometry());
   geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();
   add(geo,stone,x,h,0);
   // Shallow stone courses on exposed risers, not bars sticking out.
   if(i%2===0){add(G(new THREE.BoxGeometry(0.055,0.055,width-0.45)),shade,x-run/2-0.005,h-0.15,0);}
 }
 // One long, narrow fracture on the exposed stone (right of the carpet).
 // The line follows the step surfaces and their risers, not a floating overlay.
 const fracture=M(new THREE.MeshStandardMaterial({color:0x17131b,roughness:1,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));
 const crackZ=[5.35,5.58,5.34,5.75,5.44,5.87,5.63,5.92];
 const crackWidth=0.19;
 const strip=(a,b)=>{
   const dx=b[0]-a[0],dz=b[2]-a[2],d=Math.hypot(dx,dz)||1;
   const ox=-dz/d*crackWidth/2,oz=dx/d*crackWidth/2;
   const p=[a[0]+ox,a[1],a[2]+oz,a[0]-ox,a[1],a[2]-oz,
            b[0]+ox,b[1],b[2]+oz,b[0]-ox,b[1],b[2]-oz];
   const g=G(new THREE.BufferGeometry());
   g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
   g.setIndex([0,1,2,1,3,2]);g.computeVertexNormals();
   add(g,fracture,0,0,0);
 };
 for(let i=1;i<=5;i++){
   const h=(i+1)*rise,front=i*run-steps*run/2,back=(i+1)*run-steps*run/2;
   const z0=crackZ[i],z1=crackZ[i+1];
   strip([front+0.012,h+0.171,z0],[back-0.012,h+0.143,z1]);
   if(i<5){
     const nextH=(i+2)*rise;
     strip([back-0.007,h+0.143,z1],[back-0.007,nextH+0.171,z1]);
   }
 }
 // Pale chipped lips beside the same single crack, not additional cracks.
 const chipped=M(new THREE.MeshStandardMaterial({color:0x99929b,roughness:0.99,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));
 for(let i=1;i<=5;i++){
   const h=(i+1)*rise,front=i*run-steps*run/2,back=(i+1)*run-steps*run/2;
   const x=(front+back)/2;
   for(const side of [-1,1]){
     const z=(crackZ[i]+crackZ[i+1])/2+side*0.17;
     const g=G(new THREE.BoxGeometry(run*0.24,0.025,0.07));
     add(g,chipped,x,h+0.183,z);
   }
 }
 // Grounded sidewall buttresses: heavy masses follow the staircase's rise.
 for(const side of [-1,1]){
   for(let i=0;i<4;i++){
     const h=(i*2+2)*rise,x=(i*2+1)*run-steps*run/2;
     add(G(new THREE.BoxGeometry(2*run,h+0.2,0.55)),shade,x,(h+0.2)/2,side*(width/2+0.25));
   }
 }
 // Irregular angular rubble with a footprint exactly on the floor.
 const rock=(x,z,sx,h,sz)=>{
   const n=7,p=[],idx=[],phase=rand()*Math.PI*2;
   for(let j=0;j<n;j++){const a=phase+j*Math.PI*2/n;p.push(sx*Math.cos(a)*(0.8+rand()*0.2),0,sz*Math.sin(a)*(0.8+rand()*0.2));}
   for(let j=0;j<n;j++){const a=phase+j*Math.PI*2/n;p.push(sx*0.35*Math.cos(a),h*(0.72+rand()*0.28),sz*0.35*Math.sin(a));}
   p.push(0,h,0);
   for(let j=0;j<n;j++){const k=(j+1)%n;idx.push(j,k,n+j,k,n+k,n+j,n+j,n+k,2*n);}
   const g=G(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();
   add(g,rand()>0.6?shade:stone,x,0,z);
 };
 // Keep debris OUTSIDE the actual stairway, concentrated beside damaged sides.
 for(let i=0;i<27;i++){
   const x=(rand()-0.5)*steps*run*1.45;
   const side=i%2?-1:1;
   const z=side*(width/2+0.7+rand()*1.5);
   rock(x,z,0.18+rand()*0.45,0.12+rand()*0.35,0.19+rand()*0.46);
 }
 // Carpet lies on the broad central axis, with a short runner on each step.
 const carpet=M(new THREE.MeshStandardMaterial({color:0x792b43,roughness:0.98,side:THREE.DoubleSide}));
 const moss=M(new THREE.MeshStandardMaterial({color:0x344b3e,roughness:0.98,flatShading:true}));
 const carpetWidth=5.6;
 for(let i=0;i<steps;i++){
   const h=(i+1)*rise,x=(i+0.5)*run-steps*run/2;
   add(G(new THREE.BoxGeometry(run+0.025,0.026,carpetWidth)),carpet,x,h+0.155,0);
 }
 // Broken flagstones and sparse ground-hugging growth at the stair edges.
 for(let i=0;i<32;i++){
   const x=(rand()-0.5)*steps*run*1.35;
   const side=i%2?-1:1;
   const z=side*(width/2+0.35+rand()*2.1);
   const h=0.09+rand()*0.19;
   const clump=add(G(new THREE.ConeGeometry(0.12+rand()*0.2,h,5)),moss,x,h/2,z);
   clump.rotation.y=rand()*Math.PI*2;
 }
 const scale=Number.isFinite(options.scale)?Math.max(0.1,Math.min(4,options.scale)):1;
 group.scale.setScalar(scale);
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;if(group.parent)group.parent.remove(group);group.clear();geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}};
}
