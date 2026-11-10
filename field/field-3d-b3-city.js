/* B3 visual-only placement. Collision, events, FOE and saves remain owned by field/*.js. */
import * as THREE from 'three';
import { createRuinedCityKit } from './b3-ruined-city-kit.js';
import { createB3UrbanProps } from './b3-ruined-city-urban-props.js';
import { createCitySurfaces } from './b3-city-surfaces.js?v=20261110-1';

export function createTheme(api) {
  const { g, CELL, DIR_ORDER, DIR_VEC, FACE_YAW, hash, place, load, npcFile } = api;
  const originalFar = g.camera.far;
  const daylightPool = g.pool.slice(g.high ? 4 : 2);
  const env = { background: 0x9aa9aa, fog: { color: 0x9aa9aa, density: 0.012 },
    hemi: { sky: 0xb4d0ce, ground: 0x28382e, high: 1.05, low: 1.25 } };
  let root, city, urban, finish, skyMesh, materials = [], geometries = [], batches = [], placements = [], stats = {};
  const prototypes = new Map();
  const geo = x => (geometries.push(x), x);
  const mat = x => { const m = g.high ? new THREE.MeshStandardMaterial(x) : new THREE.MeshLambertMaterial({ color: x.color, flatShading: x.flatShading }); materials.push(m); return m; };
  function add(shape, material, x, y, z, sx, sy, sz, ry = 0) {
    const m = new THREE.Mesh(shape, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.y = ry; root.add(m); return m;
  }
  function prototype(key, make) {
    if (!prototypes.has(key)) {
      const model = finish.dress(make(), key);
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
    holder.scale.set(scale, height / size.y, scale);
    holder.position.set(tx * CELL - center.x * scale, -b.min.y * holder.scale.y, ty * CELL - center.z * scale);
    root.add(holder); holder.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(holder);
    placements.push({ key, tx, ty, min: bounds.min.toArray(), max: bounds.max.toArray() });
  }
  function batchStatic() {
    root.updateMatrixWorld(true);
    const groups = new Map(), meshes = [];
    root.traverse(m => { if (m.isMesh) meshes.push(m); });
    for (const m of meshes) {
      const p = new THREE.Vector3().setFromMatrixPosition(m.matrixWorld);
      // Spatial buckets preserve frustum culling, even across long street corridors.
      const key = `${Math.floor(p.x / 24)},${Math.floor(p.z / 24)}:${m.geometry.uuid}:${m.material.uuid}`;
      if (!groups.has(key)) groups.set(key, []); groups.get(key).push(m);
    }
    stats.sourceMeshes = meshes.length;
    stats.lodPairs = 0;
    for (const items of groups.values()) {
      const first = items[0], batch = new THREE.InstancedMesh(first.geometry, first.material, items.length);
      batch.name = 'b3:city-batch';
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
          lod.addLevel(far, g.high ? 32 : 26); batches.push(far);
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
  async function build(a, S, info) {
    dispose();
    root = new THREE.Group(); root.name = 'b3_ruined_city_map'; g.world.add(root);
    // Daylight carries the city: keep only a few nearby interactive point lights.
    daylightPool.forEach(light => g.scene.remove(light));
    g.camera.far = 80; g.camera.updateProjectionMatrix();
    city = createRuinedCityKit(THREE); urban = createB3UrbanProps(THREE);
    finish = createCitySurfaces(THREE, g.high);
    const cube = geo(new THREE.BoxGeometry(1, 1, 1));
    const { paving, stone, soil, rust: steel, leaf: grass } = finish.palette;
    const tuft = finish.fern;
    const chip = geo(new THREE.IcosahedronGeometry(0.18, 0));
    const water = mat({ color: 0x354f4b, roughness: 0.22, metalness: 0.1 });
    const { ch, wallCell, open, facing } = info;
    const reserved = new Set();
    for (const o of a.objects) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) reserved.add(`${o.tx + dx},${o.ty + dz}`);
    const occupied = new Set();
    const wall = (x, z) => x >= 0 && z >= 0 && x < a.w && z < a.h && ch(x, z) === '#' && !reserved.has(`${x},${z}`);
    stats = { mode: 'b3-ruined-city', floor: a.key, motifs: {}, quality: g.high ? 'high' : 'low' };
    const count = k => { stats.motifs[k] = (stats.motifs[k] || 0) + 1; };
    // Large paired blocks are confined to 2x2 solid cells. Distinct districts per floor.
    let landmark = 0;
    const large = ['collapsedOverpass', 'derelictRailCorridor', 'collapsedSkybridge', 'temple', 'tower', 'arch'];
    for (let z = 0; z < a.h - 1; z++) for (let x = 0; x < a.w - 1; x++) {
      if (![ [0, 0], [1, 0], [0, 1], [1, 1] ].every(([dx, dz]) => wall(x + dx, z + dz) && !occupied.has(`${x + dx},${z + dz}`))) continue;
      // Only dress blocks visible from a street; leave deep interiors empty.
      if (![[-1, 0], [0, -1], [2, 0], [0, 2]].some(([dx, dz]) => !wallCell(x + dx, z + dz))) continue;
      const kind = large[landmark++ % large.length], v = landmark % 3;
      scenery(`${kind}${v}`, () => city[kind] ? city[kind]() : urban[kind](v), x + 0.5, z + 0.5, 7.5, 7.5, kind === 'temple' ? 7 : 6, v * Math.PI / 2);
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
      const n = g.high ? 4 : 3, unit = CELL / n;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const k = hash(x * n + i, z * n + j, 202), edge = i === 0 || j === 0 || i === n - 1 || j === n - 1;
        // Small surface relief only; avoid a false impassable crater on traversable tiles.
        const slab = add(finish.slabs[Math.floor(k * 3)], paving[Math.floor(k * 3)], px + (i + 0.5) * unit - 2, -0.07 + (safe ? 0 : k * 0.07), pz + (j + 0.5) * unit - 2, unit - 0.045, 0.14, unit - 0.045);
        if (!safe && !edge) slab.rotation.z = (k - 0.5) * 0.07;
      }
      if (!safe && r < 0.2) {
        // Use the supplied roots at ankle height, never as a raised obstacle.
        const obj = prototype('paving' + (x % 3), () => urban.rootedPavement(x % 3 + 1));
        obj.scale.set(0.8, 0.18, 0.8); obj.position.set(px, -0.025, pz); root.add(obj); count('rootedPavement');
      }
      if (!safe) {
        // Follow actual street walls, including east-west streets, rather than
        // placing rows of tufts across the walking line.
        const edges = DIR_ORDER.filter(d => wallCell(x + DIR_VEC[d][0], z + DIR_VEC[d][1]));
        for (const d of edges) for (let i = 0; i < (g.high ? 5 : 3); i++) {
          const [dx, dz] = DIR_VEC[d], k = hash(x * 9 + i, z, DIR_ORDER.indexOf(d) + 210);
          if (k < 0.35) continue;
          const along = (i / 5 - 0.4) * 3 + (k - 0.5) * 0.3;
          const gx = px + dx * (1.65 + k * 0.15) + dz * along;
          const gz = pz + dz * (1.65 + k * 0.15) - dx * along;
          const plant = add(tuft, grass, gx, 0.1 + k * 0.13, gz, 0.6 + k, 0.5 + k * 0.5, 0.7);
          plant.rotation.z = k * 0.45;
          if (i === 1) add(chip, stone, gx, 0.05, gz, 1.5, 0.7, 1, k * 6);
        }
      }
      for (const d of DIR_ORDER) {
        const [dx, dz] = DIR_VEC[d]; if (!wallCell(x + dx, z + dz)) continue;
        const ry = FACE_YAW[d] + Math.PI, ex = px + dx * 2.12, ez = pz + dz * 2.12;
        // Continuous base identifies every solid boundary, including closed shortcuts.
        add(cube, stone, ex, 0.55, ez, 4.02, 1.1, 0.24, ry);
        for (const side of [-1, 1]) add(cube, stone, ex + Math.cos(ry) * side * 1.83, 1.4 + r * 0.5, ez - Math.sin(ry) * side * 1.83, 0.32, 1.8 + r * 2, 0.27, ry);
        if (r > 0.5) add(cube, steel, ex, 2.6 + r, ez, r > 0.8 ? 4 : 2.5, 0.16, 0.28, ry);
        if (!safe && r < 0.35) {
          const obj = prototype('wallRoots', () => city.vines());
          obj.scale.set(0.55, 0.65, 0.35); obj.rotation.y = ry; obj.position.set(ex, 0, ez); root.add(obj);
        }
      }
    }
    batchStatic();
    skyMesh = finish.sky(); root.add(skyMesh);
    const sun = new THREE.DirectionalLight(0xffe3ac, 3.0);
    sun.position.set(a.w * 2 - 35, 65, a.h * 2 - 25);
    sun.target.position.set(a.w * 2, 0, a.h * 2); root.add(sun, sun.target);
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
    root?.parent?.remove(root);
    daylightPool.forEach(light => g.scene.add(light));
    g.camera.far = originalFar; g.camera.updateProjectionMatrix();
    for (const batch of batches) batch.dispose();
    city?.dispose(); urban?.dispose(); finish?.dispose(); finish = null; skyMesh = null;
    geometries.forEach(x => x.dispose()); materials.forEach(x => x.dispose());
    root = city = urban = null; batches = []; geometries = []; materials = []; placements = []; prototypes.clear(); stats = {};
  }
  return { area: 3, env, build, dispose, tick() { if (skyMesh) skyMesh.position.copy(g.camera.position); }, async sync() { return false; },
    info: () => ({ ...stats, placed: !!root, surfaceTextures: finish?.textureCount || 0, placements, memory: { ...g.renderer.info.memory } }) };
}
