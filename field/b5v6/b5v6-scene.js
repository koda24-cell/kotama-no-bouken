/* 5層 V6：シーン全体のまとめ役。建築 → 小物 → VFX → 遠景 の順に組み立てる。
 * 見た目だけ。マップ・通行判定・FOE・イベント・セーブは既存の field 系が正で、ここでは読むだけ。 */
import * as THREE from 'three';
import { createB5V6Materials } from './b5v6-materials.js';
import { Bucket } from './b5v6-geom.js';
import { buildB5V6Architecture } from './b5v6-architecture.js';

let SHARED = null;   // 素材はページ全体で 1 組（フロア移動のたびに読み直さない）
export function getB5V6Materials(high) { return (SHARED ||= createB5V6Materials({ high })); }

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export function b5v6Heights(a, ch) {
  // 15F（a.f=2）：ボス前の安全地帯（_ B S とその周り）は大聖堂の身廊として高くする
  const hall = new Set();
  if (a.f === 2) for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if ('_BS'.includes(ch(x, y))) hall.add(x + ',' + y);
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

export async function createB5V6Scene({ root, a, ch, wallCell, hash, CELL = 4, g, lights = [], objects = [] }) {
  const high = !!g?.high;
  const M = getB5V6Materials(high);
  await M.ready;
  const group = new THREE.Group(); group.name = 'b5v6'; root.add(group);
  const ownedGeo = [], ownedObj = [], updaters = [], myLights = [];
  const heights = b5v6Heights(a, ch);
  const breaches = pickBreaches(a, ch, wallCell, hash, a.f === 2 ? 2 : 4);
  const breachFaces = new Set(breaches.map(b => `${b.tx},${b.ty},${b.dx},${b.dz}`));

  // 暗い神殿でも石の形が読める最低限の環境光（色は冷たい灰紫）
  const amb = new THREE.AmbientLight(0x8c88a8, high ? 0.9 : 1.2); group.add(amb);

  const bucket = new Bucket(12);
  const arch = buildB5V6Architecture({ a, ch, wallCell, hash, CELL, M, bucket, heights, breachFaces, collapse: a.f === 2 ? 0.06 : 0.1, high });
  const addLight = (x, y, z, color, intensity, range) => { const L = { world: new THREE.Vector3(x, y, z), color, intensity, range, off: false }; g?.lights?.push(L); lights.push(L); myLights.push(L); return L; };

  // 仮の灯り（後で篝火・燭台に置き換える）
  arch.faces.forEach((f, i) => {
    if (hash(f.tx * 3 + f.dx, f.ty * 3 + f.dz, 481) < 0.22) {
      const p = f.world.clone().addScaledVector(f.normal, 0.6); addLight(p.x, 2.2, p.z, 0x8f5cff, 1.6, 4.5);
    }
  });

  for (const m of bucket.build(group, 'b5v6')) ownedGeo.push(m.geometry);

  let disposed = false;
  return {
    group,
    info: () => ({ faces: arch.faces.length, piers: arch.piers.length, collapsed: arch.collapsed.length, breaches: breaches.length, lights: myLights.length, meshes: ownedGeo.length }),
    update(now, camera) { for (const u of updaters) u(now * 0.001, camera); },
    dispose() {
      if (disposed) return; disposed = true;
      ownedGeo.forEach(g => g.dispose()); ownedObj.forEach(o => o.dispose?.());
      for (const L of myLights) L.off = true;
      group.removeFromParent();
    }
  };
}
