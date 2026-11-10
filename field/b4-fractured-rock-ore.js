/* B4 volcanic silhouette kit: exaggerated broken rocks and clustered ore.
 * Purely visual, anchored on wall cells; no game-state or collision changes.
 */
import * as THREE from 'three';
import { fitB4Recess, batchB4Scenery, disposeB4Owned } from './b4-placement.js';
export function createB4RockForms({root,map,wallCell,hash,CELL,objects=[],excludedWalls=new Set()}) {
  if(!root || !map || !wallCell)return 0;
  const group=new THREE.Group();group.name='b4:fractured-rock-and-ore';
  const rock=new THREE.MeshStandardMaterial({color:0x30272b,roughness:1,flatShading:true});
  const core=new THREE.MeshStandardMaterial({color:0x4c3230,roughness:0.91,flatShading:true});
  const ore=new THREE.MeshStandardMaterial({color:0x9e4933,roughness:0.48,metalness:0.18,flatShading:true});
  const materials=[rock,core,ore],geometries=[];
  // Each rock is a jagged asymmetrical icosahedron, with a strongly broken outline.
  const jagged=(seed)=>{
    const g=new THREE.IcosahedronGeometry(1,1),p=g.getAttribute('position');
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const a=Math.sin(x*8.3+y*3.2+seed)*Math.cos(z*7.1-y*4.7);
      const b=Math.sin(x*14.3+z*6.8+seed*2.1);
      const factor=1+a*0.25+b*0.11;
      p.setXYZ(i,x*factor+(y>0?y*y*0.19:0),y*factor,z*factor+(x<0?-0.1:0));
    }
    g.computeVertexNormals();geometries.push(g);return g;
  };
  const rockGeos=[jagged(1),jagged(3),jagged(7)];
  const crystal=new THREE.CylinderGeometry(0,0.62,1,5,1);crystal.translate(0,0.5,0);geometries.push(crystal);
  const mesh=(geo,mat,x,y,z,sx,sy,sz,rx=0,rz=0)=>{
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);
    m.rotation.set(rx,0,rz);cluster.add(m);return m;
  };
  let clusters=0, cluster;
  for(let ty=1;ty<map.h-1 && clusters<20;ty++)for(let tx=1;tx<map.w-1 && clusters<20;tx++){
    if(excludedWalls.has(tx+','+ty) || !wallCell(tx,ty) || hash(tx,ty,301)>0.14)continue;
    // Only solid wall cells adjacent to a visible walkable cell can host the cluster.
    const sides=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dz])=>
      !wallCell(tx+dx,ty+dz)&&objects.every(o=>Math.abs(o.tx-tx-dx)+Math.abs(o.ty-ty-dz)>1));
    if(!sides.length)continue;
    const [dx,dz]=sides[0],x=0,z=0;
    cluster=new THREE.Group();
    const scale=0.7+hash(tx,ty,302)*1.15;
    // A dominant jagged monolith, two angled shards and small scree.
    mesh(rockGeos[0],rock,x,1.2*scale,z,0.85*scale,1.75*scale,0.8*scale,0.23,-0.24);
    mesh(rockGeos[1],rock,x+0.55*scale,0.6*scale,z-0.38*scale,0.7*scale,1.0*scale,0.68*scale,-0.4,0.65);
    mesh(rockGeos[2],core,x-0.6*scale,0.38*scale,z+0.28*scale,0.8*scale,0.5*scale,0.7*scale,0.2,-0.5);
    for(let i=0;i<5;i++){
      const angle=i*2.399+hash(tx,ty,303)*6.28;
      const radius=(0.3+hash(tx,ty,304+i)*0.5)*scale;
      mesh(rockGeos[i%3],rock,x+Math.cos(angle)*radius,0.12*scale,z+Math.sin(angle)*radius,
        0.18*scale,0.22*scale,0.2*scale,0,angle*0.15);
    }
    // Giant + medium + tiny ore crystals interlock into one readable silhouette.
    if(hash(tx,ty,310)<0.65){
      const count=6+Math.floor(hash(tx,ty,311)*7);
      for(let i=0;i<count;i++){
        const a=i*2.399+hash(tx,ty,312)*6.28;
        const radius=(0.12+Math.sqrt(i/count)*0.7)*scale;
        const height=(i===0?3.3:i<4?1.6:0.4+hash(tx,ty,320+i))*scale;
        const c=mesh(crystal,ore,x+Math.cos(a)*radius,0.12*scale,z+Math.sin(a)*radius,
          (i===0?0.72:0.15+hash(tx,ty,340+i)*0.36)*scale,height,
          (i===0?0.72:0.15+hash(tx,ty,350+i)*0.36)*scale);
        c.rotation.z=Math.cos(a)*0.22;c.rotation.x=Math.sin(a)*0.22;
      }
    }
    const slot=fitB4Recess(cluster,{tx:tx+dx,ty:ty+dz,dx:-dx,dz:-dz},CELL,[2.65,3.45,.85]);
    // Wall relief, up to 0.75m from the boundary, leaving the central camera lane clear.
    cluster.position.z+=.9;
    group.add(slot);
    clusters++;
  }
  if(clusters){batchB4Scenery(group);root.add(group);}else{geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
  group.userData.disposeB4RockForms=()=>disposeB4Owned(group);
  return clusters;
}
