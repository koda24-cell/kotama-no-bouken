/* Visual-only B5 integration. The boss marker selects the cathedral floor;
 * all other B5 floors remain war ruins. Never writes map or field state. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createB5WarProp } from './assets/b5-war-props.js';
import { createB5ThroneProp } from './assets/b5-throne-props.js';
import { planB5Walls } from './b5-architecture.js?v=20261110-closed-1';
import { createAbyssBackdrop } from './assets/b5-abyss-backdrop.js';
import { createAbyssRuinSilhouettes } from './assets/b5-abyss-ruin-silhouettes.js';

export function isB5Hall(a, ch) {
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (ch(x, y) === 'B') return true;
  return false;
}

export function createB5Dressing({ root, a, ch, wallCell, hash, CELL, hall, architecture = null }) {
  const assets = [], merged = [], placements = [];
  const dressing = new THREE.Group(); dressing.name = hall ? 'b5:cathedral' : 'b5:war-ruins'; root.add(dressing);
  const keyLight = new THREE.DirectionalLight(hall ? 0xffdfbb : 0xbacbdf, 2.1);
  keyLight.position.set(a.w * CELL / 2 - 12, 30, a.h * CELL / 2 + 15);
  keyLight.target.position.set(a.w * CELL / 2, 0, a.h * CELL / 2);
  const fill = new THREE.HemisphereLight(hall ? 0xd8d0c2 : 0xc0ccd8, 0x39404a, 1.45);
  dressing.add(keyLight, keyLight.target, fill);
  // The libraries reuse materials but contain hundreds of separate meshes.
  // Bake static transforms and merge by material *within each prop* so spatial
  // culling still works and no new PointLights enter the existing light pool.
  function prop(kind, x, z, width, depth, bottom = 0, yaw = 0, fittedHeight = 0) {
    const asset = hall ? createB5ThroneProp(THREE, kind, { seed: 505, detail: 'low' })
      : createB5WarProp(THREE, kind, { seed: Math.round(hash(x, z, 505) * 1e6) });
    assets.push(asset);
    const surfaced=new Set();
    if(architecture) asset.group.traverse(mesh=>{
      const m=mesh.material;
      if(!m?.isMeshStandardMaterial || surfaced.has(m) || (m.emissive.getHex()!==0&&m.emissiveIntensity>0.1)) return;
      surfaced.add(m);
      const cloth=m.side===THREE.DoubleSide;if(cloth&&!architecture.fabric)return;
      const surface=cloth?architecture.fabric:m.metalness>0.3?architecture.iron:architecture.stone;
      const dim=m.color.r<0.05&&m.color.g<0.05&&m.color.b<0.05;
      m.color.setHex(cloth?0xffffff:dim?0x727b87:0xc6c9ce);
      for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])m[key]=surface[key];
      m.metalness=surface.metalness;m.roughness=1;m.normalScale.setScalar(0.65);
    });
    const group = asset.group; dressing.add(group); merged.push(...compactB5Static(group));
    const box = new THREE.Box3().setFromObject(group), size = box.getSize(new THREE.Vector3());
    const scale = Math.min(width / size.x, depth / size.z);
    // Fit the blind bay in local axes; preserve a broad readable silhouette
    // instead of shrinking a sword field to the bay's shallow depth in all axes.
    const sx=fittedHeight?width/size.x:scale,sz=fittedHeight?depth/size.z:scale;
    const sy=fittedHeight?fittedHeight/size.y:scale;
    group.scale.set(sx,sy,sz);group.rotation.y=yaw;
    const center=box.getCenter(new THREE.Vector3());
    const offset=new THREE.Vector3(center.x*sx,0,center.z*sz).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
    group.position.set(x-offset.x,bottom-box.min.y*sy,z-offset.z);
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(group);
    placements.push({ kind, x, z, bottom, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() } });
  }
  const faces=(architecture?.faces || planB5Walls({a,ch,wallCell,hash,CELL,hall})).filter(f=>f.niche);
  faces.sort((a,b)=>hash(a.tx,a.ty,591)-hash(b.tx,b.ty,591));
  const chosen=[];
  for(const face of faces) {
    if(chosen.some(p=>Math.hypot(p.x-face.x,p.z-face.z)<(hall?9:7)))continue;
    chosen.push(face);if(chosen.length>=(hall?10:16))break;
  }
  chosen.forEach((f,i)=>{
    const kind=hall?(i%2?'hangingBanner':'ruinedPillar'):['swordField','brokenWarMachine','brokenBridge','debrisHeap'][i%4];
    // All ground props remain in the blind bay: front of the opaque back,
    // behind the corridor boundary. No prop or opening joins adjacent corridors.
    const nx=-f.dx,nz=-f.dz;
    prop(kind,f.x-nx*0.62,f.z-nz*0.62,2.45,0.82,
      hall&&i%2?3.1:0.28,f.yaw,hall?(i%2?8.8:11):kind==='swordField'?2.6:1.7);
    placements[placements.length-1].view={tx:f.tx,ty:f.ty,dir:f.dx===1?'right':f.dx===-1?'left':f.dz===1?'down':'up'};
  });
  if(hall) {
    for(const y of [4,a.h-4])prop('grandChandelier',13*CELL,y*CELL,5.7,5.7,5.2,0,8.3);
  } else {
    // Preserve the optional far assets as atmosphere. Solid walls and a closed
    // roof always take precedence; they are never opened for a distant vista.
    const backdrop=createAbyssBackdrop(THREE,dressing,{starCount:100,rockCount:6});
    const ruins=createAbyssRuinSilhouettes(THREE,dressing,{clusters:4});assets.push(backdrop,ruins);
    for(const item of [backdrop,ruins]){item.group.position.set((a.w-1)*CELL/2,0,(a.h-1)*CELL/2);item.group.scale.setScalar(1.7);}
  }
  let disposed = false;
  return {
    info: () => ({ hall, placements, mergedDraws: merged.length }),
    dispose() {
      if (disposed) return; disposed = true;
      assets.forEach(a => a.dispose()); merged.forEach(g => g.dispose()); dressing.removeFromParent();
    }
  };
}

export function compactB5Static(group) {
  const merged = [];
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert(), byMaterial = new Map(), old = [];
  group.traverse(m => {
    if (!m.isMesh || Array.isArray(m.material)) return;
    const geo = m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, m.matrixWorld));
    // Indexed and non-indexed primitives must share the same layout.
    const flat = geo.index ? geo.toNonIndexed() : geo;
    if (flat !== geo) geo.dispose();
    flat.deleteAttribute('normal'); flat.computeVertexNormals();
    const p=flat.attributes.position,n=flat.attributes.normal,uv=[];
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i)/4,y=p.getY(i)/4,z=p.getZ(i)/4;
      if(Math.abs(n.getY(i))>.6)uv.push(x,z);
      else if(Math.abs(n.getX(i))>.6)uv.push(z,y);
      else uv.push(x,y);
    }
    flat.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    if (!byMaterial.has(m.material)) byMaterial.set(m.material, []);
    byMaterial.get(m.material).push(flat); old.push(m);
  });
  for (const [material, parts] of byMaterial) {
    const geo = mergeGeometries(parts); parts.forEach(p => p.dispose());
    if (!geo) throw new Error('B5 static geometry merge failed');
    merged.push(geo); group.add(new THREE.Mesh(geo, material));
  }
  old.forEach(m => m.removeFromParent());
  return merged;
}
