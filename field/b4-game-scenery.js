import * as THREE from 'three';
import { addB4AbandonedMine } from './b4-abandoned-mine.js?v=20261110-quality';
import { createB4MineRigProps } from './b4-mine-rig-props.js';
import { addB4FortressSkyline } from './b4-fortress-skyline.js?v=20261110-placement';
import { addB4CitadelBackdrop } from './b4-citadel-backdrop.js?v=20261110-quality';
import { planB4Scenery, fitB4Recess, batchB4Scenery } from './b4-placement.js?v=20261110-quality';

export function addB4GameScenery({ root, map, ch, wallCell, hash, CELL, surfaces }) {
  const plan = planB4Scenery(map, ch, wallCell, hash);
  const scenery = new THREE.Group(); scenery.name = 'b4:owned-scenery';
  scenery.userData.b4Owned = true; root.add(scenery);
  const stone = new THREE.MeshStandardMaterial({color: 0x443330, roughness: 1, flatShading: true});
  const iron = new THREE.MeshStandardMaterial({color: 0x51413b, roughness: .8, metalness: .25});
  const box = new THREE.BoxGeometry(1, 1, 1);
  const put = (parent, mat, x, y, z, sx, sy, sz) => {
    const mesh = new THREE.Mesh(box, mat); mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); parent.add(mesh);
  };
  const lipRock = new THREE.IcosahedronGeometry(1, 0);
  { const p=lipRock.getAttribute('position');
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+Math.sin(x*5.1+y*3.3-z*4.7)*.22;p.setXYZ(i,x*k,y*k*.8,z*k);}
    lipRock.computeVertexNormals(); }
  // Superellipse tunnel: t=0 is the wall mouth (fills the 4m opening), t=1 the
  // rounded back. Displacement only moves vertices inwards, so the shell never
  // leaves |x|<1.86, z>-3.75, y<4 — inside the reserved solid cell.
  const grottoGeo = seed => {
    const U=26,V=11,D=3.62,pos=[],uv=[],idx=[];
    const noise=(x,y,z)=>.5+.5*Math.sin(x*2.1+y*1.3+seed)*Math.cos(y*1.7-z*1.9+seed*.7)
      +.35*(.5+.5*Math.sin(x*5.3-z*4.1+y*3.7+seed*2))+.18*(.5+.5*Math.sin(x*11.7+y*9.1-z*7.3+seed));
    for(let v=0;v<=V;v++){
      const t=v/V,w=1.84-.34*Math.pow(t,1.5),h=3.92-1.05*Math.pow(t,1.6),n=8-5.4*t,z=-t*D;
      for(let u=0;u<=U;u++){
        const a=u/U*Math.PI,c=Math.cos(a),s=Math.sin(a);
        let x=w*Math.sign(c)*Math.pow(Math.abs(c),2/n),y=h*Math.pow(s,2/n)-.06;
        const dx=x/w,dy=Math.max(0,y)/h*.9,len=Math.hypot(dx,dy)||1;
        const d=noise(x,y,z)*(.07+.36*t)*(y<.05?.6:1);
        x-=dx/len*d;y-=dy/len*d;
        pos.push(x,y,z);uv.push(a/Math.PI*2.6,t*1.1+y*.12);
      }
    }
    // Back cap fan, pushed slightly outwards for a rounded end.
    const centre=pos.length/3;pos.push(0,1.25,-D-.1);uv.push(1.3,1.3);
    for(let v=0;v<V;v++)for(let u=0;u<U;u++){
      const a=v*(U+1)+u,b=a+U+1;idx.push(a,b,a+1,b,b+1,a+1);
    }
    for(let u=0;u<U;u++)idx.push(V*(U+1)+u,centre,V*(U+1)+u+1);
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geo.setIndex(idx);geo.computeVertexNormals();return geo;
  };
  const frame = (s, vista = false) => {
    const alcove = new THREE.Group(); alcove.name = vista ? 'b4:overlook' : 'b4:mine-alcove';
    alcove.userData.site = s;
    alcove.position.set((s.tx+s.dx/2)*CELL,0,(s.ty+s.dz/2)*CELL);
    alcove.rotation.y = Math.atan2(-s.dx,-s.dz); scenery.add(alcove);
    // The boss-floor cavern is taller; close the rock above the same 4m recess/window.
    if(map.f===2)put(alcove,stone,0,6.05,0,vista ? 12 : 4,4.1,.3);
    if (vista) {
      for(let i=0;i<12;i++){
        put(alcove,stone,-5.5+i,.14,0,.98,.28,.5);
        put(alcove,stone,-5.5+i,.405,0,.98,.25,.56);
      } // visibly impassable, matching the unchanged solid cell
      for (const x of [-5.75,5.75]) put(alcove,stone,x,2,0,.5,4,.65);
      put(alcove,stone,0,3.8,0,12,.4,.65);
      for (const x of [-4.6,-2.3,0,2.3,4.6]) put(alcove,iron,x,.65,.05,.12,.35,.14);
      put(alcove,iron,0,.82,.05,11.5,.10,.14);
    } else {
      put(alcove,stone,0,-.17,-1.8,4,.32,4);
      // Irregular eroded grotto instead of a four-sided box: square at the wall
      // mouth, rounding and narrowing towards the back, all inside the solid cell.
      const cave=new THREE.Mesh(grottoGeo(hash(s.wx,s.wy,881)*20),surfaces?.grotto || stone);
      cave.name='b4:mine-grotto';alcove.add(cave);
      // Raised broken-rock lip, not a new walkable branch.
      for(let i=0;i<7;i++){
        const r=new THREE.Mesh(lipRock,surfaces?.basalt || stone);
        r.position.set(-1.65+i*.55+(hash(s.wx+i,s.wy,883)-.5)*.16,.07,.04+(hash(s.wx,s.wy+i,884)-.5)*.12);
        r.scale.set(.30+hash(s.wx+i,s.wy,885)*.14,.13+hash(s.wx+i,s.wy,886)*.1,.22);
        r.rotation.y=hash(s.wx+i,s.wy,887)*6.28;alcove.add(r);
      }
      // Fallen scree banked against the grotto sides, away from the corridor.
      for(const side of [-1,1])for(let i=0;i<3;i++){
        const r=new THREE.Mesh(lipRock,surfaces?.basalt || stone);
        r.position.set(side*(1.38-i*.06),.12+i*.05,-.7-i*1.0);
        r.scale.set(.38,.28+hash(s.wx,s.wy,890+i)*.2,.5);r.rotation.y=hash(s.wx+side,s.wy,893+i)*6.28;alcove.add(r);
      }
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
  surfaces?.apply(scenery);
  batchB4Scenery(scenery);
  const vistaFaces=plan.vista ? [-1,0,1].map(offset=>({...plan.vista,tx:plan.vista.tx+offset,wx:plan.vista.wx+offset,key:`${plan.vista.tx+offset},${plan.vista.ty}:0,-1`})) : [];
  const lights = plan.mines.map(s => ({world:new THREE.Vector3((s.tx+s.dx*.32)*CELL,2.6,(s.ty+s.dz*.32)*CELL),
    color:0xffb784,intensity:3,range:5,off:false}));
  return { ...plan, vistaFaces, lights, openings:new Set([...plan.mines, ...vistaFaces].map(s=>s.key)),
    excludedWalls: new Set([...plan.mines, ...vistaFaces].map(s=>`${s.wx},${s.wy}`)) };
}
