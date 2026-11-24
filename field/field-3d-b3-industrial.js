/* B3 visual-only placement. Collision, events, FOE and saves remain owned by field/*.js. */
import * as THREE from 'three';
import { createRuinedCityKit } from './b3-ruined-city-kit.js';
import { createB3UrbanProps } from './b3-ruined-city-urban-props.js';
import { createCitySurfaces } from './b3-industrial-surfaces.js';
import { loadIndustrialAssets } from './b3-industrial-assets.js';
import { cityVisibility } from './b3-industrial-visibility.js';
import {createStreetEdgeBlend} from './b3-city-v2-art.js';
import {bridgeSupportBounds} from './b3-city-v2-clearance.js';
import {retainFirstLayerSource} from './field-3d-b1-sacred-trial.js';
import {grassCutoutMaterialV6} from './f1-grass-cutout-lighting-v6.js';

export function createTheme(api) {
  const { g, CELL, DIR_ORDER, DIR_VEC, FACE_YAW, hash, place, load, npcFile } = api;
  const originalFar = g.camera.far;
  const originalShadow={enabled:g.renderer.shadowMap.enabled,type:g.renderer.shadowMap.type};
  let v2=false,edgeBlend=null,cloudSun=null,shadowEnabled=false;
  const viewFrustum=new THREE.Frustum(),viewMatrix=new THREE.Matrix4();
  const daylightPool = g.pool.slice(g.high ? 4 : 2);
  const env = { background: 0x929d9d, fog: { color: 0x929d9d, density: 0.037 },
    hemi: { sky: 0xd6dfdb, ground: 0x92988a, high: 1.9, low: 2.1 } };
  let root, city, urban, finish, skyMesh, materials = [], geometries = [], batches = [], placements = [], stats = {};
  const prototypes = new Map();
  let industrial, solid, visibilityGroups=[],lastVisibility="",edgePlacements=[],fallback=null,fallbackReason=null,heldGrass=[],ownedThemeTextures=[],contactGeometry=null,contactMaterial=null,environmentTarget=null,previousEnvironment=null,previousEnvironmentIntensity=1;
  const geo = x => (geometries.push(x), x);
  const mat = x => { const m = g.high ? new THREE.MeshStandardMaterial(x) : new THREE.MeshLambertMaterial({ color: x.color, flatShading: x.flatShading }); materials.push(m); return m; };
  function add(shape, material, x, y, z, sx, sy, sz, ry = 0) {
    const m = new THREE.Mesh(shape, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.y = ry; root.add(m); return m;
  }
  function prototype(key, make) {
    if (!prototypes.has(key)) {
      const sourceId=industrial.models.has(key)?key:industrial.models.has(key.slice(0,-1))?key.slice(0,-1):key.endsWith("0")&&industrial.models.has("native_"+key.slice(0,-1))?"native_"+key.slice(0,-1):null;
      const model = sourceId ? industrial.models.get(sourceId).clone(true) : finish.dress(make(), key);
      prototypes.set(key, model);
    }
    return prototypes.get(key).clone(true);
  }
  // Fit the complete transformed bounding box inside reserved non-walkable cells.
  // No dangling girder, root or fallen bridge fragment can extend onto a path.
  function scenery(key, make, tx, ty, width, depth, height, ry = 0) {
    const holder = new THREE.Group(), model = prototype(key, make);
    model.rotation.y = ry; holder.add(model);
    const b = new THREE.Box3().setFromObject(holder), size = b.getSize(new THREE.Vector3()), center = b.getCenter(new THREE.Vector3());
    const scale = Math.min(width / size.x, depth / size.z);
    holder.scale.set(scale, height==null?scale:height / size.y, scale);
    holder.position.set(tx * CELL - center.x * scale, -b.min.y * holder.scale.y, ty * CELL - center.z * scale);
    root.add(holder); holder.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(holder);
    const record={ key, tx, ty, min: bounds.min.toArray(), max: bounds.max.toArray() };
    placements.push(record);holder.traverse(o=>{if(o.isMesh)o.userData.f3Bounds=record;});
  }
  function edgeDetail(id,px,pz,dx,dz,ry,seed){
    const holder=new THREE.Group(),model=industrial.models.get(id).clone(true);holder.add(model);model.rotation.y=ry;
    // The stairs and long beams run along the wall, leaving a full central walking lane.
    if(['service_stair','flanged_pipe','bridge_abutment'].includes(id))model.rotation.y+=Math.PI/2;
    const b=new THREE.Box3().setFromObject(holder),size=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());
    const depth=dx?size.x:size.z,width=dx?size.z:size.x;
    const scale=Math.min(3.1/width,.85/depth,4.8/size.y),d=depth*scale;
    holder.scale.setScalar(scale);
    const overhead=['riveted_girder','pipe_rack','grating_catwalk','landing_railing'].includes(id),lift=overhead?3.55:0;
    holder.position.set(px+dx*(2-d/2)-c.x*scale,lift-b.min.y*scale,pz+dz*(2-d/2)-c.z*scale);
    root.add(holder);holder.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(holder);
    const record={key:id,min:bb.min.toArray(),max:bb.max.toArray(),overhead};edgePlacements.push(record);holder.traverse(o=>{if(o.isMesh)o.userData.f3Bounds=record;});
    if(!overhead){
      const shadow=new THREE.Mesh(contactGeometry,contactMaterial);shadow.rotation.x=-Math.PI/2;shadow.scale.set(Math.max(.22,bb.max.x-bb.min.x)*1.18,Math.max(.22,bb.max.z-bb.min.z)*1.18,1);
      shadow.position.set((bb.min.x+bb.max.x)/2,.081,(bb.min.z+bb.max.z)/2);shadow.userData.f3Bounds=record;root.add(shadow);
    }
    if(['grating_catwalk','landing_railing'].includes(id)){
      const pier=new THREE.Group(),member=industrial.models.get('column_joint').clone(true);member.rotation.y=ry;pier.add(member);
      const pb=new THREE.Box3().setFromObject(pier),ps=pb.getSize(new THREE.Vector3()),pc=pb.getCenter(new THREE.Vector3()),factor=3.55/ps.y;
      pier.scale.setScalar(factor);pier.position.set(px+dx*1.7-pc.x*factor,-pb.min.y*factor,pz+dz*1.7-pc.z*factor);root.add(pier);pier.updateMatrixWorld(true);
      const bound=new THREE.Box3().setFromObject(pier),record={key:'column_joint:walkway-bearing',min:bound.min.toArray(),max:bound.max.toArray(),overhead:false};edgePlacements.push(record);pier.traverse(o=>{if(o.isMesh)o.userData.f3Bounds=record;});
    }
  }
  function batchStatic() {
    root.updateMatrixWorld(true);
    const groups = new Map(), meshes = [];
    root.traverse(m => { if (m.isMesh) meshes.push(m); });
    for (const m of meshes) {
      const p = new THREE.Vector3().setFromMatrixPosition(m.matrixWorld);
      // Spatial buckets preserve frustum culling, even across long street corridors.
      const key = `${Math.floor(p.x / 16)},${Math.floor(p.z / 16)}:${m.geometry.uuid}:${m.material.uuid}:${!!m.userData.f3Keep}`;
      if (!groups.has(key)) groups.set(key, []); groups.get(key).push(m);
    }
    stats.sourceMeshes = meshes.length;
    stats.lodPairs = 0;
    for (const items of groups.values()) {
      const first = items[0], batch = new THREE.InstancedMesh(first.geometry, first.material, items.length);
      if(v2){batch.castShadow=g.high&&!first.material.transparent&&!first.material.transmission;batch.receiveShadow=true;}
      batch.name = 'b3:city-batch';
      const matrices=items.map(m=>m.matrixWorld.clone()),bounds=items.map(m=>m.userData.f3Bounds||(()=>{const b=new THREE.Box3().setFromObject(m);return {min:b.min.toArray(),max:b.max.toArray()};})());
      const vg={batch,far:null,matrices,bounds,boxes:bounds.map(b=>new THREE.Box3(new THREE.Vector3(...b.min),new THREE.Vector3(...b.max))),keep:!!first.userData.f3Keep};visibilityGroups.push(vg);
      items.forEach((m, i) => batch.setMatrixAt(i, m.matrixWorld));
      batch.computeBoundingSphere(); batch.instanceMatrix.needsUpdate = true;
      batches.push(batch);
      if (finish.lodGeometries.has(first.geometry)) {
        const coarse = finish.lodGeometries.get(first.geometry), lod = new THREE.LOD();
        const center = batch.boundingSphere.center;
        lod.position.copy(center); batch.position.copy(center).multiplyScalar(-1);
        lod.addLevel(batch, 0);
        if (coarse) {
          const far = new THREE.InstancedMesh(coarse, first.material, items.length);
          far.instanceMatrix.array.set(batch.instanceMatrix.array); far.instanceMatrix.needsUpdate = true;
          far.boundingSphere = batch.boundingSphere.clone(); far.position.copy(batch.position);
          lod.addLevel(far, g.high ? 26 : 22); batches.push(far);vg.far=far;
        } else lod.addLevel(new THREE.Group(), g.high ? 32 : 26);
        lod.userData.b3Batch = true; root.add(lod); stats.lodPairs++;
      } else root.add(batch);
    }
    // Drop empty factory hierarchies as well as individual meshes after baking transforms.
    for (const child of [...root.children]) if (!child.isInstancedMesh && !child.userData.b3Batch) root.remove(child);
    stats.batches = groups.size;
    stats.allocatedBatches = batches.length;
    stats.instances = meshes.length;
  }
  async function build(a,S,info){
    const before=new Set(g.world.children),entryCount=g.entries.length;
    try{await buildIndustrial(a,S,info);}
    catch(error){
      dispose();for(const child of [...g.world.children])if(!before.has(child))child.removeFromParent();g.entries.splice(entryCount);
      fallbackReason=String(error.message||error);
      const legacy=await import('./field-3d-b3-city.js?v=20261110-quality-1');fallback=legacy.createTheme(api);
      api.setEnvironment?.(fallback.env);await fallback.build(a,S,info);
      console.warn('[industrial-review] Restored existing city after failed candidate load:',fallbackReason);
    }
  }
  async function buildIndustrial(a, S, info) {
    dispose();
    root = new THREE.Group(); root.name = 'b3_ruined_city_map'; g.world.add(root);
    // Daylight carries the city: keep only a few nearby interactive point lights.
    daylightPool.forEach(light => g.scene.remove(light));
    g.camera.far = 44; g.camera.updateProjectionMatrix();
    industrial=await loadIndustrialAssets({legacyModels:a.f===2?['reused_stairs_v10']:[]});
    v2=industrial.models.has('v2_courtyard_facade');
    if(v2){
      env.hemi={sky:0xd6dfdb,ground:0x8d9687,high:.90,low:1.15};
      // Closed rooms receive little skylight; constant hemi must not wash them out.
      for(const m of industrial.materials)if(m.name==='v2_unlit_room_concrete')m.color.setRGB(.19,.22,.21);
      api.setEnvironment?.(env);
      g.camera.far=44;g.camera.updateProjectionMatrix();
    }
    const anisotropy=Math.min(g.high?8:4,g.renderer.capabilities.getMaxAnisotropy());
    for(const material of industrial.materials)for(const texture of Object.values(material))if(texture?.isTexture)texture.anisotropy=anisotropy;
    city = createRuinedCityKit(THREE); urban = createB3UrbanProps(THREE);
    finish = createCitySurfaces(THREE, g.high,industrial.materials);
    if(v2)edgeBlend=createStreetEdgeBlend(THREE,industrial.materials);
    // One shared overcast reflection for glass, corroded steel and worn hardware.
    previousEnvironment=g.scene.environment;previousEnvironmentIntensity=g.scene.environmentIntensity;
    const environmentScene=new THREE.Scene();environmentScene.add(finish.sky());const pmrem=new THREE.PMREMGenerator(g.renderer);
    environmentTarget=pmrem.fromScene(environmentScene,0,.1,200);pmrem.dispose();g.scene.environment=environmentTarget.texture;g.scene.environmentIntensity=.5;
    const cube = geo(new THREE.BoxGeometry(1, 1, 1));
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const context=shadowCanvas.getContext('2d'),gradient=context.createRadialGradient(32,32,2,32,32,31);
    gradient.addColorStop(0,'rgba(7,12,9,.23)');gradient.addColorStop(.55,'rgba(7,12,9,.13)');gradient.addColorStop(1,'rgba(7,12,9,0)');context.fillStyle=gradient;context.fillRect(0,0,64,64);
    const shadowTexture=new THREE.CanvasTexture(shadowCanvas);ownedThemeTextures.push(shadowTexture);contactGeometry=geo(new THREE.PlaneGeometry(1,1));
    contactMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});materials.push(contactMaterial);
    const { paving, stone, soil, rust: steel, leaf: grass } = finish.palette;
    // Reuse the already scanned original cutout plants, with unchanged geometry and atlas bytes.
    const nature=await fetch(new URL('../assets/3d/dungeons/b1_nature_v6_candidates/catalog.json',import.meta.url));if(!nature.ok)throw Error('Ground vegetation catalog unavailable');
    const grassCatalog=await nature.json(),tufts=[];
    for(const name of ['sedge','fern','trifoliate']){
      const row=grassCatalog.sources.find(r=>r.name===name),held=await retainFirstLayerSource(row.file,row.sha256);heldGrass.push(held);
      let mesh;held.source.updateMatrixWorld(true);held.source.traverse(o=>{if(o.isMesh)mesh=o;});
      const geometry=geo(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)),material=grassCutoutMaterialV6(mesh.material);materials.push(material);tufts.push({geometry,material});
    }


    const chip = geo(new THREE.IcosahedronGeometry(0.18, 0));
    const water = mat({ color: 0x354f4b, roughness: 0.22, metalness: 0.1 });
    const { ch, wallCell, open, facing } = info;
    solid=(x,z)=>x<0||z<0||x>=a.w||z>=a.h||wallCell(x,z);
    const reserved = new Set();
    for (const o of a.objects) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) reserved.add(`${o.tx + dx},${o.ty + dz}`);
    const occupied = new Set();
    const stairCells=new Set(),stairFront=new Set();
    if(v2&&a.f===2&&industrial.models.has('reused_stairs_v10')){
      const candidates=[];
      for(let z=1;z<a.h-2;z++)for(let x=1;x<a.w-2;x++){
        const cells=[[x,z],[x+1,z],[x,z+1],[x+1,z+1]];
        if(cells.every(([tx,tz])=>ch(tx,tz)==='#'&&!reserved.has(`${tx},${tz}`))&&(open(x,z+2)||open(x+1,z+2)))candidates.push({x,z,score:Math.abs(x-17)+Math.abs(z-3)});
      }
      candidates.sort((a,b)=>a.score-b.score);
      if(candidates.length){
        const {x,z}=candidates[0];scenery('reused_stairs_v10',null,x+.5,z+.5,7.5,7.5,null,0);
        for(const [tx,tz]of [[x,z],[x+1,z],[x,z+1],[x+1,z+1]]){stairCells.add(`${tx},${tz}`);occupied.add(`${tx},${tz}`);}
        stairFront.add(`${x},${z+1}`);stairFront.add(`${x+1},${z+1}`);
      }
    }
    const machineCells=new Set();
    if(v2&&industrial.models.has('v2_service_tower')){
      const chosen=[];
      for(let z=1;z<a.h-1;z++)for(let x=1;x<a.w-1;x++){
        if(ch(x,z)!=='#'||occupied.has(`${x},${z}`)||reserved.has(`${x},${z}`)||!DIR_ORDER.some(d=>open(x+DIR_VEC[d][0],z+DIR_VEC[d][1])))continue;
        if((hash(x,z,917)>(a.f===1?.15:.065)&&!(z===18&&x===14&&a.f<2))||chosen.some(q=>Math.abs(q.x-x)+Math.abs(q.z-z)<6))continue;
        chosen.push({x,z});machineCells.add(`${x},${z}`);
        scenery('v2_service_tower',null,x,z,3.55,3.55,15.45,(chosen.length%4)*Math.PI/2);
      }
    }
    for(const cell of machineCells)occupied.add(cell);
    const pilotWall=(x,z)=>v2&&ch(x,z)==='#'&&!machineCells.has(`${x},${z}`)&&!stairCells.has(`${x},${z}`);
    const wall = (x, z) => x >= 0 && z >= 0 && x < a.w && z < a.h && ch(x, z) === '#' && !reserved.has(`${x},${z}`)&&!pilotWall(x,z);
    stats = { mode: 'b3-industrial-trial', floor: a.key, motifs: {}, quality: g.high ? 'high' : 'low',groundSpecies:3,artRevision:v2?'V2 city structural revision, work in progress':'V1',representativeFacadeCount:0,serviceTowers:machineCells.size,reusedStairCourtyard:stairCells.size?1:0 };
    const count = k => { stats.motifs[k] = (stats.motifs[k] || 0) + 1; };
    function softColony(id,x,z,rotation,depth=.60,ground=.04){
      if(!industrial.models.has(id))return;
      const holder=new THREE.Group(),model=industrial.models.get(id).clone(true);model.rotation.y=rotation;holder.add(model);
      const bounds=new THREE.Box3().setFromObject(holder),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      const alongX=Math.abs(Math.sin(rotation))>.7,scale=Math.min(1,depth/(alongX?size.x:size.z));holder.scale.setScalar(scale);
      holder.position.set(x-center.x*scale,ground-bounds.min.y*scale,z-center.z*scale);root.add(holder);count(id+':soft-colony');
    }

    // Large paired blocks are confined to 2x2 solid cells. Distinct districts per floor.
    let landmark = 0;
    const large = ['collapsedOverpass', 'reused_stairs_v10', 'derelictRailCorridor', 'collapsedSkybridge', 'reused_stairs_v8', 'temple', 'tower', 'arch'];
    for (let z = 0; z < a.h - 1; z++) for (let x = 0; x < a.w - 1; x++) {
      if (![ [0, 0], [1, 0], [0, 1], [1, 1] ].every(([dx, dz]) => wall(x + dx, z + dz) && !occupied.has(`${x + dx},${z + dz}`))) continue;
      // Only dress blocks visible from a street; leave deep interiors empty.
      if (![[-1, 0], [0, -1], [2, 0], [0, 2]].some(([dx, dz]) => !wallCell(x + dx, z + dz))) continue;
      const kind = large[landmark++ % large.length], v = landmark % 3;
      scenery(`${kind}${v}`, () => city[kind] ? city[kind]() : urban[kind](v), x + 0.5, z + 0.5, 7.5, 7.5, kind.startsWith('reused_stairs') ? 8.5 : kind === 'temple' ? 7 : 6, v * Math.PI / 2);
      count(kind);
      for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) occupied.add(`${x + dx},${z + dz}`);
    }
    // The first two maze floors mainly have one-cell-thick walls. Reserve long
    // wall runs too, so bridges and rail remains appear on every floor.
    for (let z = 0; z < a.h; z++) for (let x = 0; x < a.w; x++) {
      if (landmark >= 12) break;
      for (const [dx, dz] of [[1, 0], [0, 1]]) {
        const cells = [0, 1, 2].map(i => [x + dx * i, z + dz * i]);
        if (!cells.every(([tx, ty]) => wall(tx, ty) && !occupied.has(`${tx},${ty}`))) continue;
        if (!cells.some(([tx, ty]) => DIR_ORDER.some(d => !wallCell(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1])))) continue;
        const kind = large[landmark++ % large.length], v = landmark % 3;
        scenery(kind + v, () => city[kind] ? city[kind]() : urban[kind](v), x + dx, z + dz, dx ? 11.5 : 3.65, dz ? 11.5 : 3.65, 5.5 + v * 0.5, dz ? Math.PI / 2 : 0);
        count(kind); cells.forEach(([tx, ty]) => occupied.add(`${tx},${ty}`)); break;
      }
    }
    let block = 0;
    for (let z = 0; z < a.h; z++) for (let x = 0; x < a.w; x++) {
      if (wallCell(x, z)) {
        if (!wall(x, z) || occupied.has(`${x},${z}`) || !DIR_ORDER.some(d => !wallCell(x + DIR_VEC[d][0], z + DIR_VEC[d][1]))) continue;
        const v = block++ % 3, r = hash(x, z, 215);
        if (hash(Math.floor(x / 3), Math.floor(z / 3), 220) < 0.2) continue;
        const kind = r < 0.56 ? 'ruinedBuilding' : r < 0.68 ? 'invasiveTree' : r < 0.77 ? 'radioTower' : r < 0.84 ? 'utilityPole' : r < 0.9 ? 'steelWreck' : r < 0.95 ? 'abandonedTransitStop' : 'ruinedStreetlamp';
        const height = kind === 'ruinedBuilding' ? 7 + v * 2.2 : kind === 'radioTower' ? 11 + v : kind === 'invasiveTree' ? 9 : kind === 'utilityPole' ? 6 : kind === 'steelWreck' ? 3 : 4.5;
        scenery(kind + v, () => urban[kind](v), x, z, 3.65, 3.65, height, v * Math.PI / 2); count(kind);
        // Cluster secondary roots, vines and rubble with the dominant silhouette.
        if (kind === 'ruinedBuilding') {
          scenery('vines' + v, () => city.vines(), x, z, 3.7, 3.7, 5 + v); count('vines');
          scenery('rubble' + v, () => city.rubble(v + 1), x, z, 3.75, 3.75, 0.85); count('rubble');
        }
        continue;
      }
      const px = x * CELL, pz = z * CELL, r = hash(x, z, 201), safe = reserved.has(`${x},${z}`);
      if (ch(x, z) === '~') { add(cube, water, px, -0.12, pz, 4, 0.15, 4); continue; }
      add(cube, soil, px, -0.25, pz, 4.02, 0.35, 4.02);
      const natural=v2&&ch(x,z)==='*'&&!safe;
      const road=v2&&!natural&&industrial.models.has('v2_fractured_road');
      if(road){
        const holder=industrial.models.get('v2_fractured_road').clone(true);
        holder.position.set(px,.055,pz);holder.rotation.y=Math.floor(hash(x,z,780)*4)*Math.PI/2;root.add(holder);count('fracturedRoad');
      }
      const n = 3, unit = CELL / n;
      for (let j = 0; !road&&!natural&&j < n; j++) for (let i = 0; i < n; i++) {
        const k = hash(x * n + i, z * n + j, 202), edge = i === 0 || j === 0 || i === n - 1 || j === n - 1;
        // Small surface relief only; avoid a false impassable crater on traversable tiles.
        const slab = add(finish.slabs[Math.floor(k * 3)], paving[Math.floor(k * 3)], px + (i + 0.5) * unit - 2, -0.07 + (safe ? 0 : k * 0.07), pz + (j + 0.5) * unit - 2, unit - 0.012, 0.14, unit - 0.012);
        if (!safe && !edge) slab.rotation.z = (k - 0.5) * 0.07;
      }
      if(natural){
        add(cube,soil,px,-.080,pz,4.02,.03,4.02);
        if(edgeBlend)for(let k=0;k<3;k++){
          const q=hash(x,z,900+k),patch=new THREE.Mesh(edgeBlend.geometry,edgeBlend.material);
          patch.position.set(px+(q-.5)*.8,-.057+k*.001,pz+(hash(x,z,905+k)-.5)*2.3);patch.rotation.y=q*Math.PI;
          patch.scale.set(.78+q*.20,1,2.1+q*.8);patch.receiveShadow=true;root.add(patch);
        }
        for(let k=0;k<(g.high?18:10);k++){
          const q=hash(x*31+k,z,910),rx=(q-.5)*3.8,rz=(hash(x,z*31+k,911)-.5)*3.8,central=Math.abs(rx)<.95||Math.abs(rz)<.95;
          const tuft=tufts[(k+x+z)%3],plant=add(tuft.geometry,tuft.material,px+rx,-.058,pz+rz,.55+q*.55,central?.24:.6+q*.3,.65);
          plant.rotation.y=q*6.28;
        }
        if(r<.55){const side=r<.275?-1:1;softColony('v2_fern_colony',px+side*1.5,pz,(side>0?1:-1)*Math.PI/2,.75,-.055);}
        if(r>.73)softColony('v2_wildflower_colony',px,pz+1.5,0,.55,-.055);
        count('reclaimedGroundPocket');
      }else if(v2&&a.f===2){
        // Low soft plants occupy cell corners, outside both central movement strips.
        for(let k=0;k<(safe?1:3);k++){
          const q=hash(x*7+k,z,924),tuft=tufts[(x+z+k)%3],plant=add(tuft.geometry,tuft.material,px+(k%2?1:-1)*(1.30+q*.3),.02,pz+(k>1?1:-1)*(1.28+q*.3),.55,.28+q*.30,.55);
          plant.rotation.y=q*6.28;
        }
      }
      if (!safe && r < 0.2) {
        // Use the supplied roots at ankle height, never as a raised obstacle.
        const obj = prototype('paving' + (x % 3), () => urban.rootedPavement(x % 3 + 1));
        obj.scale.set(0.8, 0.18, 0.8); obj.position.set(px, -0.025, pz); root.add(obj); count('rootedPavement');
      }
      if (!safe || v2) {
        // Follow actual street walls, including east-west streets, rather than
        // placing rows of tufts across the walking line.
        const edges = DIR_ORDER.filter(d => wallCell(x + DIR_VEC[d][0], z + DIR_VEC[d][1]));
        const plantsPerEdge=v2?(safe?5:(g.high?12:8)):(g.high?5:3);
        for (const d of edges) for (let i = 0; i < plantsPerEdge; i++) {
          const [dx, dz] = DIR_VEC[d], k = hash(x * 9 + i, z, DIR_ORDER.indexOf(d) + 210);
          if (k < (v2 ? .12 : .35)) continue;
          const along = v2?((i+.5)/plantsPerEdge-.5)*3.8+(k-.5)*.15:(i/5-.4)*3+(k-.5)*.3;
          const gx = px + dx * (1.65 + k * 0.15) + dz * along;
          const gz = pz + dz * (1.65 + k * 0.15) - dx * along;
          const tuft=tufts[(i+x+z)%tufts.length];
          const plant = add(tuft.geometry, tuft.material, gx, .018 + k * .02, gz, (0.6+k)*(safe?.7:1), (0.5+k*.5)*(safe?.65:1), 0.7);
          plant.rotation.z = (k-.5)*.12;
          if (!safe&&i === 1) add(chip, stone, gx, 0.05, gz, 1.5, 0.7, 1, k * 6);
        }
        if(v2&&industrial.models.has('v2_fern_colony'))for(const d of edges){
          if(hash(x,z,802+DIR_ORDER.indexOf(d))>.52)continue;
          const [dx,dz]=DIR_VEC[d],holder=new THREE.Group(),model=industrial.models.get('v2_fern_colony').clone(true);
          model.rotation.y=dx?Math.PI/2:0;holder.add(model);
          const bounds=new THREE.Box3().setFromObject(holder),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
          const scale=Math.min(1, .50/(dx?size.x:size.z));holder.scale.setScalar(scale);
          holder.position.set(px+dx*1.66-center.x*scale,.04-bounds.min.y*scale,pz+dz*1.66-center.z*scale);
          root.add(holder);count('photographicFernColony');
        }
        if(edgeBlend)for(const d of edges){
          const [dx,dz]=DIR_VEC[d],patch=new THREE.Mesh(edgeBlend.geometry,edgeBlend.material);
          patch.position.set(px+dx*1.65,.078,pz+dz*1.65);patch.rotation.y=dx?Math.PI/2:0;patch.receiveShadow=true;root.add(patch);
        }
      }
      for (const d of DIR_ORDER) {
        const [dx, dz] = DIR_VEC[d]; if (!wallCell(x + dx, z + dz)) continue;
        const ry = FACE_YAW[d] + Math.PI, ex = px + dx * 2.12, ez = pz + dz * 2.12;
        const boundaryKey=`${x+dx},${z+dz}`;
        if(stairCells.has(boundaryKey)){
          if(stairFront.has(boundaryKey)&&dz===-1){
            const holder=new THREE.Group(),rail=industrial.models.get('landing_railing').clone(true);rail.rotation.y=ry;holder.add(rail);
            const b=new THREE.Box3().setFromObject(holder),ss=b.getSize(new THREE.Vector3()),cc=b.getCenter(new THREE.Vector3()),along=dx?ss.z:ss.x,depth=dx?ss.x:ss.z;
            const scale=Math.min(3.9/along,.45/depth,1.05/ss.y);holder.scale.setScalar(scale);holder.position.set(ex-cc.x*scale+dx*.28,-b.min.y*scale,ez-cc.z*scale+dz*.28);root.add(holder);holder.updateMatrixWorld(true);
            const bb=new THREE.Box3().setFromObject(holder),record={key:'stair-courtyard:closed-railing',min:bb.min.toArray(),max:bb.max.toArray(),overhead:false};edgePlacements.push(record);holder.traverse(o=>{if(o.isMesh)o.userData.f3Bounds=record;});
          }else{
            const backing=add(cube,stone,ex+dx*.03,6,ez+dz*.03,4.04,12,.16,ry),bb=new THREE.Box3().setFromObject(backing);
            backing.userData.f3Bounds={min:bb.min.toArray(),max:bb.max.toArray()};
          }
          continue;
        }
        const representative=pilotWall(x+dx,z+dz);
        // Continuous base identifies every solid boundary, including closed shortcuts.
        // Closed concrete back keeps skyline fractures and windows from exposing adjacent streets.
        const wallHeight=4.7+Math.floor(hash(Math.floor((x+dx)/4),Math.floor((z+dz)/4),837)*3)*.25;
        if(!representative){const backing=add(cube, stone, ex+dx*.65, 1.9, ez+dz*.65, 4.07, 3.8, .30, ry);backing.userData.f3Keep=true;}
        const sequence=['retaining_wall','retaining_wall','shattered_window','roller_shutter','retaining_wall','factory_door'].filter(id=>industrial.models.has(id));
        const factory=representative&&industrial.models.has('v2_factory_bay')&&hash(Math.floor((x+dx)/3),Math.floor((z+dz)/3),861)<(a.f===1?.65:a.f===2?.36:.20);
        const id=representative?(factory?'v2_factory_bay':'v2_courtyard_facade'):sequence[Math.floor(hash(x,z,330+DIR_ORDER.indexOf(d))*sequence.length)];
        const model=industrial.models.get(id).clone(true),holder=new THREE.Group();holder.add(model);model.rotation.y=ry;
        let bb=new THREE.Box3().setFromObject(holder),ss=bb.getSize(new THREE.Vector3()),cc=bb.getCenter(new THREE.Vector3());
        const along=dx?ss.z:ss.x,scale=3.96/along,depth=representative?1.70:(dx?ss.x:ss.z)*scale;
        // Two opposing facade bays share a four-metre solid cell. Keep each
        // recessed bay in its own half; an opposite rear wall must not fill it.
        const sx=representative&&dx?depth/ss.x:scale,sz=representative&&dz?depth/ss.z:scale;
        holder.scale.set(sx,representative?scale:Math.min(scale,wallHeight/ss.y),sz);
        holder.position.set(ex-cc.x*sx+dx*(representative?depth/2+.03:-.10),-bb.min.y*holder.scale.y,ez-cc.z*sz+dz*(representative?depth/2+.03:-.10));
        if(representative){
          const height=ss.y*scale,concrete=industrial.materials.find(m=>m.name==='f3_v2_aged_structure')||stone;
          for(const side of[-1,1]){
            const joint=add(cube,concrete,ex+dx*1.64+dz*side*1.96,height/2,ez+dz*1.64-dx*side*1.96,.27,height,.18,ry);
            const jb=new THREE.Box3().setFromObject(joint);joint.userData.f3Bounds={min:jb.min.toArray(),max:jb.max.toArray()};
          }
        }
        if(representative)stats.representativeFacadeCount++;
        root.add(holder);holder.updateMatrixWorld(true);const facadeBounds=new THREE.Box3().setFromObject(holder),facadeRecord={key:id+':facade',min:facadeBounds.min.toArray(),max:facadeBounds.max.toArray(),overhead:false};holder.traverse(o=>{if(o.isMesh)o.userData.f3Bounds=facadeRecord;});
        if(representative)edgePlacements.push(facadeRecord);count(id);
        // Utility clusters repeat a structural language, while their combinations vary by block.
        if(!safe){
          const ids=['broken_signal','broken_streetlamp','control_cabinet','flanged_pipe','pipe_rack','rebar_rubble','drain_channel','ivy_pocket','heaved_asphalt','column_joint','riveted_girder','buckled_portal','grating_catwalk','service_stair','landing_railing','bridge_abutment'].filter(id=>industrial.models.has(id));
          const degree=DIR_ORDER.filter(dir=>!wallCell(x+DIR_VEC[dir][0],z+DIR_VEC[dir][1])).length;
          const straight=(open(x-1,z)&&open(x+1,z))||(open(x,z-1)&&open(x,z+1));
          const candidates=v2&&degree===2&&straight?['drain_channel','ivy_pocket','rebar_rubble','heaved_asphalt'].filter(k=>industrial.models.has(k)):ids;
          const side=candidates[Math.floor(hash(x,z,440+DIR_ORDER.indexOf(d))*candidates.length)];
          edgeDetail(side,px,pz,dx,dz,ry,r);count(side);
        }
        if(!representative){
          for (const side of [-1, 1]) add(cube, stone, ex + Math.cos(ry) * side * 1.83, 1.4 + r * 0.5, ez - Math.sin(ry) * side * 1.83, 0.32, 1.8 + r * 2, 0.27, ry);
          if (r > 0.5) add(cube, steel, ex, 2.6 + r, ez, r > 0.8 ? 4 : 2.5, 0.16, 0.28, ry);
        }
        if (!representative && !safe && r < 0.35) {
          const obj = prototype('wallRoots', () => city.vines());
          obj.scale.set(0.55, 0.65, 0.35); obj.rotation.y = ry; obj.position.set(ex, 0, ez); root.add(obj);
        }
      }
    }
    // A few supported overhead crossings connect both sides of the industrial streets.
    // Their piers stay against the walls; head clearance is at least3.55m.
    const crossings=[];
    for(let z=1;z<a.h-1;z++)for(let x=1;x<a.w-1;x++){
      if(wallCell(x,z)||reserved.has(`${x},${z}`)||ch(x,z)==='~')continue;
      const acrossX=wallCell(x-1,z)&&wallCell(x+1,z)&&open(x,z-1)&&open(x,z+1),acrossZ=wallCell(x,z-1)&&wallCell(x,z+1)&&open(x-1,z)&&open(x+1,z);
      if(acrossX||acrossZ)crossings.push({x,z,acrossX,score:hash(x,z,681)});
    }
    const focal=a.f===2?[11,8]:[12,19];
    crossings.sort((a,b)=>v2?((Math.abs(a.x-focal[0])+Math.abs(a.z-focal[1]))*.12+a.score*.2)-((Math.abs(b.x-focal[0])+Math.abs(b.z-focal[1]))*.12+b.score*.2):a.score-b.score);const selected=[];
    const mount=(id,x,z,lift,rotation,height=null)=>{
      const holder=new THREE.Group(),model=industrial.models.get(id).clone(true);model.rotation.y=rotation;holder.add(model);const b=new THREE.Box3().setFromObject(holder),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());
      const scale=height?height/size.y:4.12/Math.max(size.x,size.z);holder.scale.setScalar(scale);holder.position.set(x-center.x*scale,lift-b.min.y*scale,z-center.z*scale);root.add(holder);holder.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(holder),record={key:id+':crosswalk',min:bounds.min.toArray(),max:bounds.max.toArray(),overhead:lift>=3.5};
      if(id==='v2_truss_bridge'){
        const checked=bridgeSupportBounds(THREE,holder,x,z,rotation);
        edgePlacements.push({...record,key:id+':upper-structure',min:[record.min[0],3.5,record.min[2]],overhead:true,checkedLowTriangles:checked.checkedTriangles},...checked.supports);
      }else edgePlacements.push(record);
      holder.traverse(o=>{if(o.isMesh)o.userData.f3Bounds=record;});
    };
    for(const p of crossings){
      if(selected.length>=(a.f===2?2:4)||selected.some(q=>Math.abs(p.x-q.x)+Math.abs(p.z-q.z)<7))continue;selected.push(p);
      const x=p.x*CELL,z=p.z*CELL;
      if(v2&&industrial.models.has('v2_truss_bridge')){
        // Source piers at ±3.25m sit inside solid cells, deck underside5.2m.
        mount('v2_truss_bridge',x,z,0,p.acrossX?0:Math.PI/2,7.2);count('supportedTrussBridge');continue;
      }
      mount('grating_catwalk',x,z,3.55,p.acrossX?0:Math.PI/2);
      for(const side of[-1,1])mount('column_joint',x+(p.acrossX?side*1.7:0),z+(p.acrossX?0:side*1.7),0,p.acrossX?Math.PI/2:0,3.55);
      count('supportedCrosswalk');
    }
    batchStatic();
    skyMesh = finish.sky(); root.add(skyMesh);
    const sun = new THREE.DirectionalLight(0xe6e9e2, v2?1.85:.85);
    sun.position.set(a.w * 2 - 35, 65, a.h * 2 - 25);
    sun.target.position.set(a.w * 2, 0, a.h * 2); root.add(sun, sun.target);
    if(v2&&g.high){
      g.renderer.shadowMap.enabled=true;g.renderer.shadowMap.type=THREE.PCFSoftShadowMap;shadowEnabled=true;
      sun.castShadow=true;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-16;sun.shadow.camera.right=16;sun.shadow.camera.top=16;sun.shadow.camera.bottom=-16;sun.shadow.camera.near=.5;sun.shadow.camera.far=65;sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;cloudSun=sun;
    }
    // Keep the established entry/sync contract for all interactive objects.
    for (const o of a.objects) {
      const f = facing(o.tx, o.ty), [dx, dz] = DIR_VEC[f], ry = FACE_YAW[f];
      const x = o.tx * CELL + (o.onWall ? dx * 2.45 : 0), z = o.ty * CELL + (o.onWall ? dz * 2.45 : 0);
      const e = { o, kind: o.kind, obj: null, state: null, at: new THREE.Vector3(x, 1.2, z), ry };
      switch (o.kind) {
        case 'stairs': e.obj = place(g.world, o.dir === 'down' ? S.stairsDown : S.stairsUp, x, 0, z, ry, o.dir === 'down' ? 1 : 0.75); break;
        case 'save': place(g.world, S.seal, x, 0.005, z, 0, 0.8); e.obj = place(g.world, S.torch, x, 0, z); e.at.y = 1.9; break;
        case 'sign': e.obj = place(g.world, S.sign, x, 0, z, ry); e.at.y = 1.8; break;
        case 'switch': e.obj = place(g.world, S.lever, x, 0, z, ry, 0.85); e.at.y = 1.7; break;
        case 'gate': e.obj = place(g.world, S.runeDoor, x - dx * 1.9, 0, z - dz * 1.9, ry); break;
        case 'exit': e.obj = place(g.world, prototype('exitArch', () => city.arch(3.2, 3.5)), x - DIR_VEC[f][0] * 1.7, 0, z - DIR_VEC[f][1] * 1.7, f === 'up' || f === 'down' ? 0 : Math.PI / 2, 0.92); break;
        case 'npc': e.obj = place(g.world, o.id === 'statue' ? prototype('statue', () => city.statue()) : await load(npcFile(o)), x, 0, z, ry); e.at.y = 2.2; break;
        case 'door': if (!o.hidden) e.ry = open(o.tx, o.ty - 1) || open(o.tx, o.ty + 1) ? 0 : Math.PI / 2; break;
        default: break;
      }
      g.entries.push(e);
    }
    stats.objects = g.entries.length; stats.scenery = placements.length;
  }
  function dispose() {
    fallback?.dispose();fallback=null;fallbackReason=null;
    if(shadowEnabled){g.renderer.shadowMap.enabled=originalShadow.enabled;g.renderer.shadowMap.type=originalShadow.type;shadowEnabled=false;}
    cloudSun?.shadow.dispose();cloudSun=null;edgeBlend?.dispose();edgeBlend=null;v2=false;
    if(environmentTarget){if(g.scene.environment===environmentTarget.texture){g.scene.environment=previousEnvironment;g.scene.environmentIntensity=previousEnvironmentIntensity;}environmentTarget.dispose();environmentTarget=null;}
    root?.parent?.remove(root);
    daylightPool.forEach(light => g.scene.add(light));
    g.camera.far = originalFar; g.camera.updateProjectionMatrix();
    for (const batch of batches) batch.dispose();
    heldGrass.forEach(h=>h.release());heldGrass=[];industrial?.dispose();industrial=null;visibilityGroups=[];lastVisibility="";solid=null;edgePlacements=[];
    city?.dispose(); urban?.dispose(); finish?.dispose(); finish = null; skyMesh = null;
    geometries.forEach(x => x.dispose()); materials.forEach(x => x.dispose());ownedThemeTextures.forEach(x=>x.dispose());ownedThemeTextures=[];contactGeometry=contactMaterial=null;
    root = city = urban = null; batches = []; geometries = []; materials = []; placements = []; prototypes.clear(); stats = {};
  }
  function tick(...args){
    if(fallback){fallback.tick(...args);return;}
    if(skyMesh)skyMesh.position.copy(g.camera.position);
    if(!solid)return;
    const camera=g.camera.position,key=`${Math.floor(camera.x*2)},${Math.floor(camera.z*2)},${Math.round(g.camera.quaternion.y*100)},${Math.round(g.camera.quaternion.w*100)}`;if(key===lastVisibility)return;lastVisibility=key;
    if(cloudSun){const x=Math.floor(camera.x/2)*2,z=Math.floor(camera.z/2)*2;cloudSun.position.set(x-14,28,z+12);cloudSun.target.position.set(x,4,z);cloudSun.target.updateMatrixWorld();cloudSun.shadow.needsUpdate=true;}
    g.camera.updateMatrixWorld(true);viewMatrix.multiplyMatrices(g.camera.projectionMatrix,g.camera.matrixWorldInverse);viewFrustum.setFromProjectionMatrix(viewMatrix);
    let visible=0,total=0;
    for(const group of visibilityGroups){
      if(group.keep)continue;let count=0;
      group.matrices.forEach((m,i)=>{total++;if((!v2||group.boxes[i].distanceToPoint(camera)<12||viewFrustum.intersectsBox(group.boxes[i]))&&cityVisibility(camera,group.bounds[i],solid,44,CELL)){group.batch.setMatrixAt(count,m);group.far?.setMatrixAt(count,m);count++;}});
      for(const batch of [group.batch,group.far].filter(Boolean)){batch.count=count;batch.instanceMatrix.needsUpdate=true;}
      visible+=count;
    }
    stats.visibleInstances=visible;stats.occlusionCandidates=total;
  }
  return { area: 3, env, build, dispose, tick, async sync() { return false; },
    info: () => fallback ? {...fallback.info(),fallbackReason} : ({ ...stats, placed: !!root, surfaceTextures: finish?.textureCount || 0, industrialAssets:industrial?.info(), edgePlacements, placements, memory: { ...g.renderer.info.memory } }) };
}
