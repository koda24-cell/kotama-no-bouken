/* Gradual first-stratum art progression, opt-in only. Native maps/objects stay authoritative. */
import * as THREE from 'three';
import {firstLayerTransition} from './f1-transition-v7.js';
import {retainFirstLayerSource} from './field-3d-b1-sacred-trial.js';
export async function buildFirstLayerProgression({world,area}){
  if(area.n!==1||![0,1].includes(area.f))throw new Error('Progression dressing only accepts first-stratum 1F/2F');
  const url=new URL('../assets/3d/dungeons/b1_sacred_forest_candidates/scene/game-layout-v5.json',import.meta.url);
  const response=await fetch(url);if(!response.ok)throw new Error('Progression catalog unavailable');
  const catalog=await response.json(),ids=['v3_moss_veil','v3_shade_understory','legacy_pillar','v4_passage_arch'];
  const ownMaterials=[],materialRestores=new Map(),held=[],root=new THREE.Group(),sources=new Map(),batches=[];root.name='f1-v4:gradual-progression';let disposed=false,seal=null;
  function dispose(){if(disposed)return;disposed=true;seal?.dispose();root.removeFromParent();for(const [mesh,material]of materialRestores)mesh.material=material;for(const m of ownMaterials)m.dispose();for(const b of batches)b.dispose();root.clear();held.forEach(s=>s.release());}
  try{
    // Serial asset load: source cache is shared with the later 3F trial.
    for(const id of ids){const descriptor=catalog.revisionSources.find(s=>s.id===id);if(!descriptor)throw new Error('Missing progression source '+id);const source=await retainFirstLayerSource(descriptor.file,descriptor.sha256);held.push(source);sources.set(id,source.source);}
    const map=area.floor.map,groups=new Map(),portals=[],counts={moss:0,understory:0,pillars:0,arches:0};
    const walkable=new Set(area.reviewWalkableTiles.map(t=>t.join(',')));
    const walk=(x,z)=>walkable.has(x+','+z);
    const reserved=(x,z)=>area.objects.some(o=>Math.abs(o.tx-x)+Math.abs(o.ty-z)<=1);
    function add(id,x,y,z,ry,sx,sy,sz){const source=sources.get(id),matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ry),new THREE.Vector3(sx,sy,sz));source.updateMatrixWorld(true);const inverse=source.matrixWorld.clone().invert();source.traverse(o=>{if(!o.isMesh)return;const key=o.uuid+':'+Math.floor(x/16)+':'+Math.floor(z/16);if(!groups.has(key))groups.set(key,{o,matrices:[]});groups.get(key).matrices.push(matrix.clone().multiply(inverse).multiply(o.matrixWorld));});}
    const stage=area.f,transition=firstLayerTransition(area,area.reviewWalkableTiles);
    for(let z=0;z<area.h;z++)for(let x=0;x<area.w;x++){
      if(!walk(x,z))continue;const seed=x*17+z*31,u=transition.blend(x,z),modulo=Math.round(7-4*u);
      if(seed%modulo===0){add('v3_moss_veil',x*4,.015,z*4,seed%6,.65,1,.65);counts.moss++;}
      if(reserved(x,z))continue;
      const corners=[[-1,-1],[1,-1],[-1,1],[1,1]].filter(([dx,dz])=>!walk(x+dx,z)&&!walk(x,z+dz));
      if(corners.length&&seed%Math.round(13-8*u)===0){const[dx,dz]=corners[0];add('legacy_pillar',x*4+dx*1.65,0,z*4+dz*1.65,0,.7,1,.7);counts.pillars++;}
      if(seed%Math.round(17-10*u)===0){const side=[[1,0],[-1,0],[0,1],[0,-1]].find(([dx,dz])=>!walk(x+dx,z+dz));if(side){add('v3_shade_understory',x*4+side[0]*1.65,0,z*4+side[1]*1.65,seed,.55,.7,.55);counts.understory++;}}
      const vertical=walk(x,z-1)&&walk(x,z+1)&&!walk(x-1,z)&&!walk(x+1,z),horizontal=walk(x-1,z)&&walk(x+1,z)&&!walk(x,z-1)&&!walk(x,z+1);
      if(counts.arches<(stage===0?1:3)&&seed%5===0&&(vertical||horizontal)){const position=[x*4+(horizontal?2:0),0,z*4+(vertical?2:0)],rotationY=vertical?0:Math.PI/2;add('v4_passage_arch',...position,rotationY,1,1,1);portals.push({position,rotationY});counts.arches++;}
    }
    for(const{o,matrices}of groups.values()){const b=new THREE.InstancedMesh(o.geometry,o.material,matrices.length);matrices.forEach((m,i)=>b.setMatrixAt(i,m));b.computeBoundingBox();b.computeBoundingSphere();b.userData.f1Progression=true;root.add(b);batches.push(b);}
    // Retain the native stone silhouettes/UVs; progressively add the verified stone surface.
    let stone=null;sources.get('v4_passage_arch').traverse(o=>{for(const m of o.isMesh?(Array.isArray(o.material)?o.material:[o.material]):[])if(m.name==='sacred_weathered_stone')stone=m;});
    if(!stone?.map||!stone.normalMap)throw new Error('Verified stone surface is unavailable');
    const detailBlend=stage===0?.38:.68,replacements=new Map();
    function detailed(original,level){
      if(!/^stone_(wall|wall_mossy|floor|dark|block)$/.test(original.name))return original;
      const key=original.uuid+':'+level,amount=level/4,blend=.38+.30*amount;
      if(replacements.has(key))return replacements.get(key);
      const material=original.clone();material.name='f1-v4:detail:'+original.name;
      material.normalMap=stone.normalMap;material.normalScale.set(.28+.22*amount,.28+.22*amount);material.roughnessMap=stone.roughnessMap;material.roughness=.93;
      material.customProgramCacheKey=()=> 'first-layer-stone-detail-v7-'+level;
      material.onBeforeCompile=shader=>{
        shader.uniforms.firstLayerStoneMap={value:stone.map};
        shader.vertexShader='varying vec2 vFirstLayerStoneUV;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vFirstLayerStoneUV=uv;');
        shader.fragmentShader='varying vec2 vFirstLayerStoneUV;\nuniform sampler2D firstLayerStoneMap;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 vec3 detailStone=texture2D(firstLayerStoneMap,vFirstLayerStoneUV*1.7).rgb;
 diffuseColor.rgb=mix(diffuseColor.rgb,detailStone,${blend.toFixed(3)});`);
      };
      replacements.set(key,material);ownMaterials.push(material);return material;
    }
    world.updateMatrixWorld(true);
    world.traverse(mesh=>{if(!mesh.isMesh)return;const p=mesh.getWorldPosition(new THREE.Vector3()),level=Math.round(transition.blend(Math.round(p.x/4),Math.round(p.z/4))*4),original=mesh.material;const changed=Array.isArray(original)?original.map(m=>detailed(m,level)):detailed(original,level);if(changed!==original){materialRestores.set(mesh,original);mesh.material=changed;}});
    const {createCeilingSealV5}=await import('./f1-ceiling-seal-v5.js');
    const opens=new Set(area.reviewOpenTiles.map(t=>t.join(','))),caps=[];
    for(const[x,z]of area.reviewOpenTiles)for(const[dx,dz,rot]of[[0,-1,0],[1,0,-Math.PI/2],[0,1,Math.PI],[-1,0,Math.PI/2]])if(!opens.has((x+dx)+','+(z+dz)))caps.push({position:[x*4+dx*2,0,z*4+dz*2],rotationY:rot});
    seal=createCeilingSealV5({root,tiles:Array.from({length:area.h},(_,z)=>Array.from({length:area.w},(_,x)=>[x,z])).flat(),walls:caps,fullBacking:true,source:sources.get('v4_passage_arch')});
    world.add(root);
    return{dispose,cameraPortals:()=>portals,info:()=>({version:4,floor:area.f,sourceHashesVerified:true,counts,stoneDetailBlend:detailBlend,stoneMaterials:ownMaterials.length,ceilingSeal:seal?.info(),batches:batches.length,nativeMapUnchanged:true,disposed}),env:{background:0x0d1715,fog:{color:stage===0?0x11221d:0x15271e,density:.044},hemi:{sky:stage===0?0x95aaa2:0x9daa99,ground:0x263426,high:1.1,low:1.45}}};
  }catch(error){dispose();throw error;}
}
