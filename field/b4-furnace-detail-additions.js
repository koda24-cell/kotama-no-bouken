import * as THREE from 'three';
// Additive details only: original furnace meshes are never removed or reshaped.
export function enhanceB4Furnace(root){
 const furnace=root.getObjectByName('b4:ruined-smelting-furnace');
 if(!furnace)throw Error('B4 furnace not found');
 if(furnace.getObjectByName('b4:furnace-added-details'))return furnace;
 const details=new THREE.Group();details.name='b4:furnace-added-details';furnace.add(details);
 const dark=new THREE.MeshStandardMaterial({color:0x302c2a,roughness:.94,flatShading:true});
 const iron=new THREE.MeshStandardMaterial({color:0x514a46,metalness:.48,roughness:.72});
 const ember=new THREE.MeshStandardMaterial({color:0xe9571b,emissive:0xa32b0b,emissiveIntensity:.7,roughness:.8});
 const box=new THREE.BoxGeometry(1,1,1);
 const sphere=new THREE.IcosahedronGeometry(1,1);
 function add(g,m,x,y,z,sx,sy,sz,rz=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.z=rz;details.add(o);return o}
 // Arch edge stones: segmented, with a deliberately open center.
 for(const side of [-1,1]){
  for(let i=0;i<5;i++){
   const y=.45+i*.65;
   add(box,dark,side*(.87+.12*(i%2)),y,.5,.25,.23,.3,side*.07*i);
  }
  add(box,iron,side*1.52,1.35,.43,.1,2.15,.14,side*.025);
  for(let i=0;i<5;i++)add(sphere,iron,side*1.52,.45+i*.45,.54,.09,.09,.07);
  for(let i=0;i<4;i++)add(sphere,dark,side*(1.25+i*.14),3.65+i*.27,.4,.26,.18,.28,side*.18);
 }
 // Ash clinker and faint embers in the lower firebox, no solid front wall.
 for(let i=0;i<13;i++){
  const x=Math.sin(i*2.4)*.76,z=.15+Math.cos(i*1.9)*.34;
  add(sphere,i%4===0?ember:dark,x,.18+(i%3)*.09,z,.18+(i%3)*.08,.14,.16);
 }
 // Broken metal flue straps near the crown.
 for(let i=0;i<3;i++)add(box,iron,-.62+i*.61,4.75+(i%2)*.13,.56,.11,.12,.18,(i-1)*.18);
 return furnace;
}
