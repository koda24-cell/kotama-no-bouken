/* Hidden upper masonry and continuous backing close the original modular roof seams. */
import * as THREE from 'three';
export function createCeilingSealV5({root,tiles,walls,source,openings=[],height=4.8,boss=false}){
 let stone;source.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name==='sacred_weathered_stone')stone=m;});
 if(!stone)throw new Error('Ceiling seal requires pinned stone material');
 const material=stone.clone();material.name='f1-v5:upper-stone-seal';material.side=THREE.DoubleSide;
 const band=new THREE.BoxGeometry(4.04,1.8,.8),lid=new THREE.PlaneGeometry(4,4).rotateX(Math.PI/2),group=new THREE.Group(),batches=[],groups=new Map(),dummy=new THREE.Object3D();
 group.name='f1-v5:closed-wall-roof-junctions';const holes=new Set(openings.map(t=>t.join(',')));
 function add(geometry,position,rotation){dummy.position.set(...position);dummy.rotation.set(0,rotation,0);dummy.scale.set(1,1,1);dummy.updateMatrix();const key=(geometry===band?'band':'lid')+':'+Math.floor(position[0]/16)+':'+Math.floor(position[2]/16);if(!groups.has(key))groups.set(key,{geometry,matrices:[]});groups.get(key).matrices.push(dummy.matrix.clone());}
 for(const row of walls){const a=row.rotationY||0,p=row.position;const y=p[1]+4*(row.scale?.[1]??1)+.8;add(band,[p[0]-.42*Math.sin(a),y,p[2]-.42*Math.cos(a)],a);}
 for(const[x,z]of tiles)if(!holes.has(x+','+z))add(lid,[x*4,boss&&x>=21&&z<=4?6.1:height,z*4],0);
 for(const{geometry,matrices}of groups.values()){const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.receiveShadow=true;mesh.name='f1-v5:roof-junction-batch';batches.push(mesh);group.add(mesh);}
 root.add(group);let disposed=false;
 return{info:()=>({upperWallBands:walls.length,backingRoofTiles:tiles.length-holes.size,visibleEmitterMeshes:0,disposed}),dispose(){if(disposed)return;disposed=true;group.removeFromParent();batches.forEach(b=>b.dispose());band.dispose();lid.dispose();material.dispose();group.clear();}};
}
