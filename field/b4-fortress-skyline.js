/* B4 volcanic fortress skyline. Visual-only meshes; never changes map or collision. */
import * as THREE from 'three';
export function addB4FortressSkyline({root, area, map, wallCell, hash, cellSize, objects}) {
  if (area !== 4 || !root || !map) return 0;
  const blocked = new Set((objects || []).map(o => o.tx + ',' + o.ty));
  const stone = new THREE.MeshStandardMaterial({color:0x211b20,roughness:0.96,flatShading:true});
  const trim = new THREE.MeshStandardMaterial({color:0x46302a,roughness:0.88,flatShading:true});
  const ember = new THREE.MeshStandardMaterial({color:0xff5824,emissive:0xd92a08,emissiveIntensity:1.4});
  const cylinder = new THREE.CylinderGeometry(0.62,0.84,1,6);
  const spire = new THREE.ConeGeometry(0.8,1,6);
  const beam = new THREE.BoxGeometry(1,1,1);
  const group = new THREE.Group(); group.name='b4:fortress-skyline';
  const place = (geo,mat,x,y,z,sx,sy,sz) => {
    const mesh=new THREE.Mesh(geo,mat);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);group.add(mesh);
  };
  let count=0;
  // Towers sit at the centers of adjacent wall cells, not in walkable cells.
  for(let ty=1;ty<map.h-1 && count<8;ty++) for(let tx=1;tx<map.w-1 && count<8;tx++){
    if(wallCell(tx,ty) || blocked.has(tx+','+ty) || hash(tx,ty,211)>0.055) continue;
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    const adjacent=dirs.filter(([dx,dz])=>wallCell(tx+dx,ty+dz));
    if(!adjacent.length) continue;
    const [dx,dz]=adjacent[0], x=(tx+dx)*cellSize, z=(ty+dz)*cellSize;
    const h=5.5+hash(tx,ty,212)*4.5;
    place(cylinder,stone,x,h/2,z,0.95,h,0.95);
    place(cylinder,trim,x,h-0.35,z,1.05,0.38,1.05);
    place(spire,stone,x,h+1.05,z,1.25,2.3,1.25);
    place(beam,ember,x-dx*0.12,h*0.68,z-dz*0.12,0.22,0.48,0.22);
    // A short crenellated parapet visually links the tower to the enclosing rock wall.
    place(beam,stone,x-dz*1.1,3.6,z+dx*1.1,2.5,1.1,0.5);
    count++;
  }
  if(count){root.add(group);}else{group.clear();}
  // Geometries and materials are owned by this module and disposed by the caller on rebuild.
  group.userData.disposeFortress=()=>{for(const g of [cylinder,spire,beam])g.dispose();for(const m of [stone,trim,ember])m.dispose();};
  return count;
}
