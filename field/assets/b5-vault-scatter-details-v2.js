/** Additive stylized-ruin detailing, retaining every V1 mesh.
 * Visual target: readable hand-shaped stone silhouettes, inspired by broad
 * stylization principles, not extracted Nintendo geometry or textures.
 * No third-party asset files are included.
 */
export function addB5VaultScatterDetails(T,group,kind,seed=17){
 let s=(seed>>>0)||1;const rand=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
 const rock=new T.MeshStandardMaterial({color:0x817c78,roughness:1,flatShading:true,side:T.DoubleSide});
 const edge=new T.MeshStandardMaterial({color:0xa6a09a,roughness:1,flatShading:true,side:T.DoubleSide});
 const shade=new T.MeshStandardMaterial({color:0x555358,roughness:1,flatShading:true,side:T.DoubleSide});
 const materials=[rock,edge,shade],geometries=[];
 const add=(g,m=rock)=>{geometries.push(g);const o=new T.Mesh(g,m);group.add(o);return o};
 // Irregular angular cut stone with broad chipped planes and bevel-like shoulders.
 function stone(x,y,z,w,h,d,angle=0,m=rock){
   const sides=7,verts=[],faces=[];
   for(let layer=0;layer<3;layer++)for(let i=0;i<sides;i++){
     const a=2*Math.PI*i/sides,scale=layer===1?1:.79;
     const jitter=.87+.23*rand();
     verts.push(Math.cos(a)*w*.5*scale*jitter,(layer===0?-.5:layer===1?.17:.5)*h+(rand()-.5)*h*.12,Math.sin(a)*d*.5*scale*jitter);
   }
   for(let layer=0;layer<2;layer++)for(let i=0;i<sides;i++){
     const j=(i+1)%sides,A=layer*sides+i,B=layer*sides+j,C=(layer+1)*sides+i,D=(layer+1)*sides+j;
     faces.push(A,B,C,B,D,C);
   }
   for(let i=1;i<sides-1;i++){faces.push(0,i+1,i);faces.push(2*sides,2*sides+i,2*sides+i+1)}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(faces);g.computeVertexNormals();
   const o=add(g,m);o.position.set(x,y,z);o.rotation.y=angle;return o;
 }
 function beam(a,b,width,depth,mat=rock){
   const v=new T.Vector3(...a),u=new T.Vector3(...b),delta=u.clone().sub(v);
   const o=add(new T.BoxGeometry(width,delta.length(),depth),mat);
   o.position.copy(v).add(u).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;
 }
 if(kind==='fallen-rib'){
   for(let i=0;i<8;i++){const t=i/7,x=-.91+t*1.65,y=.16+.31*Math.sin(t*Math.PI),z=-.31+.55*t;
     stone(x,y,z,.32,.29,.39,t*.45,i%4===0?edge:rock);
   }
   stone(-.72,.13,.46,.48,.25,.40,.7);stone(.62,.10,-.37,.37,.20,.43,-.3);
 }else if(kind==='pointed-arch-fragment'){
   for(let i=0;i<6;i++){const t=i/5;
     stone(-.8+t*.69,.14+.64*t*t,-.03,.34,.29,.40,.16+t*.3,i%3===0?edge:rock);
   }
   stone(.27,.13,.22,.55,.25,.44,.35);stone(.60,.08,-.30,.30,.16,.30,.5);
 }else if(kind==='carved-block'){
   for(let i=0;i<3;i++)stone(-.34+i*.34,.51,-.03,.36,.18,.75,.08,edge);
   // Raised quatrefoil: four carved diamond lobes in the front face.
   for(let i=0;i<4;i++){
     const a=i*Math.PI/2,x=.22*Math.cos(a),y=.29+.17*Math.sin(a);
     const o=stone(x,y,-.41,.17,.20,.075,a,edge);o.rotation.z=a;
   }
   for(let i=0;i<5;i++)stone((rand()-.5)*1.35,.05,(rand()-.5)*1.1,.13+.13*rand(),.1,.15);
 }else if(kind==='broken-vault-panel'){
   // Large uneven perimeter slabs preserve the original central plate.
   const placements=[[-.57,.16,-.41,.55,.23,.46],[-.14,.18,-.57,.65,.27,.43],[.47,.15,-.32,.60,.23,.50],[-.55,.17,.32,.59,.25,.48],[.18,.19,.35,.70,.27,.58]];
   for(const [x,y,z,w,h,d] of placements)stone(x,y,z,w,h,d,(rand()-.5)*.6);
   for(let i=0;i<6;i++)stone((rand()-.5)*1.65,.07,(rand()-.5)*1.5,.15+.12*rand(),.12,.19);
 }else if(kind==='hanging-iron'){
   const rust=new T.MeshStandardMaterial({color:0x3e3735,metalness:.65,roughness:.67});materials.push(rust);
   for(let i=0;i<4;i++){const x=-.45+i*.30;beam([x,.11,.14],[x+.13,.25,.16],.035,.045,rust)}
   stone(-.54,.08,-.12,.22,.14,.23);stone(.55,.08,.16,.18,.13,.20);
 }else if(kind==='small-rubble'){
   for(let i=0;i<7;i++){
     const x=(rand()-.5)*1.34,z=(rand()-.5)*1.26;
     stone(x,.15,z,.30+.25*rand(),.22+.20*rand(),.30+.25*rand(),rand()*Math.PI);
   }
 }
 group.userData.detailPass='stylized-stone-v2';group.userData.thirdPartyMeshes='none';
 return {disposeDetails(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}};
}
