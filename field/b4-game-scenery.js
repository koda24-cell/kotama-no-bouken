import * as THREE from 'three';
import { addB4AbandonedMine } from './b4-abandoned-mine.js?v=20261110-placement';
import { createB4MineRigProps } from './b4-mine-rig-props.js';
import { addB4FortressSkyline } from './b4-fortress-skyline.js?v=20261110-placement';
import { addB4CitadelBackdrop } from './b4-citadel-backdrop.js?v=20261110-placement';
import { planB4Scenery, fitB4Recess, batchB4Scenery } from './b4-placement.js';

export function addB4GameScenery({ root, map, ch, wallCell, hash, CELL }) {
  const plan = planB4Scenery(map, ch, wallCell, hash);
  const scenery = new THREE.Group(); scenery.name = 'b4:owned-scenery';
  scenery.userData.b4Owned = true; root.add(scenery);
  const stone = new THREE.MeshStandardMaterial({color: 0x443330, roughness: 1, flatShading: true});
  const iron = new THREE.MeshStandardMaterial({color: 0x51413b, roughness: .8, metalness: .25});
  const box = new THREE.BoxGeometry(1, 1, 1);
  const put = (parent, mat, x, y, z, sx, sy, sz) => {
    const mesh = new THREE.Mesh(box, mat); mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); parent.add(mesh);
  };
  const frame = (s, vista = false) => {
    const alcove = new THREE.Group(); alcove.name = vista ? 'b4:overlook' : 'b4:mine-alcove';
    alcove.userData.site = s;
    alcove.position.set((s.tx+s.dx/2)*CELL,0,(s.ty+s.dz/2)*CELL);
    alcove.rotation.y = Math.atan2(-s.dx,-s.dz); scenery.add(alcove);
    if (vista) {
      put(alcove,stone,0,.4,0,12,.8,.5); // visibly impassable, matching the unchanged solid cell
      for (const x of [-5.75,5.75]) put(alcove,stone,x,2,0,.5,4,.65);
      put(alcove,stone,0,3.8,0,12,.4,.65);
      for (const x of [-4.6,-2.3,0,2.3,4.6]) put(alcove,iron,x,.9,.05,.12,.35,.14);
    } else {
      put(alcove,stone,0,-.17,-1.8,4,.32,4);
      put(alcove,stone,0,2,-3.7,4,4,.2);
      for (const x of [-1.85,1.85]) put(alcove,stone,x,2,-1.8,.3,4,4);
      put(alcove,stone,0,3.95,-1.8,4,.2,4);
      put(alcove,stone,0,.1,.05,4,.2,.35); // raised rock lip, not a new walkable branch
    }
  };
  plan.mines.forEach(s => frame(s));
  const rigSite = plan.mines[0];
  if (rigSite) scenery.add(fitB4Recess(createB4MineRigProps({detail:'low'}), rigSite, CELL));
  addB4AbandonedMine({root:scenery,area:4,map,wallCell,hash,cellSize:CELL,sites:plan.mines.slice(1)});
  if (plan.vista) {
    frame(plan.vista,true);
    const x = plan.vista.tx*CELL, z=(plan.vista.ty-.5)*CELL;
    addB4CitadelBackdrop({root:scenery,area:4,map,cellSize:CELL,anchor:{x,z:z-22}});
    const skyline = new THREE.Group(); skyline.name='b4:overlook-spires';
    // The authored map coordinates are local to this small distant cluster.
    addB4FortressSkyline({root:skyline,area:4,map,wallCell,hash,cellSize:CELL,
      sites:[{tx:-3,ty:0,dx:0,dz:-1},{tx:3,ty:0,dx:0,dz:-1}]});
    skyline.position.set(x,-2,z-8); skyline.scale.setScalar(.65); scenery.add(skyline);
  }
  batchB4Scenery(scenery);
  const vistaFaces=plan.vista ? [-1,0,1].map(offset=>({...plan.vista,tx:plan.vista.tx+offset,wx:plan.vista.wx+offset,key:`${plan.vista.tx+offset},${plan.vista.ty}:0,-1`})) : [];
  const lights = plan.mines.map(s => ({world:new THREE.Vector3((s.tx+s.dx*.32)*CELL,2.6,(s.ty+s.dz*.32)*CELL),
    color:0xffb784,intensity:3,range:5,off:false}));
  return { ...plan, vistaFaces, lights, openings:new Set([...plan.mines, ...vistaFaces].map(s=>s.key)),
    excludedWalls: new Set([...plan.mines, ...vistaFaces].map(s=>`${s.wx},${s.wy}`)) };
}
