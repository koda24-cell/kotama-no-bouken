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
 const steps=7,run=1.65,rise=0.16,width=17.5;
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
 // ONE continuous broken seam, slightly off-centre. Clearly visible on the
 // horizontal treads AND the vertical risers. No additional cracks.
 const fracture=M(new THREE.MeshStandardMaterial({color:0x110d14,roughness:1,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
 const chipped=M(new THREE.MeshStandardMaterial({color:0xb2aab3,roughness:1,side:THREE.DoubleSide}));
 const crackZ=[3.20,3.35,3.10,3.57,3.25,3.68,3.46,3.70];
 const surface=(pts,mat)=>{
   const g=G(new THREE.BufferGeometry());
   g.setAttribute('position',new THREE.Float32BufferAttribute(pts.flat(),3));
   g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();
   add(g,mat,0,0,0);
 };
 const crackStrip=(a,b,w)=>{
   const dx=b[0]-a[0],dz=b[2]-a[2],d=Math.hypot(dx,dz)||1;
   const ox=-dz*w/(2*d),oz=dx*w/(2*d);
   surface([[a[0]+ox,a[1],a[2]+oz],[a[0]-ox,a[1],a[2]-oz],
     [b[0]-ox,b[1],b[2]-oz],[b[0]+ox,b[1],b[2]+oz]],fracture);
 };
 for(let i=1;i<=5;i++){
   const h=(i+1)*rise,front=i*run-steps*run/2,back=(i+1)*run-steps*run/2;
   const z0=crackZ[i],z1=crackZ[i+1],mid=(front+back)/2;
   const zmid=(z0+z1)/2+0.15;
   // The tread cap is 0.14 thick: its actual upper surface is h+0.14.
   const y=h+0.143;
   crackStrip([front+0.018,y,z0],[mid,y,zmid],0.30);
   crackStrip([mid,y,zmid],[back-0.018,y,z1],0.24);
   // Light broken-stone shoulders reinforce the depth cue without adding lines.
   for(const side of [-1,1]){
     surface([[mid-0.26,y+0.003,zmid+side*0.19],
       [mid+0.08,y+0.003,zmid+side*0.16],
       [mid+0.20,y+0.003,zmid+side*0.28],
       [mid-0.12,y+0.003,zmid+side*0.30]],chipped);
   }
   if(i<5){
     const nh=(i+2)*rise;
     // Riser at x=back is vertical, visible from the ascending approach.
     surface([[back+0.012,h+0.135,z1-0.14],
       [back+0.012,h+0.135,z1+0.14],
       [back+0.012,nh+0.135,z1+0.14],
       [back+0.012,nh+0.135,z1-0.14]],fracture);
   }
 }
 // Missing tile faces: dark recessed patches with irregular outlines.
 // Confined to exposed stone, leaving the red carpet untouched.
 const recess=M(new THREE.MeshStandardMaterial({color:0x36313b,roughness:0.98,side:THREE.DoubleSide}));
 const tileScars=[
   [0,-5.75,0.75,0.70],[1,-6.7,0.95,0.62],
   [2,7.05,0.84,0.78],[3,-5.9,1.06,0.85],
   [4,6.9,0.90,0.68],[5,-7.0,0.88,0.90],[6,7.0,0.92,0.65]
 ];
 for(const [i,z,sx,sz] of tileScars){
   const h=(i+1)*rise,x=(i+0.5)*run-steps*run/2;
   const y=h+0.179;
   surface([[x-sx*0.48,y,z-sz*0.46],[x+sx*0.43,y,z-sz*0.36],
     [x+sx*0.50,y,z+sz*0.42],[x-sx*0.32,y,z+sz*0.50]],recess);
   // Loose triangular shard, resting on its own tread.
   const g=G(new THREE.BufferGeometry());
   g.setAttribute('position',new THREE.Float32BufferAttribute([
     x-sx*0.3,y+0.015,z+sz*0.05,
     x+sx*0.05,y+0.015,z+sz*0.06,
     x-sx*0.09,y+0.095,z+sz*0.31
   ],3));g.setIndex([0,1,2]);g.computeVertexNormals();
   add(g,chipped,0,0,0);
 }
 // Grounded sidewall buttresses: heavy masses follow the staircase's rise.
 for(const side of [-1,1]){
   for(let i=0;i<3;i++){
     const h=(i*2+2)*rise,x=(i*2+1)*run-steps*run/2;
     add(G(new THREE.BoxGeometry(2*run,h+0.2,0.55)),shade,x,(h+0.2)/2,side*(width/2+0.25));
   }
 }
 // Irregular angular rubble with a footprint exactly on the floor.
 const rock=(x,z,sx,h,sz)=>{
   const n=8,p=[],idx=[],phase=rand()*Math.PI*2,rad=Array.from({length:n},()=>0.52+rand()*0.48);
   for(let j=0;j<n;j++){const a=phase+j*Math.PI*2/n;p.push(sx*Math.cos(a)*rad[j],0,sz*Math.sin(a)*rad[j]);}
   for(let j=0;j<n;j++){const a=phase+j*Math.PI*2/n;p.push(sx*(0.18+rand()*0.30)*Math.cos(a),h*(0.48+rand()*0.52),sz*(0.18+rand()*0.30)*Math.sin(a));}
   p.push((rand()-0.5)*sx*0.38,h,(rand()-0.5)*sz*0.38);
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
 // Carpet intentionally removed by art direction; leave all treads exposed.
 const moss=M(new THREE.MeshStandardMaterial({color:0x344b3e,roughness:0.98,flatShading:true}));
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
