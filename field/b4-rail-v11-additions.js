/* V11: additive fracture geometry and load-bearing tie plates.
   Keep the original V10 meshes intact for a true before/after comparison. */
import * as THREE from 'three';
export function enhanceB4RailsV11(root,{length=5,broken=false,curve=0}={}){
 const iron=new THREE.MeshStandardMaterial({color:0x493a35,metalness:.55,roughness:.83,flatShading:true});
 const rust=new THREE.MeshStandardMaterial({color:0x78462f,metalness:.28,roughness:.92});
 const rawWood=new THREE.MeshStandardMaterial({color:0x826348,roughness:1,flatShading:true});
 const stone=new THREE.MeshStandardMaterial({color:0x35302d,roughness:1,flatShading:true});
 const center=z=>curve*z*z/(length*1.9), slope=z=>2*curve*z/(length*1.9);
 const point=(z,side)=>{const k=slope(z),norm=Math.hypot(1,k);return [center(z)+side*.59/norm,z-side*.59*k/norm]};
 const beam=(x,y,z,sx,sy,sz,mat,yaw=0)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);mesh.position.set(x,y,z);mesh.rotation.y=yaw;root.add(mesh);return mesh};
 // Full-width end ties and thick iron hold-down shoes create a legible silhouette.
 for(const z of [-length/2+.15,length/2-.15]){
  const yaw=Math.atan(slope(z));
  beam(center(z),-.18,z,1.78,.23,.31,rawWood,yaw);
  for(const side of [-1,1]){
   const [x,pz]=point(z,side);
   beam(x,-.035,pz,.34,.07,.25,iron,yaw);
   for(const dz of [-.075,.075]){
    const b=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.025,6),rust);
    b.position.set(x,-.002,pz+dz);root.add(b);
   }
  }
 }
 if(broken){
  // Distinct sheared rail lips and jagged steel fracture at the actual track end.
  for(const side of [-1,1]){
   const z=side===-1?length*.39:length*.365;
   const [x,pz]=point(z,side);
   const yaw=Math.atan(slope(z));
   const lip=beam(x,.075,pz,.26,.17,.13,iron,yaw+side*.22);
   lip.rotation.z=side*.15;
   const wedge=new THREE.Mesh(new THREE.ConeGeometry(.135,.32,4),rust);
   wedge.rotation.x=Math.PI/2;wedge.rotation.z=side*.3;
   wedge.position.set(x,.1,pz+.11);root.add(wedge);
  }
  // A few large planar splinters instead of dozens of identical cone fragments.
  for(let i=0;i<5;i++){
   const z=.62+i*.34,x=center(z)+(i%2?-.75:.8);
   const g=new THREE.BufferGeometry();
   const verts=new Float32Array([-.28,-.055,-.12,.24,-.055,-.12,-.11,.13,.02,
      -.28,-.055,-.12,-.11,.13,.02,.17,-.035,.25]);
   g.setAttribute('position',new THREE.BufferAttribute(verts,3));g.computeVertexNormals();
   const shard=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x9b7856,roughness:1,side:THREE.DoubleSide,flatShading:true}));
   shard.position.set(x,-.04,z);shard.rotation.y=(i-2)*.23;root.add(shard);
  }
  // Broken ballast chunks under the displaced ties: no arbitrary high-floating rubble.
  for(let i=0;i<9;i++){
   const z=.6+i*.17,x=center(z)+Math.sin(i*2.7)*.85;
   const m=new THREE.Mesh(new THREE.DodecahedronGeometry(.09+(i%3)*.055,0),stone);
   m.scale.set(1.3,.5,.8);m.position.set(x,-.22,z);root.add(m);
  }
 }
 root.userData={...root.userData,enhancement:'V11 fracture end caps, timber splinters and anchor shoes'};
 return root;
}
