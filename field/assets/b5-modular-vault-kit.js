/**
 * B5 modular ruined Gothic vault kit. Original, additive, standalone preview
 * geometry; no dungeon collision or runtime changes.
 * Each kind exports independently through tools/b5-vault-render.
 * Three.js coordinates: Y up; FRONT looks from -Z.
 */
export const B5_VAULT_KINDS=['basic-vault','collapsed-vault','royal-vault','vault-support','fallen-vault-rubble'];
export function createB5VaultAsset(THREE,kind='basic-vault'){
 if(!B5_VAULT_KINDS.includes(kind))throw new Error('Unknown B5 vault kind: '+kind);
 const group=new THREE.Group(); group.name='b5:modular:'+kind;
 group.userData.visualOnly=true;group.userData.frontDirection=[0,0,-1];
 const gs=[],ms=[],G=g=>(gs.push(g),g),M=m=>(ms.push(m),m);
 const stone=M(new THREE.MeshStandardMaterial({color:0x77747a,roughness:1,flatShading:true,side:THREE.DoubleSide}));
 const trim=M(new THREE.MeshStandardMaterial({color:0x99959a,roughness:1,flatShading:true,side:THREE.DoubleSide}));
 const dark=M(new THREE.MeshStandardMaterial({color:0x5c585f,roughness:1,flatShading:true,side:THREE.DoubleSide}));
 const add=(g,m=stone)=>{const o=new THREE.Mesh(G(g),m);group.add(o);return o;};
 const box=(x,y,z,w,h,d,m=stone)=>{
  const o=add(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);return o;
 };
 const beam=(a,b,r=.12,m=stone)=>{
  const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.clone().sub(va);
  if(delta.length()<1e-5)return;
  const mesh=add(new THREE.CylinderGeometry(r,r,delta.length(),8),m);
  mesh.position.copy(va).add(vb).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  return mesh;
 };
 const chip=(x,y,z,w,h,d,seed=0)=>{
  const o=add(new THREE.DodecahedronGeometry(1,1),stone);
  o.position.set(x,y,z);o.scale.set(w,h,d);
  o.rotation.set(seed*.27,seed*.13,seed*.22);return o;
 };
 const arch=(z,side=1,detail=true,broken=false)=>{
  // Radial rising ribs connect the left and right supporting masonry.
  for(let layer=0;layer<(detail?3:2);layer++){
   for(let i=0;i<28;i++){
    if(broken&&(i>=17&&i<=23||i===5))continue;
    const x0=-3.0+6*i/28,x1=-3+6*(i+1)/28;
    const top=x=>4.5+2.0*(1-Math.pow(Math.abs(x)/3,1.55));
    beam([x0,top(x0)-layer*.16,z-layer*.10],
         [x1,top(x1)-layer*.16,z-layer*.10],.13-layer*.026,layer===1?trim:stone);
   }
  }
 };
 const stonePier=(x,z,broken=false)=>{
  const H=broken?4.0:4.9;
  box(x,H/2,z,.76,H,.78,stone);
  for(let i=0;i<3;i++)box(x,1.05+i*1.36,z-.30,.95,.16,.89,trim);
  // Gothic flute carvings, recessed impression by dark grooves
  for(const dx of [-.23,0,.23])box(x+dx,H*.53,z-.408,.055,H*.67,.028,dark);
  box(x,H-.18,z,1.05,.38,1.02,stone);
  for(let i=0;i<3;i++)chip(x+(-.35+i*.24),H+.02,z-.13,.21,.16,.22,i+Math.floor(x*3));
 };
 const rubble=()=>{
  // Every shard has a flattened bottom and a broad irregular top;
  // no isolated spiky crystals or rounded beads.
  for(let i=0;i<25;i++){
   const a=i*2.399963,r=1.1+(i%7)*.24;
   const x=Math.cos(a)*r,z=Math.sin(a)*r-.2;
   const w=.2+(i%5)*.13,h=.08+(i%4)*.07,d=.18+(i%3)*.14;
   const obj=chip(x,h*.7,z,w,h,d,i);
   obj.rotation.x*=.22;obj.rotation.z*=.22;
  }
 };
 if(kind==='vault-support'){
  stonePier(0,0);
  for(const sign of [-1,1]){
   for(let i=0;i<14;i++){
    const t=i/14,a=[sign*.36,4.48,0],b=[sign*(.36+2.2*t),4.48+1.55*t-.82*t*t,0];
    const next=[sign*(.36+2.2*(t+1/14)),4.48+1.55*(t+1/14)-.82*Math.pow(t+1/14,2),0];
    beam(b,next,.17,stone);
   }
  }
  for(let s of [-1,1])for(let i=0;i<4;i++)box(s*.38,3.9+i*.22,-.48,.22,.12,.12,trim);
  chip(.38,.18,-.47,.42,.18,.35,8);
 }else if(kind==='fallen-vault-rubble'){
  rubble();
  for(let i=0;i<7;i++){
   const x=-2.7+i*.82,z=.10+Math.sin(i*2.1)*1.0;
   const obj=box(x,.16,z,.72,.32,.49,i%3?stone:trim);
   obj.rotation.y=.19*i;obj.rotation.z=(i%2?-.16:.12);
  }
  // A fallen carved rib with multiple disrupted segments.
  for(let i=0;i<13;i++){
   if(i===5||i===9)continue;
   const x=-2.6+i*.42,y=.26+.18*Math.sin(i*.45),z=-1.1+.17*Math.sin(i*.41);
   beam([x,y,z],[x+.39,y+.06,z+.05],.16,i%3?stone:trim);
  }
  for(let i=0;i<5;i++)chip(-2.4+i*.9,.13,1.8,.26,.12,.3,i+15);
 }else{
  const broken=kind==='collapsed-vault',royal=kind==='royal-vault';
  for(const x of [-3.25,3.25])for(const z of [-2.5,2.5])stonePier(x,z,broken&&x>0&&z>0);
  arch(-2.5,1,true,broken);arch(2.5,1,true,broken);
  // Transverse crossing ribs sit under the stone vault surface.
  for(const x of [-3,0,3]){
   for(let i=0;i<24;i++){
    if(broken&&x>=0&&i>12&&i<20)continue;
    const z0=-2.5+i*5/24,z1=-2.5+(i+1)*5/24;
    const y=z=>4.55+1.72*(1-Math.pow(Math.abs(z)/2.5,1.8));
    beam([x,y(z0),z0],[x,y(z1),z1],royal?.16:.12,i%5===0?trim:stone);
   }
  }
  // Vault webbing in large dressed stone courses; the missing quadrant
  // exposes the rib structure for ruined variants.
  for(let ix=0;ix<10;ix++)for(let iz=0;iz<8;iz++){
   const x=-2.95+(ix+.5)*5.9/10,z=-2.42+(iz+.5)*4.84/8;
   if(broken&&(ix>5&&iz>2||ix===3&&iz===6))continue;
   const yy=5.40+.56*(1-Math.abs(x)/3)+.28*(1-Math.abs(z)/2.5);
   const p=box(x,yy,z,.56,.13,.59,ix%4===0?trim:stone);
   p.rotation.z=.035*Math.sin(ix*1.8+iz);p.rotation.x=.03*Math.cos(iz*1.1+ix);
  }
  if(broken){
   for(let i=0;i<10;i++){
    const x=1.25+i*.18,z=.08+Math.sin(i*2.1)*.6,y=5.65+.16*Math.sin(i*1.7);
    chip(x,y,z,.2,.14,.25,i);
   }
   rubble();
  }
  if(royal){
   // Additional carved rib mouldings, cusps and a restrained keystone.
   for(const z of [-2.63,2.37]){
    for(let i=0;i<18;i++){
     const x=-2.8+i*5.6/18,x2=-2.8+(i+1)*5.6/18;
     const yy=t=>4.63+2.0*(1-Math.pow(Math.abs(t)/3,1.55));
     beam([x,yy(x)+.19,z],[x2,yy(x2)+.19,z],.062,trim);
    }
   }
   for(const x of [-3.13,3.13])for(let i=0;i<5;i++){
    const z=-1.95+i*.96;
    box(x,4.53,z,.21,.31,.23,trim);
    chip(x,4.85,z,.21,.14,.20,i+11);
   }
   const keystone=chip(0,6.65,-2.62,.34,.39,.32,0);
   keystone.rotation.set(0,0,.13);
  }
 }
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.parent?.remove(group);
  group.traverse(o=>{if(o.isMesh)o.parent?.remove(o)}); gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}};
}
