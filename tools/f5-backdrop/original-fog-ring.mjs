/** V4: wide, FLAT world-locked abyss vistas, NOT a visible circular cylinder.
 * Preserve original B5 shader. Four 220-unit distant walls surround the map,
 * with large uninterrupted panels instead of narrow strips. Review-only.
 */
import {createB5DistantFogBackground} from '../../field/b5-distant-fog-background.js';
export function createOriginalB5FogRing(THREE,scene,{radius=145,height=88,seed=514}={}) {
  const group=new THREE.Group();
  group.name='B5_V4_FLAT_ABYSS_VISTAS';
  scene.add(group);
  const parts=[];
  const sides=[
    {x:0,z:-radius,ry:0},
    {x:radius,z:0,ry:-Math.PI/2},
    {x:0,z:radius,ry:Math.PI},
    {x:-radius,z:0,ry:Math.PI/2}
  ];
  for(let i=0;i<4;i++){
    const s=sides[i];
    const part=createB5DistantFogBackground({width:radius*2.08,height,seed:seed+i*127});
    part.mesh.position.set(s.x,height*.16,s.z);
    part.mesh.rotation.y=s.ry;
    part.mesh.material.side=THREE.DoubleSide;
    part.mesh.material.depthWrite=false;
    part.mesh.renderOrder=-90;
    part.mesh.name='B5_V4_WIDE_FLAT_VISTA_'+i;
    group.add(part.mesh);
    parts.push(part);
  }
  return {group,update(seconds){for(const p of parts)p.update(seconds)},
    dispose(){for(const p of parts)p.dispose();group.removeFromParent()}};
}
