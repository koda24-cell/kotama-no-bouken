/* Fourth stratum: distant volcanic citadel and lava bridges.
 * Decorative scenery only. Everything is outside the authoritative tile map.
 */
import * as THREE from 'three';
export function addB4CitadelBackdrop({root,area,map,cellSize}) {
  if(area!==4 || !root || !map || !map.w || !map.h)return 0;
  const group=new THREE.Group();group.name='b4:citadel-backdrop';
  const stone=new THREE.MeshStandardMaterial({color:0x201b22,roughness:1,flatShading:true});
  const ledge=new THREE.MeshStandardMaterial({color:0x453138,roughness:0.94,flatShading:true});
  const magma=new THREE.MeshStandardMaterial({color:0xff4517,emissive:0xe92a04,emissiveIntensity:1.6,roughness:0.4});
  const dark=new THREE.MeshStandardMaterial({color:0x100e17,roughness:1});
  const box=new THREE.BoxGeometry(1,1,1);
  const tower=new THREE.CylinderGeometry(0.78,1.05,1,8);
  const roof=new THREE.ConeGeometry(1,1,8);
  const arch=new THREE.TorusGeometry(1,0.14,5,12,Math.PI);
  const geometries=[box,tower,roof,arch],materials=[stone,ledge,magma,dark];
  const put=(geo,mat,x,y,z,sx,sy,sz,rz=0)=>{
    const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.z=rz;group.add(o);return o;
  };
  const w=map.w*cellSize,h=map.h*cellSize;
  // Stage sits beyond the northern edge: no scenery overlaps walkable cells.
  const z=-cellSize*4.5;
  const cx=(w-cellSize)/2;
  const width=Math.min(Math.max(w*0.65,16),64);
  const baseH=6;
  put(box,stone,cx,baseH/2,z,width,baseH,7);
  put(box,ledge,cx,baseH,z,width+1,0.65,7.6);
  put(box,dark,cx,baseH+2,z,width*0.46,4,5);
  put(box,stone,cx,baseH+4.3,z,width*0.49,0.6,5.5);
  // Distinct height rhythm: two bastions, tall keep, and narrow distant spires.
  const offsets=[-0.47,-0.29,0,0.29,0.47];
  const heights=[11,15,23,15,11];
  for(let i=0;i<offsets.length;i++){
    const x=cx+offsets[i]*width,y=heights[i],radius=i===2?2.25:1.4;
    put(tower,stone,x,y/2,z,radius,y,radius);
    put(tower,ledge,x,y-0.45,z,radius*1.18,0.8,radius*1.18);
    put(roof,dark,x,y+2.3,z,radius*1.5,4.8,radius*1.5);
    put(box,magma,x,y*0.55,z+radius*0.86,0.3,0.8,0.12);
    for(const dx of [-1,1])put(box,stone,x+dx*radius*0.73,y+0.35,z,0.35,0.8,0.6);
  }
  // Two broken elevated viaducts, deliberately on the far side of the map.
  for(const side of [-1,1]){
    const start=cx+side*width*0.32;
    put(box,stone,start+side*4,4.3,z+5,9,0.8,2.1);
    for(let i=0;i<3;i++){
      const x=start+side*(i*3+0.6);
      put(box,stone,x,2.0,z+5,0.7,3.9,1.7);
      put(arch,ledge,x+side*1.5,3.3,z+5,1.2,1.2,1.0);
    }
  }
  // A low lava terrace reinforces the glowing horizon without dynamic lights.
  put(box,magma,cx,-0.12,z+7,width+20,0.13,2.6);
  put(box,stone,cx,0.2,z+9,width+20,0.7,1.1);
  group.userData.disposeFortress=()=>{geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());};
  root.add(group);
  return group.children.length;
}
