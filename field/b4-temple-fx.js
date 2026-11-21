/* B4 黒き神殿：場所に置く演出（docs/3d/B4_TEMPLE_REDESIGN.md 5・6章）
 *  - buildDeepLava：通れない深い溶岩（床より沈んだ流れる溶岩＋黒い岸＋岸の下端の赤い光）
 *  - buildTemplePass：たいまつ（灯/折れ/消え）・床の魔法陣・宙に浮くルーン帯・火の粉・崩落・光の筋
 * どれも見た目だけ。通行判定・イベントには触れない。 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { B4_VFX_TIME, createFlames, createEmbers, glyphMaterial, deepLavaMaterial, lightShaftMaterial, createRockfall, GLYPH_STYLES } from './b4-vfx.js?v=20261122-n2';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/* ---------------- 通れない深い溶岩 ---------------- */
export function buildDeepLava({ root, tiles, ch, CELL, hash }) {
  const group = new THREE.Group(); group.name = 'b4:deep-lava';
  const owned = [];
  if (!tiles.length) return { group, embers: [], dispose() {} };
  const isDeep = (x, y) => ch(x, y) === '~';
  const plates = [], banks = [], rims = [], glows = [];
  const half = CELL / 2 + 0.02;
  for (const { tx, ty } of tiles) {
    const x = tx * CELL, z = ty * CELL;
    plates.push(new THREE.PlaneGeometry(CELL + 0.04, CELL + 0.04).rotateX(-Math.PI / 2).translate(x, -0.55, z));
    DIRS.forEach(([dx, dz], k) => {
      if (isDeep(tx + dx, ty + dz)) return;
      // 岸の壁：床(-0.17)から溶岩の下(-0.85)まで。黒い玄武岩
      const yaw = Math.atan2(dx, dz);
      const bank = new THREE.PlaneGeometry(CELL + 0.04, 0.72, 8, 2);
      const pa = bank.attributes.position;
      for (let i = 0; i < pa.count; i++) pa.setZ(i, (hash(tx * 7 + i, ty * 5 + k, 61) - 0.5) * 0.12);   // 岩肌のでこぼこ
      bank.rotateY(yaw + Math.PI).translate(x + dx * (half - 0.02), -0.51, z + dz * (half - 0.02));
      banks.push(bank);
      // 岸の下端の赤い光（溶岩に触れているところ）
      glows.push(new THREE.PlaneGeometry(CELL, 0.18).rotateY(yaw + Math.PI).translate(x + dx * (half - 0.06), -0.5, z + dz * (half - 0.06)));
      // 岸の上の縁石（欠けた黒い石が並ぶ）
      for (let j = 0; j < 5; j++) {
        const along = -1.6 + j * 0.8 + (hash(tx, ty * 9 + j, 62 + k) - 0.5) * 0.3;
        const w = 0.55 + hash(tx * 3 + j, ty, 63 + k) * 0.35, h = 0.14 + hash(tx, ty + j, 64 + k) * 0.12;
        const b = new THREE.BoxGeometry(w, h, 0.32);
        b.rotateY(yaw + (hash(tx + j, ty, 65 + k) - 0.5) * 0.25);
        // 岸に沿う方向 = (|dz|, |dx|)
        b.translate(x + dx * (half - 0.14) + Math.abs(dz) * along, -0.17 + h / 2 - 0.03, z + dz * (half - 0.14) + Math.abs(dx) * along);
        rims.push(b);
      }
    });
  }
  const lavaMat = deepLavaMaterial({ flow: new THREE.Vector2(0.05, 0.03) });
  const bankMat = new THREE.MeshStandardMaterial({ color: 0x1a1412, roughness: 0.92, metalness: 0, emissive: 0x3a0a02, emissiveIntensity: 0.6 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x241c19, roughness: 0.88, metalness: 0, flatShading: true });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff5a14, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const [geos, mat, name] of [[plates, lavaMat, 'surface'], [banks, bankMat, 'bank'], [rims, rimMat, 'rim'], [glows, glowMat, 'glow']]) {
    if (!geos.length) continue;
    const g = mergeGeometries(geos.map(x => x.index ? x.toNonIndexed() : x), false);
    geos.forEach(x => x.dispose());
    const m = new THREE.Mesh(g, mat); m.name = `b4:deep-lava-${name}`; group.add(m); owned.push(g, mat);
  }
  root.add(group);
  const embers = tiles.filter((_, i) => i % 2 === 0).map(({ tx, ty }) => ({ x: tx * CELL, z: ty * CELL, y0: -0.45, spread: 2.0, rise: 5.5, count: 28, hot: 1 }));
  return { group, embers, dispose() { owned.forEach(o => o.dispose()); group.removeFromParent(); } };
}

