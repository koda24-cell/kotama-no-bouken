/** Floor 5 Gothic vault scatter props: independent, grid-friendly visual assets.
 * Three.js Y-up, tile centered at (0,0,0). No changes to existing vaults.
 * For Claude/Codex: createB5VaultScatterProp(THREE, kind, seed) -> {group,dispose}.
 */
export const B5_VAULT_SCATTER_KINDS=[
 'fallen-rib','pointed-arch-fragment','carved-block',
 'broken-vault-panel','hanging-iron','small-rubble'
];
export function createB5VaultScatterProp(T,kind='fallen-rib',seed=1){
 if(!B5_VAULT_SCATTER_KINDS.includes(kind))throw Error('Unknown scatter prop: '+kind);
 const group=new T.Group();group.name='b5:vault-scatter:'+kind;
 group.userData={visualOnly:true,gridFootprint:1,scatterKind:kind,seed};
 let s=(seed>>>0)||1;
 const rand=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
 const gs=[],ms=[];
 const stone=new T.MeshStandardMaterial({color:0x77747a,roughness:.94,flatShading:true});
 const trim=new T.MeshStandardMaterial({color:0x99959a,roughness:.9,flatShading:true});
 const iron=new T.MeshStandardMaterial({color:0x292a30,metalness:.75,roughness:.43});
 ms.push(stone,trim,iron);
 const add=(geo,mat=stone)=>{gs.push(geo);const o=new T.Mesh(geo,mat);group.add(o);return o;};
 const block=(x,y,z,w,h,d,mat=stone)=>{const o=add(new T.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);return o;};
 const segment=(a,b,w=.13,d=.17,mat=stone)=>{
   const A=new T.Vector3(...a),B=new T.Vector3(...b),dir=B.clone().sub(A);
   const o=block(0,0,0,w,dir.length(),d,mat);
   o.position.copy(A).add(B).multiplyScalar(.5);
   o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());
   return o;
 };
 const stoneShard=(x,z,r,h)=>{
   const n=7,vs=[],idx=[];
   for(let ring=0;ring<2;ring++)for(let i=0;i<n;i++){
     const a=i*2*Math.PI/n;const rr=r*(.78+.32*rand());
     vs.push(x+rr*Math.cos(a),ring?h*(.65+.35*rand()):.015,z+rr*Math.sin(a));
   }
   for(let i=0;i<n;i++){const j=(i+1)%n;idx.push(i,j,n+i,j,n+j,n+i);}
   for(let i=1;i<n-1;i++)idx.push(n,n+i,n+i+1);
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vs,3));g.setIndex(idx);g.computeVertexNormals();add(g);
 };
 const curveStrip=(pts,width=.13,depth=.15,mat=stone)=>{
   for(let i=1;i<pts.length;i++)segment(pts[i-1],pts[i],width,depth,mat);
 };
 if(kind==='fallen-rib'){
   curveStrip([[-.95,.16,-.34],[-.60,.23,-.23],[-.25,.34,-.13],[.10,.41,.02],[.47,.29,.18],[.75,.13,.29]],.24,.28);
   block(-.88,.10,-.34,.25,.19,.32,trim);stoneShard(.78,.28,.23,.14);
 }else if(kind==='pointed-arch-fragment'){
   curveStrip([[-.82,.13,0],[-.57,.29,0],[-.32,.53,0],[-.12,.78,0]],.24,.30);
   block(-.09,.74,0,.26,.21,.31,trim);stoneShard(.45,.32,.26,.17);
 }else if(kind==='carved-block'){
   const b=block(0,.28,0,.95,.56,.70);
   b.rotation.y=(rand()-.5)*.25;
   for(const x of [-.29,0,.29])block(x,.33,-.365,.06,.35,.055,trim);
   for(const y of [.12,.48])block(0,y,-.38,.82,.045,.045,trim);
   stoneShard(.56,.38,.17,.11);
 }else if(kind==='broken-vault-panel'){
   const b=block(0,.09,0,1.48,.16,1.12);b.rotation.y=.15;
   for(let i=0;i<4;i++)stoneShard((rand()-.5)*1.3,(rand()-.5)*.9,.13+.09*rand(),.08);
   segment([-.62,.17,-.46],[.52,.17,.40],.09,.10,trim);
 }else if(kind==='hanging-iron'){
   curveStrip([[-.58,.12,0],[-.31,.25,0],[.02,.18,0],[.34,.10,0]],.055,.075,iron);
   for(let i=0;i<6;i++){
     const x=-.65+i*.22;
     const o=add(new T.TorusGeometry(.105,.023,6,12),iron);
     o.position.set(x,.14+.07*(i%2),.08);o.rotation.x=i%2?0:Math.PI/2;
   }
 }else if(kind==='small-rubble'){
   for(let i=0;i<12;i++)stoneShard((rand()-.5)*1.55,(rand()-.5)*1.45,.09+.17*rand(),.08+.22*rand());
 }
 group.userData.maxFootprint=1.9;
 return {group,dispose(){group.parent?.remove(group);group.clear();gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}};
}
