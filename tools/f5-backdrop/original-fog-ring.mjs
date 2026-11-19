/** V3: one seamless cylindrical projection of the ORIGINAL B5 fog shader.
 * Original source remains untouched; visual-review-only.
 * One shader draw call replaces 32 tiled planes, avoiding repeated panels.
 */
import {createB5DistantFogBackground} from '../../field/b5-distant-fog-background.js';
export function createOriginalB5FogRing(THREE,scene,{radius=110,height=62,seed=514}={}) {
  const group=new THREE.Group();
  group.name='B5_ORIGINAL_FOG_CYLINDER_V3_REVIEW';
  scene.add(group);
  const original=createB5DistantFogBackground({width:1,height:1,seed});
  // The original plane is only a material source; never render it.
  original.mesh.geometry.dispose();
  const material=original.mesh.material;
  // Remove rectangular side-edge fading on a full-wrap UV cylinder.
  // The original shader module remains intact and available for comparison.
  material.fragmentShader=material.fragmentShader.replace(
    'float alpha=bottom*left*right*top;',
    'float alpha=bottom*top;'
  );
  material.needsUpdate=true;
  material.side=THREE.BackSide;
  material.depthWrite=false;
  material.fog=false;
  const geometry=new THREE.CylinderGeometry(radius,radius,height,256,1,true);
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='B5_ORIGINAL_SHADER_SEAMLESS_360';
  mesh.position.y=height*.13;
  mesh.renderOrder=-90;
  group.add(mesh);
  return {group,update(seconds){original.update(seconds)},
    dispose(){geometry.dispose();material.dispose();group.removeFromParent()}};
}
