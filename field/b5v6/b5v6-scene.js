/* 5層 V6：シーン全体のまとめ役。建築 → 小物 → VFX → 遠景 の順に組み立てる。
 * 見た目だけ。マップ・通行判定・FOE・イベント・セーブは既存の field 系が正で、ここでは読むだけ。 */
import * as THREE from 'three';
import { createB5V6Materials } from './b5v6-materials.js';
import { Bucket } from './b5v6-geom.js';
import { buildB5V6Architecture } from './b5v6-architecture.js';
import { createB5V6DistantCity } from './b5v6-distant-city.js';
import { FlameSystem, EmberSystem, GroundMist, LightShafts } from './b5v6-vfx.js';
import { BannerSystem } from './b5v6-banners.js';
import { layoutB5V6 } from './b5v6-layout.js';
import { knightStatue } from './b5v6-knight-statue.js';
import { placeAsset, trs } from './b5v6-place.js';
import { createB5V6Kit } from './b5v6-kit.js';

let SHARED = null;   // 素材はページ全体で 1 組（フロア移動のたびに読み直さない）
export function getB5V6Materials(high) { return (SHARED ||= createB5V6Materials({ high })); }

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export function b5v6Heights(a, ch) {
  // 15F（a.f=2）：ボス前の安全地帯（_ B S とその周り）は大聖堂の身廊として高くする
  const hall = new Set();
  // 開始地点（P・<）も安全地帯（_）に接していれば同じ高さにそろえる（高さが混ざると壁の端が薄い板のように見える）
  const nearSafe = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ch(x + dx, y + dy) === '_');
  if (a.f === 2) for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) { const c = ch(x, y); if ('_BS'.includes(c) || ('P<>'.includes(c) && nearSafe(x, y))) hall.add(x + ',' + y); }
  return (tx, ty) => hall.has(tx + ',' + ty) ? { spring: 10.2, apex: 16 } : { spring: 5.8, apex: 9.0 };
}

// 外周に面した壁から、遠景（奈落・ビル群）が見える破れ目を選ぶ
export function pickBreaches(a, ch, wallCell, hash, max = 4) {
  const walk = (x, y) => x >= 0 && y >= 0 && x < a.w && y < a.h && !wallCell(x, y);
  const near = (x, y) => a.objects.some(o => Math.abs(o.tx - x) + Math.abs(o.ty - y) <= 1);
  const cands = [];
  for (let ty = 1; ty < a.h - 1; ty++) for (let tx = 1; tx < a.w - 1; tx++) {
    if (!walk(tx, ty) || near(tx, ty) || '<>'.includes(ch(tx, ty))) continue;
    for (const [dx, dz] of DIRS) {
      const wx = tx + dx, wz = ty + dz;
      if (!(wx === 0 || wz === 0 || wx === a.w - 1 || wz === a.h - 1)) continue;
      if (walk(wx, wz)) continue;
      cands.push({ tx, ty, dx, dz, r: hash(tx, ty, 471 + dx * 3 + dz) });
    }
  }
  cands.sort((p, q) => p.r - q.r);
  const out = [];
  for (const c of cands) { if (out.some(o => Math.abs(o.tx - c.tx) + Math.abs(o.ty - c.ty) < 7)) continue; out.push(c); if (out.length >= max) break; }
  return out;
}

// 奈落を見渡す開廊：外周に沿って 2〜4 マス続く面をまとめて開く
export function pickVistas(a, ch, wallCell, hash, max = 2, avoid = new Set()) {
  const walk = (x, y) => x >= 0 && y >= 0 && x < a.w && y < a.h && !wallCell(x, y);
  const bad = (x, y) => a.objects.some(o => Math.abs(o.tx - x) + Math.abs(o.ty - y) <= 1) || '<>SPEB_'.includes(ch(x, y)) || avoid.has(x + ',' + y);
  const runs = [];
  for (const [dx, dz] of DIRS) {
    // 外周の壁に面するマスの列を、辺に沿って走査
    const along = dx !== 0 ? [0, 1] : [1, 0];
    const lines = new Map();
    for (let ty = 1; ty < a.h - 1; ty++) for (let tx = 1; tx < a.w - 1; tx++) {
      const wx = tx + dx, wz = ty + dz;
      if (!walk(tx, ty) || walk(wx, wz) || bad(tx, ty)) continue;
      if (!(wx === 0 || wz === 0 || wx === a.w - 1 || wz === a.h - 1)) continue;
      const key = dx !== 0 ? 'x' + tx : 'y' + ty; if (!lines.has(key)) lines.set(key, []); lines.get(key).push([tx, ty]);
    }
    for (const cells of lines.values()) {
      cells.sort((p, q) => (p[0] + p[1]) - (q[0] + q[1]));
      let run = [];
      for (const c of cells) {
        const prev = run[run.length - 1];
        if (prev && Math.abs(prev[0] - c[0]) + Math.abs(prev[1] - c[1]) === 1) run.push(c); else { if (run.length >= 2) runs.push({ cells: run, dx, dz }); run = [c]; }
      }
      if (run.length >= 2) runs.push({ cells: run, dx, dz });
    }
  }
  runs.forEach(r => { r.cells = r.cells.slice(0, 4); r.score = r.cells.length + hash(r.cells[0][0], r.cells[0][1], 491); });
  runs.sort((p, q) => q.score - p.score);
  const out = [];
  for (const r of runs) {
    const c = r.cells[0];
    if (out.some(o => Math.abs(o.cells[0][0] - c[0]) + Math.abs(o.cells[0][1] - c[1]) < 8)) continue;
    out.push(r); if (out.length >= max) break;
  }
  return out;
}

