/* Opt-in, hash-pinned review dressing. Whole source meshes retained near camera. */
import * as THREE from 'three';
import {grassCutoutMaterialV6} from './f1-grass-cutout-lighting-v6.js';
import {retainFirstLayerSource} from './field-3d-b1-sacred-trial.js';
export async function buildFirstLayerNatureV6({world,area,openTiles,walkTiles}){
 const response=await fetch(new URL('../assets/3d/dungeons/b1_nature_v6_candidates/catalog.json',import.meta.url));
 if(!response.ok)throw Error('V6 nature catalog unavailable');
 const catalog=await response.json(),root=new THREE.Group(),held=[],sources=new Map(),groups=new Map(),batches=[],hidden=[],ownedMaterials=[],materials=new Map();
 root.name='f1-v6:understory-and-wall-transition';let disposed=false;
 const counts={plants:{sedge:0,trifoliate:0,fern:0},rocks:{schist:0,fractured:0,riverstones:0},walls:{wall_a:0,wall_b:0,wall_c:0}};
 function dispose(){if(disposed)return;disposed=true;root.removeFromParent();hidden.forEach(o=>o.visible=true);batches.forEach(o=>o.dispose());ownedMaterials.forEach(m=>m.dispose());held.forEach(o=>o.release());root.clear();}
 try{
  for(const name of ['sedge','trifoliate','fern','schist','fractured','riverstones',...(area.f===1?['wall_a','wall_b','wall_c']:[])]){
   const d=catalog.sources.find(s=>s.name===name);if(!d)throw Error('Missing V6 asset '+name);
   const heldSource=await retainFirstLayerSource(d.file,d.sha256);held.push(heldSource);sources.set(name,heldSource.source);
  }
  const walk=new Set(walkTiles.map(t=>t.join(','))),opens=new Set(openTiles.map(t=>t.join(',')));
  const add=(id,x,y,z,ry=0,sx=1,sy=sx,sz=sx)=>{
   const source=sources.get(id),matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ry),new THREE.Vector3(sx,sy,sz));
   source.updateMatrixWorld(true);const inv=source.matrixWorld.clone().invert();
   source.traverse(o=>{if(!o.isMesh)return;const key=id+':'+o.uuid+':'+Math.floor(x/16)+':'+Math.floor(z/16);if(!groups.has(key))groups.set(key,{o,matrices:[],wall:id.startsWith('wall_')});groups.get(key).matrices.push(matrix.clone().multiply(inv).multiply(o.matrixWorld));});
  };
  for(const[x,z]of walkTiles){
   const seed=x*17+z*31+area.f*41,stair=area.objects.some(o=>o.kind==='stairs'&&o.tx===x&&o.ty===z);

   for(const[i,[dx,dz]]of [[-1,-1],[1,-1],[-1,1],[1,1]].entries()){
    // Every cardinal view has a tall corner plant. Central 1.8m lane stays clear.
    const tall=i===0||i===3,id=tall?(seed+i)%4===0?'fern':'sedge':'trifoliate';
    const jitter=((seed+i*7)%7-3)*.02,offset=stair?1.65:tall?1.5:1.43,scale=stair?.6:(tall?.86:.9)+(seed+i)%5*.025;
    add(id,x*4+dx*(offset+jitter),0,z*4+dz*(offset-jitter),seed+i*1.7,scale);counts.plants[id]++;
    if(!stair){add('trifoliate',x*4+dx*1.2,0,z*4+dz*1.62,seed+i*2.3,.65+(seed+i)%3*.035);counts.plants.trifoliate++;const companion=id==='fern'?'sedge':'fern';add(companion,x*4+dx*1.64,0,z*4+dz*1.19,seed+i*2.7,.56+(seed+i)%3*.035);counts.plants[companion]++;}
   }
   if(stair)continue;
   if(seed%3!==0){const side=[[1,0],[-1,0],[0,1],[0,-1]].find(([dx,dz])=>!opens.has((x+dx)+','+(z+dz)));if(side){const[dx,dz]=side;add('trifoliate',x*4+dx*1.62+dz*((seed%7)-3)*.12,0,z*4+dz*1.62-dx*((seed%7)-3)*.12,seed,.8);counts.plants.trifoliate++;}}
   for(const[dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]])if(!opens.has((x+dx)+','+(z+dz)))for(const t of[-.55,.55]){const id=(seed+(t>0?1:0))%3===0?'fern':'sedge';add(id,x*4+dx*1.5+dz*t,0,z*4+dz*1.5-dx*t,seed+t,.78+(seed%4)*.025);counts.plants[id]++;}
   const i=seed%4,[dx,dz]=[[-1,-1],[1,-1],[-1,1],[1,1]][i],id=['schist','fractured','riverstones'][seed%3];
   add(id,x*4+dx*1.59,0,z*4+dz*1.59,seed,.72);counts.rocks[id]++;
  }
  if(area.f===1){
   const near=(x,z)=>[[x+1,z],[x-1,z],[x,z+1],[x,z-1]];
   function distances(origin){const d=new Map([[origin.tx+','+origin.ty,0]]),q=[[origin.tx,origin.ty]];for(let i=0;i<q.length;i++)for(const p of near(...q[i])){const k=p.join(',');if(walk.has(k)&&!d.has(k)){d.set(k,d.get(q[i].join(','))+1);q.push(p);}}return d;}
   const up=distances(area.up),down=distances(area.down);
   for(const[x,z]of openTiles){const k=x+','+z,du=up.get(k)??0,dd=down.get(k)??0,t=du/Math.max(1,du+dd),id=t<.34?'wall_a':t<.67?'wall_b':'wall_c';
    for(const[dx,dz,ry]of [[0,-1,0],[1,0,-Math.PI/2],[0,1,Math.PI],[-1,0,Math.PI/2]])if(!opens.has((x+dx)+','+(z+dz))){add(id,x*4+dx*2,0,z*4+dz*2,ry);counts.walls[id]++;}
   }
  }
  for(const{o,matrices,wall}of groups.values()){
   const b=new THREE.InstancedMesh(o.geometry,(()=>{if(!/v6_(sedge|trifoliate|fern)_cutout/.test(o.material.name))return o.material;if(!materials.has(o.material)){const m=grassCutoutMaterialV6(o.material);materials.set(o.material,m);ownedMaterials.push(m);}return materials.get(o.material);})(),matrices.length);matrices.forEach((m,i)=>b.setMatrixAt(i,m));b.computeBoundingBox();b.computeBoundingSphere();b.userData.v6Wall=wall;root.add(b);batches.push(b);
  }
  // Commit only once every asset and batch is ready. Failed loads leave native walls visible.
  if(area.f===1)world.traverse(o=>{if(o.userData.firstStratumNativeWall&&o.visible){hidden.push(o);o.visible=false;}});
  world.add(root);
  return{dispose,update:(x,z)=>{for(const b of batches){if(b.userData.v6Wall)continue;const s=b.boundingSphere;b.visible=Math.hypot(s.center.x-x,s.center.z-z)<30+s.radius;}},info:()=>({version:6,sourceHashesVerified:true,counts,batches:batches.length,hiddenNativeWalls:hidden.length,distanceCullMeters:30,wholeSourceMeshes:true,disposed})};
 }catch(error){dispose();throw error;}
}
