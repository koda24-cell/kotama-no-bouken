/* Shape-led volcanic dressing. All solids stay outside the central camera lane. */
import * as THREE from 'three';
import { batchB4Scenery } from './b4-placement.js?v=20261110-quality';

export function addB4VolcanicDetail({root,map,ch,wallCell,hash,CELL,plan,surfaces}) {
  const group=new THREE.Group();group.name='b4:volcanic-detail';group.userData.b4Owned=true;root.add(group);
  const column=new THREE.CylinderGeometry(.34,.43,1,6,1),rock=new THREE.IcosahedronGeometry(1,0);
  // Eroded, asymmetrical rock shared by the mantle, shoreline and rubble.
  const p=rock.getAttribute('position');
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+Math.sin(x*7+y*4-z*6)*.17;p.setXYZ(i,x*k,y*k,z*k);}
  rock.computeVertexNormals();
  const box=new THREE.BoxGeometry(1,1,1);
  const put=(parent,geo,mat,x,y,z,sx,sy,sz,rz=0)=>{
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.z=rz;parent.add(m);return m;
  };
  const reserved=map.objects || [],safe=(x,y)=>reserved.every(o=>Math.abs(o.tx-x)+Math.abs(o.ty-y)>1);
  let panels=0,crust=0;const used=new Set(),lavaLights=[];
  for(let y=1;y<map.h-1;y++)for(let x=1;x<map.w-1;x++){
    if(wallCell(x,y))continue;
    const c=ch(x,y),wx=x*CELL,wz=y*CELL;
    if(c==='*'||c==='~'){
      // An unbroken lava sheet under the cooling plates hides the old black tile grid.
      for(let i=0;i<3 && crust<150;i++){
        const size=.32+hash(x,y,713+i)*.58;
        const m=put(group,rock,surfaces.basalt,wx+(hash(x,y,723+i)-.5)*3.1,.035,wz+(hash(x,y,733+i)-.5)*3.1,size,.10+size*.06,size*.8);
        m.rotation.y=hash(x,y,743+i)*6.28;crust++;
      }
      if(hash(x,y,750)<.24)lavaLights.push({world:new THREE.Vector3(wx,.6,wz),color:0xff6a22,intensity:5.2,range:7,off:false});
      for(const [dx,dz]of[[0,-1],[1,0],[0,1],[-1,0]]){
        if(wallCell(x+dx,y+dz)||['*','~'].includes(ch(x+dx,y+dz)))continue;
        for(let i=0;i<3;i++){
          const t=(i-1)*1.15;
          put(group,rock,surfaces.basalt,wx+dx*1.9+dz*t,.015,wz+dz*1.9-dx*t,.65,.12,.58);
        }
      }
    }
    if(c!=='.' || !safe(x,y) || panels>=46)continue;
    for(const [dx,dz]of[[0,-1],[1,0],[0,1],[-1,0]]){
      const wallKey=`${x+dx},${y+dz}`;
      if(!wallCell(x+dx,y+dz)||ch(x+dx,y+dz)!=='#'||used.has(wallKey)||plan.excludedWalls.has(wallKey)||hash(x,y,760+dx+dz*3)>.19)continue;
      used.add(wallKey);
      const face=new THREE.Group();face.position.set(wx+dx*2,0,wz+dz*2);face.rotation.y=Math.atan2(-dx,-dz);group.add(face);
      // Uneven hexagonal basalt organ pipes: their front stays <=0.65m from the wall.
      for(let i=0;i<4;i++){
        const h=2.65+hash(x+i,y,770)*1.25;
        put(face,column,surfaces.basalt,-1.42+i*.92,h*.5,.32,.68,h,.68,(hash(x+i,y,771)-.5)*.035);
        put(face,rock,surfaces.ash,-1.42+i*.92,.18,.02,.34,.24,.30);
        // Distinct horizontal joints make the columns read as fractured basalt.
        for(const ratio of [.35,.72])put(face,column,surfaces.ash,-1.42+i*.92,h*ratio,.32,.70,.075,.70);
      }
      // Cantilevered cave lip sits above the eye line; never a gameplay obstruction.
      for(let i=0;i<3;i++)put(face,rock,surfaces.basalt,-1.28+i*1.24,3.8+(i%2)*.12,.06,.74,.35,.40);
      // Three scorched claw scars, carved as broken glowing seams, not an enemy trigger.
      if(hash(x,y,780)<.22)for(let i=0;i<3;i++){
        const crack=put(face,box,surfaces.ember,(i-1)*.32,2.2,.65,.025,1.05,.018,(i-1)*.10);
        crack.rotation.x=.05;
      }
      if(map.f===2)for(const height of [4.5,6.4])for(let i=0;i<3;i++)put(face,rock,surfaces.basalt,-1.25+i*1.2,height,.08,.8,.55,.42,(i-1)*.17);
      panels++;break;
    }
  }
  // Original charcoal boulders break the smooth square frames of the mine entrances.
  for(const s of plan.mines){
    const edge=new THREE.Group();edge.position.set((s.tx+s.dx/2)*CELL,0,(s.ty+s.dz/2)*CELL);edge.rotation.y=Math.atan2(-s.dx,-s.dz);group.add(edge);
    for(const side of [-1,1])for(let i=0;i<6;i++){
      put(edge,rock,surfaces.basalt,side*1.85,.32+i*.64,-.10,.28+(i%2)*.08,.42,.32,(i-2)*.07);
    }
    for(let i=0;i<5;i++)put(edge,rock,surfaces.basalt,-1.65+i*.82,3.92,-.10,.53,.27,.38,(i-2)*.05);
  }
  // Spread candidates over the whole stratum rather than exhausting the quota in the first rows.
  lavaLights.sort((a,b)=>hash(a.world.x,a.world.z,840)-hash(b.world.x,b.world.z,840));
  const distributed=[];
  for(const light of lavaLights)if(distributed.length<24 && distributed.every(l=>l.world.distanceTo(light.world)>=CELL*2.2))distributed.push(light);
  lavaLights.length=0;lavaLights.push(...distributed);
  batchB4Scenery(group);
  // A single Points draw replaces scores of individually animated ember meshes.
  const positions=[];
  for(let y=1;y<map.h-1;y++)for(let x=1;x<map.w-1;x++)if(['*','~'].includes(ch(x,y)) && positions.length<180*3){
    for(let i=0;i<2;i++)positions.push(x*CELL+(hash(x,y,801+i)-.5)*3.2,.45+hash(x,y,811+i)*2.4,y*CELL+(hash(x,y,821+i)-.5)*3.2);
  }
  const particleGeo=new THREE.BufferGeometry();particleGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const particleMat=new THREE.PointsMaterial({color:0xffb264,size:.085,transparent:true,opacity:.8,depthWrite:false,sizeAttenuation:true});
  const particles=new THREE.Points(particleGeo,particleMat);particles.name='b4:embers';group.add(particles);
  particleGeo.computeBoundingSphere();if(particleGeo.boundingSphere)particleGeo.boundingSphere.radius+=3;
  const original=new Float32Array(positions);
  return {lights:lavaLights,info:{basaltPanels:panels,coolingPlates:crust,embers:positions.length/3},
    tick(now){const t=now*.001,attr=particleGeo.getAttribute('position');
      for(let i=0;i<attr.count;i++)attr.setY(i,.3+(original[i*3+1]+t*.35)%3);attr.needsUpdate=true;
      lavaLights.forEach((l,i)=>{l.intensity=5.1+Math.sin(t*1.3+i*2.4)*.35;});
    }
  };
}
