/* B4 12F：反重力の柱の間（Anti-gravity hall）と竜の聖域（Dragon sanctum）
 * docs/3d/B4_TEMPLE_REDESIGN.md 7.2 / 7.3。寸法はすべて m（1マス = 4 m、12F の壁高 8.2 m）。
 *
 * 反重力の柱の間：迷宮内の 7×5 マスの広間。中央 3×2 マスは溶岩の穴（~）。
 *   ・浮遊する黒曜のオベリスク 9 本：断面 0.45–0.85 m 角、高さ 2.6–9.0 m、底 y −1.2〜+1.3、
 *     上下 0.3–0.8 m を 6–11 秒周期でゆっくり浮き沈み。各 2–3 本の橙のルーン帯（高さ 0.32 m）。
 *   ・天井から逆さに垂れるオベリスク 7 本（下端 y 3.6–6.0）。
 *   ・穴の上に浮かぶ紋章の輪 4 つ（半径 2.4–4.4 m、高さ 2.4–7.0 m、回転）。
 *   ・浮遊する破片 12 個（0.18–0.5 m）、穴から立ちのぼる火の粉。
 *
 * 竜の聖域：ボス（B）の手前 5×5 マス。左右対称。
 *   ・南壁のファサード：尖頭アーチ（外幅 5.4 m、頂部 8.0 m、開口 4.0 m）＋左右の竜の翼の影（各 7.0 m）。
 *     翼の後ろに格子模様の光の板（各 7.4×7.2 m）＝逆光のシルエット。
 *   ・ボスの壁龕：3 段の階段（0.18 / 0.36 / 0.54 m）、竜の背後に光輪（半径 2.0 m）。
 *   ・側壁に沿って 6 本の柱（0.9 m 角、8.0 m）、うち 4 本に火鉢。
 *   ・艶のある黒い床＋魔法陣（半径 5.5 m）、光の筋 2 本、金色の火の粉。 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { B4_VFX_TIME, glyphMaterial, createFlames, createEmbers, lightShaftMaterial } from './b4-vfx.js?v=20261122-h6';
import { addUplight, hazeMaterial, parapetGeometry } from './b4-chasm.js?v=20261122-h6';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// ---------------------------------------------------------------- 部屋の検出
export function findVaultRooms(map, ch) {
  const W = map.w, H = map.h;
  const comp = (sx, sy, ok) => {
    const seen = new Set([sx + ',' + sy]), q = [[sx, sy]], out = [];
    while (q.length) {
      const [x, y] = q.pop(); out.push([x, y]);
      for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (!seen.has(k) && nx >= 0 && ny >= 0 && nx < W && ny < H && ok(ch(nx, ny))) { seen.add(k); q.push([nx, ny]); } }
    }
    return out;
  };
  const bbox = cells => cells.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [1e9, 1e9, -1e9, -1e9]);
  let hall = null, sanctum = null, boss = null;
  const done = new Set();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (ch(x, y) === 'B') boss = { tx: x, ty: y };
    if (ch(x, y) !== '~' || done.has(x + ',' + y)) continue;
    const cells = comp(x, y, c => c === '~'); cells.forEach(([cx, cy]) => done.add(cx + ',' + cy));
    // 通路（,）に接しない溶岩の塊＝広間の穴
    if (cells.some(([cx, cy]) => DIRS.some(([dx, dy]) => ch(cx + dx, cy + dy) === ','))) continue;
    const pit = bbox(cells), room = pit.slice();
    const free = (x0, y0, x1, y1) => { for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) if (ch(xx, yy) === '#') return false; return true; };
    for (let grow = true; grow;) {
      grow = false;
      if (free(room[0] - 1, room[1], room[0] - 1, room[3])) { room[0]--; grow = true; }
      if (free(room[2] + 1, room[1], room[2] + 1, room[3])) { room[2]++; grow = true; }
      if (free(room[0], room[1] - 1, room[2], room[1] - 1)) { room[1]--; grow = true; }
      if (free(room[0], room[3] + 1, room[2], room[3] + 1)) { room[3]++; grow = true; }
    }
    if (!hall || cells.length > hall.pitCells) hall = { pit, room, pitCells: cells.length };
  }
  if (boss) {
    const start = [boss.tx, boss.ty - 1];
    if ('_S'.includes(ch(...start))) sanctum = { room: bbox(comp(start[0], start[1], c => c === '_' || c === 'S')), boss };
  }
  return { hall, sanctum, boss };
}

// ---------------------------------------------------------------- 共通の形
function obeliskGeometry() {
  // 底 1.0 m 角 → 上 0.8 m 角の四角柱（高さ 1）＋四角錐の頂部（高さ 0.9、底 0.8）。scale(w, h, w) で使う
  const shaft = new THREE.CylinderGeometry(0.4 * Math.SQRT2, 0.5 * Math.SQRT2, 1, 4, 1); shaft.rotateY(Math.PI / 4); shaft.translate(0, 0.5, 0);
  return shaft;
}
function capGeometry() { const c = new THREE.ConeGeometry(0.4 * Math.SQRT2, 0.9, 4); c.rotateY(Math.PI / 4); c.translate(0, 0.45, 0); return c; }
function bandGeometry() { const b = new THREE.CylinderGeometry(0.47 * Math.SQRT2, 0.47 * Math.SQRT2, 0.32, 4, 1, true); b.rotateY(Math.PI / 4); return b; }

// ---------------------------------------------------------------- 反重力の柱の間
export function buildAntigravHall({ root, hall, CELL, hash, mats, lights, gLights }) {
  const group = new THREE.Group(); group.name = 'b4:antigrav-hall';
  const owned = [], embersSrc = [];
  const [px0, pz0, px1, pz1] = hall.pit;
  const cx = (px0 + px1) / 2 * CELL, cz = (pz0 + pz1) / 2 * CELL;
  const halfX = (px1 - px0 + 1) * CELL / 2 - 0.9, halfZ = (pz1 - pz0 + 1) * CELL / 2 - 0.9;
  const stone = addUplight(mats.trim.clone(), { base: 0.06, k: 0.55, max: 0.5, under: 2 });
  stone.color = new THREE.Color(0x2a1e1c); stone.roughness = 0.3; stone.metalness = 0.25;   // 黒曜の艶
  // 黒曜の割れ目の発光＋表面を上へ流れるルーンの光（ワールド座標のノイズ。2026-11-22「ただの物感」対策）
  { const prev = stone.onBeforeCompile; stone.onBeforeCompile = (sh, r) => { prev?.call(stone, sh, r);
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec3 w = vUpW; float cr = abs(upN(w.xz * 1.7 + w.y * 0.9) - 0.5) + abs(upN(w.zy * 2.3 + 4.0) - 0.5) * 0.6;
          float crack = smoothstep(0.06, 0.0, cr) ;
          float flow = smoothstep(0.92, 1.0, sin(w.y * 2.6 - uUpTime * 2.2 + upN(w.xz * 0.8) * 6.0)) * step(0.55, upN(w.xz * 3.0 + floor(w.y * 1.3)));
          totalEmissiveRadiance += vec3(1.0, 0.32, 0.06) * (crack * 1.4 + flow * 0.9); }`); }; }
  const shaftG = obeliskGeometry(), capG = capGeometry(), bandG = bandGeometry();
  const band = glyphMaterial({ style: 2, seed: 3.3, intensity: 1.35, speed: 0.6 });
  owned.push(stone, shaftG, capG, bandG, band);
  // 浮遊オベリスク
  const floaters = [];
  const N = 9;
  for (let i = 0; i < N; i++) {
    const a = i * 2.399 + hash(i, 1, 990) * 0.6, rr = Math.sqrt((i + 0.5) / N);
    floaters.push({
      x: cx + Math.cos(a) * rr * halfX, z: cz + Math.sin(a) * rr * halfZ,
      w: 0.45 + hash(i, 2, 990) * 0.4, h: 2.6 + Math.pow(hash(i, 3, 990), 0.7) * 6.4,
      y0: -1.2 + hash(i, 4, 990) * 2.5, amp: 0.3 + hash(i, 5, 990) * 0.5, per: 6 + hash(i, 6, 990) * 5, ph: hash(i, 7, 990) * 6.28,
      yaw: hash(i, 8, 990) * 1.57, spin: (hash(i, 9, 990) - 0.5) * 0.08, tx: (hash(i, 10, 990) - 0.5) * 0.14, tz: (hash(i, 11, 990) - 0.5) * 0.14,
      bands: [0.28, 0.55, 0.8].filter((_, k) => k < 2 || hash(i, 12, 990) > 0.4),
    });
  }
  // 逆さのオベリスク（天井 8.1 m から）
  const [rx0, rz0, rx1, rz1] = hall.room;
  for (let i = 0; i < 7; i++) {
    const x = (rx0 - 0.3 + hash(i, 1, 991) * (rx1 - rx0 + 0.6)) * CELL, z = (rz0 - 0.3 + hash(i, 2, 991) * (rz1 - rz0 + 0.6)) * CELL;
    const h = 2.1 + hash(i, 3, 991) * 2.4;
    floaters.push({ x, z, w: 0.4 + hash(i, 4, 991) * 0.3, h, y0: 8.1 - h + 0.2, amp: 0.12, per: 9, ph: i, yaw: hash(i, 5, 991), spin: 0, tx: 0, tz: 0, flip: true, bands: [0.4] });
  }
  const nB = floaters.reduce((s, f) => s + f.bands.length, 0);
  const shaftI = new THREE.InstancedMesh(shaftG, stone, floaters.length), capI = new THREE.InstancedMesh(capG, stone, floaters.length), bandI = new THREE.InstancedMesh(bandG, band, nB);
  [shaftI, capI, bandI].forEach((m, k) => { m.name = ['b4:antigrav-obelisk', 'b4:antigrav-cap', 'b4:antigrav-band'][k]; m.frustumCulled = false; group.add(m); owned.push(m); });
  bandI.renderOrder = 5;
  // 破片
  const shardG = new THREE.IcosahedronGeometry(1, 0); owned.push(shardG);
  const shards = Array.from({ length: 12 }, (_, i) => ({ r: 1.6 + hash(i, 1, 992) * Math.max(halfX, halfZ), y: 1.6 + hash(i, 2, 992) * 5, s: 0.18 + hash(i, 3, 992) * 0.32, w: (0.05 + hash(i, 4, 992) * 0.08) * (hash(i, 5, 992) < 0.5 ? 1 : -1), a: hash(i, 6, 992) * 6.28 }));
  const shardI = new THREE.InstancedMesh(shardG, stone, shards.length); shardI.name = 'b4:antigrav-shards'; shardI.frustumCulled = false; group.add(shardI); owned.push(shardI);
  // 紋章の輪
  const rings = [];
  for (const [i, [R, y, tilt]] of [[3.0, 2.4, 0], [4.4, 4.6, 0.12], [2.4, 7.0, -0.1], [2.0, 3.6, 1.45]].entries()) {
    const m = glyphMaterial({ style: 1, seed: 1.7 + i, intensity: 1.6, speed: 0.7 + i * 0.2 });
    const g = new THREE.PlaneGeometry(R * 2, R * 2); g.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(g, m); mesh.position.set(cx + (i === 3 ? halfX * 0.3 : 0), y, cz); mesh.rotation.x = tilt; mesh.renderOrder = 6; mesh.name = 'b4:antigrav-ring';
    group.add(mesh); owned.push(g, m); rings.push({ mesh, spin: (i % 2 ? -1 : 1) * (0.06 + i * 0.02), tilt });
  }
  embersSrc.push({ x: cx, z: cz, y0: -0.4, spread: Math.min(halfX, halfZ) + 0.6, rise: 9, count: 140, hot: 1 });
  // 柱の根元から吸い上げられる光の粒
  floaters.filter(f => !f.flip).forEach(f => embersSrc.push({ x: f.x, z: f.z, y0: f.y0 - 0.2, spread: f.w * 0.45, rise: f.h + 1.5, count: 26, hot: 1 }));
  // 穴の上の熱の霞（2層）
  { const hm = hazeMaterial(); owned.push(hm); for (const y of [0.3]) { const g = new THREE.PlaneGeometry((px1 - px0 + 1) * CELL, (pz1 - pz0 + 1) * CELL).rotateX(-Math.PI / 2); owned.push(g); const m = new THREE.Mesh(g, hm); m.position.set(cx, y, cz); m.renderOrder = 3; group.add(m); } }
  const L1 = { world: new THREE.Vector3(cx, 1.4, cz), color: 0xff6a22, intensity: 4.5, range: 15, off: false };
  const L2 = { world: new THREE.Vector3(cx, 6.2, cz), color: 0xff8a3a, intensity: 2.6, range: 12, off: false };
  for (const L of [L1, L2]) { lights.push(L); gLights.push(L); }
  const embers = createEmbers(embersSrc); embers.mesh.name = 'b4:antigrav-embers'; group.add(embers.mesh); owned.push(embers);
  // 破片と柱を結ぶ光の糸（毎フレーム更新）
  const threadPos = new Float32Array(shards.length * 2 * 3), threadG = new THREE.BufferGeometry(); threadG.setAttribute('position', new THREE.BufferAttribute(threadPos, 3));
  const threadM = new THREE.LineBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
  const threads = new THREE.LineSegments(threadG, threadM); threads.frustumCulled = false; threads.name = 'b4:antigrav-threads'; group.add(threads); owned.push(threadG, threadM);
  const ringBase = rings.map(r => r.mesh.material.uniforms.uInt.value);

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3(), V = new THREE.Vector3();
  function update() {
    const t = B4_VFX_TIME.value;
    let b = 0;
    floaters.forEach((f, i) => {
      const y = f.y0 + Math.sin(t * 6.2832 / f.per + f.ph) * f.amp;
      E.set(f.tx + Math.sin(t * 0.21 + f.ph) * 0.02, f.yaw + t * f.spin, f.tz, 'YXZ'); Q.setFromEuler(E);
      if (f.flip) Q.multiply(new THREE.Quaternion().setFromAxisAngle(V.set(1, 0, 0), Math.PI));
      const base = P.set(f.x, f.flip ? y + f.h : y, f.z).clone();
      shaftI.setMatrixAt(i, M.compose(base, Q, S.set(f.w, f.h, f.w)));
      const up = V.set(0, f.h, 0).applyQuaternion(Q);
      capI.setMatrixAt(i, M.compose(base.clone().add(up), Q, S.set(f.w, f.w * 1.1, f.w)));
      for (const k of f.bands) {
        const off = V.set(0, f.h * k, 0).applyQuaternion(Q);
        bandI.setMatrixAt(b++, M.compose(base.clone().add(off), Q, S.set(f.w * (1 - 0.2 * k), 1, f.w * (1 - 0.2 * k))));
      }
    });
    shards.forEach((s, i) => {
      const a = s.a + t * s.w;
      E.set(t * 0.3 + i, t * 0.2, i); Q.setFromEuler(E);
      shardI.setMatrixAt(i, M.compose(P.set(cx + Math.cos(a) * s.r, s.y + Math.sin(t * 0.5 + i) * 0.4, cz + Math.sin(a) * s.r * (halfZ / halfX)), Q, S.setScalar(s.s)));
    });
    rings.forEach((r, i) => { r.mesh.rotation.y = t * r.spin; r.mesh.material.uniforms.uInt.value = ringBase[i] * (0.65 + 0.45 * Math.max(0, Math.sin(t * 6.2832 / floaters[i % floaters.length].per + floaters[i % floaters.length].ph))); });
    shards.forEach((sh, i) => {
      const a = sh.a + t * sh.w, sx = cx + Math.cos(a) * sh.r, sy = sh.y + Math.sin(t * 0.5 + i) * 0.4, sz = cz + Math.sin(a) * sh.r * (halfZ / halfX);
      const f = floaters[i % 9], fy = f.y0 + Math.sin(t * 6.2832 / f.per + f.ph) * f.amp + f.h * (0.3 + 0.4 * ((i * 0.37) % 1));
      threadPos.set([sx, sy, sz, f.x, fy, f.z], i * 6);
    });
    threadG.attributes.position.needsUpdate = true;
    threadM.opacity = 0.3 + 0.2 * Math.sin(t * 3.1);
    shaftI.instanceMatrix.needsUpdate = capI.instanceMatrix.needsUpdate = bandI.instanceMatrix.needsUpdate = shardI.instanceMatrix.needsUpdate = true;
  }
  update();
  root.add(group);
  return { group, update, info: { floaters: floaters.length, rings: rings.length }, dispose() { owned.forEach(o => o.dispose()); group.removeFromParent(); } };
}

// ---------------------------------------------------------------- 参道（溶岩に挟まれた道）を神殿の回廊にする
// 両側の溶岩の帯の外に、高さ 8.2 m の連続した神殿の壁（柱形 4 m ごと、尖頭の壁龕に火鉢とルーン柱を交互、上下の化粧材）。
// 参道と溶岩の境に低い縁石（0.35 m）、入口に神殿の門。
function nicheArchGeo() {
  const s = new THREE.Shape();
  s.moveTo(-1.25, 0); s.lineTo(-1.25, 3.6); s.quadraticCurveTo(-1.25, 5.0, 0, 5.4); s.quadraticCurveTo(1.25, 5.0, 1.25, 3.6); s.lineTo(1.25, 0);
  s.lineTo(1.0, 0); s.lineTo(1.0, 3.6); s.quadraticCurveTo(1.0, 4.8, 0, 5.1); s.quadraticCurveTo(-1.0, 4.8, -1.0, 3.6); s.lineTo(-1.0, 0); s.lineTo(-1.25, 0);
  return new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: false, curveSegments: 10 });
}
export function buildCauseway({ root, map, ch, CELL, hash, mats, lights, gLights }) {
  const group = new THREE.Group(); group.name = 'b4:causeway-temple';
  const owned = [];
  const cw = []; for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (ch(x, y) === ',') cw.push([x, y]);
  if (!cw.length) { root.add(group); return { group, info: {}, dispose() {} }; }
  const band = new Set();
  for (const [x, y] of cw) for (const [dx] of [[1], [-1]]) for (let k = 1; k <= 3 && ch(x + dx * k, y) === '~'; k++) band.add((x + dx * k) + ',' + y);
  const bx = [...band].map(k => +k.split(',')[0]), by = [...band].map(k => +k.split(',')[1]);
  const x0 = Math.min(...bx), x1 = Math.max(...bx), z0 = Math.min(...by), z1 = Math.max(...by);
  const len = (z1 - z0 + 1) * CELL, zc = (z0 + z1) / 2 * CELL, H = 8.2;
  const wallM = mats.wall.clone(); if (wallM.map) { wallM.map = wallM.map.clone(); wallM.map.repeat.set(len / 4.08 * 1.6, H / 4.2 * 1.6); wallM.map.needsUpdate = true; }
  const trim = mats.trim, dark = new THREE.MeshStandardMaterial({ color: 0x120b0a, roughness: 0.8 });
  owned.push(wallM, dark); if (wallM.map !== mats.wall.map) owned.push(wallM.map);
  const parts = { trim: [], dark: [] }, flameSites = [], emberSrc = [];
  const runeCol = glyphMaterial({ style: 10, seed: 2.7, intensity: 0.7, speed: 0.5 }); owned.push(runeCol);
  const runeG = new THREE.PlaneGeometry(0.7, 3.0); owned.push(runeG);
  const archG = nicheArchGeo(); owned.push(archG);
  for (const side of [-1, 1]) {
    const xw = side < 0 ? (x0 - 0.5) * CELL : (x1 + 0.5) * CELL, inward = -side;
    const wg = new THREE.BoxGeometry(0.8, H, len + 0.8); wg.translate(xw, H / 2, zc); owned.push(wg);   // 内側の面が xw に来るよう外へ 0.4 m ずらす
    const wall = new THREE.Mesh(wg, wallM); wall.position.x = side * 0.4; wall.name = 'b4:causeway-wall'; group.add(wall);
    const face = xw + inward * 0.0;
    parts.trim.push(new THREE.BoxGeometry(0.5, 0.55, len + 0.8).translate(face + inward * 0.25, 0.275, zc));
    parts.trim.push(new THREE.BoxGeometry(0.6, 0.45, len + 0.8).translate(face + inward * 0.3, H - 0.6, zc));
    parts.trim.push(new THREE.BoxGeometry(0.4, 0.16, len + 0.8).translate(face + inward * 0.2, 4.6, zc));
    for (let k = 0; k <= z1 - z0 + 1; k++) {
      const z = (z0 - 0.5 + k) * CELL;
      parts.trim.push(new THREE.BoxGeometry(0.75, H - 0.4, 0.75).translate(face + inward * 0.37, (H - 0.4) / 2, z));
      parts.trim.push(new THREE.BoxGeometry(1.0, 0.5, 1.0).translate(face + inward * 0.45, 0.25, z), new THREE.BoxGeometry(1.0, 0.4, 1.0).translate(face + inward * 0.45, H - 1.0, z));
      if (k > z1 - z0) continue;
      const zm = z + CELL / 2;
      const a = archG.clone(); a.rotateY(inward > 0 ? Math.PI / 2 : -Math.PI / 2); a.translate(face + inward * 0.02, 0.55, zm); parts.trim.push(a);
      parts.dark.push(new THREE.BoxGeometry(0.06, 4.4, 2.0).translate(face + inward * 0.02, 0.55 + 2.2, zm));
      if ((k + (side > 0 ? 1 : 0)) % 2 === 0) {
        parts.trim.push(new THREE.BoxGeometry(0.7, 1.0, 0.7).translate(face + inward * 0.5, 0.5 + 0.55, zm), new THREE.CylinderGeometry(0.42, 0.24, 0.3, 8).translate(face + inward * 0.5, 1.75, zm));
        flameSites.push({ x: face + inward * 0.5, y: 1.85, z: zm, w: 0.9, h: 1.7, seed: hash(k, side, 1401), intensity: 1.0 });
        emberSrc.push({ x: face + inward * 0.5, z: zm, y0: 2.2, spread: 0.3, rise: 4, count: 16, hot: 1 });
        if (lights.length < 60) { const L = { world: new THREE.Vector3(face + inward * 1.2, 2.6, zm), color: 0xff7a2a, intensity: 2.4, range: 9, off: false }; lights.push(L); gLights.push(L); }
      } else {
        const r = new THREE.Mesh(runeG, runeCol); r.position.set(face + inward * 0.06, 2.9, zm); r.rotation.y = inward > 0 ? Math.PI / 2 : -Math.PI / 2; r.renderOrder = 4; group.add(r);
      }
    }
  }
  // 縁石（溶岩と歩ける床の境）
  for (const k of band) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dz] of DIRS) {
      const c = ch(x + dx, y + dz); if (!c || c === '#' || c === '~') continue;
      const ex = x * CELL + dx * CELL / 2, ez = y * CELL + dz * CELL / 2;
      const g = dx ? new THREE.BoxGeometry(0.45, 0.35, CELL) : new THREE.BoxGeometry(CELL, 0.35, 0.45); g.translate(ex, 0.12, ez); parts.trim.push(g);
    }
  }
  const tg = mergeGeometries(parts.trim.map(g => g.index ? g.toNonIndexed() : g), false), dg = mergeGeometries(parts.dark.map(g => g.index ? g.toNonIndexed() : g), false);
  [...parts.trim, ...parts.dark].forEach(g => g.dispose()); owned.push(tg, dg);
  const tm = new THREE.Mesh(tg, trim); tm.name = 'b4:causeway-trim'; const dm = new THREE.Mesh(dg, dark); dm.name = 'b4:causeway-niches'; group.add(tm, dm);
  const fl = createFlames(flameSites, 'fire'); fl.mesh.name = 'b4:causeway-flames'; group.add(fl.mesh); owned.push(fl);
  const em = createEmbers(emberSrc); em.mesh.name = 'b4:causeway-embers'; group.add(em.mesh); owned.push(em);
  root.add(group);
  return { group, band, info: { length: len, braziers: flameSites.length }, dispose() { owned.forEach(o => o.dispose()); group.removeFromParent(); } };
}

// 柱の間の穴：まわりを欄干で囲う（GPT 溶岩の段差の裏を隠す。段差は小さい版だけにする）
export function buildPitRail({ root, hall, ch, CELL, hash, mats }) {
  const group = new THREE.Group(); group.name = 'b4:pit-rail'; const owned = [];
  const [px0, pz0, px1, pz1] = hall.pit;
  const geos = [];
  for (let y = pz0; y <= pz1; y++) for (let x = px0; x <= px1; x++) {
    if (ch(x, y) !== '~') continue;
    for (const [dx, dz] of DIRS) {
      const c = ch(x + dx, y + dz); if (!c || c === '~' || c === '#') continue;
      const g = parapetGeometry(hash, x * 31 + y * 7 + dx * 3 + dz);
      if (dx) g.rotateY(Math.PI / 2);
      g.translate(x * CELL + dx * (CELL / 2 - 0.1), 0, y * CELL + dz * (CELL / 2 - 0.1)); geos.push(g);
    }
  }
  if (geos.length) { const g = mergeGeometries(geos, false); geos.forEach(q => q.dispose()); owned.push(g); const m = new THREE.Mesh(g, mats.trim); m.name = 'b4:pit-rail'; group.add(m); }
  root.add(group);
  return { group, dispose() { owned.forEach(o => o.dispose()); group.removeFromParent(); } };
}

// ---------------------------------------------------------------- 竜の聖域
function wingShape() {
  // 翼の付け根（x=0）から外へ 7.0 m。y は床から。前縁→手首→指先 4 本→膜のスカラップ
  const s = new THREE.Shape();
  s.moveTo(0, 2.4); s.lineTo(0, 4.7);
  s.quadraticCurveTo(0.9, 6.3, 2.4, 6.9);          // 前縁
  s.quadraticCurveTo(4.8, 7.6, 7.0, 7.7);          // 第1指先
  s.quadraticCurveTo(5.4, 6.0, 6.7, 4.5);          // 膜
  s.quadraticCurveTo(5.1, 4.1, 5.5, 2.3);
  s.quadraticCurveTo(4.0, 2.6, 3.4, 1.0);
  s.quadraticCurveTo(2.0, 2.0, 0, 2.4);
  return s;
}
function wingBones() {
  // 手首 (2.4, 6.9) から各指先へ、骨の浮き彫り（0.16 m 角）
  const parts = [], wrist = new THREE.Vector2(2.4, 6.9);
  for (const tip of [[7.0, 7.7], [6.7, 4.5], [5.5, 2.3], [3.4, 1.0], [0.0, 4.6]]) {
    const v = new THREE.Vector2(...tip).sub(wrist), len = v.length();
    const b = new THREE.BoxGeometry(len, 0.17, 0.16); b.translate(len / 2, 0, 0); b.rotateZ(Math.atan2(v.y, v.x)); b.translate(wrist.x, wrist.y, 0.2);
    parts.push(b);
    const claw = new THREE.ConeGeometry(0.12, 0.42, 5); claw.rotateZ(Math.atan2(v.y, v.x) - Math.PI / 2); claw.translate(tip[0] + v.x / len * 0.18, tip[1] + v.y / len * 0.18, 0.2); parts.push(claw);
  }
  const knob = new THREE.SphereGeometry(0.26, 8, 6); knob.translate(wrist.x, wrist.y, 0.2); parts.push(knob);
  return mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p), false);
}
function backlightMaterial() {
  // 翼の後ろの光の板：中心（アーチ側）ほど白熱、菱形格子＋六芒の目、ゆっくり脈動
  return new THREE.ShaderMaterial({
    uniforms: { uTime: B4_VFX_TIME },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec2 vUv;
      void main(){
        vec2 p = vUv;                                  // x=0 がアーチ側
        float core = exp(-p.x * 2.2) * (0.55 + 0.45 * exp(-pow((p.y - 0.62) * 2.4, 2.0)));
        vec2 q = vec2(p.x * 7.4, p.y * 7.2) * 1.1;
        float d1 = abs(fract(q.x + q.y) - 0.5), d2 = abs(fract(q.x - q.y) - 0.5);
        float lat = smoothstep(0.06, 0.0, min(d1, d2));
        vec2 c = fract(q) - 0.5; float eye = smoothstep(0.1, 0.06, abs(length(c) - 0.22));
        float edge = smoothstep(0.0, 0.03, p.x) * smoothstep(1.0, 0.7, p.x) * smoothstep(0.0, 0.04, p.y) * smoothstep(1.0, 0.95, p.y);
        float pulse = 0.85 + 0.15 * sin(uTime * 1.3 - p.x * 4.0);
        vec3 hot = vec3(1.0, 0.62, 0.28), warm = vec3(0.95, 0.3, 0.06), deep = vec3(0.35, 0.05, 0.01);
        vec3 col = mix(deep, warm, smoothstep(0.05, 0.4, core)); col = mix(col, hot, smoothstep(0.45, 0.95, core));
        float vig = smoothstep(1.0, 0.55, p.y) * smoothstep(0.0, 0.18, p.y);
        float a = (0.18 + 0.95 * core) * (0.35 + 0.65 * lat + 0.4 * eye) * pulse * edge * (0.45 + 0.55 * vig);
        gl_FragColor = vec4(col * a, 1.0);
      }`,
    side: THREE.DoubleSide, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  });
}
function archGeometry() {
  // 逆U字の1本の輪郭（穴を使わない）：外幅 5.4 m・頂部 8.0 m、開口 4.0 m・頂部 7.4 m
  const s = new THREE.Shape();
  s.moveTo(-2.7, 0); s.lineTo(-2.7, 5.4); s.quadraticCurveTo(-2.7, 7.6, 0, 8.0); s.quadraticCurveTo(2.7, 7.6, 2.7, 5.4); s.lineTo(2.7, 0);
  s.lineTo(2.0, 0); s.lineTo(2.0, 5.4); s.quadraticCurveTo(2.0, 7.0, 0, 7.4); s.quadraticCurveTo(-2.0, 7.0, -2.0, 5.4); s.lineTo(-2.0, 0); s.lineTo(-2.7, 0);
  return new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 1, curveSegments: 14 });
}

export function buildSanctum({ root, sanctum, CELL, hash, mats, lights, gLights }) {
  const group = new THREE.Group(); group.name = 'b4:dragon-sanctum';
  const owned = [];
  const { room: [sx0, sz0, sx1, sz1], boss } = sanctum;
  const cx = boss.tx * CELL, bz = boss.ty * CELL;            // 壁龕の中心
  const faceZ = bz - CELL / 2 - 0.33;                        // 聖域の南壁の表面（通路側）
  const roomCz = (sz0 + sz1) / 2 * CELL, roomW = (sx1 - sx0 + 1) * CELL;
  const black = new THREE.MeshStandardMaterial({ color: 0x0b0807, roughness: 0.55, metalness: 0.25 });
  const trim = mats.trim.clone(); trim.color = new THREE.Color(0x5a4440);
  owned.push(black, trim);
  // アーチ
  const archG = archGeometry(); owned.push(archG);
  const arch = new THREE.Mesh(archG, trim); arch.position.set(cx, 0, faceZ - 0.75); arch.name = 'b4:sanctum-arch'; group.add(arch);
  const archBand = glyphMaterial({ style: 2, seed: 5.1, intensity: 1.4, speed: 0.5 }); owned.push(archBand);
  { const g = new THREE.PlaneGeometry(4.2, 0.4); owned.push(g); for (const side of [-1, 1]) { const m = new THREE.Mesh(g, archBand); m.position.set(cx + side * 2.36, 3.2, faceZ - 0.78); m.rotation.z = Math.PI / 2; m.scale.set(0.9, 0.8, 1); group.add(m); } }
  // 翼と逆光
  const wingG = new THREE.ExtrudeGeometry(wingShape(), { depth: 0.22, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1, curveSegments: 10 });
  const boneG = wingBones(); owned.push(wingG, boneG);
  const glowM = backlightMaterial(); owned.push(glowM);
  const half = Math.min(7.4, roomW / 2 - 2.75);
  for (const side of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(cx + side * 2.75, 0, faceZ - 0.62); w.scale.set(side * half / 7.0, 1, 1); group.add(w);
    const wm = new THREE.Mesh(wingG, black); wm.name = 'b4:sanctum-wing'; w.add(wm);
    const bm = new THREE.Mesh(boneG, trim); bm.name = 'b4:sanctum-wing-bones'; w.add(bm);
    if (side < 0) { wingG.computeVertexNormals(); }
    const pg = new THREE.PlaneGeometry(1, 1); pg.translate(0.5, 0.5, 0); owned.push(pg);
    const panel = new THREE.Mesh(pg, glowM); panel.scale.set(7.4, 7.6, 1); panel.position.set(0, 0.35, 0.3); panel.renderOrder = 2; panel.name = 'b4:sanctum-backlight'; w.add(panel);
  }
  black.side = THREE.DoubleSide; trim.side = THREE.DoubleSide;
  // 壁龕：階段と台座
  for (const [i, h] of [0.18, 0.36, 0.54].entries()) {
    const d = i < 2 ? 0.45 : CELL - 0.9 - 0.33;
    const g = new THREE.BoxGeometry(CELL - 0.2, h, d); owned.push(g);
    const m = new THREE.Mesh(g, trim); m.position.set(cx, h / 2, bz - CELL / 2 + 0.0 + i * 0.45 + d / 2); m.name = 'b4:sanctum-step'; group.add(m);
  }
  // 光輪（竜の背後）
  for (const [R, I, s] of [[2.1, 1.9, 0.5], [2.9, 0.8, -0.3]]) {
    const g = new THREE.PlaneGeometry(R * 2, R * 2), m = glyphMaterial({ style: 1, seed: R, intensity: I, speed: s, color: 0xffa040 }); owned.push(g, m);
    const mesh = new THREE.Mesh(g, m); mesh.position.set(cx, 4.4, bz + CELL / 2 - 0.4); mesh.rotation.y = Math.PI; mesh.renderOrder = 4; mesh.name = 'b4:sanctum-halo'; group.add(mesh);
  }
  // 柱（側壁沿い）と火鉢
  const pillarParts = [];
  const sideX = [(sx0 - 0.5) * CELL + 0.33 + 0.6, (sx1 + 0.5) * CELL - 0.33 - 0.6];
  const pz = [sz0 * CELL + 1.0, roomCz, sz1 * CELL - 1.0];
  const flameSites = [], emberSrc = [];
  for (const x of sideX) for (const [k, z] of pz.entries()) {
    const sh = new THREE.CylinderGeometry(0.45 * Math.SQRT2, 0.5 * Math.SQRT2, 7.0, 4); sh.rotateY(Math.PI / 4); sh.translate(x, 0.5 + 3.5, z); pillarParts.push(sh);
    const b = new THREE.BoxGeometry(1.3, 0.5, 1.3); b.translate(x, 0.25, z); pillarParts.push(b);
    const b2 = new THREE.BoxGeometry(1.1, 0.12, 1.1); b2.translate(x, 0.56, z); pillarParts.push(b2);
    const c = new THREE.BoxGeometry(1.3, 0.45, 1.3); c.translate(x, 7.72, z); pillarParts.push(c);
    const c2 = new THREE.BoxGeometry(1.1, 0.14, 1.1); c2.translate(x, 7.44, z); pillarParts.push(c2);
    if (k !== 1) {
      const inward = x < cx ? 1 : -1;
      const arm = new THREE.BoxGeometry(0.9, 0.14, 0.18); arm.translate(x + inward * 0.75, 4.9, z); pillarParts.push(arm);
      const bowl = new THREE.CylinderGeometry(0.42, 0.22, 0.34, 8); bowl.translate(x + inward * 1.15, 5.05, z); pillarParts.push(bowl);
      flameSites.push({ x: x + inward * 1.15, y: 5.2, z, w: 0.9, h: 1.7, seed: hash(k, x, 995), intensity: 1.15 });
      emberSrc.push({ x: x + inward * 1.15, z, y0: 5.4, spread: 0.25, rise: 2.6, count: 18, hot: 1 });
      if (lights.length < 44) { const L = { world: new THREE.Vector3(x + inward * 1.3, 5.6, z), color: 0xff8a34, intensity: 2.2, range: 8, off: false }; lights.push(L); gLights.push(L); }
    }
  }
  const pillarG = mergeGeometries(pillarParts.map(p => p.index ? p.toNonIndexed() : p), false); pillarParts.forEach(p => p.dispose()); owned.push(pillarG);
  const pillars = new THREE.Mesh(pillarG, trim); pillars.name = 'b4:sanctum-pillars'; group.add(pillars);
  const pBand = glyphMaterial({ style: 2, seed: 9.2, intensity: 1.2, speed: 0.4 }); owned.push(pBand);
  const pbG = bandGeometry(); owned.push(pbG);
  for (const x of sideX) for (const z of pz) for (const y of [2.3, 6.2]) { const m = new THREE.Mesh(pbG, pBand); m.position.set(x, y, z); m.scale.set(1.0, 1, 1.0); m.renderOrder = 5; group.add(m); }
  const flames = createFlames(flameSites, 'fire'); flames.mesh.name = 'b4:sanctum-flames'; group.add(flames.mesh); owned.push(flames);
  // 床：艶のある黒＋魔法陣
  const fg = new THREE.PlaneGeometry(roomW - 0.7, (sz1 - sz0 + 1) * CELL - 0.7).rotateX(-Math.PI / 2); owned.push(fg);
  const fm = new THREE.MeshStandardMaterial({ color: 0x100a08, roughness: 0.16, metalness: 0.55, transparent: true, opacity: 0.62, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }); owned.push(fm);
  const floor = new THREE.Mesh(fg, fm); floor.position.set((sx0 + sx1) / 2 * CELL, 0.004, roomCz); floor.name = 'b4:sanctum-floor'; group.add(floor);
  const cg = new THREE.PlaneGeometry(11, 11).rotateX(-Math.PI / 2), cm = glyphMaterial({ style: 0, seed: 4.4, intensity: 1.1, speed: 0.5 }); owned.push(cg, cm);
  const circle = new THREE.Mesh(cg, cm); circle.position.set(cx, 0.02, roomCz); circle.renderOrder = 3; circle.name = 'b4:sanctum-circle'; group.add(circle);
  // 光の筋：龕の上から床の魔法陣へ
  const rayG = new THREE.PlaneGeometry(3.6, 13); rayG.translate(0, -6.5, 0); owned.push(rayG);
  for (const [i, side] of [-1, 1].entries()) {
    const m = lightShaftMaterial({ seed: 3 + i, intensity: 0.12, color: 0xffa050 }); owned.push(m);
    for (const rot of [0, Math.PI / 2]) {
      const ray = new THREE.Mesh(rayG, m); ray.position.set(cx + side * 1.6, 8.1, faceZ - 0.5); ray.rotation.set(-0.62, rot, side * 0.12); ray.renderOrder = 8; ray.name = 'b4:sanctum-ray'; group.add(ray);
    }
  }
  // 光
  for (const L of [
    { world: new THREE.Vector3(cx, 4.6, bz + 1.0), color: 0xffb060, intensity: 7.5, range: 16, off: false },
    { world: new THREE.Vector3(cx, 5.0, faceZ - 1.6), color: 0xff7a30, intensity: 4.2, range: 20, off: false },
  ]) { lights.push(L); gLights.push(L); }
  emberSrc.push({ x: cx, z: bz, y0: 0.6, spread: 1.6, rise: 8, count: 70, hot: 1 }, { x: cx, z: roomCz, y0: 0.1, spread: 5, rise: 6, count: 60, hot: 0.6 });
  const embers = createEmbers(emberSrc); embers.mesh.name = 'b4:sanctum-embers'; group.add(embers.mesh); owned.push(embers);
  root.add(group);
  return { group, update() {}, dragon: { x: cx, y: 0.54, z: bz + 0.5, size: 4.8 }, info: { pillars: sideX.length * pz.length, braziers: flameSites.length }, dispose() { owned.forEach(o => o.dispose()); group.removeFromParent(); } };
}
