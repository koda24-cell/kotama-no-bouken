/* Fourth and fifth stratum map-driven 3D placement. Visuals only; map remains authoritative. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createB4RockForms } from './b4-fractured-rock-ore.js?v=20261110-quality';
import { createB4SurfaceLibrary } from './b4-surface-library.js?v=20261122-n2';
import { addB4VolcanicDetail } from './b4-volcanic-detail.js?v=20261122-n2';
import { addB4GameScenery } from './b4-game-scenery.js?v=20261110-quality';
import { faceKey, disposeB4Owned } from './b4-placement.js?v=20261110-quality';
import { addB4AssetDressing } from './b4-asset-dressing.js?v=20261122-n2';
import { buildDeepLava, advanceVfxTime } from './b4-temple-fx.js?v=20261122-n2';
import { buildTempleDecor } from './b4-temple-decor.js?v=20261122-n2';
import { createUpperKit } from './b4-upper.js?v=20261122-n2';
import { buildVista } from './b4-vista.js?v=20261122-n2';
import { buildRockPass, makeRockyZone } from './b4-rocks.js?v=20261122-n2';
import { createB4Kit, nearCull as kitNearCull } from './b4-kit.js?v=20261122-n2';
import { findVaultRooms, buildAntigravHall, buildSanctum, buildCauseway, buildPitRail } from './b4-sanctum.js?v=20261122-n2';
import { build12FFX } from './b4-fx12.js?v=20261122-n2';
import { planChasms, buildChasms } from './b4-chasm.js?v=20261122-n2';
import { createTempleMaterials, makeTempleFacePicker, buildTempleTrims, buildCeilingBeams } from './b4-temple-arch.js?v=20261122-n2';
import { createB5Dressing, isB5Hall, compactB5Static } from './b5-scene-dressing.js';
import { createB5DistantFogBackground } from './b5-distant-fog-background.js';
import { createB5ArcaneSparks, createB5PathEdgeMist } from './b5-vfx-presets.js';
import { createB5V6Scene } from './b5v6/b5v6-scene.js';
// 5層 V6（2026-11-26 Claude, 未承認の試作）。?b5v6=0 か localStorage kotama.b5v6=off で従来表示に戻す
const B5V6_ON = (() => { try { return new URLSearchParams(location.search).get('b5v6') !== '0' && localStorage.getItem('kotama.b5v6') !== 'off'; } catch (_) { return true; } })();
// 4層専用の配置物はページ全体で1組（g.world に置かれ、読み込みキャッシュの部品と同じ扱い）
const DRAGON_HEAD_YAW = -Math.PI / 2;
let B4_KIT = null;
const getB4Kit = () => (B4_KIT ||= createB4Kit(createTempleMaterials()));

export function createTheme(api, area) {
  const { g, CELL, DIR_ORDER, DIR_VEC, FACE_YAW, hash, place, load, npcFile, FILES } = api;
  const magma = area === 4, mist = area === 3;
  const ENV = mist
    ? { background: 0x182a26, fog: { color: 0x536c67, density: 0.066 }, hemi: { sky: 0x9bbdb3, ground: 0x253e31, high: 1.55, low: 1.85 } }
    : magma
    // 2026-11-20 user: 暗い → 赤・オレンジ系で見やすく。熱い空気（暖色の霧）と溶岩の照り返し（下からの赤）
    ? { background: 0x401608, fog: { color: 0x74300f, density: 0.015 }, hemi: { sky: 0xffc49c, ground: 0xc04a1c, high: 4.4, low: 4.8 } }
    : area === 5 && B5V6_ON
    // 5層 V6：黒い神殿。霧で通路の奥を溶かし、光は篝火とろうそくで作る
    ? { background: 0x050409, fog: { color: 0x120f1c, density: 0.042 }, hemi: { sky: 0x8f8ca8, ground: 0x231f2b, high: 1.5, low: 2.0 } }
    : { background: 0x050514, fog: { color: 0x10102a, density: 0.022 }, hemi: { sky: 0x9d9bd6, ground: 0x292541, high: 1.75, low: 2.05 } };
  function rockTexture(seed) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d'); if (!ctx) return null;
    const img = ctx.createImageData(128, 128);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const coarse = Math.sin(x * 0.12 + seed) * Math.cos(y * 0.1 + seed * 0.4);
      const grain = Math.sin(x * 0.87 + y * 1.37 + seed) * Math.cos(y * 0.73 - x * 0.31);
      const veins = Math.abs(Math.sin(x * 0.04 + Math.sin(y * 0.06) * 3 + seed));
      const v = Math.max(30, Math.min(225, 117 + coarse * 31 + grain * 19 - (veins > 0.98 ? 38 : 0)));
      const i = (y * 128 + x) * 4;
      img.data[i] = v; img.data[i + 1] = v * (mist ? 0.99 : magma ? 0.84 : 0.91);
      img.data[i + 2] = v * (mist ? 0.86 : magma ? 0.76 : 1.04); img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(canvas); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }
  const surfaces = magma ? createB4SurfaceLibrary({high:g.high}) : null;
  const rockMap = magma ? null : rockTexture(4), floorMap = magma ? null : rockTexture(11);
  const mat = {
    floor: new THREE.MeshStandardMaterial({ color: mist ? 0x485d4b : magma ? 0x544038 : 0x48445d, roughness: 0.85, map: floorMap }),
    wall: new THREE.MeshStandardMaterial({ color: mist ? 0x344c42 : magma ? 0x30262a : 0x22233c, roughness: 0.93, flatShading: true, map: rockMap }),
    ceiling: new THREE.MeshStandardMaterial({ color: mist ? 0x30493c : magma ? 0x281b1a : 0x171729, roughness: 1, side: THREE.DoubleSide, map: rockMap }),
    glow: new THREE.MeshStandardMaterial({ color: mist ? 0x83d7c1 : magma ? 0xff4a12 : 0x7950ed, emissive: mist ? 0x4aab91 : magma ? 0xff2600 : 0x6437ef, emissiveIntensity: magma ? 1.8 : 1.5, roughness: 0.2 }),
    metal: new THREE.MeshStandardMaterial({ color: mist ? 0x5a735a : magma ? 0x8b6551 : 0x565877, metalness: 0.55, roughness: 0.5 })
  };
  if (surfaces) {
    for (const [name,material] of Object.entries({floor:surfaces.ash,wall:surfaces.basalt,ceiling:surfaces.ceiling,glow:surfaces.ember,metal:surfaces.iron})) {
      mat[name].dispose(); mat[name]=material;
    }
  }
  // 黒き神殿（2026-11-21）：神殿の壁・床・化粧材の材質（CC0 スキャン）
  const temple = magma ? createTempleMaterials() : null;
  const isTempleFace = makeTempleFacePicker(hash);
  const rockyZone = makeRockyZone(hash);   // 岩盤・炭鉱の区域（10F・11F）
  if (temple) mat.floor = temple.floor;
  const templeWallGeo = magma ? fixEndUV(new THREE.BoxGeometry(4.08, 4.2, 0.65, 1, 1, 1), 4.08) : null;
  if (templeWallGeo) templeWallGeo.userData.b4Shared = true;
  const templeWallGeoTall = magma ? (() => { const b = fixEndUV(new THREE.BoxGeometry(4.08, 8.2, 0.65, 1, 1, 1), 4.08); b.userData.b4Shared = true; const uv = b.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 8.2 / 4.2); return b; })() : null;
  const floorGeo = new THREE.BoxGeometry(4.02, 0.32, 4.02, magma ? 4 : 1, 1, magma ? 4 : 1);
  if (magma) {
    const p=floorGeo.getAttribute('position');
    for(let i=0;i<p.count;i++)if(p.getY(i)>0){
      const x=p.getX(i),z=p.getZ(i),edge=Math.max(0,1-Math.pow(Math.abs(x)/2.01,4))*Math.max(0,1-Math.pow(Math.abs(z)/2.01,4));
      p.setY(i,p.getY(i)+Math.sin(x*2.3+z*.7)*Math.cos(z*2.8-x)*.075*edge);
    }
    floorGeo.computeVertexNormals();
  }
  // B4's large rock relief supplies the silhouette detail; avoid spending nearly
  // a million triangles on dense copies of the underlying wall panels.
  const wallGeo = new THREE.BoxGeometry(4.08, 4.2, 0.65, magma ? 8 : 16, magma ? 8 : 14, 2);
  { const p = wallGeo.getAttribute('position'); for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = Math.sin(x * 2.6 + y * 1.7) * Math.cos(y * 3.3 - x * 1.4) * 0.12 + Math.sin(x * 6.2 + y * 4.3) * 0.045;
    if (Math.abs(z) > 0.3) p.setZ(i, z + Math.sign(z) * d);
  } p.needsUpdate = true; wallGeo.computeVertexNormals(); }
  // 第4階層専用：溶岩流で削れた玄武岩の張り出しを追加。
  // 壁の両端と上下端を固定し、隣接するマスや天井との継ぎ目を抑える。
  // 第3・第5階層には適用しない。
  // 壁の箱の端（厚さ 0.65 m）に正面と同じ UV が押し込まれて縦じまになる → 端の面の u を厚さに合わせる（2026-11-22）
  function fixEndUV(geo, w) { if (!geo) return geo; const n = geo.attributes.normal, uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) if (Math.abs(n.getX(i)) > 0.9) uv.setX(i, uv.getX(i) * 0.65 / w); uv.needsUpdate = true; return geo; }
  if (magma) fixEndUV(wallGeo, 4.08);
  const volcanicWallGeo = magma ? wallGeo.clone() : null;
  const recessWallGeo = magma ? new THREE.BoxGeometry(4.08, 4.2, 0.22) : null;
  if (volcanicWallGeo) {
    const p = volcanicWallGeo.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (Math.abs(z) < 0.3) continue;
      const edge = THREE.MathUtils.smoothstep(2.04 - Math.abs(x), 0, 0.5);
      const height = THREE.MathUtils.smoothstep(2.1 - Math.abs(y), 0, 0.48);
      const large = Math.sin(x * 1.19 + y * 0.63) * Math.cos(y * 0.94 - x * 0.36);
      const small = Math.sin(x * 3.45 - y * 2.18) * Math.cos(y * 1.83 + x * 1.22);
      const fracture = Math.pow(Math.abs(Math.sin(x * 2.2 + y * 0.7)), 10);
      p.setZ(i, z + Math.sign(z) * (large * 0.26 + small * 0.11 - fracture * 0.07) * edge * height);
    }
    p.needsUpdate = true;
    volcanicWallGeo.computeVertexNormals();
  }
  // B5 parapets/tall flat hall walls do not need the cave mesh's 16×14 grid.
  const b5WallGeo = area === 5 ? new THREE.BoxGeometry(4.08, 4.2, 0.65, 2, 2, 1) : null;
  const ceilingGeo = new THREE.PlaneGeometry(4.02, 4.02, 12, 12).rotateX(Math.PI / 2);
  { const p = ceilingGeo.getAttribute('position'); for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const edge = magma ? Math.max(0,1-Math.pow(Math.abs(x)/2.01,4))*Math.max(0,1-Math.pow(Math.abs(z)/2.01,4)) : 1;
    p.setY(i, Math.sin(x * 2.3 + z * 0.8) * Math.cos(z * 2.1 - x) * (magma ? .28 : .16)*edge);
  } p.needsUpdate = true; ceilingGeo.computeVertexNormals(); }
  const crystalGeo = new THREE.ConeGeometry(0.32, 1.25, 5);
  const rimGeo = new THREE.BoxGeometry(0.18, 0.08, 3.3);
  let b4Plan = null, volcanicDetail = null, cameraLamp = null;
  let dressing = null, ownedModels = [], ownedModelGeometry = [];
  let root = null, lights = [], ornaments = 0, dynamic = [], localGeometries = [], landmarkState = 'pending';
  let b4Dressing = null, deepLava = null;
  let oreSites = [], lavaSites = [], deepLavaTiles = [], templeFaces = [], templeTiles = [], templeTrims = null, templeBeams = null, chasmPlan = null, chasms = null, vaultHall = null, vaultSanctum = null, templeDecor = null, rockPass = null, statueOwned = [], causeway = null, pitRail = null, vistaWorld = null, upper = null, fx12 = null;
  const gltfLoader = new GLTFLoader();
  const localGeo = geo => (localGeometries.push(geo), geo);
  const shardGeo = localGeo(new THREE.ConeGeometry(0.22, 1.1, 5));
  const archGeo = localGeo(new THREE.CylinderGeometry(0.22, 0.36, 3.6, 7));
  const trunkGeo = localGeo(new THREE.CylinderGeometry(0.24, 0.47, 6.8, 7));
  const canopyGeo = localGeo(new THREE.ConeGeometry(1.6, 4.4, 7));
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a443b, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x294d43, roughness: 1, flatShading: true });
  const emberGeo = localGeo(new THREE.IcosahedronGeometry(0.06, 0));
  const crackGeo = localGeo(new THREE.PlaneGeometry(3.4, 0.07).rotateX(-Math.PI / 2));
  const lavaGeo = localGeo(new THREE.PlaneGeometry(magma ? 4.05 : 3.85, magma ? 4.05 : 3.85).rotateX(-Math.PI / 2));
  const flameMat = new THREE.MeshBasicMaterial({ color: mist ? 0xa3ffe4 : magma ? 0xff6b24 : 0xb18cff, transparent: true, opacity: 0.75, depthWrite: false });
  function mesh(geo, material, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z); m.rotation.y = ry; m.scale.set(sx, sy, sz); root.add(m); return m;
  }
  function batchStatic() {
    // 1マスごとの描画呼び出しを同一形状・材質のインスタンスへまとめる。
    const moving = new Set(dynamic.map(x => x.mesh));
    const groups = new Map();
    for (const m of [...root.children]) {
      if (!m.isMesh || moving.has(m)) continue;
      const key = m.geometry.uuid + ':' + m.material.uuid;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(m);
    }
    for (const items of groups.values()) {
      if (items.length < 2) continue;
      const first = items[0], batch = new THREE.InstancedMesh(first.geometry, first.material, items.length);
      batch.name = 'b' + area + ':instanced:' + first.geometry.type;
      batch.frustumCulled = false; // 各マスの広い範囲を一括した場合の誤カリングを防ぐ
      items.forEach((m, i) => { m.updateMatrix(); batch.setMatrixAt(i, m.matrix); root.remove(m); });
      batch.instanceMatrix.needsUpdate = true;
      root.add(batch);
    }
  }
  // Visual-only backdrop: follows the camera, remains behind physical walls,
  // and never modifies collision, visibility, map cells or saved state.
  let b5v6 = null;
  let b5Fog = null, b5FogTexture = null, b5FogBuild = 0, b5Sparks = null, b5EdgeMist = null;
  const b5FogPath = './field/assets/b5-distant/facade020c-windows.png';
  function installB5Fog() {
    if (area !== 5 || !g.scene) return;
    const token = ++b5FogBuild;
    b5Fog = createB5DistantFogBackground({width:230,height:135,seed:514});
    b5Fog.mesh.name = 'b5:v5-distant-miasma';
    b5Fog.mesh.frustumCulled = false;
    g.scene.add(b5Fog.mesh);
    b5Sparks = createB5ArcaneSparks({count:g.high?42:16});
    g.scene.add(b5Sparks.points);
    b5EdgeMist = createB5PathEdgeMist();
    g.scene.add(b5EdgeMist.mesh);
    new THREE.TextureLoader().load(b5FogPath, texture => {
      if (token !== b5FogBuild || !b5Fog) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      b5FogTexture = texture;
      b5Fog.mesh.material.uniforms.uWindowMap.value = texture;
      b5Fog.mesh.material.uniforms.uUseWindowMap.value = 1;
    }, undefined, () => {
      // The procedural fallback keeps the dungeon playable if the optional
      // CC0 texture has not yet been promoted to the repository.
    });
  }
  function clearB5Fog() {
    ++b5FogBuild;
    if (b5Fog) { b5Fog.mesh.parent?.remove(b5Fog.mesh); b5Fog.dispose(); b5Fog = null; }
    b5FogTexture?.dispose(); b5FogTexture = null;
    if (b5Sparks) { b5Sparks.points.parent?.remove(b5Sparks.points); b5Sparks.dispose(); b5Sparks = null; }
    if (b5EdgeMist) { b5EdgeMist.mesh.parent?.remove(b5EdgeMist.mesh); b5EdgeMist.dispose(); b5EdgeMist = null; }
  }
  async function build(a, S, info) {
    if (surfaces) await surfaces.ready;
    dispose();
    root = new THREE.Group(); root.name = mist ? 'b3_mist_forest_map' : magma ? 'b4_magma_map' : 'b5_abyss_map'; g.world.add(root);
    const { ch, wallCell, facing, open } = info;
    const buildRoot = root; oreSites = []; lavaSites = []; deepLavaTiles = []; templeFaces = []; templeTiles = [];
    const b5 = area === 5, hall = b5 && isB5Hall(a, ch);
    const b4Vault = magma && a.f === 2;
    const rocky = (tx, ty) => magma && !b4Vault && rockyZone(tx + a.f * 11, ty + a.f * 7);
    // 12F：開けた場所（柱の間・参道・聖域）は 8.2 m の天井を張らず、上の空間（回廊・橋・溶岩の水路・高い天井）を作る
    const vaultAreas = [];
    if (b4Vault) {
      const rv = findVaultRooms(a, ch);
      if (rv.hall) vaultAreas.push({ kind: 'hall', r: rv.hall.room });
      if (rv.sanctum) vaultAreas.push({ kind: 'sanctum', r: rv.sanctum.room });
      const cw = []; for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (ch(x, y) === ',') cw.push([x, y]);
      if (cw.length) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, y] of cw) { for (let k = -2; k <= 2; k++) if (ch(x + k, y) === '~' || k === 0) { x0 = Math.min(x0, x + k); x1 = Math.max(x1, x + k); } z0 = Math.min(z0, y); z1 = Math.max(z1, y); } vaultAreas.push({ kind: 'causeway', r: [x0, z0, x1, z1] }); }
    }
    const openTop = (tx, ty) => vaultAreas.some(({ r }) => tx >= r[0] && tx <= r[2] && ty >= r[1] && ty <= r[3]);
    const objAt = new Set(a.objects.map(o => o.tx + ',' + o.ty));
    b4Plan = magma ? addB4GameScenery({root,map:a,ch,wallCell,hash,CELL,surfaces}) : null;
    if (b4Plan) {
      cameraLamp={world:new THREE.Vector3(),color:0xffc890,intensity:8.2,range:11,off:false};
      lights.push(cameraLamp,...b4Plan.lights); g.lights.push(cameraLamp,...b4Plan.lights);
    }
    if (b4Plan) for (const s of [...b4Plan.mines, ...b4Plan.vistaFaces]) objAt.add(s.tx+','+s.ty);
    // 奈落（上下の空間、2026-11-21）：12F 以外で、壁の塊を最大 3 つ縦穴にする
    chasmPlan = magma && a.f !== 2 ? planChasms({ map: a, ch, wallCell, hash, reservedCells: new Set([...(b4Plan?.excludedWalls || [])]) }) : null;
    if (b4Plan) b4Plan.chasmCells = chasmPlan?.cellSet || new Set();

    for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
      if (wallCell(tx, ty)) continue;
      if (b5 && B5V6_ON) continue;   // V6 は床・壁・天井を b5v6 で作る
      const x = tx * CELL, z = ty * CELL, c = ch(tx, ty);
      if (magma && c === '~') {
        // 通れない深い溶岩（ユーザー指示 2026-11-21：通れる浅い溶岩と見分けられるように）。床より 0.55 m 沈んだ流れる溶岩＋黒い岸
        deepLavaTiles.push({ tx, ty });
        continue;
      }
      if (!(magma && c === '>')) mesh(floorGeo, mat.floor, x, -0.17, z);   // 4層の下り階段は口の開いた床を自前で持つ
      if (magma && c === '*') {
        mesh(lavaGeo, surfaces.lava, x, 0.009, z);
        lavaSites.push({ tx, ty });
      }
      // 地熱の亀裂／古代星界の紋様。通行判定には影響させない。
      if (!b5 && !magma && !objAt.has(tx + ',' + ty) && hash(tx, ty, 31) < 0.28) {
        const angle = hash(tx, ty, 32) * Math.PI;
        mesh(crackGeo, mat.glow, x, 0.016, z, angle, 0.65 + hash(tx, ty, 33) * 0.4, 1, 1);
        ornaments++;
      }
      if ((!b5 || hall) && c !== '>' && c !== '<' && !(b4Vault && openTop(tx, ty))) mesh(ceilingGeo, mat.ceiling, x, hall ? 16 : b4Vault ? 8.1 : 4.05, z);
      if (temple && c !== '>' && c !== '<' && hash(tx, ty, 783) < 0.7) templeTiles.push({ tx, ty, rot: !wallCell(tx + 1, ty) || !wallCell(tx - 1, ty) });
      // 洞窟の天井に不規則な鍾乳石、奈落では垂れ下がる古代構造物。
      if (!b5 && !objAt.has(tx + ',' + ty) && hash(tx, ty, 45) < 0.32) {
        const h = magma ? .5 + hash(tx,ty,46)*1.1 : 0.8 + hash(tx, ty, 46) * 1.7;
        const hanging = mesh(shardGeo, mat.wall, x + (hash(tx, ty, 47) - 0.5) * 2.3, (b4Vault ? 8 : 4) - h * 0.45, z + (hash(tx, ty, 48) - 0.5) * 2.3, Math.PI, 1.2, h, 1.2);
        if (magma) hanging.rotation.x=Math.PI;
        ornaments++;
      }
      for (const d of DIR_ORDER) {
        const [dx, dz] = DIR_VEC[d];
        if (!wallCell(tx + dx, ty + dz)) continue;
        const ex = x + dx * 2, ez = z + dz * 2, ry = FACE_YAW[d] + Math.PI;
        if (b4Plan?.openings.has(faceKey(tx,ty,dx,dz))) continue;
        if (chasmPlan?.parapets.has(`${tx},${ty},${dx},${dz}`)) continue;   // 欄干に置き換え（奈落が見える）
        // Other corridors may touch this same solid cell. Keep their wall skin
        // outside the recess instead of letting displaced rock cut through its back/sides.
        const recessSide = b4Plan?.excludedWalls.has(`${tx+dx},${ty+dz}`);
        const tallHallWall = hall && (tx + dx <= 3 || tx + dx >= a.w - 4 || ty + dz === 0 || ty + dz >= a.h - 1);
        if (temple && !recessSide && (b4Vault || (isTempleFace(tx, ty, dx, dz) && !rocky(tx, ty)))) {
          if (b4Vault) mesh(templeWallGeoTall, temple.wall, ex, 4.1, ez, ry, 1, 1, 1); else mesh(templeWallGeo, temple.wall, ex, 2, ez, ry, 1, 1, 1);
          templeFaces.push({ x: ex, z: ez, ry, dx, dz, rune: hash(tx * 3 + dx, ty * 3 + dz, 781) < 0.4, seed: hash(tx, ty, 782 + dx * 2 + dz) });
          continue;
        }
        mesh(recessSide ? recessWallGeo : (b5WallGeo || volcanicWallGeo || wallGeo), temple && !recessSide ? (rocky(tx, ty) ? temple.rock : temple.wall) : mat.wall, ex, b5 ? (tallHallWall ? 7.3 : 0.35) : b4Vault ? 4 : 2, ez, ry, 1, b5 ? (tallHallWall ? 3.5 : 0.25) : b4Vault ? 2 : 1, 1);
        const k = hash(tx, ty, DIR_ORDER.indexOf(d) + 29);
        if (!b5 && k < 0.17 && !objAt.has(tx + ',' + ty)) {
          // 4層：手作りの円錐の結晶はやめ、鉱石はダウンロード／承認済みのモデル（b4-asset-dressing・b4-rocks）に任せる（2026-11-22）
          if (!magma) mesh(crystalGeo, mat.glow, ex - dx * 0.42, 0.6, ez - dz * 0.42, ry, 0.6, 1.1 + k, 0.6);
          if (magma) oreSites.push({ x: ex - dx * 0.42, z: ez - dz * 0.42, dx, dz, k });
          if (lights.length < 28) {
            const L = { world: new THREE.Vector3(ex - dx * 0.4, 1.2, ez - dz * 0.4), color: mist ? 0x92dfc1 : magma ? 0xff6726 : 0x8d6bff, intensity: 0.9, range: 4, off: false };
            g.lights.push(L); lights.push(L);
          }
          ornaments++;
        }
      }
      if (mist && !objAt.has(tx + ',' + ty) && hash(tx, ty, 66) < 0.3) {
        const sx = x + (hash(tx, ty, 67) > 0.5 ? 1.52 : -1.52);
        const sz = z + (hash(tx, ty, 68) > 0.5 ? 1.52 : -1.52);
        mesh(trunkGeo, trunkMat, sx, 3.1, sz, hash(tx, ty, 69) * 6.28, 0.65, 1, 0.65);
        mesh(canopyGeo, leafMat, sx, 6.8, sz, 0, 1, 1, 1);
        ornaments++;
      }
      if (!mist && !magma && !b5 && !objAt.has(tx + ',' + ty) && hash(tx, ty, 76) < 0.12) {
        const sx = x + (hash(tx, ty, 77) - 0.5) * 2.2;
        const sz = z + (hash(tx, ty, 78) - 0.5) * 2.2;
        mesh(archGeo, mat.metal, sx, 1.8, sz, hash(tx, ty, 79) * 6.28, 1, 1, 1);
        if (!magma) mesh(crystalGeo, mat.glow, sx, 3.8, sz, 0, 0.55, 0.7, 0.55);
        ornaments++;
      }
      if (!magma && !b5 && !objAt.has(tx + ',' + ty) && hash(tx, ty, 74) < 0.09) {
        mesh(rimGeo, mat.metal, x, 0.05, z, hash(tx, ty, 75) * Math.PI, 1, 1, 1);
        ornaments++;
      }
      // 空中に漂う火の粉／星界の魔力片。マップに紐づけて再現可能な位置に配置。
      if (!magma && hash(tx, ty, 90) < 0.16 && dynamic.length < 100) {
        const p = mesh(emberGeo, flameMat, x + (hash(tx, ty, 91) - 0.5) * 2.8, 0.7 + hash(tx, ty, 92) * 2.4, z + (hash(tx, ty, 93) - 0.5) * 2.8);
        dynamic.push({ mesh: p, y: p.position.y, phase: hash(tx, ty, 94) * 6.28 });
      }
    }
    // ボスマスの視覚的ランドマーク。GLBが未展開でも探索は止めない。
    if (!mist) {
      let boss = null;
      for (let ty = 0; ty < a.h && !boss; ty++) for (let tx = 0; tx < a.w; tx++) {
        if (ch(tx, ty) === 'B') { boss = { tx, ty }; break; }
      }
      if (boss) {
        const x = boss.tx * CELL, z = boss.ty * CELL;
        if (!b5 && !(magma && a.f === 2)) {
        mesh(archGeo, mat.metal, x - 1.1, 1.8, z, 0, 1.5, 1.1, 1.5);
        mesh(archGeo, mat.metal, x + 1.1, 1.8, z, 0, 1.5, 1.1, 1.5);
        mesh(crystalGeo, mat.glow, x, 2.4, z, Math.PI, 1.8, 2.1, 1.8);
        ornaments += 3;
        }
        const file = magma
          ? './assets/3d/dungeons/b4_dragonfire/models/floor4_corrupted_barrier_v1.glb'
          : './assets/3d/dungeons/b5_abyssal_star_realm/models/floor5_abyss_throne_refined_v2.glb';
        try {
          const gltf = await gltfLoader.loadAsync(file);
          if (magma && root !== buildRoot) { disposeB4Owned(gltf.scene); return; }
          if (magma) gltf.scene.userData.b4Owned = true;
          const model = gltf.scene, bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3()), max = Math.max(size.x, size.y, size.z);
          if (max > 0) {
            const scale = (magma ? 3.2 : 6.5) / max, center = bounds.getCenter(new THREE.Vector3());
            model.scale.setScalar(scale);
            model.position.set(x - center.x * scale, -bounds.min.y * scale, z - center.z * scale);
            model.name = magma ? 'b4_boss_barrier' : 'b5_demon_throne';
            if (magma && a.f === 2) model.visible = false;   // 聖域では竜像と光輪が主役
            if (b5) {
              model.traverse(o => { if (o.geometry) ownedModelGeometry.push(o.geometry); });
              ownedModelGeometry.push(...compactB5Static(model));
            }
            if (!magma) ownedModels.push(model); root.add(model); landmarkState = 'glb-loaded';
            if (magma) {
              try {
                // 12F の守護像：Stanford Dragon（Khronos glTF-Sample-Assets 経由、29k 三角形に間引き。出典は assets/models/floor4/ext/stanford-dragon/manifest.json）
                const dragon = (await gltfLoader.loadAsync(a.f === 2 ? './assets/models/floor4/ext/stanford-dragon/dragon_29k.glb' : './assets/3d/dungeons/b4_dragonfire/models/floor4_dragon_boss_v1.glb')).scene;
                if (root !== buildRoot) { disposeB4Owned(dragon); return; }
                dragon.userData.b4Owned = true;
                const dragonBounds = new THREE.Box3().setFromObject(dragon);
                const dragonSize = dragonBounds.getSize(new THREE.Vector3());
                const dragonMax = Math.max(dragonSize.x, dragonSize.y, dragonSize.z);
                if (dragonMax > 0) {
                  if (a.f === 2) {
                    // 2026-11-22：竜は壁龕（ボスの立ち位置）から外し、聖域の左右に守護像として向かい合わせに置く。
                    // 素材は Z-up のまま（頭 +Y）なので X 軸で -90° 起こす → 頭は -Z。外側の Y 回転で通路の中心へ向ける。
                    const rooms = findVaultRooms(a, ch), R = rooms.sanctum?.room;
                    if (R || true) {
                      // 金青銅の像（聖域の金と白の配色に合わせる）。下からの熱の照り返しを emissive で少し
                      const stone = new THREE.MeshStandardMaterial({ color: 0x8a6430, roughness: 0.32, metalness: 0.9, emissive: 0x2a1004, emissiveIntensity: 0.7 });
                      const eye = stone;
                      const origM = new Set(); dragon.traverse(o => { if (o.isMesh) { origM.add(o.material); o.material = /head/i.test(o.name) ? eye : stone; if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals(); } });   // 法線の無い部品があると照明が NaN になり、ブルームで画面が黒くなる
                      origM.forEach(m => { for (const v of Object.values(m)) if (v?.isTexture) v.dispose(); m.dispose?.(); });
                      const cxS = boss.tx * CELL, sites = [];
                      for (let yy = 0; yy < a.h; yy++) for (let xx = 0; xx < a.w; xx++) if (ch(xx, yy) === 'D') sites.push([xx, yy]);   // 像のマス（通れない）
                      const plinthG = new THREE.BoxGeometry(2.8, 1.0, 3.8);
                      const capG = new THREE.BoxGeometry(3.1, 0.16, 4.0);
                      statueOwned.push(stone, plinthG, capG); dragon.traverse(o => { if (o.geometry) statueOwned.push(o.geometry); });
                      sites.forEach(([sx, sy], k) => {
                        const xS = sx * CELL, zS = sy * CELL;
                        const holder = new THREE.Group(); holder.name = 'b4:dragon-guardian';
                        const body = k === 0 ? dragon : dragon.clone(true);
                        body.scale.setScalar(2.7);   // 高さ 2.7 m・全長 3.8 m・奥行 1.7 m（モデルは高さ 1 に正規化済み）
                        const inner = new THREE.Group(); inner.add(body);
                        const bb = new THREE.Box3().setFromObject(inner), c = bb.getCenter(new THREE.Vector3());
                        body.position.set(-c.x, 1.16 - bb.min.y, -c.z);
                        holder.add(inner);
                        // 体の長さを壁沿い（Z）に、横顔が通路から見えるように。頭は入口（北）へ、左右で鏡写し
                        const fx = Math.sign(cxS - xS);
                        inner.rotation.y = DRAGON_HEAD_YAW; if (fx < 0) inner.scale.x = -1;
                        const pl = new THREE.Mesh(plinthG, temple.trim); pl.position.set(0, 0.5, 0); holder.add(pl);
                        const cap = new THREE.Mesh(capG, temple.trim); cap.position.set(0, 1.08, 0); holder.add(cap);
                        if (lights.length < 100) { const L = { world: new THREE.Vector3(xS + fx * 1.6, 0.6, zS), color: 0xffc070, intensity: 2.4, range: 6, off: false }; lights.push(L); g.lights.push(L); }
                        holder.position.set(xS, 0, zS); root.add(holder);
                      });
                    }
                  } else {
                    const dragonScale = 3.4 / dragonMax;
                    const dragonCenter = dragonBounds.getCenter(new THREE.Vector3());
                    dragon.scale.setScalar(dragonScale);
                    dragon.position.set(x - dragonCenter.x * dragonScale, -dragonBounds.min.y * dragonScale, z - dragonCenter.z * dragonScale);
                    dragon.name = 'b4:dragon-boss-static';
                    root.add(dragon);
                  }
                }
              } catch (_) { /* 竜の素材がない場合も探索は継続 */ }
            }
          } else landmarkState = 'empty-glb';
        } catch (_) { landmarkState = 'procedural-fallback'; }
      }
    }
    // Authored procedural scenery replaces three unbounded GLB environment overlays.
    // Those overlays crossed corridor cells and duplicated the mine/citadel silhouettes.
    if (magma) createB4RockForms({root,map:a,wallCell,hash,CELL,objects:a.objects,excludedWalls:new Set([...b4Plan.excludedWalls,...(b4Plan.chasmCells||[])]),surfaces});
    if (magma) {
      volcanicDetail=addB4VolcanicDetail({root,map:a,ch,wallCell,hash,CELL,plan:b4Plan,surfaces});
      lights.push(...volcanicDetail.lights);g.lights.push(...volcanicDetail.lights);
    }
    if (b5 && B5V6_ON) {
      const scene = await createB5V6Scene({ root: buildRoot, a, ch, wallCell, hash, CELL, g, lights, objects: a.objects });
      if (root !== buildRoot) { scene.dispose(); return; }
      b5v6 = scene;
    } else if (b5) { dressing = createB5Dressing({ root, a, ch, wallCell, hash, CELL, hall }); installB5Fog(); }
    batchStatic();
    if (chasmPlan) chasms = buildChasms({ root: buildRoot, plan: chasmPlan, CELL, hash, trimMaterial: temple.boulder, wallMaterial: temple.wall, lights, gLights: g.lights, isWalk: (x, y) => x >= 0 && y >= 0 && x < a.w && y < a.h && !wallCell(x, y) });
    if (temple) { templeTrims = buildTempleTrims(buildRoot, templeFaces, temple, hash, a.f === 2 ? 8.2 : 4.2); templeBeams = buildCeilingBeams(buildRoot, templeTiles, temple, CELL, a.f === 2 ? 8.1 : 4.05); }
    if (temple) {
      const decorTiles = [];
      for (let ty = 1; ty < a.h - 1; ty++) for (let tx = 1; tx < a.w - 1; tx++) if ('.,'.includes(ch(tx, ty)) && !objAt.has(tx + ',' + ty)) decorTiles.push({ tx, ty });
      const iron = new THREE.MeshStandardMaterial({ color: 0x2a2220, roughness: 0.45, metalness: 0.85 }); localGeometries.push(iron);
      // 壁より上の空間
      {
        const U = createUpperKit({ mats: temple, hash, lights, gLights: g.lights });
        const W = (r) => [(r[0] - 0.5) * CELL, (r[1] - 0.5) * CELL, (r[2] + 0.5) * CELL, (r[3] + 0.5) * CELL];
        for (const { kind, r } of vaultAreas) {
          const [x0, z0, x1, z1] = W(r), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
          U.enclose(x0, z0, x1, z1, { top: kind === 'sanctum' ? 21 : 18 });
          if (kind === 'hall') {
            U.bridge(new THREE.Vector3(x0, 0, cz - 2), new THREE.Vector3(x1, 0, cz + 1), 7.4, 1);
            U.aqueduct(new THREE.Vector3(cx, 0, z0), new THREE.Vector3(cx, 0, cz - 1.2), 10.5, -0.4);
          } else if (kind === 'causeway') {
            U.bridge(new THREE.Vector3(x0, 0, z0 + CELL * 1.2), new THREE.Vector3(x1, 0, z0 + CELL * 1.2), 7.2, 2);
            U.bridge(new THREE.Vector3(x0, 0, z1 - CELL * 0.8), new THREE.Vector3(x1, 0, z1 - CELL * 0.8), 9.8, 3);
            U.aqueduct(new THREE.Vector3(x1, 0, cz), new THREE.Vector3(x0 + CELL * 1.3, 0, cz), 12.0, -0.4);
          }
        }
        if (chasmPlan) chasmPlan.regions.forEach((cells, ri) => {
          const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
          const r = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], [x0, z0, x1, z1] = W(r);
          const alongX = r[2] - r[0] >= r[3] - r[1];
          if (alongX) U.bridge(new THREE.Vector3(x0 + 0.2, 0, (z0 + z1) / 2), new THREE.Vector3(x1 - 0.2, 0, (z0 + z1) / 2), 5.8, 10 + ri);
          else U.bridge(new THREE.Vector3((x0 + x1) / 2, 0, z0 + 0.2), new THREE.Vector3((x0 + x1) / 2, 0, z1 - 0.2), 5.8, 10 + ri);
          // 縦穴の壁の高いところに上の道の戸口を 2 つ
          U.doorway(new THREE.Vector3(x0 + 0.25, 0, (z0 + z1) / 2 + 0.9), new THREE.Vector3(1, 0, 0), 6.6);
          U.doorway(new THREE.Vector3(x1 - 0.25, 0, (z0 + z1) / 2 - 0.9), new THREE.Vector3(-1, 0, 0), 9.4);
        });
        upper = U.finish(buildRoot);
      }
      if (b4Plan?.vista) vistaWorld = buildVista({ root: buildRoot, site: b4Plan.vista, CELL, mats: temple, hash });
      if (!b4Vault) rockPass = buildRockPass({ root: buildRoot, map: a, ch, wallCell, hash, CELL, reserved: objAt, openFaces: new Set(chasms?.parapetFaces.map(f => `${f.tx},${f.ty},${f.dx},${f.dz}`) || []), rocky, mats: temple, lights, gLights: g.lights, nearCull: kitNearCull });
      kitNearCull(iron, 1.5);
      templeDecor = buildTempleDecor({ root: buildRoot, faces: templeFaces, tiles: decorTiles, beams: templeTiles, CELL, hash, ironMaterial: iron, ceiling: a.f === 2 ? 8.1 : 4.05, nearCull: kitNearCull });
    }
    if (temple && a.f === 2) {
      const rooms = findVaultRooms(a, ch);
      if (rooms.hall) vaultHall = buildAntigravHall({ root: buildRoot, hall: rooms.hall, CELL, hash, mats: temple, lights, gLights: g.lights });
      causeway = buildCauseway({ root: buildRoot, map: a, ch, CELL, hash, mats: temple, lights, gLights: g.lights });
      if (rooms.hall) pitRail = buildPitRail({ root: buildRoot, hall: rooms.hall, ch, CELL, hash, mats: temple });
      if (rooms.sanctum) vaultSanctum = buildSanctum({ root: buildRoot, sanctum: rooms.sanctum, CELL, hash, mats: temple, lights, gLights: g.lights });
      // 新しい VFX 10 種＋炎 5 種（柱の間・参道・聖域）
      fx12 = build12FFX({ root: buildRoot, hash, lights, gLights: g.lights, areas: vaultAreas.map(({ kind, r }) => {
        const x0 = (r[0] - 0.5) * CELL, z0 = (r[1] - 0.5) * CELL, x1 = (r[2] + 0.5) * CELL, z1 = (r[3] + 0.5) * CELL, lava = [];
        for (let y = r[1]; y <= r[3]; y++) for (let x = r[0]; x <= r[2]; x++) if ('~*'.includes(ch(x, y))) lava.push([x * CELL, y * CELL]);
        const alongZ = z1 - z0 >= x1 - x0, walls = kind === 'sanctum' ? [] : alongZ
          ? [[x0 + 0.4, (z0 + z1) / 2, Math.PI / 2, z1 - z0 - 2], [x1 - 0.4, (z0 + z1) / 2, -Math.PI / 2, z1 - z0 - 2]]
          : [[(x0 + x1) / 2, z0 + 0.4, 0, x1 - x0 - 2], [(x0 + x1) / 2, z1 - 0.4, Math.PI, x1 - x0 - 2]];
        return { kind, x0, z0, x1, z1, lava, walls, top: kind === 'sanctum' ? 20 : 17, braziers: kind === 'sanctum' ? vaultSanctum?.braziers || [] : [] };
      }) });
    }
    if (b4Plan) {
      // Claude B4 prop GLBs (docs/3d/B4_PROPS_DESIGN.md). Loaded in the background; exploring never waits for them.
      deepLava = buildDeepLava({ root: buildRoot, tiles: deepLavaTiles, ch, CELL, hash });
      const fallRock = new THREE.MeshStandardMaterial({ color: 0x2a221e, roughness: 0.9, flatShading: true }); localGeometries.push(fallRock);
      addB4AssetDressing({ root: buildRoot, map: a, ch, wallCell, hash, CELL, lights, gLights: g.lights, reserved: objAt, extraEmbers: [...deepLava.embers, ...(chasms?.embers || [])], openFaces: new Set(chasms?.parapetFaces.map(f => `${f.tx},${f.ty},${f.dx},${f.dz}`) || []), rockMaterial: fallRock, isTempleFace: (tx, ty, dx, dz) => a.f === 2 || (isTempleFace(tx, ty, dx, dz) && !rocky(tx, ty)), mines: b4Plan.mines.slice(1), oreSites, lavaSites, deepTiles: deepLavaTiles, crystalGeo, isStale: () => root !== buildRoot })
        .then(d => { if (root !== buildRoot) d.dispose(); else b4Dressing = d; })
        .catch(err => console.warn('[b4-dressing]', err));
    }
    // 壁に埋め込まれたスイッチ・碑文は通常の歩行マスと異なるため専用配置。
    // 第5階層の4騎士像の謎解きも、このエントリがないと3D上で操作できない。
    const K = magma && temple ? getB4Kit() : null;
    for (const o of a.objects) {
      if (!o.onWall || (o.kind !== 'switch' && o.kind !== 'sign')) continue;
      const f = facing(o.tx, o.ty), [dx, dz] = DIR_VEC[f];
      const x = o.tx * CELL + dx * 1.55, z = o.ty * CELL + dz * 1.55;
      const ry = FACE_YAW[f];
      const src = o.kind === 'switch' ? S.guardian : S.sign;
      const obj = place(g.world, (o.kind === 'sign' && K?.sign) || src || S.sign, x, 0, z, ry, o.kind === 'switch' ? 0.55 : K ? 1 : 0.8);
      g.entries.push({ o, kind: o.kind, obj, state: null, at: new THREE.Vector3(x, 1.5, z), ry });
    }
    for (const o of a.objects) {
      const x = o.tx * CELL, z = o.ty * CELL, f = facing(o.tx, o.ty), ry = FACE_YAW[f];
      const e = { o, kind: o.kind, obj: null, state: null, at: new THREE.Vector3(x, 1.2, z), ry };
      switch (o.kind) {
        case 'stairs':
          e.obj = K ? place(g.world, o.dir === 'down' ? K.stairsDown : K.stairsUp, x, 0, z, ry, 1) : place(g.world, o.dir === 'down' ? S.stairsDown : S.stairsUp, x, 0, z, ry, o.dir === 'down' ? 1 : 0.75); break;
        case 'save':
          if (K) e.obj = place(g.world, K.torch, x, 0, z); else { place(g.world, S.seal, x, 0.005, z, 0, 0.8); e.obj = place(g.world, S.torch, x, 0, z); } e.at.y = 1.9; break;
        case 'sign': e.obj = place(g.world, K?.sign || S.sign, x, 0, z, ry); e.at.y = 1.8; break;
        case 'gate': e.obj = place(g.world, K?.runeDoor || S.runeDoor, x - DIR_VEC[f][0] * 1.9, 0, z - DIR_VEC[f][1] * 1.9, ry); break;
        case 'exit': e.obj = place(g.world, K?.rootArch || S.rootArch, x, 0, z, (f === 'up' || f === 'down') ? 0 : Math.PI / 2, K ? 1 : 0.92); break;
        case 'npc': e.obj = place(g.world, S.npcTraveler, x, 0, z, ry); e.at.y = 2.2; break;
        case 'door':
          if (!o.hidden) e.ry = open(o.tx, o.ty - 1) || open(o.tx, o.ty + 1) ? 0 : Math.PI / 2;
          break;
        default: break;
      }
      if (!o.onWall) g.entries.push(e);
    }
  }
  function dispose({ final = false } = {}) {
    clearB5Fog();
    b5v6?.dispose(); b5v6 = null;
    if (!magma) {
      const geometries = new Set(), materials = new Set(), textures = new Set();
      for (const model of ownedModels) model.traverse(o => {
        if (o.geometry) geometries.add(o.geometry);
        for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) {
          materials.add(m);
          for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
        }
      });
      ownedModelGeometry.forEach(g => geometries.add(g)); ownedModelGeometry = [];
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      ownedModels = [];
    }
    if (root) {
      if (magma) {
        // Owned scenery/GLBs never contain cached gameplay assets placed under g.world.
        for (const child of root.children) {
          if (child.userData.b4Owned || child.userData.disposeB4RockForms) disposeB4Owned(child);
          else if (child.isInstancedMesh) child.dispose();
        }
      } else root.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
      root.parent?.remove(root);
    }
    dressing?.dispose(); dressing = null; b4Dressing?.dispose(); b4Dressing = null; deepLava?.dispose(); deepLava = null; templeTrims?.dispose(); templeTrims = null; templeBeams?.dispose(); templeBeams = null; chasms?.dispose(); chasms = null; chasmPlan = null; vaultHall?.dispose(); vaultHall = null; vaultSanctum?.dispose(); vaultSanctum = null; templeDecor?.dispose(); templeDecor = null; rockPass?.dispose(); rockPass = null; statueOwned.forEach(o => o.dispose()); statueOwned = []; causeway?.dispose(); causeway = null; pitRail?.dispose(); pitRail = null; vistaWorld?.dispose(); vistaWorld = null; upper?.dispose(); upper = null; fx12?.dispose(); fx12 = null; ownedModels = []; ownedModelGeometry = [];
    for (const L of lights) L.off = true;
    lights = []; dynamic = []; root = null; ornaments = 0; b4Plan = null; volcanicDetail = null; cameraLamp = null; landmarkState = 'pending';
    // build() can reuse this theme's base resources; theme replacement releases them.
    if (final) {
      for (const geo of [floorGeo,wallGeo,volcanicWallGeo,recessWallGeo,b5WallGeo,ceilingGeo,crystalGeo,rimGeo,...localGeometries]) geo?.dispose();
      for (const material of [...Object.values(mat),trunkMat,leafMat,flameMat]) if (!material.userData.b4SurfaceShared) material.dispose();
      surfaces?.dispose();
      rockMap?.dispose(); floorMap?.dispose();
      temple?.dispose?.(); templeWallGeo?.dispose(); templeWallGeoTall?.dispose();
    }
  }
  function tick(dt, now, camera) {
    b5v6?.update(now, g.camera);
    if (b5Fog && g.camera) {
      const eye = g.camera;
      const forward = new THREE.Vector3(0,0,-1).applyQuaternion(eye.quaternion);
      b5Fog.mesh.position.copy(eye.position).addScaledVector(forward, 90);
      b5Fog.mesh.quaternion.copy(eye.quaternion);
      b5Fog.update(now * .001);
      b5Sparks?.update(now * .001,eye.position);
      b5EdgeMist?.update(now * .001,eye);
    }
    if (magma) { advanceVfxTime(now); b4Dressing?.update?.(now); vaultHall?.update(); fx12?.update(); }
    if (surfaces) {
      surfaces.tick(now); volcanicDetail?.tick(now);
      if (cameraLamp && camera) { cameraLamp.world.copy(camera);cameraLamp.world.y+=.75; }
    }
    for (const p of dynamic) {
      p.mesh.position.y = p.y + Math.sin(now * 0.0015 + p.phase) * 0.22;
      p.mesh.scale.setScalar(0.75 + 0.25 * Math.sin(now * 0.003 + p.phase));
    }
  }
  // 4層：宝箱と扉は専用の部品で置く（森の部品を使わない）
  async function sync(e, st) {
    const b4Kit = magma ? getB4Kit() : null;
    if (!magma || !root) return false;
    const o = e.o, x = o.tx * CELL, z = o.ty * CELL;
    const drop = obj => { if (!obj) return; obj.parent?.remove(obj); for (const L of obj.userData.lights || []) L.off = true; };
    if (o.kind === 'chest' || o.kind === 'cache') { drop(e.obj); e.obj = place(g.world, st === 'open' ? b4Kit.chestOpen : b4Kit.chest, x, 0, z, e.ry); return true; }
    if (o.kind === 'gather') {   // 4層の採取ポイント（1層の苔の採掘点・草を使わない）
      const [kind, left] = st.split(':'), k = kind === 'chop' ? 'chop' : kind === 'mine' ? 'mine' : 'herb';
      drop(e.obj); e.obj = place(g.world, b4Kit.gather[left === 'empty' ? k + 'Empty' : k], x, 0, z, e.ry, 1.35);
      return true;
    }
    if (o.kind === 'door' && !o.hidden) {
      if (!e.obj) e.obj = place(g.world, b4Kit.gate, x, 0, z, e.ry, 1);
      e.obj.position.y = st === 'open' ? 3.7 : 0; e.obj.updateMatrix(); e.obj.updateMatrixWorld(true);
      return true;
    }
    return false;
  }
  return { area, env: ENV, build, dispose, tick, sync, info: () => ({ placed: !!root, ornaments, mode: 'map-driven-3d', landmarkState, dressing: dressing?.info(), b5v6: b5v6?.info(), ...(magma ? { scenery: { mines:b4Plan?.mines || [], vista:b4Plan?.vista || null, detail:volcanicDetail?.info, props: b4Dressing?.info() || null, chasms: chasms?.info, vault: { hall: vaultHall?.info, sanctum: vaultSanctum?.info }, decor: templeDecor?.info, rocks: rockPass?.info || null } } : {}) }) };
}
