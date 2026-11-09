/* Fourth and fifth stratum map-driven 3D placement. Visuals only; map remains authoritative. */
import * as THREE from 'three';
export function createTheme(api, area) {
  const { g, CELL, DIR_ORDER, DIR_VEC, FACE_YAW, hash, place, load, npcFile, FILES } = api;
  const magma = area === 4;
  const ENV = magma
    ? { background: 0x1b0907, fog: { color: 0x2c100a, density: 0.036 }, hemi: { sky: 0xff8750, ground: 0x25101a, high: 1.45, low: 1.8 } }
    : { background: 0x050514, fog: { color: 0x10102a, density: 0.022 }, hemi: { sky: 0x7779d7, ground: 0x14132e, high: 1.35, low: 1.7 } };
  const mat = {
    floor: new THREE.MeshStandardMaterial({ color: magma ? 0x544038 : 0x48445d, roughness: 0.85 }),
    wall: new THREE.MeshStandardMaterial({ color: magma ? 0x30262a : 0x22233c, roughness: 0.93, flatShading: true }),
    ceiling: new THREE.MeshStandardMaterial({ color: magma ? 0x281b1a : 0x171729, roughness: 1, side: THREE.DoubleSide }),
    glow: new THREE.MeshStandardMaterial({ color: magma ? 0xff4a12 : 0x7950ed, emissive: magma ? 0xff2600 : 0x6437ef, emissiveIntensity: magma ? 1.8 : 1.5, roughness: 0.2 }),
    metal: new THREE.MeshStandardMaterial({ color: magma ? 0x8b6551 : 0x565877, metalness: 0.55, roughness: 0.5 })
  };
  const floorGeo = new THREE.BoxGeometry(4.02, 0.32, 4.02);
  const wallGeo = new THREE.BoxGeometry(4.08, 4.2, 0.65, 8, 8, 1);
  const ceilingGeo = new THREE.PlaneGeometry(4.02, 4.02).rotateX(Math.PI / 2);
  const crystalGeo = new THREE.ConeGeometry(0.32, 1.25, 5);
  const rimGeo = new THREE.BoxGeometry(0.18, 0.08, 3.3);
  let root = null, lights = [], ornaments = 0, dynamic = [], localGeometries = [];
  const localGeo = geo => (localGeometries.push(geo), geo);
  const shardGeo = localGeo(new THREE.ConeGeometry(0.22, 1.1, 5));
  const archGeo = localGeo(new THREE.CylinderGeometry(0.22, 0.36, 3.6, 7));
  const emberGeo = localGeo(new THREE.IcosahedronGeometry(0.06, 0));
  const crackGeo = localGeo(new THREE.PlaneGeometry(3.4, 0.07).rotateX(-Math.PI / 2));
  const flameMat = new THREE.MeshBasicMaterial({ color: magma ? 0xff6b24 : 0xb18cff, transparent: true, opacity: 0.75, depthWrite: false });
  function mesh(geo, material, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z); m.rotation.y = ry; m.scale.set(sx, sy, sz); root.add(m); return m;
  }
  function build(a, S, info) {
    dispose();
    root = new THREE.Group(); root.name = magma ? 'b4_magma_map' : 'b5_abyss_map'; g.world.add(root);
    const { ch, wallCell, facing, open } = info;
    const objAt = new Set(a.objects.map(o => o.tx + ',' + o.ty));
    for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
      if (wallCell(tx, ty)) continue;
      const x = tx * CELL, z = ty * CELL, c = ch(tx, ty);
      mesh(floorGeo, mat.floor, x, -0.17, z);
      if (magma && (c === '*' || c === '~')) {
        mesh(localGeo(new THREE.PlaneGeometry(3.85, 3.85).rotateX(-Math.PI / 2)), mat.glow, x, 0.009, z);
      }
      // 地熱の亀裂／古代星界の紋様。通行判定には影響させない。
      if (!objAt.has(tx + ',' + ty) && hash(tx, ty, 31) < 0.28) {
        const angle = hash(tx, ty, 32) * Math.PI;
        mesh(crackGeo, mat.glow, x, 0.016, z, angle, 0.65 + hash(tx, ty, 33) * 0.4, 1, 1);
        ornaments++;
      }
      if (c !== '>' && c !== '<') mesh(ceilingGeo, mat.ceiling, x, 4.05, z);
      // 洞窟の天井に不規則な鍾乳石、奈落では垂れ下がる古代構造物。
      if (!objAt.has(tx + ',' + ty) && hash(tx, ty, 45) < 0.32) {
        const h = 0.8 + hash(tx, ty, 46) * 1.7;
        mesh(shardGeo, mat.wall, x + (hash(tx, ty, 47) - 0.5) * 2.3, 4.0 - h * 0.45, z + (hash(tx, ty, 48) - 0.5) * 2.3, Math.PI, 1.2, h, 1.2);
        ornaments++;
      }
      for (const d of DIR_ORDER) {
        const [dx, dz] = DIR_VEC[d];
        if (!wallCell(tx + dx, ty + dz)) continue;
        const ex = x + dx * 2, ez = z + dz * 2, ry = FACE_YAW[d] + Math.PI;
        mesh(wallGeo, mat.wall, ex, 2, ez, ry);
        const k = hash(tx, ty, DIR_ORDER.indexOf(d) + 29);
        if (k < 0.17 && !objAt.has(tx + ',' + ty)) {
          mesh(crystalGeo, mat.glow, ex - dx * 0.42, 0.6, ez - dz * 0.42, ry, 0.6, 1.1 + k, 0.6);
          if (lights.length < 28) {
            const L = { world: new THREE.Vector3(ex - dx * 0.4, 1.2, ez - dz * 0.4), color: magma ? 0xff6726 : 0x8d6bff, intensity: 0.9, range: 4, off: false };
            g.lights.push(L); lights.push(L);
          }
          ornaments++;
        }
      }
      if (!objAt.has(tx + ',' + ty) && hash(tx, ty, 76) < 0.12) {
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
      if (o.kind !== 'switch') g.entries.push(e);
    }
  }
  function dispose() {
    if (root) root.parent?.remove(root);
    for (const L of lights) L.off = true;
    lights = []; dynamic = []; root = null; ornaments = 0;
    // 床・壁の共有ジオメトリは再利用する。動的に生成したものだけ破棄する。
    for (const geo of localGeometries.splice(5)) geo.dispose();
  }
  function tick(dt, now) {
    for (const p of dynamic) {
      p.mesh.position.y = p.y + Math.sin(now * 0.0015 + p.phase) * 0.22;
      p.mesh.scale.setScalar(0.75 + 0.25 * Math.sin(now * 0.003 + p.phase));
    }
  }
  async function sync() { return false; }
  return { area, env: ENV, build, dispose, tick, sync, info: () => ({ placed: !!root, ornaments, mode: 'procedural-map-placement', sourceAssetsPending: true }) };
}
