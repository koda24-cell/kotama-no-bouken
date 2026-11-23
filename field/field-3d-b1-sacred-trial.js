/* Opt-in F1/3F visual trial. Navigation, water, interactables and saves stay native. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { setFoliageCoverage } from '../preview/f1-foliage-coverage.js';

const REPO = new URL('../', import.meta.url);
const KIT = 'assets/3d/dungeons/b1_sacred_forest_candidates/';
const LEGACY_CEILING = 'assets/3d/dungeons/b1_ancient_forest/modules/mod_ceiling_vault_4m.glb';
const CAPABILITIES = new Set(['explicit_floor_render_profiles_v1', 'gltf_node_material_selection_v1',
  'non_navigation_dressing_ground_v1', 'source_sha256_pins_v1']);
const SOURCE_CACHE = new Map(); // Parsed, hash-keyed prototypes are retained across floor visits.
const loader = new GLTFLoader(), up = new THREE.Vector3(0, 1, 0);
const fail = message => { throw new Error('F1 sacred trial: ' + message); };
const check = (ok, message) => { if (!ok) fail(message); };
const sorted = value => Array.isArray(value) ? value.map(sorted) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => [k, sorted(value[k])])) : value;
const stable = value => JSON.stringify(sorted(value));
const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
async function digest(buffer) {
  check(globalThis.crypto?.subtle, 'SHA-256 is unavailable in this context');
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))].map(v => v.toString(16).padStart(2, '0')).join('');
}
function fileURL(file) {
  check(typeof file === 'string' && /^assets\/3d\/dungeons\/[a-zA-Z0-9_./-]+\.glb$/.test(file)
    && !file.split('/').includes('..'), 'invalid source path');
  return new URL(file, REPO);
}
async function fetchJSON(url) {
  const response = await fetch(url, { cache: 'no-store' });
  check(response.ok, 'JSON fetch failed: ' + response.status);
  return response.json();
}
function documentFromGLB(buffer) {
  check(buffer.byteLength >= 20, 'truncated GLB');
  const v = new DataView(buffer), length = v.getUint32(12, true);
  check(v.getUint32(0, true) === 0x46546c67 && v.getUint32(4, true) === 2
    && v.getUint32(8, true) === buffer.byteLength && v.getUint32(16, true) === 0x4e4f534a
    && length <= buffer.byteLength - 20, 'invalid GLB container');
  const doc = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, length)));
  check((doc.buffers || []).every(b => !b.uri)
    && (doc.images || []).every(i => i.bufferView !== undefined && !i.uri), 'source textures must be embedded');
  return doc;
}
function inspectSource(source) {
  const geometries = new Set(), textures = new Set();
  source.traverse(o => {
    if (!o.isMesh) return;
    check(!o.isSkinnedMesh && !o.morphTargetInfluences?.length, 'animated/deforming source is unsupported');
    const g = o.geometry;
    if (!geometries.has(g)) {
      geometries.add(g);
      check(g.attributes.position && g.attributes.normal && g.attributes.uv && !g.attributes.color,
        'source requires position, normal, UV and no vertex colors: ' + o.name);
      for (const a of Object.values(g.attributes)) for (const n of a.array) check(Number.isFinite(n), 'nonfinite source attribute');
    }
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      check(m, 'missing source material');
      for (const t of Object.values(m)) if (t?.isTexture) textures.add(t);
    }
  });
  check(geometries.size > 0, 'empty source');
  for (const t of textures) check(t.image?.width || t.image?.naturalWidth, 'undecoded texture');
}
async function sharedSource(file, hash) {
  check(isHash(hash), 'missing source SHA: ' + file);
  const url = fileURL(file), key = url.href + '#' + hash;
  let entry = SOURCE_CACHE.get(key);
  if (!entry) {
    entry = { key, refs: 0, promise: null };
    entry.promise = (async () => {
      const response = await fetch(url, { cache: 'no-store' });
      check(response.ok, 'GLB fetch failed: ' + file);
      const buffer = await response.arrayBuffer();
      check(await digest(buffer) === hash, 'GLB SHA mismatch: ' + file);
      const doc = documentFromGLB(buffer);
      // Parsing and all geometry selection happen strictly after source hash verification.
      const gltf = await loader.parseAsync(buffer, new URL('.', url).href);
      inspectSource(gltf.scene);
      const foliage = setFoliageCoverage(gltf.scene, true);
      check(foliage.every(r => r.alphaCutoffUnchanged), 'foliage alpha cutoff changed');
      gltf.scene.updateMatrixWorld(true);
      return { file, sha256: hash, bytes: buffer.byteLength, source: gltf.scene, document: doc, foliage };
    })().catch(error => { if (SOURCE_CACHE.get(key) === entry) SOURCE_CACHE.delete(key); throw error; });
    SOURCE_CACHE.set(key, entry);
  }
  return { entry, record: await entry.promise };
}
function validateContract(layout) {
  check(layout?.schemaVersion === 2, 'unsupported layout schema');
  check(layout.scope === 'candidate_not_applied' && layout.runtimeModified === false && layout.mapModified === false
    && layout.saveMigrationRequired === false, 'layout is not a read-only candidate');
  check(Array.isArray(layout.requiredCapabilities) && layout.requiredCapabilities.length === CAPABILITIES.size
    && new Set(layout.requiredCapabilities).size === CAPABILITIES.size, 'four explicit capabilities are required');
  for (const cap of layout.requiredCapabilities) check(CAPABILITIES.has(cap), 'unsupported capability: ' + cap);
  const c = layout.consumerContract;
  check(c?.implicitFullAssetFallback === false && c.defaultFloorRenderProfile === null
    && c.onUnknownRenderProfile === 'reject_candidate' && c.onSelectionMismatch === 'reject_candidate'
    && c.sourceHashVerification === 'required_before_geometry_selection', 'unsupported consumer contract');
  check(layout.target?.area === 1 && layout.target.floor === 2 && layout.conventions?.tileMeters === 4
    && layout.conventions.up === '+Y' && layout.conventions.front === '+Z', 'wrong floor or coordinate convention');
  for (const field of ['floorPlacements', 'dressingGroundPlacements', 'boundaryWallPlacements', 'ceilingPlacements', 'candidatePropPlacements'])
    check(Array.isArray(layout[field]), 'missing placements: ' + field);
  const policy = layout.dressingGroundPolicy;
  check(policy?.gameTraversable === false && policy.navigationSolidUnchanged === true && policy.mapBoundsExpanded === false,
    'dressing ground cannot alter navigation');
}
function verifyArea(layout, area) {
  const before = layout.beforeFingerprint?.saveCriticalData;
  check(before && area, 'missing native floor identity');
  check(area.n === before.area && area.f === before.floor && area.key === before.floorKey
    && area.w === before.width && area.h === before.height, 'native floor dimensions/identity changed');
  check(stable(area.floor?.map) === stable(before.map)
    && stable(area.grid?.map(row => row.join(''))) === stable(before.map), 'native map changed');
  // These identify fixed objects, not mutable open/chest/quest/gather state.
  const identity = o => Object.fromEntries(['key', 'kind', 'tx', 'ty', 'dir', 'id'].filter(k => o[k] !== undefined).map(k => [k, o[k]]));
  const identities = rows => rows.map(identity).sort((a, b) => a.key.localeCompare(b.key));
  check(Array.isArray(area.objects) && stable(identities(area.objects)) === stable(identities(before.objects)), 'fixed native objects changed');
  return before;
}
function transform(row) {
  const p = row.position, s = row.scale || [1, 1, 1], angle = row.rotationY ?? 0;
  check(Array.isArray(p) && p.length === 3 && p.every(Number.isFinite)
    && Array.isArray(s) && s.length === 3 && s.every(n => Number.isFinite(n) && n > 0) && Number.isFinite(angle), 'invalid placement transform: ' + row.id);
  return new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromAxisAngle(up, angle), new THREE.Vector3(...s));
}
function selectMeshes(record, profile) {
  const meshes = [];
  record.source.traverse(o => { if (o.isMesh) meshes.push(o); });
  if (!profile) return meshes;
  check(record.sha256 === profile.sourceSha256 && profile.onMismatch === 'reject_candidate'
    && profile.selection?.preserveAncestorTransforms === true, 'floor source selection mismatch');
  const selection = profile.selection;
  if (selection.mode === 'all') return meshes;
  check(selection.mode === 'node_and_material_exact' && selection.includeDescendants === false, 'unsupported floor selection');
  const nodes = record.document.nodes.filter(n => n.name === selection.node);
  check(nodes.length === selection.expectedNodeMatches && nodes.length === 1, 'soil node selection mismatch');
  const node = nodes[0];
  check(node.mesh !== undefined && !node.children?.length, 'soil node has unexpected descendants');
  const primitives = record.document.meshes[node.mesh].primitives;
  check(primitives.length === selection.expectedPrimitiveMatches && primitives.length === 1
    && record.document.materials[primitives[0].material]?.name === selection.material, 'soil primitive/material mismatch');
  const chosen = meshes.filter(o => o.name === selection.node
    && (Array.isArray(o.material) ? o.material : [o.material]).every(m => m.name === selection.material));
  check(chosen.length === selection.expectedNodeMatches, 'GLTFLoader soil selection mismatch');
  const bounds = new THREE.Box3();
  for (const o of chosen) {
    o.geometry.computeBoundingBox();
    bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
  }
  check(Math.abs(bounds.max.y - profile.walkSurfaceY) < .002 && Math.abs(bounds.max.x - bounds.min.x - 4) < .002
    && Math.abs(bounds.max.z - bounds.min.z - 4) < .002, 'selected soil ancestor transforms/bounds changed');
  return chosen;
}

/** All candidate work is transactional: no native world changes before success. */
export async function buildSacredForestTrial({ world, layoutUrl, area, renderer }) {
  check(world?.isObject3D && layoutUrl, 'world and layoutUrl are required');
  const layoutAddress = new URL(layoutUrl, document.baseURI);
  check(layoutAddress.origin === REPO.origin && layoutAddress.pathname.startsWith(REPO.pathname), 'layout must be in this repository');
  const [layout, manifest] = await Promise.all([fetchJSON(layoutAddress), fetchJSON(new URL('../manifest.json', layoutAddress))]);
  validateContract(layout);
  const before = verifyArea(layout, area);
  const closedV4 = layout.presentationRevision === 'closed_ruins_v4';
  const closedV3 = closedV4 || layout.presentationRevision === 'closed_ruins_v3';
  const revisionSources = layout.revisionSources ?? [];
  check(Array.isArray(revisionSources) && revisionSources.length <= 64
    && (closedV3 || revisionSources.length === 0), 'unexpected revision sources');
  check(manifest.count === 17 && manifest.assets?.length === 17 && new Set(manifest.assets.map(a => a.id)).size === 17, 'unexpected asset manifest');
  check(await digest(new TextEncoder().encode(stable(before.map))) === layout.beforeFingerprint.mapSha256, 'stored map fingerprint mismatch');
  const expected = new Map(), byId = new Map(), records = new Map(), retained = new Set();
  const batches = [], ownGeometry = new Set(), root = new THREE.Group();
  root.name = 'f1-sacred-forest-opt-in-trial';
  let disposed = false, water = null, waterPromise = null, aperture = null;
  function dispose() {
    if (disposed) return; disposed = true;
    water?.dispose(); aperture?.dispose(); water = null; root.removeFromParent();
    for (const batch of batches) batch.dispose(); // Instance buffers only; cached prototypes remain shared.
    for (const g of ownGeometry) g.dispose();
    root.clear();
    for (const entry of retained) entry.refs = Math.max(0, entry.refs - 1);
  }
  try {
    for (const a of manifest.assets) {
      const file = KIT + a.file;
      fileURL(file); check(isHash(a.sha256), 'missing manifest SHA');
      expected.set(file, a.sha256); byId.set(a.id, { ...a, file });
    }
    const revisionIds = new Set();
    for (const a of revisionSources) {
      check(a && typeof a.id === 'string' && /^[a-zA-Z0-9_-]+$/.test(a.id)
        && !byId.has(a.id) && !revisionIds.has(a.id), 'duplicate/invalid revision asset ID');
      fileURL(a.file);
      check(isHash(a.sha256) && !expected.has(a.file), 'duplicate/invalid revision source');
      revisionIds.add(a.id); expected.set(a.file, a.sha256); byId.set(a.id, { ...a });
    }
    for (const row of layout.ceilingPlacements) {
      if (row.file === LEGACY_CEILING) {
        check(row.reuseExisting === true && isHash(row.sourceSha256), 'legacy ceiling must be explicitly hash-pinned');
        if (expected.has(row.file)) check(expected.get(row.file) === row.sourceSha256, 'conflicting ceiling SHA');
        expected.set(row.file, row.sourceSha256);
      } else {
        const source = byId.get(row.assetId);
        check(closedV3 && revisionIds.has(row.assetId) && source?.file === row.file
          && isHash(row.sourceSha256) && source.sha256 === row.sourceSha256,
        'revision ceiling must match an explicit revision source');
      }
    }
    // Bounded parallel loading verifies every candidate source, even an unused asset.
    const queue = [...expected]; let next = 0;
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (next < queue.length) {
        const [file, hash] = queue[next++], { entry, record } = await sharedSource(file, hash);
        if (disposed) return; // Another worker failed; never retain resources after rollback.
        if (!retained.has(entry)) { entry.refs++; retained.add(entry); }
        records.set(file, record);
      }
    }));
    const groups = new Map(), variants = new Map(), ids = new Set(), profileCounts = {};
    const counters = { floors: 0, dressingGround: 0, walls: 0, props: 0, ceilings: 0 };
    let instanceTriangles = 0, instances = 0;
    function add(row, kind, useProfile = false) {
      check(typeof row.id === 'string' && !ids.has(row.id), 'duplicate placement ID'); ids.add(row.id);
      const record = records.get(row.file), asset = row.assetId ? byId.get(row.assetId) : null;
      check(record && (!row.assetId || asset?.file === row.file), 'unknown placement source: ' + row.id);
      if (row.sourceSha256) check(row.sourceSha256 === record.sha256, 'placement SHA mismatch: ' + row.id);
      const profile = useProfile ? layout.floorRenderProfiles?.[row.renderProfile] : null;
      if (useProfile) {
        check(profile && profile.sourceAssetId === row.assetId && profile.sourceFile === row.file, 'unknown/mismatched floor profile');
        check(Array.isArray(row.tile) && row.tile.length === 2 && row.tile.every(Number.isInteger), 'invalid floor tile');
        if (profile.requireExplicitTileWhitelist) check((layout.fullRootsoilTileWhitelist || []).some(t => stable(t) === stable(row.tile)), 'full rootsoil tile is not whitelisted');
        const [x, z] = row.tile || [], letter = before.map[z]?.[x] ?? '#';
        check(letter !== '~' && row.sourceCharUnchanged === letter, 'floor source map/water mismatch');
        if (kind === 'dressingGround') check(letter === '#' && row.renderProfile === 'soil_surface_only'
          && row.gameTraversable === false && row.navigationSolidUnchanged === true && row.mapBoundsExpanded === false, 'dressing ground is not non-navigation soil');
      }
      const placement = transform(row), sourceInverse = record.source.matrixWorld.clone().invert();
      const uv = profile?.uvScale || [1, 1];
      check(Array.isArray(uv) && uv.length === 2 && uv.every(n => Number.isFinite(n) && n > 0), 'invalid UV scale');
      for (const o of selectMeshes(record, profile)) {
        let geometry = o.geometry;
        if (uv[0] !== 1 || uv[1] !== 1) {
          const key = geometry.uuid + ':' + uv.join(',');
          if (!variants.has(key)) {
            const copy = geometry.clone(), attribute = copy.attributes.uv;
            for (let i = 0; i < attribute.count; i++) attribute.setXY(i, attribute.getX(i) * uv[0], attribute.getY(i) * uv[1]);
            variants.set(key, copy); ownGeometry.add(copy);
          }
          geometry = variants.get(key);
        }
        const matrix = placement.clone().multiply(sourceInverse).multiply(o.matrixWorld);
        const p = new THREE.Vector3().setFromMatrixPosition(matrix), bx = Math.floor(p.x / 16), bz = Math.floor(p.z / 16);
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        const key = `${bx},${bz}:${geometry.uuid}:${materials.map(m => m.uuid).join(',')}`;
        if (!groups.has(key)) groups.set(key, { geometry, material: o.material, bx, bz, matrices: [] });
        groups.get(key).matrices.push(matrix);
        instanceTriangles += (geometry.index?.count || geometry.attributes.position.count) / 3; instances++;
      }
      counters[kind]++; if (kind === 'floors') profileCounts[row.renderProfile] = (profileCounts[row.renderProfile] || 0) + 1;
    }
    for (const row of layout.floorPlacements) add(row, 'floors', true);
    for (const row of layout.dressingGroundPlacements) add(row, 'dressingGround', true);
    for (const row of layout.boundaryWallPlacements) add(row, 'walls');
    for (const row of layout.candidatePropPlacements) add(row, 'props');
    for (const row of layout.ceilingPlacements) add(row, 'ceilings');
    for (const group of groups.values()) {
      const batch = new THREE.InstancedMesh(group.geometry, group.material, group.matrices.length);
      batch.name = 'f1-sacred:16m-batch'; batch.position.set(group.bx * 16 + 8, 0, group.bz * 16 + 8);
      const inverse = new THREE.Matrix4().makeTranslation(-batch.position.x, 0, -batch.position.z);
      group.matrices.forEach((m, i) => batch.setMatrixAt(i, inverse.clone().multiply(m)));
      batch.instanceMatrix.needsUpdate = true; batch.computeBoundingBox(); batch.computeBoundingSphere();
      batch.castShadow=closedV4; batch.receiveShadow=closedV4; batch.userData.f1SacredTrial = true; root.add(batch); batches.push(batch);
    }
    if(closedV4){const {createApertureLightV4}=await import('./f1-aperture-light-v4.js');aperture=createApertureLightV4({root,openings:layout.closedRuinsV3.roof.openings,renderer});}
    const sun = new THREE.DirectionalLight(closedV3 ? 0xb7c8a5 : 0xffe2b8, closedV3 ? 1.05 : 2.0);
    sun.name = 'f1-sacred:daylight'; sun.position.set(20, 90, -30); sun.target.position.set(52, 0, 32);
    root.add(sun, sun.target);
    const lightPockets = closedV3 ? (layout.closedRuinsV3?.lightPockets ?? []) : [];
    check(Array.isArray(lightPockets) && lightPockets.length <= 8, 'invalid light pockets');
    for (const [i, pocket] of lightPockets.entries()) {
      check(pocket && Array.isArray(pocket.position) && pocket.position.length === 3 && pocket.position.every(Number.isFinite)
        && Number.isInteger(pocket.color) && pocket.color >= 0 && pocket.color <= 0xffffff
        && Number.isFinite(pocket.intensity) && pocket.intensity > 0 && pocket.intensity <= 30
        && Number.isFinite(pocket.distance) && pocket.distance > 0 && pocket.distance <= 64, 'invalid light pocket');
      const light = new THREE.PointLight(pocket.color, pocket.intensity, pocket.distance, 2);
      light.name = 'f1-closed:light-pocket-' + i; light.position.set(...pocket.position); root.add(light);
    }
    const info = { scope: 'opt_in_visual_game_trial', schemaVersion: layout.schemaVersion, capabilities: [...CAPABILITIES],
      presentationRevision: layout.presentationRevision ?? null, revisionSourceCount: revisionSources.length,
      roof: closedV3 ? layout.closedRuinsV3?.roof ?? null : null, lightPockets: lightPockets.length,
      target: layout.target, placements: ids.size, ...counters, profileCounts, soilSurfaceFloors: profileCounts.soil_surface_only || 0,
      batches: batches.length, instances, instanceTriangles, spatialBucketMeters: 16, sourceCount: records.size,
      sourceSHA: Object.fromEntries([...records].map(([file, r]) => [file, r.sha256])), sourceHashesVerified: true,
      mapSha256: layout.beforeFingerprint.mapSha256, fixedObjectsPreserved: area.objects.length,
      foliageAlphaCutoffPreserved: true, realDevicePerformanceApproved: false };
    verifyArea(layout, area); // A stale native floor never receives a partially built trial.
    world.add(root);
    async function attachWater(meshes) {
      check(closedV3, 'water attachment requires closed ruins v3');
      if (disposed) return null;
      if (!waterPromise) waterPromise = (async () => {
        const module = await import(closedV4 ? './f1-closed-water-v4.js' : './f1-closed-water-v3.js');
        const createWater = closedV4 ? module.createClosedWaterV4 : module.createClosedWaterV3;
        if (disposed) return null;
        const created = await createWater({ meshes, root, map: before.map });
        if (disposed) { created.dispose(); return null; }
        water = created;
        return water.info();
      })();
      return waterPromise;
    }
    const env = closedV3
      ? { background: 0x101f18, fog: { color: 0x172c20, density: .045 },
        hemi: { sky: 0x91a58c, ground: 0x263426, high: .95, low: 1.25 } }
      : { background: 0x9eafa3, fog: { color: 0x8fa096, density: .009 },
        hemi: { sky: 0xc0d2bb, ground: 0x3d4432, high: 1.0, low: 1.2 } };
    return { root, env, far: closedV3 ? 40 : 96,
      info: () => ({ ...info, water: water?.info() ?? null, aperture: aperture?.info() ?? null }), attachWater,
      update: seconds => { if (!disposed && Number.isFinite(seconds)) { water?.update(seconds); aperture?.update(seconds); } }, dispose };

  } catch (error) { dispose(); throw error; }
}

// Same verified immutable prototype cache for staged first-stratum dressing.
export async function retainFirstLayerSource(file,sha256){
  const {entry,record}=await sharedSource(file,sha256);entry.refs++;
  let released=false;
  return{source:record.source,release(){if(released)return;released=true;entry.refs=Math.max(0,entry.refs-1);}};
}
