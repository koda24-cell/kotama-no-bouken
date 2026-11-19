/** Non-destructive 360-degree reuse of the existing B5 distant-fog shader.
 * The source shader in field/b5-distant-fog-background.js is NOT modified.
 * This is a review-only overlay; no game integration or asset promotion.
 */
import {createB5DistantFogBackground} from '../../field/b5-distant-fog-background.js';
export function createOriginalB5FogRing(THREE,scene,{segments=32,radius=110,height=62,seed=514}={}) {
  const group=new THREE.Group();
  group.name='B5_ORIGINAL_FOG_SHADER_360_REVIEW';
  scene.add(group);
  const pieces=[];
  const width=2*radius*Math.tan(Math.PI/segments)*1.025;
  for(let i=0;i<segments;i++){
    const angle=(i+.5)*Math.PI*2/segments;
    const part=createB5DistantFogBackground({width,height,seed:seed+i*13});
    const mesh=part.mesh;
    mesh.position.set(Math.sin(angle)*radius,height*.13,Math.cos(angle)*radius);
    mesh.lookAt(0,height*.13,0);
    mesh.material.side=THREE.DoubleSide;
    mesh.renderOrder=-90;
    group.add(mesh);
    pieces.push(part);
  }
  return {group,update(seconds){for(const p of pieces)p.update(seconds)},
    dispose(){for(const p of pieces)p.dispose();group.removeFromParent()}};
}
