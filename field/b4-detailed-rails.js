/* Independent, reusable B4 mine track segments. Original assets remain unchanged. */
import * as THREE from 'three';
export function createB4DetailedRails({length=5,broken=false,curve=0}={}) {
 const root=new THREE.Group();root.name='b4:detailed-rails';
 const steel=new THREE.MeshStandardMaterial({color:0x504947,metalness:.65,roughness:.76});
 const wood=new THREE.MeshStandardMaterial({color:0x453329,roughness:1,flatShading:true});
 const rust=new THREE.MeshStandardMaterial({color:0x74432b,metalness:.25,roughness:.94});
 const stone=new THREE.MeshStandardMaterial({color:0x282727,roughness:1,flatShading:true});
 const box=(parent,x,y,z,sx,sy,sz,mat,rz=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);m.position.set(x,y,z);m.rotation.y=rz;parent.add(m);return m};
 const n=Math.max(12,Math.round(length*10));
 const center=(z)=>curve*z*z/(length*1.9); // continuous single-direction arc, not an S-bend
 const slope=(z)=>2*curve*z/(length*1.9);
 const railPoint=(z,side)=>{const k=slope(z),norm=Math.hypot(1,k);return {x:center(z)+side*.59/norm,z:z-side*.59*k/norm};};
 for(let i=0;i<=Math.ceil(length/.42);i++){
  const z=-length/2+i*.42;
  if(z>length/2+.05)break;
  const x=center(z), angle=-Math.atan(slope(z));
  const sleeper=box(root,x,-.17,z,1.72,.19,.24,i%4===0?rust:wood,angle);
  if(i%5===0)sleeper.rotation.z=.045;
  // Split grain and uneven timber edges: visible even with clay render.
  if(i%3===0){
   box(root,x-.38,-.062,z+.098,.48,.022,.028,rust,angle);
   box(root,x+.41,-.068,z-.092,.38,.018,.024,rust,angle);
  }
  for(const side of [-1,1]){
   const p=railPoint(z,side);
   box(root,p.x,-.055,p.z,.16,.035,.18,rust,angle);
   for(const dz of [-.055,.055])box(root,p.x,-.025,p.z+dz,.035,.045,.035,steel);
  }
 }
 for(const side of [-1,1]){
  const points=[];
  for(let i=0;i<=n;i++){
   const z=-length/2+length*i/n;
   const p=railPoint(z,side);
   if(broken&&side===1&&i>n*.73)p.x+=(i/n-.73)*.75;
   points.push(new THREE.Vector3(p.x,0,p.z));
  }
  for(let i=0;i<n;i++){
   if(broken&&side===-1&&i>n*.83&&i<n*.91)continue;
   const a=points[i],b=points[i+1],mid=a.clone().add(b).multiplyScalar(.5);
   const d=b.clone().sub(a),ang=Math.atan2(d.x,d.z),len=d.length()+.012;
   box(root,mid.x,.02,mid.z,.13,.15,len,steel,ang);
   box(root,mid.x,.105,mid.z,.23,.045,len,steel,ang);
   box(root,mid.x,-.075,mid.z,.21,.035,len,steel,ang);
  }
  for(let j=1;j<3;j++){
   const z=-length/2+length*j/3,x=railPoint(z,side).x;
   box(root,x,.14,z,.25,.055,.13,rust);
   for(const dx of [-.085,.085])box(root,x+dx,.175,z,.025,.02,.025,steel);
  }
 }
 if(broken)for(let i=0;i<12;i++){
  const z=-length/2+length*(.55+i*.035),x=center(z)+Math.sin(i*7)*.9;
  const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(.09+(i%3)*.055,0),stone);
  rock.position.set(x,-.12,z);rock.rotation.set(i*.7,i*.4,i*.2);root.add(rock);
 }
 root.userData={asset:'B4 modular mine rails',variant:broken?'broken':curve?'curved':'straight'};
 return root;
}