/* ---------------- たいまつの部品（手続き生成。後で Blender 版に差し替え可） ---------------- */
function torchParts() {
  const iron = [];
  const plate = new THREE.BoxGeometry(0.13, 0.26, 0.035); plate.translate(0, 0, 0.0175); iron.push(plate);
  for (const yy of [-0.08, 0.08]) { const r = new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6); r.rotateX(Math.PI / 2); r.translate(0, yy, 0.04); iron.push(r); }
  const arm = new THREE.CylinderGeometry(0.014, 0.014, 0.26, 6); arm.rotateX(Math.PI / 2 - 0.5); arm.translate(0, 0.05, 0.13); iron.push(arm);
  const cup = new THREE.TorusGeometry(0.045, 0.011, 6, 12); cup.rotateX(Math.PI / 2); cup.translate(0, 0.11, 0.24); iron.push(cup);
  const cup2 = new THREE.TorusGeometry(0.04, 0.009, 6, 12); cup2.rotateX(Math.PI / 2); cup2.translate(0, 0.0, 0.24); iron.push(cup2);
  const bracket = mergeGeometries(iron.map(g => g.toNonIndexed()), false);
  const handle = new THREE.CylinderGeometry(0.026, 0.02, 0.56, 7); handle.translate(0, 0.05, 0); handle.rotateX(-0.22); handle.translate(0, 0.06, 0.25);
  const head = new THREE.CylinderGeometry(0.048, 0.034, 0.15, 8); head.rotateX(-0.22); head.translate(0, 0.38, 0.32);
  const stub = new THREE.CylinderGeometry(0.026, 0.024, 0.16, 7); stub.rotateX(-0.22); stub.translate(0, 0.05, 0.245);
  const fallen = new THREE.CylinderGeometry(0.026, 0.02, 0.46, 7); fallen.rotateZ(Math.PI / 2);
  const fallenHead = new THREE.CylinderGeometry(0.048, 0.034, 0.15, 8); fallenHead.rotateZ(Math.PI / 2); fallenHead.translate(0.29, 0, 0);
  return { bracket, handle, head, stub, fallen: mergeGeometries([fallen.toNonIndexed(), fallenHead.toNonIndexed()], false) };
}

