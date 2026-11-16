/** V3: larger silhouette, chipped masonry joints, carved profiles.
 * Additive geometry; original V1 and V2 meshes are preserved.
 * Entirely original procedural meshes, no downloaded game or third-party assets.
 */
export function addB5VaultScatterDetailsV3(T,group,kind,seed=41){
 let state=seed>>>0;const rnd=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const stone=new T.MeshStandardMaterial({color:0x87817c,roughness:.98,flatShading:true});
 const rim=new T.MeshStandardMaterial({color:0xaaa39a,roughness:.96,flatShading:true});
 const dark=new T.MeshStandardMaterial({color:0x575257,roughness:1,flatShading:true});
 const iron=new T.MeshStandardMaterial({color:0x36363a,metalness:.67,roughness:.58});
 const mats=[stone,rim,dark,iron],geos=[];
 const mesh=(g,m=stone)=>{geos.push(g);const o=new T.Mesh(g,m);group.add(o);return o};
 function chipped(x,y,z,w,h,d,rot=0,m=stone){
  const verts=[],idx=[],N=8;
  // Three rings yield broad planar chipped shoulders rather than smooth pebble facets.
  for(let ring=0;ring<3;ring++)for(let j=0;j<N;j++){
   const a=(j+.10*(rnd()-.5))*Math.PI*2/N;
   const r=(ring===1?1:.78)*(.90+.17*rnd());
   verts.push(Math.cos(a)*w*.5*r,ring===0?-.43*h:ring===1?-.08*h:.50*h,
              Math.sin(a)*d*.5*r);
  }
  for(let ring=0;ring<2;ring++)for(let j=0;j<N;j++){
   const a=ring*N+j,b=ring*N+(j+1)%N,c=(ring+1)*N+j,e=(ring+1)*N+(j+1)%N;
   idx.push(a,b,c,b,e,c);
  }
  for(let j=1;j<N-1;j++)idx.push(0,j+1,j,2*N,2*N+j,2*N+j+1);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();
  const o=mesh(g,m);o.position.set(x,y,z);o.rotation.y=rot;return o;
 }
 function bar(a,b,w,d,m=stone){
  const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p);
  const o=mesh(new T.BoxGeometry(w,v.length(),d),m);
  o.position.copy(p).add(q).multiplyScalar(.5);
  o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;
 }
 function rubble(n,extent=1.55){
  for(let i=0;i<n;i++){const x=(rnd()-.5)*extent,z=(rnd()-.5)*extent;
   chipped(x,.07+.07*rnd(),z,.13+.19*rnd(),.12+.13*rnd(),.15+.19*rnd(),rnd()*6.28,i%5===0?rim:stone)}
 }
 if(kind==='fallen-rib'){
  // Rib keystones at varied angles, broken termination and dark mortar joints.
  for(let i=0;i<7;i++){
   const t=i/6,x=-.87+1.63*t,z=-.31+.56*t,y=.21+.30*Math.sin(t*Math.PI);
   const o=chipped(x,y,z,.34,.29,.43,.22+t*.25,i===3?rim:stone);
   o.rotation.z=(t-.5)*.20;
   if(i<6)bar([x+.11,y-.08,z],[x+.14,y-.08,z+.19],.025,.025,dark);
  }
  chipped(-.98,.15,.40,.56,.28,.47,.4);rubble(7);
 }else if(kind==='pointed-arch-fragment'){
  // One broken side of a pointed arch, with clear springer and voussoir seams.
  for(let i=0;i<7;i++){
   const t=i/6,x=-.84+.80*t,y=.20+.66*Math.pow(t,1.35);
   const o=chipped(x,y,-.10,.32,.31,.48,.12,i%3===0?rim:stone);
   o.rotation.z=-.15+.32*t;
   bar([x-.09,y-.11,-.35],[x+.07,y-.11,-.35],.025,.03,dark);
  }
  chipped(.39,.14,.20,.55,.26,.44,.30);rubble(5);
 }else if(kind==='carved-block'){
  // Lintel lip and carved incised Gothic diamond over the old block.
  bar([-.52,.62,-.39],[.52,.62,-.39],.13,.15,rim);
  for(let i=0;i<4;i++){
   const a=i*Math.PI/2,b=(i+1)*Math.PI/2;
   bar([.23*Math.cos(a),.33+.20*Math.sin(a),-.45],
       [.23*Math.cos(b),.33+.20*Math.sin(b),-.45],.052,.060,rim);
  }
  for(const x of [-.38,.38])bar([x,.15,-.45],[x,.50,-.45],.045,.05,dark);
  chipped(.57,.10,.36,.44,.19,.37,.5);rubble(5);
 }else if(kind==='broken-vault-panel'){
  // Broad plates with broken edges; a heavy detached slab forms the silhouette.
  const o=chipped(-.24,.22,-.28,1.04,.26,.68,.20);o.rotation.z=-.13;
  chipped(.49,.16,.26,.76,.23,.68,-.22,rim);
  chipped(-.61,.13,.43,.55,.22,.48,.45);
  for(let i=0;i<5;i++){
   const x=-.6+i*.28;bar([x,.25,-.51],[x+.12,.25,-.31],.035,.055,dark);
  }
  rubble(8,1.75);
 }else if(kind==='hanging-iron'){
  // Rusted metal anchors and bent struts, not smooth decorative chain only.
  for(let i=0;i<5;i++){
   const x=-.56+i*.26;bar([x,.11,.17],[x+.13,.27,.15],.055,.064,iron);
  }
  for(const x of [-.62,.57]){chipped(x,.09,.05,.28,.17,.29,0,dark);bar([x,.17,-.04],[x,.35,-.04],.075,.09,iron)}
  rubble(3);
 }else if(kind==='small-rubble'){
  // Four main readable blocks, surrounded by fine breakup.
  for(let i=0;i<4;i++){
   const x=[-.47,.37,-.12,.53][i],z=[-.29,-.20,.39,.37][i];
   const o=chipped(x,.23,z,.55+.13*rnd(),.39+.12*rnd(),.48+.15*rnd(),rnd()*1.8,i===1?rim:stone);
   o.rotation.z=(rnd()-.5)*.34;
  }
  rubble(14,1.8);
 }
 group.userData.detailPass='stylized-stone-v3';
 return {disposeDetails(){geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose())}};
}