export async function createB5V6Scene({ root, a, ch, wallCell, hash, CELL = 4, g, lights = [], objects = [] }) {
  const high = !!g?.high;
  const M = getB5V6Materials(high);
  await M.ready;
  M.setEnv(g?.renderer);
  const group = new THREE.Group(); group.name = 'b5v6'; root.add(group);
  const ownedGeo = [], ownedObj = [], updaters = [], myLights = [], disposers = [];
  const heights = b5v6Heights(a, ch);
  const vistas = pickVistas(a, ch, wallCell, hash, a.f === 2 ? 1 : 2, new Set([...Array(a.w * a.h).keys()].map(i => [i % a.w, Math.floor(i / a.w)]).filter(([x, y]) => heights(x, y).apex > 12).map(([x, y]) => x + ',' + y)));
  const openFaces = new Set(); for (const v of vistas) for (const [x, y] of v.cells) openFaces.add(`${x},${y},${v.dx},${v.dz}`);
  const vistaCells = new Set(vistas.flatMap(v => v.cells.map(([x, y]) => x + ',' + y)));
  const breaches = pickBreaches(a, ch, wallCell, hash, a.f === 2 ? 4 : 7).filter(b => !vistaCells.has(b.tx + ',' + b.ty) && heights(b.tx, b.ty).apex < 12);
  const breachFaces = new Set(breaches.map(b => `${b.tx},${b.ty},${b.dx},${b.dz}`));

  // 暗い神殿でも石の形が読める最低限の環境光（色は冷たい灰紫）
  const amb = new THREE.AmbientLight(0x8c88a8, high ? 0.9 : 1.2); group.add(amb);

  // 15F：魔王の間（ボス前の身廊）と、そこへ至る参道
  let holy = () => false, roseAt = null, procession = new Map(), bossCell = null;
  if (a.f === 2) {
    for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (ch(x, y) === 'B') bossCell = [x, y];
    if (bossCell) {
      holy = (x, y) => y <= bossCell[1] + 3 && heights(x, y).apex > 12;
      roseAt = [bossCell[0], bossCell[1], 0, -1];
      // 開始地点からボスまでの最短経路のうち、身廊の手前 11 マスを参道にする
      const SOL = c => '#~STG?D'.includes(c) || /[a-z]/.test(c), w2 = (x, y) => x >= 0 && y >= 0 && x < a.w && y < a.h && !SOL(ch(x, y));
      let start = null; for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (ch(x, y) === 'P') start = [x, y];
      if (start) {
        const prev = new Map([[start.join(','), null]]), q = [start];
        while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIRS) { const n = [x + dx, y + dy], k = n.join(','); if (!prev.has(k) && (w2(...n) || ch(...n) === 'B')) { prev.set(k, [x, y]); q.push(n); } } }
        const path = []; let cur = bossCell.join(','); while (cur) { path.unshift(cur.split(',').map(Number)); const p0 = prev.get(cur); cur = p0 ? p0.join(',') : null; }
        const entry = path.findIndex(([x, y]) => holy(x, y));
        for (let i = Math.max(0, entry - 11); i < entry; i++) procession.set(path[i].join(','), { i: entry - i, next: path[i + 1], prev: path[i - 1] });
      }
    }
  }

  const bucket = new Bucket(12);
  const arch = buildB5V6Architecture({ holy, roseAt, a, ch, wallCell, hash, CELL, M, bucket, heights, breachFaces, openFaces, collapse: a.f === 2 ? 0.06 : 0.1, high });
  const addLight = (x, y, z, color, intensity, range) => { const L = { world: new THREE.Vector3(x, y, z), color, intensity, range, off: false }; g?.lights?.push(L); lights.push(L); myLights.push(L); return L; };

  // 小物・灯り・VFX
  const flames = new FlameSystem(), embers = new EmberSystem(), goldMotes = new EmberSystem(0xffd890), mist = new GroundMist(), shafts = new LightShafts(), banners = new BannerSystem(M);
  const ctx = { bucket, flames, embers, mist, shafts, addLight, goldMotes };
  const stats = layoutB5V6({ a, ch, wallCell, hash, CELL, M, arch, heights, ctx, banners, high, breaches, holy, procession, bossCell });
  banners.build(group, bucket);
  flames.build(group); embers.build(group); goldMotes.build(group); mist.build(group, CELL); shafts.build(group);
  ownedObj.push(flames, embers, mist, shafts, banners, goldMotes);
  updaters.push((t) => { flames.update(t); embers.update(t, g?.renderer?.getPixelRatio?.() || 1); goldMotes.update(t, g?.renderer?.getPixelRatio?.() || 1); mist.update(t); shafts.update(t); banners.update(t); });
  const staticMeshes = bucket.build(group, 'b5v6');
  for (const m of staticMeshes) ownedGeo.push(m.geometry);
  // 魔王の間に入ると空気が変わる：霧と環境光が暖かい金色へ（離れると元に戻る）
  if (bossCell && g?.scene?.fog) {
    const fog = g.scene.fog, baseFog = fog.color.clone(), baseD = fog.density, warmFog = new THREE.Color(0x2a1f14), baseAmb = amb.color.clone(), warmAmb = new THREE.Color(0xc8b08a);
    const bx = bossCell[0] * CELL, bz = bossCell[1] * CELL; let k = 0;
    updaters.push((t, camera) => {
      if (!camera) return;
      const d = Math.hypot(camera.position.x - bx, camera.position.z - (bz + 6));
      const target = THREE.MathUtils.clamp(1 - (d - 10) / 18, 0, 1);
      k += (target - k) * 0.05;
      fog.color.copy(baseFog).lerp(warmFog, k); fog.density = baseD * (1 - 0.35 * k);
      amb.color.copy(baseAmb).lerp(warmAmb, k); amb.intensity = (high ? 0.9 : 1.2) * (1 + 0.6 * k);
    });
    disposers.push(() => { fog.color.copy(baseFog); fog.density = baseD; });
  }
  // 霧の向こう（約 46 m 先）の区画は描かない。区画は 12 m 角なので、カメラが 2 m 動くごとに判定し直す
  const lastCam = new THREE.Vector3(1e9, 0, 0), sph = new THREE.Vector3();
  updaters.push((t, camera) => {
    if (!camera || camera.position.distanceToSquared(lastCam) < 4) return;
    lastCam.copy(camera.position);
    for (const m of staticMeshes) { const bs = m.geometry.boundingSphere; sph.copy(bs.center); m.visible = sph.distanceTo(camera.position) - bs.radius < 46; }
  });

  // 5層専用の固有オブジェクト（階段・導きの灯・碑・宝箱・扉・採取点・亡霊の騎士）
  const kit = createB5V6Kit(M, { high }); ownedObj.push(kit); updaters.push(t => kit.update(t));

  // 遠景：奈落とビル群（破れ目と崩れた天井からだけ見える）
  const center = new THREE.Vector3((a.w - 1) * CELL / 2, 0, (a.h - 1) * CELL / 2);
  const city = createB5V6DistantCity({ center, seed: 11 + a.f * 7, high, radius: [Math.max(a.w, a.h) * CELL * 0.5 + 45, Math.max(a.w, a.h) * CELL * 0.5 + 110], focus: [...vistas.map(v => { const c = v.cells[Math.floor(v.cells.length / 2)]; return { pos: new THREE.Vector3(c[0] * CELL + v.dx * 2, 0, c[1] * CELL + v.dz * 2), dir: new THREE.Vector3(v.dx, 0, v.dz), vista: true }; }), ...breaches.map(b => ({ pos: new THREE.Vector3(b.tx * CELL + b.dx * 2, 0, b.ty * CELL + b.dz * 2), dir: new THREE.Vector3(b.dx, 0, b.dz) }))] });
  group.add(city.group); ownedObj.push(city); updaters.push(t => city.update(t));

  let disposed = false;
  return {
    group, kit,
    info: () => ({ stats, breachList: breaches.map(b => [b.tx, b.ty, b.dx, b.dz]), vistaList: vistas.map(v => [v.cells, v.dx, v.dz]), faces: arch.faces.length, piers: arch.piers.length, collapsed: arch.collapsed.length, breaches: breaches.length, lights: myLights.length, meshes: ownedGeo.length }),
    // 壁に付いた謎解きの騎士像（14F）。既存のエントリ（調べる・状態）はそのまま使い、見た目だけこの像にする
    switchStatue(seed = 1) {
      const b = new Bucket(64), gr = new THREE.Group(); gr.name = 'b5v6:switch-knight';
      placeAsset({ bucket: b }, knightStatue(M, seed, { damage: 'none' }), trs(0, 0, 0, 0, 0.78));
      for (const m of b.build(gr, 'knight')) ownedGeo.push(m.geometry);
      return gr;
    },
    update(now, camera) { for (const u of updaters) u(now * 0.001, camera); },
    dispose() {
      if (disposed) return; disposed = true;
      disposers.forEach(f => f()); ownedGeo.forEach(g => g.dispose()); ownedObj.forEach(o => o.dispose?.());
      for (const L of myLights) L.off = true;
      group.removeFromParent();
    }
  };
}
