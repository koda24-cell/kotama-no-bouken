/* Third through fifth stratum map-driven 3D placement. Visuals only; map remains authoritative. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export function createTheme(api, area) {
  const { g, CELL, DIR_ORDER, DIR_VEC, FACE_YAW, hash, place, load, npcFile, FILES } = api;
  const magma = area === 4, mist = area === 3; // B3: ancient ruined city, not forest
  const ENV = mist
    ? { background: 0x292b2a, fog: { color: 0x64695f, density: 0.038 }, hemi: { sky: 0xc5c2a7, ground: 0x383c32, high: 1.55, low: 1.65 } }
    : magma
    ? { background: 0x1b0907, fog: { color: 0x2c100a, density: 0.036 }, hemi: { sky: 0xff8750, ground: 0x25101a, high: 1.45, low: 1.8 } }
    : { background: 0x050514, fog: { color: 0x10102a, density: 0.022 }, hemi: { sky: 0x7779d7, ground: 0x14132e, high: 1.35, low: 1.7 } };
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
  const rockMap = rockTexture(4), floorMap = rockTexture(11);
  const mat = {
    floor: new THREE.MeshStandardMaterial({ color: mist ? 0x77776b : magma ? 0x544038 : 0x48445d, roughness: 0.85, map: floorMap }),
    wall: new THREE.MeshStandardMaterial({ color: mist ? 0x777a70 : magma ? 0x30262a : 0x22233c, roughness: 0.93, flatShading: true, map: rockMap }),
    ceiling: new THREE.MeshStandardMaterial({ color: mist ? 0x555d54 : magma ? 0x281b1a : 0x171729, roughness: 1, side: THREE.DoubleSide, map: rockMap }),
    glow: new THREE.MeshStandardMaterial({ color: mist ? 0xd9c18b : magma ? 0xff4a12 : 0x7950ed, emissive: mist ? 0x98733f : magma ? 0xff2600 : 0x6437ef, emissiveIntensity: magma ? 1.8 : 1.5, roughness: 0.2 }),
    metal: new THREE.MeshStandardMaterial({ color: mist ? 0x77705e : magma ? 0x8b6551 : 0x565877, metalness: 0.55, roughness: 0.5 })
  };
  const floorGeo = new THREE.BoxGeometry(4.02, 0.32, 4.02);
  const wallGeo = new THREE.BoxGeometry(4.08, 4.2, 0.65, 16, 14, 2);
  { const p = wallGeo.getAttribute('position'); for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = Math.sin(x * 2.6 + y * 1.7) * Math.cos(y * 3.3 - x * 1.4) * 0.12 + Math.sin(x * 6.2 + y * 4.3) * 0.045;
    if (Math.abs(z) > 0.3) p.setZ(i, z + Math.sign(z) * d);
  } p.needsUpdate = true; wallGeo.computeVertexNormals(); }
  const ceilingGeo = new THREE.PlaneGeometry(4.02, 4.02, 12, 12).rotateX(Math.PI / 2);
  { const p = ceilingGeo.getAttribute('position'); for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, Math.sin(x * 2.3 + z * 0.8) * Math.cos(z * 2.1 - x) * 0.16);
  } p.needsUpdate = true; ceilingGeo.computeVertexNormals(); }
  const crystalGeo = new THREE.ConeGeometry(0.32, 1.25, 5);
  const rimGeo = new THREE.BoxGeometry(0.18, 0.08, 3.3);
  const pavingGeo = new THREE.BoxGeometry(3.8, 0.035, 0.055);
  const columnGeo = new THREE.CylinderGeometry(0.26, 0.36, 1, 8);
  const capitalGeo = new THREE.BoxGeometry(0.76, 0.19, 0.76);
  // B3 facade: recessed lintel and masonry bands, kept above walking height.
  const lintelGeo = new THREE.BoxGeometry(2.15, 0.24, 0.28);
  const bandGeo = new THREE.BoxGeometry(3.55, 0.065, 0.13);
  const reliefGeo = new THREE.BoxGeometry(0.48, 0.62, 0.095);
  const ruinMat = new THREE.MeshStandardMaterial({ color: 0x9a9885, roughness: 0.96 });
  let root = null, lights = [], ornaments = 0, dynamic = [], localGeometries = [], landmarkState = 'pending';
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
  const lavaGeo = localGeo(new THREE.PlaneGeometry(3.85, 3.85).rotateX(-Math.PI / 2));
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
  async function build(a, S, info) {
    dispose();
    root = new THREE.Group(); root.name = mist ? 'b3_ruined_city_map' : magma ? 'b4_magma_map' : 'b5_abyss_map'; g.world.add(root);
    const { ch, wallCell, facing, open } = info;
    const objAt = new Set(a.objects.map(o => o.tx + ',' + o.ty));
    for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
      if (wallCell(tx, ty)) continue;
      const x = tx * CELL, z = ty * CELL, c = ch(tx, ty);
      mesh(floorGeo, mat.floor, x, -0.17, z);
      if (mist && !objAt.has(tx + ',' + ty)) {
        // Sunken paving joints: thin overlays, no physics or map changes.
        for (const offset of [-1.15, 0.1, 1.35]) mesh(pavingGeo, mat.metal, x, 0.006, z + offset, 0, 1, 1, 1);
        if (hash(tx, ty, 140) < 0.45) mesh(pavingGeo, mat.metal, x + 0.92, 0.007, z, Math.PI / 2, 0.75, 1, 1);
      }
      if (magma && (c === '*' || c === '~')) {
        mesh(lavaGeo, mat.glow, x, 0.009, z);
      }
      // 地熱の亀裂／古代星界の紋様。通行判定には影響させない。
      if (!objAt.has(tx + ',' + ty) && hash(tx, ty, 31) < 0.28) {
        const angle = hash(tx, ty, 32) * Math.PI;
        if (!mist) mesh(crackGeo, mat.glow, x, 0.016, z, angle, 0.65 + hash(tx, ty, 33) * 0.4, 1, 1);
        ornaments++;
      }
      if (c !== '>' && c !== '<') mesh(ceilingGeo, mat.ceiling, x, 4.05, z);
      // 洞窟の天井に不規則な鍾乳石、奈落では垂れ下がる古代構造物。
      if (!mist && !objAt.has(tx + ',' + ty) && hash(tx, ty, 45) < 0.32) {
        const h = 0.8 + hash(tx, ty, 46) * 1.7;
        mesh(shardGeo, mat.wall, x + (hash(tx, ty, 47) - 0.5) * 2.3, 4.0 - h * 0.45, z + (hash(tx, ty, 48) - 0.5) * 2.3, Math.PI, 1.2, h, 1.2);
        ornaments++;
      }
      for (const d of DIR_ORDER) {
        const [dx, dz] = DIR_VEC[d];
        if (!wallCell(tx + dx, ty + dz)) continue;
        const ex = x + dx * 2, ez = z + dz * 2, ry = FACE_YAW[d] + Math.PI;
        mesh(wallGeo, mat.wall, ex, 2, ez, ry);
        if (mist && !objAt.has(tx + ',' + ty) && hash(tx, ty, DIR_ORDER.indexOf(d) + 151) < 0.43) {
          // Broken colonnade sits against solid walls, clear of the walkable tile center.
          const px = ex - dx * 0.13, pz = ez - dz * 0.13;
          const height = 1.15 + hash(tx, ty, DIR_ORDER.indexOf(d) + 157) * 1.65;
          mesh(columnGeo, ruinMat, px, height / 2, pz, 0, 1, height, 1);
          mesh(capitalGeo, ruinMat, px, height + 0.06, pz);
          ornaments += 2;
        }
        if (mist && !objAt.has(tx + ',' + ty)) {
          // Wall-mounted ruined-city architecture; no new collision or blocked passage.
          const seed = DIR_ORDER.indexOf(d) + 181;
          if (hash(tx, ty, seed) < 0.62) {
            mesh(bandGeo, ruinMat, ex - dx * 0.13, 3.62, ez - dz * 0.13, ry);
            ornaments++;
          }
          if (hash(tx, ty, seed + 9) < 0.25) {
            mesh(lintelGeo, ruinMat, ex - dx * 0.16, 3.14, ez - dz * 0.16, ry);
            mesh(reliefGeo, mat.metal, ex - dx * 0.23, 2.65, ez - dz * 0.23, ry);
            ornaments += 2;
          }
        }
        const k = hash(tx, ty, DIR_ORDER.indexOf(d) + 29);
        if (k < 0.17 && !objAt.has(tx + ',' + ty)) {
          mesh(crystalGeo, mat.glow, ex - dx * 0.42, 0.6, ez - dz * 0.42, ry, 0.6, 1.1 + k, 0.6);
          if (lights.length < 28) {
            const L = { world: new THREE.Vector3(ex - dx * 0.4, 1.2, ez - dz * 0.4), color: mist ? 0xffd59b : magma ? 0xff6726 : 0x8d6bff, intensity: 0.9, range: 4, off: false };
            g.lights.push(L); lights.push(L);
          }
          ornaments++;
        }
      }
      if (false && mist && !objAt.has(tx + ',' + ty) && hash(tx, ty, 66) < 0.3) {
        const sx = x + (hash(tx, ty, 67) > 0.5 ? 1.52 : -1.52);
        const sz = z + (hash(tx, ty, 68) > 0.5 ? 1.52 : -1.52);
        mesh(trunkGeo, trunkMat, sx, 3.1, sz, hash(tx, ty, 69) * 6.28, 0.65, 1, 0.65);
        mesh(canopyGeo, leafMat, sx, 6.8, sz, 0, 1, 1, 1);
        ornaments++;
      }
      if (!mist && !objAt.has(tx + ',' + ty) && hash(tx, ty, 76) < 0.12) {
        const sx = x + (hash(tx, ty, 77) - 0.5) * 2.2;
        const sz = z + (hash(tx, ty, 78) - 0.5) * 2.2;
        mesh(archGeo, mat.metal, sx, 1.8, sz, hash(tx, ty, 79) * 6.28, 1, 1, 1);
        if (!magma) mesh(crystalGeo, mat.glow, sx, 3.8, sz, 0, 0.55, 0.7, 0.55);
        ornaments++;
      }
      if (!objAt.has(tx + ',' + ty) && hash(tx, ty, 74) < 0.09) {
        mesh(rimGeo, mat.metal, x, 0.05, z, hash(tx, ty, 75) * Math.PI, 1, 1, 1);
        ornaments++;
      }
      // 空中に漂う火の粉／星界の魔力片。マップに紐づけて再現可能な位置に配置。
      if (hash(tx, ty, 90) < 0.16 && dynamic.length < 100) {
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
        mesh(archGeo, mat.metal, x - 1.1, 1.8, z, 0, 1.5, 1.1, 1.5);
        mesh(archGeo, mat.metal, x + 1.1, 1.8, z, 0, 1.5, 1.1, 1.5);
        mesh(crystalGeo, mat.glow, x, 2.4, z, Math.PI, 1.8, 2.1, 1.8);
        ornaments += 3;
        const file = magma
          ? './assets/3d/dungeons/b4_dragonfire/models/floor4_corrupted_barrier_v1.glb'
          : './assets/3d/dungeons/b5_abyssal_star_realm/models/floor5_abyss_throne_refined_v2.glb';
        try {
          const gltf = await gltfLoader.loadAsync(file);
          const model = gltf.scene, bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3()), max = Math.max(size.x, size.y, size.z);
          if (max > 0) {
            const scale = (magma ? 3.2 : 6.5) / max, center = bounds.getCenter(new THREE.Vector3());
            model.scale.setScalar(scale);
            model.position.set(x - center.x * scale, -bounds.min.y * scale, z - center.z * scale);
            model.name = magma ? 'b4_boss_barrier' : 'b5_demon_throne';
            root.add(model); landmarkState = 'glb-loaded';
            if (magma) {
              try {
                const dragon = (await gltfLoader.loadAsync('./assets/3d/dungeons/b4_dragonfire/models/floor4_dragon_boss_v1.glb')).scene;
                const dragonBounds = new THREE.Box3().setFromObject(dragon);
                const dragonSize = dragonBounds.getSize(new THREE.Vector3());
                const dragonMax = Math.max(dragonSize.x, dragonSize.y, dragonSize.z);
                if (dragonMax > 0) {
                  const dragonScale = 3.4 / dragonMax;
                  const dragonCenter = dragonBounds.getCenter(new THREE.Vector3());
                  dragon.scale.setScalar(dragonScale);
                  dragon.position.set(x - dragonCenter.x * dragonScale, -dragonBounds.min.y * dragonScale, z - dragonCenter.z * dragonScale);
                  dragon.name = 'b4:dragon-boss-static';
                  // 竜は戦闘ロジックと連動しない、ボス前の静的な環境演出。
                  root.add(dragon);
                }
              } catch (_) { /* 竜の素材がない場合も探索は継続 */ }
            }
          } else landmarkState = 'empty-glb';
        } catch (_) { landmarkState = 'procedural-fallback'; }
      }
    }
    // 第4階層の専用背景素材を、通路の中央ではなく壁面沿いに配置。
    // モデル単位でのサイズ正規化を行い、既存マップの歩行判定を維持する。
    if (magma) {
      const extras = [
        ['floor4_dragonfire_environment_v1.glb', 5.2, 1],
        ['floor4_gothic_fortress_addon_v1.glb', 4.8, 2],
        ['floor4_lavafall_ember_fx_seed_v1.glb', 3.2, 3]
      ];
      const spots = [];
      for (let ty = 1; ty < a.h - 1; ty++) for (let tx = 1; tx < a.w - 1; tx++) {
        if (wallCell(tx, ty) || a.objects.some(o => o.tx === tx && o.ty === ty)) continue;
        const walls = DIR_ORDER.filter(d => wallCell(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1]));
        if (walls.length && hash(tx, ty, 117) < 0.2) spots.push({ tx, ty, dir: walls[0] });
      }
      for (const [file, sizeTarget, index] of extras) {
        const spot = spots[Math.floor(spots.length * index / 4)];
        if (!spot) continue;
        try {
          const gltf = await gltfLoader.loadAsync('./assets/3d/dungeons/b4_dragonfire/models/' + file);
          const model = gltf.scene, bounds = new THREE.Box3().setFromObject(model);
          const dims = bounds.getSize(new THREE.Vector3()), max = Math.max(dims.x, dims.y, dims.z);
          if (!(max > 0)) continue;
          const scale = sizeTarget / max, center = bounds.getCenter(new THREE.Vector3());
          const [dx, dz] = DIR_VEC[spot.dir];
          model.scale.setScalar(scale);
          model.position.set(spot.tx * CELL + dx * 1.3 - center.x * scale, -bounds.min.y * scale,
            spot.ty * CELL + dz * 1.3 - center.z * scale);
          model.name = 'b4:scenery:' + file;
          root.add(model);
        } catch (_) { /* ZIP展開前はプロシージャル背景を維持 */ }
      }
    }
    batchStatic();
    // 壁に埋め込まれたスイッチ・碑文は通常の歩行マスと異なるため専用配置。
    // 第5階層の4騎士像の謎解きも、このエントリがないと3D上で操作できない。
    for (const o of a.objects) {
      if (!o.onWall || (o.kind !== 'switch' && o.kind !== 'sign')) continue;
      const f = facing(o.tx, o.ty), [dx, dz] = DIR_VEC[f];
      const x = o.tx * CELL + dx * 1.55, z = o.ty * CELL + dz * 1.55;
      const ry = FACE_YAW[f];
      const src = o.kind === 'switch' ? S.guardian : S.sign;
      const obj = place(g.world, src || S.sign, x, 0, z, ry, o.kind === 'switch' ? 0.55 : 0.8);
      g.entries.push({ o, kind: o.kind, obj, state: null, at: new THREE.Vector3(x, 1.5, z), ry });
    }
    for (const o of a.objects) {
      const x = o.tx * CELL, z = o.ty * CELL, f = facing(o.tx, o.ty), ry = FACE_YAW[f];
      const e = { o, kind: o.kind, obj: null, state: null, at: new THREE.Vector3(x, 1.2, z), ry };
      switch (o.kind) {
        case 'stairs':
          e.obj = place(g.world, o.dir === 'down' ? S.stairsDown : S.stairsUp, x, 0, z, ry, o.dir === 'down' ? 1 : 0.75); break;
        case 'save':
          place(g.world, S.seal, x, 0.005, z, 0, 0.8); e.obj = place(g.world, S.torch, x, 0, z); e.at.y = 1.9; break;
        case 'sign': e.obj = place(g.world, S.sign, x, 0, z, ry); e.at.y = 1.8; break;
        case 'gate': e.obj = place(g.world, S.runeDoor, x - DIR_VEC[f][0] * 1.9, 0, z - DIR_VEC[f][1] * 1.9, ry); break;
        case 'exit': e.obj = place(g.world, S.rootArch, x, 0, z, (f === 'up' || f === 'down') ? 0 : Math.PI / 2, 0.92); break;
        case 'npc': e.obj = place(g.world, S.npcTraveler, x, 0, z, ry); e.at.y = 2.2; break;
        case 'door':
          if (!o.hidden) e.ry = open(o.tx, o.ty - 1) || open(o.tx, o.ty + 1) ? 0 : Math.PI / 2;
          break;
        default: break;
      }
      if (!o.onWall) g.entries.push(e);
    }
  }
  function dispose() {
    if (root) root.parent?.remove(root);
    for (const L of lights) L.off = true;
    lights = []; dynamic = []; root = null; ornaments = 0;
    // 共有ジオメトリを再利用し、フロア切替時にマテリアルを破棄しない。
  }
  function tick(dt, now) {
    for (const p of dynamic) {
      p.mesh.position.y = p.y + Math.sin(now * 0.0015 + p.phase) * 0.22;
      p.mesh.scale.setScalar(0.75 + 0.25 * Math.sin(now * 0.003 + p.phase));
    }
  }
  async function sync() { return false; }
  return { area, env: ENV, build, dispose, tick, sync, info: () => ({ placed: !!root, ornaments, mode: 'map-driven-3d', landmarkState }) };
}