/* ---------------- 神殿の演出を一式置く ---------------- */
// faces: [{ tx, ty, dx, dz, theme }]（壁に面した通路側の面）  paneled: Set("tx,ty,dx,dz")
export function buildTemplePass({ root, map, ch, wallCell, hash, CELL, lights, gLights, reserved, faces, paneled, extraEmbers = [], rockMaterial }) {
  const group = new THREE.Group(); group.name = 'b4:temple-fx';
  const owned = [], flickers = [];
  const info = { torches: { lit: 0, broken: 0, out: 0 }, glyphs: 0, runeBands: 0, shafts: 0, rockfalls: 0, embers: 0 };
  const walk = (x, y) => x >= 0 && y >= 0 && x < map.w && y < map.h && !wallCell(x, y) && ch(x, y) !== '~';
  const key = f => `${f.tx},${f.ty},${f.dx},${f.dz}`;

  // ---- たいまつ：壁 2〜3 面に1つ（灯 70% / 折れ 15% / 消え 15%）----
  const P = torchParts();
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1c1816, roughness: 0.55, metalness: 0.7 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x170e08, roughness: 0.85, metalness: 0 });
  const headLit = new THREE.MeshStandardMaterial({ color: 0x140c08, roughness: 0.9, emissive: 0xff4a10, emissiveIntensity: 1.6 });
  const headOut = new THREE.MeshStandardMaterial({ color: 0x0c0908, roughness: 0.95 });
  const M = { bracket: [], handle: [], headLit: [], headOut: [], stub: [], fallen: [] };
  const fireSites = [], smokeSites = [], torchEmbers = [];
  const SKIN = 2 - 0.325 - 0.06;   // 壁の箱の表面（変位の平均）より少し手前
  const placed = [];
  for (const f of faces) {
    if (paneled.has(key(f)) || reserved.has(f.tx + ',' + f.ty)) continue;
    if (hash(f.tx * 5 + f.dx + 3, f.ty * 5 + f.dz + 3, 901) > (f.theme === 'mine' ? 0.5 : 0.42)) continue;   // 2026-11-21 マシマシ：たいまつ倍増
    if (placed.some(p => Math.abs(p.tx - f.tx) + Math.abs(p.ty - f.ty) < 2)) continue;
    placed.push(f);
    const yaw = Math.atan2(-f.dx, -f.dz);
    const along = (hash(f.tx, f.ty, 902) - 0.5) * 1.6;
    const pos = new THREE.Vector3(f.tx * CELL + f.dx * SKIN - f.dz * along, 1.95, f.ty * CELL + f.dz * SKIN + f.dx * along);
    const mtx = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1.45, 1.45, 1.45));
    const r = hash(f.tx, f.ty * 3 + f.dx, 903);
    const state = r < 0.7 ? 'lit' : r < 0.85 ? 'broken' : 'out';
    info.torches[state]++;
    M.bracket.push(mtx);
    const local = v => v.clone().applyMatrix4(mtx);
    if (state === 'lit') {
      M.handle.push(mtx); M.headLit.push(mtx);
      const tip = local(new THREE.Vector3(0, 0.44, 0.335));
      fireSites.push({ x: tip.x, y: tip.y - 0.06, z: tip.z, w: 0.46, h: 0.72, seed: hash(f.tx, f.ty, 904), intensity: 1 });
      fireSites.push({ x: tip.x, y: tip.y - 0.04, z: tip.z, w: 0.34, h: 0.62, seed: hash(f.tx, f.ty, 905) + 0.5, intensity: 0.9 });
      torchEmbers.push({ x: tip.x, z: tip.z, y0: tip.y + 0.15, spread: 0.08, rise: 1.6, count: 8, hot: 1 });
      if (lights.length < 70) {
        const L = { world: local(new THREE.Vector3(0, 0.5, 0.55)), color: 0xff8a3a, intensity: 2.4, range: 6.5, off: false };
        lights.push(L); gLights.push(L); flickers.push({ L, base: 2.0, seed: hash(f.tx, f.ty, 906) * 50 });
      }
    } else if (state === 'out') {
      M.handle.push(mtx); M.headOut.push(mtx);
      const tip = local(new THREE.Vector3(0, 0.46, 0.34));
      smokeSites.push({ x: tip.x, y: tip.y, z: tip.z, w: 0.3, h: 1.3, seed: hash(f.tx, f.ty, 907), intensity: 0.55 });
    } else {
      M.stub.push(mtx);
      // 折れた残りは壁の下に落ちている
      const fp = new THREE.Vector3(f.tx * CELL + f.dx * (SKIN - 0.35) - f.dz * (along + 0.2), 0.03, f.ty * CELL + f.dz * (SKIN - 0.35) + f.dx * (along + 0.2));
      M.fallen.push(new THREE.Matrix4().compose(fp, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + 0.6 + hash(f.tx, f.ty, 908), 0)), new THREE.Vector3(1, 1, 1)));
    }
  }
  const inst = (geo, mat, list, name) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.name = name; group.add(im); owned.push(im);
  };
  inst(P.bracket, ironMat, M.bracket, 'b4:torch-bracket');
  inst(P.handle, woodMat, M.handle, 'b4:torch-handle');
  inst(P.head, headLit, M.headLit, 'b4:torch-head-lit');
  inst(P.head, headOut, M.headOut, 'b4:torch-head-out');
  inst(P.stub, woodMat, M.stub, 'b4:torch-stub');
  inst(P.fallen, woodMat, M.fallen, 'b4:torch-fallen');
  owned.push(P.bracket, P.handle, P.head, P.stub, P.fallen, ironMat, woodMat, headLit, headOut);

  // ---- 床の魔法陣（2026-11-22：意味のある場所だけ。広い交差点のみ・最大7、図案はばらばら。近づくと外側から崩れて消える）----
  const glyphGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const vGeo = new THREE.PlaneGeometry(1, 1);
  owned.push(glyphGeo, vGeo);
  const byStyle = new Map();
  const push = (style, M, geo, opts) => { const k = style + '|' + geo.uuid + '|' + opts.key; if (!byStyle.has(k)) byStyle.set(k, { style, geo, opts, ms: [] }); byStyle.get(k).ms.push(M); };
  // 2026-11-22：魔法陣のある場所を限定する。セーブ・階段・扉・看板のまわり（半径 2 マス）だけ。1 か所につき床 1・頭上 1・浮く紋章 ≤3・帯 ≤2
  const anchors = (map.objects || []).filter(o => ['save', 'stairs', 'gate', 'door', 'sign'].includes(o.kind) && !o.hidden).slice(0, 5);
  const near = (tx, ty) => anchors.find(o => Math.max(Math.abs(o.tx - tx), Math.abs(o.ty - ty)) <= 2);
  let floorN = 0, bands = 0, sigils = 0;
  const perArea = new Map();
  for (const o of anchors) {
    // 床の魔法陣：物の隣の歩けるマス（物の上には置かない）
    const spot = DIRS.map(([dx, dz]) => [o.tx + dx, o.ty + dz]).find(([x, y]) => walk(x, y) && !reserved.has(x + ',' + y) && ch(x, y) !== '*');
    if (!spot) continue;
    const [tx, ty] = spot, style = GLYPH_STYLES[Math.floor(hash(tx, ty, 911) * GLYPH_STYLES.length)];
    push(style, new THREE.Matrix4().compose(new THREE.Vector3(tx * CELL, 0.025, ty * CELL), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, hash(tx, ty, 914) * 6.28, 0)), new THREE.Vector3(3.0, 1, 3.0)), glyphGeo, { key: 'floor', intensity: 0.6, dissolve: 5.0 });
    floorN++;
    push(GLYPH_STYLES[Math.floor(hash(tx, ty, 916) * GLYPH_STYLES.length)], new THREE.Matrix4().compose(new THREE.Vector3(tx * CELL, 2.8 + hash(tx, ty, 917) * 0.4, ty * CELL), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.55, hash(tx, ty, 919) * 6.28, 0, 'YXZ')), new THREE.Vector3(1.8, 1.8, 1.8)), vGeo, { key: 'air', intensity: 0.8, dissolve: 3.2 });
  }
  info.glyphs = floorN;
  const bandGeo = new THREE.PlaneGeometry(3.4, 0.36);
  owned.push(bandGeo);
  for (const f of faces) {
    if (paneled.has(key(f)) || placed.includes(f)) continue;
    const o = near(f.tx, f.ty); if (!o) continue;
    const c = perArea.get(o) || { b: 0, s: 0 }; perArea.set(o, c);
    const r = hash(f.tx * 5 + f.dx, f.ty * 5 + f.dz, 920);
    const d = 2 - 0.325 - (0.5 + hash(f.tx, f.ty, 921) * 0.25);
    // 壁に平行だと通路から真横になる → 通路の奥（開いている方向）へ 35° 振る
    const side = [[-f.dz, f.dx], [f.dz, -f.dx]].find(([sx, sz]) => walk(f.tx + sx, f.ty + sz)) || [-f.dz, f.dx];
    const yaw = Math.atan2(-f.dx, -f.dz) + Math.sign(side[0] * -f.dz + side[1] * f.dx || 1) * 0.6;
    if (r < 0.35 && c.b < 2) {
      push(2, new THREE.Matrix4().compose(new THREE.Vector3(f.tx * CELL + f.dx * d, 1.8 + hash(f.tx, f.ty, 922) * 0.5, f.ty * CELL + f.dz * d), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(0.8, 1, 1)), bandGeo, { key: 'band', intensity: 0.75, dissolve: 2.6 });
      bands++; c.b++;
    } else if (c.s < 3) {
      const style = GLYPH_STYLES[Math.floor(hash(f.tx, f.ty * 3 + f.dx, 923) * GLYPH_STYLES.length)];
      const sz = 0.9 + hash(f.tx, f.ty, 924) * 0.6;
      const lat = (hash(f.tx, f.ty, 925) - 0.5) * 1.6;
      const pos = new THREE.Vector3(f.tx * CELL + f.dx * d - f.dz * lat, 1.6 + hash(f.tx, f.ty, 926) * 0.8, f.ty * CELL + f.dz * d + f.dx * lat);
      push(style, new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0, 'YXZ')), new THREE.Vector3(sz, sz, 1)), vGeo, { key: 'sigil', intensity: 0.9, dissolve: 2.8 });
      sigils++; c.s++;
    }
  }
  info.runeBands = bands; info.sigils = sigils;
  for (const { style, geo, opts, ms } of byStyle.values()) {
    const mat = glyphMaterial({ style, seed: 1.3 + style * 0.71, intensity: opts.intensity, speed: 0.7, dissolve: opts.dissolve, color: style % 3 === 1 ? 0xff5a18 : 0xff7a1e });
    const im = new THREE.InstancedMesh(geo, mat, ms.length); ms.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.name = `b4:glyph-${opts.key}-${style}`; im.renderOrder = 4;
    group.add(im); owned.push(im, mat);
  }
  // ---- 光の筋（天井の割れ目から）----
  const shaftGeo = new THREE.PlaneGeometry(2.8, 4.3); shaftGeo.translate(0, 2.15, 0);
  owned.push(shaftGeo);
  const shaftTiles = [];
  for (let ty = 1; ty < map.h - 1; ty++) for (let tx = 1; tx < map.w - 1; tx++) if (walk(tx, ty) && hash(tx, ty, 930) < 0.06) shaftTiles.push([tx, ty]);
  for (const [tx, ty] of shaftTiles.slice(0, 10)) {
    const mat = lightShaftMaterial({ seed: hash(tx, ty, 931) * 10, intensity: 0.08, color: 0xff6a24 });
    for (const rot of [0, Math.PI / 2]) {
      const m = new THREE.Mesh(shaftGeo, mat); m.position.set(tx * CELL + (hash(tx, ty, 932) - 0.5), -0.1, ty * CELL); m.rotation.y = rot + hash(tx, ty, 933);
      m.rotation.z = (hash(tx, ty, 934) - 0.5) * 0.25; m.name = 'b4:light-shaft'; m.renderOrder = 8; group.add(m);
    }
    owned.push(mat); info.shafts++;
  }
  // ---- 崩落（天井から小石と砂）----
  const fallTiles = [];
  for (let ty = 1; ty < map.h - 1; ty++) for (let tx = 1; tx < map.w - 1; tx++) if (walk(tx, ty) && !reserved.has(tx + ',' + ty) && hash(tx, ty, 940) < 0.07) fallTiles.push({ x: tx * CELL + (hash(tx, ty, 941) - 0.5) * 2.2, z: ty * CELL + (hash(tx, ty, 942) - 0.5) * 2.2, top: 4.1, seed: hash(tx, ty, 943) });
  let rockfall = null;
  if (fallTiles.length && rockMaterial) {
    rockfall = createRockfall(fallTiles.slice(0, 14), rockMaterial);
    group.add(rockfall.mesh, rockfall.dust); info.rockfalls = Math.min(14, fallTiles.length);
  }
  // ---- 炎・煙・火の粉 ----
  const fire = createFlames(fireSites, 'fire'); group.add(fire.mesh);
  const smoke = createFlames(smokeSites, 'smoke'); group.add(smoke.mesh);
  const ambient = [];
  for (let ty = 1; ty < map.h - 1; ty++) for (let tx = 1; tx < map.w - 1; tx++) if (walk(tx, ty) && hash(tx, ty, 950) < 0.55) ambient.push({ x: tx * CELL, z: ty * CELL, y0: 0.05, spread: 1.9, rise: 3.6, count: 7, hot: 0.55 });
  const emb = createEmbers([...extraEmbers, ...torchEmbers, ...ambient]);
  group.add(emb.mesh); info.embers = emb.count;
  root.add(group);
  return {
    group, info: () => info,
    update(now) {
      const t = now * 0.001;
      for (const f of flickers) f.L.intensity = f.base * (0.82 + 0.12 * Math.sin(t * 9.3 + f.seed) + 0.08 * Math.sin(t * 23.1 + f.seed * 1.7));
      rockfall?.update(t);
    },
    dispose() { owned.forEach(o => o.dispose?.()); fire.dispose(); smoke.dispose(); emb.dispose(); rockfall?.dispose(); group.removeFromParent(); },
  };
}

export function advanceVfxTime(now) { B4_VFX_TIME.value = now * 0.001; }
