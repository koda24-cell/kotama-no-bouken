/* Gradual first-stratum art progression, opt-in only. Native maps/objects stay authoritative. */
import * as THREE from 'three';
import {retainFirstLayerSource} from './field-3d-b1-sacred-trial.js';
export async function buildFirstLayerProgression({world,area}){
  if(area.n!==1||![0,1].includes(area.f))throw new Error('Progression dressing only accepts first-stratum 1F/2F');
  const url=new URL('../assets/3d/dungeons/b1_sacred_forest_candidates/scene/game-layout-v4.json',import.meta.url);
  const response=await fetch(url);if(!response.ok)throw new Error('Progression catalog unavailable');
  const catalog=await response.json(),ids=['v3_moss_veil','v3_shade_understory','legacy_pillar','v4_passage_arch'];
  const held=[],root=new THREE.Group(),sources=new Map(),batches=[];root.name='f1-v4:gradual-progression';let disposed=false;
  function dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const b of batches)b.dispose();root.clear();held.forEach(s=>s.release());}
  try{
    // Serial asset load: source cache is shared with the later 3F trial.
    for(const id of ids){const descriptor=catalog.revisionSources.find(s=>s.id===id);if(!descriptor)throw new Error('Missing progression source '+id);const source=await retainFirstLayerSource(descriptor.file,descriptor.sha256);held.push(source);sources.set(id,source.source);}
    const map=area.floor.map,groups=new Map(),counts={moss:0,understory:0,pillars:0,arches:0};
    const walk=(x,z)=>map[z]?.[x]!==undefined&&!'#~'.includes(map[z][x])&&!area.objects.some(o=>o.tx===x&&o.ty===z&&o.onWall);
    const reserved=(x,z)=>area.objects.some(o=>Math.abs(o.tx-x)+Math.abs(o.ty-z)<=1);
    function add(id,x,y,z,ry,sx,sy,sz){const source=sources.get(id),matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ry),new THREE.Vector3(sx,sy,sz));source.updateMatrixWorld(true);const inverse=source.matrixWorld.clone().invert();source.traverse(o=>{if(!o.isMesh)return;const key=o.uuid+':'+Math.floor(x/16)+':'+Math.floor(z/16);if(!groups.has(key))groups.set(key,{o,matrices:[]});groups.get(key).matrices.push(matrix.clone().multiply(inverse).multiply(o.matrixWorld));});}
    const stage=area.f,modulo=stage===0?7:3;
    for(let z=0;z<area.h;z++)for(let x=0;x<area.w;x++){
      if(!walk(x,z))continue;const seed=x*17+z*31;
      if(seed%modulo===0){add('v3_moss_veil',x*4,.015,z*4,seed%6,.65,1,.65);counts.moss++;}
      if(reserved(x,z))continue;
      const corners=[[-1,-1],[1,-1],[-1,1],[1,1]].filter(([dx,dz])=>!walk(x+dx,z)&&!walk(x,z+dz));
      if(corners.length&&seed%(stage===0?13:5)===0){const[dx,dz]=corners[0];add('legacy_pillar',x*4+dx*1.65,0,z*4+dz*1.65,0,.7,1,.7);counts.pillars++;}
      if(seed%(stage===0?17:7)===0){const side=[[1,0],[-1,0],[0,1],[0,-1]].find(([dx,dz])=>!walk(x+dx,z+dz));if(side){add('v3_shade_understory',x*4+side[0]*1.65,0,z*4+side[1]*1.65,seed,.55,.7,.55);counts.understory++;}}
      const vertical=walk(x,z-1)&&walk(x,z+1)&&!walk(x-1,z)&&!walk(x+1,z),horizontal=walk(x-1,z)&&walk(x+1,z)&&!walk(x,z-1)&&!walk(x,z+1);
      if(counts.arches<(stage===0?1:3)&&seed%5===0&&(vertical||horizontal)){add('v4_passage_arch',x*4,0,z*4,vertical?0:Math.PI/2,1,1,1);counts.arches++;}
    }
    for(const{o,matrices}of groups.values()){const b=new THREE.InstancedMesh(o.geometry,o.material,matrices.length);matrices.forEach((m,i)=>b.setMatrixAt(i,m));b.computeBoundingBox();b.computeBoundingSphere();b.userData.f1Progression=true;root.add(b);batches.push(b);}
    world.add(root);
    return{dispose,info:()=>({version:4,floor:area.f,sourceHashesVerified:true,counts,batches:batches.length,nativeMapUnchanged:true,disposed}),env:{background:0x0d1715,fog:{color:stage===0?0x11221d:0x15271e,density:.044},hemi:{sky:stage===0?0x95aaa2:0x9daa99,ground:0x263426,high:1.1,low:1.45}}};
  }catch(error){dispose();throw error;}
}
