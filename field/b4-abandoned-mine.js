/* B4 abandoned mine vignette: exaggerated silhouettes, no gameplay/collision changes. */
import * as THREE from 'three';
export function addB4AbandonedMine({root,area,map,wallCell,hash,cellSize,objects=[]}) {
  if(area!==4||!root||!map)return 0;
  const group=new THREE.Group();group.name='b4:abandoned-mine';
  const timber=new THREE.MeshStandardMaterial({color:0x3d2824,roughness:1});
  const iron=new THREE.MeshStandardMaterial({color:0x383b3c,metalness:.35,roughness:.83});
  const ore=new THREE.MeshStandardMaterial({color:0x675049,roughness:.88,flatShading:true});
  const mats=[timber,iron,ore];
  const box=new THREE.BoxGeometry(1,1,1);
  const wheel=new THREE.TorusGeometry(.27,.075,5,9);
  const jagged=new THREE.IcosahedronGeometry(1,1);
  const pick=new THREE.ConeGeometry(.11,.65,5);
  const geometries=[box,wheel,jagged,pick];
  const put=(geo,mat,x,y,z,sx=1,sy=1,sz=1,rz=0)=>{
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.z=rz;group.add(m);return m;
  };
  const reserved=new Set(objects.map(o=>o.tx+','+o.ty));
  let sites=0;
  for(let ty=1;ty<map.h-1&&sites<6;ty++)for(let tx=1;tx<map.w-1&&sites<6;tx++){
    if(wallCell(tx,ty)||reserved.has(tx+','+ty)||hash(tx,ty,310)>.065)continue;
    const directions=[[1,0],[-1,0],[0,1],[0,-1]];
    const neighbor=directions.find(([dx,dz])=>wallCell(tx+dx,ty+dz));
    if(!neighbor)continue;
    const [dx,dz]=neighbor;
    // Entire vignette is embedded into an adjacent solid wall cell.
    const x=(tx+dx)*cellSize,z=(ty+dz)*cellSize;
    const angle=Math.atan2(dx,dz);
    const site=new THREE.Group();site.position.set(x,0,z);site.rotation.y=angle;group.add(site);
    const start=group; // build local shapes then reparent without changing their local coordinates
    const initial=group.children.length;
    // Broken timber arch and mining shaft frame.
    put(box,timber,-1.2,1.55,0,.25,3.1,.3,-.12);
    put(box,timber,1.1,1.25,0,.27,2.5,.3,.18);
    put(box,timber,-.1,3.05,0,2.7,.25,.32,.12);
    put(box,iron,0,.05,-.5,2.5,.09,.13);
    put(box,iron,0,.05,.5,2.5,.09,.13);
    // Distorted cart body, raised ore mound, four wheels.
    put(box,iron,0,.76,0,1.65,.65,1.1,.08);
    put(box,iron,-.85,.8,0,.13,.8,1.25,-.2);
    for(const sx of [-.65,.65])for(const sz of [-.62,.62]){
      const w=put(wheel,iron,sx,.34,sz);w.rotation.y=Math.PI/2;
    }
    for(let i=0;i<7;i++){
      const ox=(hash(tx,ty,320+i)-.5)*1.3,oz=(hash(tx,ty,340+i)-.5)*.8;
      const rock=put(jagged,ore,ox,1.2+hash(tx,ty,360+i)*.45,oz,.23+hash(tx,ty,380+i)*.2,.35+hash(tx,ty,400+i)*.3,.28);
      rock.rotation.set(hash(tx,ty,420+i),hash(tx,ty,440+i)*6,hash(tx,ty,460+i));
    }
    // Oversized pickaxe leaned against the broken frame.
    put(box,timber,1.5,.85,.5,.12,1.65,.12,.36);
    const blade=put(pick,iron,1.24,1.65,.5,.7,1.5,.6);blade.rotation.z=Math.PI/2;
    // Craggy rubble silhouettes around the mine entrance.
    for(let i=0;i<5;i++){
      const rock=put(jagged,ore,-1.5+(i%3)*1.4,.22,-1.1+Math.floor(i/3)*2,.55,.45,.65);
      rock.rotation.y=hash(tx,ty,500+i)*6;
    }
    // Move the newly-created meshes into the wall-cell-local group.
    const newly=group.children.slice(initial);
    for(const mesh of newly){group.remove(mesh);site.add(mesh);}
    sites++;
  }
  if(!sites){geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());return 0;}
  group.userData.disposeFortress=()=>{geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());};
  root.add(group);return sites;
}
