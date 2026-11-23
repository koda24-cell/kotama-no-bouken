/* Hidden upper masonry and continuous backing close the original modular roof seams. */
import * as THREE from 'three';
export function createCeilingSealV5({root,tiles,walls,source,openings=[],height=4.8,boss=false,fullBacking=false}){
 let stone;source.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name==='sacred_weathered_stone')stone=m;});
 if(!stone)throw new Error('Ceiling seal requires pinned stone material');
 const material=stone.clone();material.name='f1-v5:upper-stone-seal';material.side=THREE.DoubleSide;
 const shape=new THREE.Shape();shape.moveTo(-2,-2);shape.lineTo(2,-2);shape.lineTo(2,2);shape.lineTo(-2,2);shape.closePath();const hole=new THREE.Path();hole.absarc(0,0,1,0,Math.PI*2,true);shape.holes.push(hole);const wellRing=new THREE.ShapeGeometry(shape,32).rotateX(Math.PI/2),wellLiner=new THREE.CylinderGeometry(1.06,1.06,1.8,32,1,true);
 const backing=new THREE.BoxGeometry(4.1,1,.72);
 const band=new THREE.BoxGeometry(4.04,1.8,.8),lid=new THREE.PlaneGeometry(4,4).rotateX(Math.PI/2),group=new THREE.Group(),batches=[],groups=new Map(),dummy=new THREE.Object3D();
 group.name='f1-v5:closed-wall-roof-junctions';const holes=new Set(openings.map(t=>t.join(',')));
 function add(geometry,position,rotation,scale=[1,1,1]){dummy.position.set(...position);dummy.rotation.set(0,rotation,0);dummy.scale.set(...scale);dummy.updateMatrix();const key=(geometry===band?'band':geometry===lid?'lid':geometry===wellRing?'ring':geometry===backing?'backing':'liner')+':'+Math.floor(position[0]/16)+':'+Math.floor(position[2]/16);if(!groups.has(key))groups.set(key,{geometry,matrices:[]});groups.get(key).matrices.push(dummy.matrix.clone());}
 for(const row of walls){const a=row.rotationY||0,p=row.position;if(fullBacking){const top=4*(row.scale?.[1]??1)+1.7;add(backing,[p[0]-.4*Math.sin(a),p[1]+top/2,p[2]-.4*Math.cos(a)],a,[1,top,1]);}const y=p[1]+4*(row.scale?.[1]??1)+.8;add(band,[p[0]-.42*Math.sin(a),y,p[2]-.42*Math.cos(a)],a);}
 for(const[x,z]of tiles)if(!holes.has(x+','+z))add(lid,[x*4,boss&&x>=21&&z<=4?6.1:height,z*4],0);
 for(const[x,z]of openings){add(wellRing,[x*4,height,z*4],0);add(wellLiner,[x*4,height-.9,z*4],0);}
 for(const{geometry,matrices}of groups.values()){const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.receiveShadow=true;mesh.name='f1-v5:roof-junction-batch';batches.push(mesh);group.add(mesh);}
 root.add(group);let disposed=false;
 return{info:()=>({upperWallBands:walls.length,fullHeightWallBackings:fullBacking?walls.length:0,backingRoofTiles:tiles.length-holes.size,linedLightWells:openings.length,visibleEmitterMeshes:0,disposed}),dispose(){if(disposed)return;disposed=true;group.removeFromParent();batches.forEach(b=>b.dispose());backing.dispose();band.dispose();lid.dispose();wellRing.dispose();wellLiner.dispose();material.dispose();group.clear();}};
}
