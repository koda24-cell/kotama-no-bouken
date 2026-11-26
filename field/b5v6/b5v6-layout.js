/* 5層 V6：配置（A14）— マスごとの密集配置。どのマスにも何かがある状態にし、通路の中央（視線と移動）は低い物だけ。
 * フロアの主題：13F（a.f=0）戦場跡の回廊／14F（a.f=1）騎士団の神殿区／15F（a.f=2）魔王の大聖堂・迷宮 */
import * as THREE from 'three';
import { rng } from './b5v6-geom.js';
import { placeAsset, trs } from './b5v6-place.js';
import { brazier, wallTorch, candles, fallenBrazier, candelabrum } from './b5v6-fixtures.js';
import { swordField, battleDebris, rubble, arrows, shield, helmet, sword, spear } from './b5v6-war-props.js';
import { knightStatue } from './b5v6-knight-statue.js';
import { chandelier, fallenChandelier } from './b5v6-chandelier.js';
import { wallVines, floorRoots, pale_flowers } from './b5v6-overgrowth.js';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export function layoutB5V6({ a, ch, wallCell, hash, CELL = 4, M, arch, heights, ctx, banners, high = true, breaches = [], holy = () => false, procession = new Map(), bossCell = null }) {
  const f = a.f, walk = (x, y) => x >= 0 && y >= 0 && x < a.w && y < a.h && !wallCell(x, y);
  const objAt = new Map(a.objects.map(o => [o.tx + ',' + o.ty, o]));
  const busy = (tx, ty) => objAt.has(tx + ',' + ty) || '<>SPETG?B_'.includes(ch(tx, ty));
  const nearObj = (tx, ty, r = 1) => a.objects.some(o => Math.abs(o.tx - tx) <= r && Math.abs(o.ty - ty) <= r);
  const stats = { torches: 0, braziers: 0, statues: 0, swordFields: 0, debris: 0, chandeliers: 0, banners: 0, candles: 0, mist: 0, shafts: 0 };
  const facesByCell = new Map(); for (const fc of arch.faces) { const k = fc.tx + ',' + fc.ty; if (!facesByCell.has(k)) facesByCell.set(k, []); facesByCell.get(k).push(fc); }
  const degree = (tx, ty) => DIRS.filter(([dx, dz]) => walk(tx + dx, ty + dz)).length;
  const wallMount = (fc, ox = 0) => fc.matrix.clone().multiply(new THREE.Matrix4().makeTranslation(ox, 0, 0));
  const usedFace = new Set();

  // ---------------------------------------------------------------- 壁面：松明・旗・窪みの燭台／像
  arch.faces.forEach((fc, i) => {
    const R = rng(Math.floor(fc.seed * 1e9) + 17), k = R();
    const occupiedWallObj = a.objects.some(o => o.onWall && o.tx === fc.tx + fc.dx && o.ty === fc.ty + fc.dz);
    if ((fc.variant === 'breach' || fc.variant === 'open') || occupiedWallObj) return;
    if (holy(fc.tx, fc.ty)) { usedFace.add(fc.key); return; }   // 魔王の間は下の専用処理
    const pr = procession.get(fc.tx + ',' + fc.ty);
    if (pr) {
      // 参道：両側の壁に赤い長旗、玉座に近いほど金の松明
      banners.wallBanner(wallMount(fc), i * 13 + 7, { top: Math.min(fc.spring - 0.55, 5.1), h: 3.6, color: 'red' });
      for (const ox of [-1.4, 1.4]) placeAsset(ctx, wallTorch(M, i * 3 + ox * 10, { palette: pr.i <= 6 ? 1 : 0 }), wallMount(fc, ox));
      usedFace.add(fc.key); stats.banners++; stats.torches += 2; return;
    }
    if (fc.variant === 'arch') {
      // 窪み：棚に燭台、手前に低い瓦礫。14F は窪みの前に小さな騎士像も
      if (f === 1 && k < 0.22 && !nearObj(fc.tx, fc.ty, 1)) {
        placeAsset(ctx, knightStatue(M, i * 7 + 3, { damage: R() < 0.4 ? 'arm' : 'none' }), wallMount(fc).multiply(trs(0, 0, 0.55, 0, 0.72)));
        stats.statues++; usedFace.add(fc.key); return;
      }
      placeAsset(ctx, candles(M, i * 11 + 1, { count: (high ? 5 : 3) + Math.floor(R() * (high ? 6 : 3)), radius: 0.4, base: 0.95 + 0.07 }), wallMount(fc).multiply(trs((R() - 0.5) * 0.6, 0, -0.18)));
      stats.candles++; usedFace.add(fc.key);
      return;
    }
    // 平らな壁：一定の間隔で松明、間に旗
    const torchP = f === 1 ? 0.3 : 0.36;
    if (k < torchP) {
      placeAsset(ctx, wallTorch(M, i, { palette: R() < (f === 1 ? 0.25 : 0.1) ? 1 : 0 }), wallMount(fc));
      stats.torches++; usedFace.add(fc.key);
    } else if (k < torchP + (f === 1 ? 0.32 : 0.18)) {
      banners.wallBanner(wallMount(fc), i * 13 + 5, { top: Math.min(fc.spring - 0.55, 5.1), h: 2.9 + R() * 0.9, color: f === 1 ? (R() < 0.6 ? 'blue' : 'red') : R() < 0.7 ? 'red' : 'black' });
      stats.banners++; usedFace.add(fc.key);
    }
  });

  // 行き止まり・突き当たりの壁は必ず見どころにする（旗＋左右の松明）
  for (const fc of arch.faces) {
    if (usedFace.has(fc.key) || (fc.variant === 'breach' || fc.variant === 'open')) continue;
    if (a.objects.some(o => o.onWall && o.tx === fc.tx + fc.dx && o.ty === fc.ty + fc.dz)) continue;
    // 2 マス以上まっすぐ歩いてきた先の正面の壁＝視線の終点
    const back = walk(fc.tx - fc.dx, fc.ty - fc.dz) && walk(fc.tx - 2 * fc.dx, fc.ty - 2 * fc.dz);
    if (!back) continue;
    banners.wallBanner(wallMount(fc), fc.tx * 7 + fc.ty * 3, { top: Math.min(fc.spring - 0.55, 5.1), h: 3.4, color: f === 1 ? 'blue' : 'red' });
    for (const ox of [-1.35, 1.35]) placeAsset(ctx, wallTorch(M, fc.tx + ox * 10, { palette: f === 1 ? 1 : 0 }), wallMount(fc, ox));
    usedFace.add(fc.key); stats.banners++; stats.torches += 2;
  }
  // 植生：つる（上から垂れる）・根（壁際）
  const nearLight = (tx, ty) => arch.collapsed.some(c => Math.abs(c.tx - tx) + Math.abs(c.ty - ty) <= 2) || breaches.some(b => Math.abs(b.tx - tx) + Math.abs(b.ty - ty) <= 2);
  for (const fc of arch.faces) {
    if (holy(fc.tx, fc.ty) || (fc.variant === 'breach' || fc.variant === 'open')) continue;
    const R = rng(Math.floor(fc.seed * 1e9) + 91), lit = nearLight(fc.tx, fc.ty);
    if (R() < (lit ? 0.75 : 0.32) * (high ? 1 : 0.5)) { placeAsset(ctx, wallVines(M, Math.floor(R() * 1e6), { y0: fc.spring - 0.3, count: 3 + Math.floor(R() * 5), leafy: lit ? 0.9 : 0.35, maxLen: lit ? 4.6 : 3.2 }), fc.matrix); stats.vines = (stats.vines || 0) + 1; }
    if (R() < (lit ? 0.6 : 0.25)) placeAsset(ctx, floorRoots(M, Math.floor(R() * 1e6), { count: 2 + Math.floor(R() * 3) }), fc.matrix);
  }

  // ---------------------------------------------------------------- 床：マスごとの主題
  const collapsedSet = new Map(arch.collapsed.map(c => [c.tx + ',' + c.ty, c]));
  for (const cell of arch.floorCells) {
    const { tx, ty, x, z } = cell, R = rng(Math.floor(hash(tx, ty, 601) * 1e9) + 3), key = tx + ',' + ty;
    const deg = degree(tx, ty), faces = facesByCell.get(key) || [];
    const hall = heights(tx, ty).apex > 12;
    if (holy(tx, ty)) continue;   // 魔王の間は清浄に（瓦礫・霧・植生なし）
    // 壁際の低い瓦礫（どのマスにも）
    for (const fc of faces) {
      if ((fc.variant === 'breach' || fc.variant === 'open')) continue;
      const along = new THREE.Vector3(fc.dz !== 0 ? 1 : 0, 0, fc.dx !== 0 ? 1 : 0), off = (R() - 0.5) * 2.4;
      const p = new THREE.Vector3(x + fc.dx * 1.45, 0, z + fc.dz * 1.45).addScaledVector(along, off);
      placeAsset(ctx, rubble(M, Math.floor(R() * 1e6), { radius: 0.45, count: 3 + Math.floor(R() * 4), drums: 0, voussoirs: R() < 0.3 ? 1 : 0, low: true }), trs(p.x, 0, p.z, R() * 6));
      if (fc.plinthGap) placeAsset(ctx, rubble(M, Math.floor(R() * 1e6), { radius: 0.35, count: 4, drums: 0, voussoirs: 0, low: true }), trs(fc.plinthGap.x, 0, fc.plinthGap.z, R() * 6));
    }
    // 白い小花（光の届く場所に多く）
    if (R() < (nearLight(tx, ty) ? 0.55 : 0.1)) { const [fx, fz] = [(R() - 0.5) * 2.8, (R() - 0.5) * 2.8]; placeAsset(ctx, pale_flowers(M, tx * 53 + ty, { count: 10 + Math.floor(R() * 14) }), trs(x + fx, 0.0, z + fz)); stats.flowers = (stats.flowers || 0) + 1; }
    // 床の霧（密度にむら）
    ctx.mist.add(x, z, 0.55 + R() * 0.6 + (collapsedSet.has(key) ? 0.5 : 0)); stats.mist++;
    if (busy(tx, ty) && !hall) continue;
    const corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([cx, cz]) => ({ cx, cz, wall: (!walk(tx + cx, ty) ? 1 : 0) + (!walk(tx, ty + cz) ? 1 : 0) })).sort((p, q) => q.wall - p.wall);
    const pr = procession.get(key);
    if (pr) {
      // 参道：赤い絨毯（金の縁）が次のマスへ続き、両脇に燭台。玉座に近いほど暖かい光
      const carpetTo = (n) => {
        if (!n) return;
        const nx = n[0] * CELL, nz = n[1] * CELL, len = Math.hypot(nx - x, nz - z) / 2 + 0.55, ang = Math.atan2(nx - x, nz - z);
        const m = trs(x + (nx - x) / 4, 0, z + (nz - z) / 4, ang);
        placeAsset(ctx, { parts: [[new THREE.BoxGeometry(1.5, 0.025, len).translate(0, 0.013, 0), M.clothRed, { grime: 0.2, soot: 0.3, moss: 0, mottle: 0.4 }], [new THREE.BoxGeometry(0.08, 0.03, len).translate(0.78, 0.015, 0), M.gold, false], [new THREE.BoxGeometry(0.08, 0.03, len).translate(-0.78, 0.015, 0), M.gold, false]] }, m);
      };
      carpetTo(pr.next); carpetTo(pr.prev);
      for (const [cx, cz] of [[1.3, 1.3], [-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3]]) if (R() < 0.6) placeAsset(ctx, candles(M, tx * 7 + ty + cx * 3, { count: 6, radius: 0.3 }), trs(x + cx, 0, z + cz));
      if (pr.i % 3 === 0) { const c = corners[0]; placeAsset(ctx, knightStatue(M, tx * 11 + ty, { damage: 'none' }), trs(x + c.cx * 1.25, 0, z + c.cz * 1.25, Math.atan2(-c.cx, -c.cz), 0.62)); stats.statues++; }
      if (pr.i <= 5) ctx.addLight(x, 3.2, z, 0xffcf8a, 0.9 + (6 - pr.i) * 0.25, 6);
      if (pr.i <= 4) ctx.goldMotes.add(x, 0.4, z, 8, 1.4, 3.2);
      continue;
    }
    // 崩れた天井の下：大きな瓦礫の山＋光の柱
    const col = collapsedSet.get(key);
    if (col) {
      placeAsset(ctx, rubble(M, tx * 97 + ty, { radius: 1.1, count: 16, drums: 1, voussoirs: 2 }), trs(col.x, 0, col.z, R() * 6));
      ctx.shafts.add(col.x, col.z, col.apex + 1.5, col.r * 0.45, 0xa48cff); stats.shafts++;
      continue;
    }
    if (hall) continue;   // 大聖堂の身廊は別途
    // カメラはマスの中心から 1.1 m 後ろ（前後左右の十字上）に立つ。背の高い物は十字を避けて四隅に置く
    corners.forEach(c => { c.wall += (!walk(tx + c.cx, ty + c.cz) ? 0.5 : 0) + (R() - 0.5) * 0.6; }); corners.sort((p, q) => q.wall - p.wall);
    let ci = 0; const corner = (d = 1.28) => { const c = corners[ci++ % 4]; return [c.cx * d, c.cz * d]; };
    const roll = R();
    if ((deg === 1 && roll < 0.8) || (deg >= 3 && roll < 0.45) || (deg === 2 && roll < 0.14)) {
      const [ox, oz] = corner(1.3);
      placeAsset(ctx, brazier(M, tx * 31 + ty, { scale: 1 }), trs(x + ox, 0, z + oz, R() * 6)); stats.braziers++;
    }
    // フロア別の主題物（四隅）
    const [sx, sz] = corner(1.25);
    const side = faces.length ? faces[0] : null;
    const r2 = R();
    if (f === 0) {
      if (r2 < 0.3) { placeAsset(ctx, swordField(M, tx * 13 + ty * 7, { count: 8 + Math.floor(R() * 7), radius: 0.7 }), trs(x + sx, 0, z + sz, R() * 6)); stats.swordFields++; }
      else if (r2 < 0.62) { placeAsset(ctx, battleDebris(M, tx * 17 + ty * 3, { radius: 1.0, dense: 1 }), trs(x + sx * 0.8, 0, z + sz * 0.8, R() * 6)); stats.debris++; }
      else if (r2 < 0.74) { banners.warStandard(trs(x + sx, 0, z + sz, R() * 6), tx * 5 + ty, { color: R() < 0.7 ? 'red' : 'black' }); placeAsset(ctx, rubble(M, tx + ty * 9, { radius: 0.5, count: 6, drums: 0, voussoirs: 0 }), trs(x + sx, 0, z + sz)); stats.banners++; }
      else if (r2 < 0.82) { placeAsset(ctx, fallenBrazier(M, tx * 3 + ty), trs(x + sx * 0.6, 0, z + sz * 0.6, R() * 6)); }
      else if (r2 < 0.88 && side && !nearObj(tx, ty)) { placeAsset(ctx, knightStatue(M, tx * 41 + ty, { damage: 'toppled', plinth: false }), trs(x + sx * 0.5, 0, z + sz * 0.5, R() * 6, 0.9)); stats.statues++; }
      else { placeAsset(ctx, arrows(M, tx * 19 + ty, { count: 6 + Math.floor(R() * 6), radius: 0.7 }), trs(x + sx * 0.7, 0, z + sz * 0.7)); banners.fallenCloth(trs(x - sx * 0.4, 0, z - sz * 0.4, R() * 6), tx * 7 + ty); }
    } else if (f === 1) {
      if (r2 < 0.22) { placeAsset(ctx, candles(M, tx * 23 + ty, { count: 9, radius: 0.5 }), trs(x + sx, 0, z + sz)); stats.candles++; }
      else if (r2 < 0.45) { placeAsset(ctx, battleDebris(M, tx * 17 + ty * 3, { radius: 0.9, dense: 0.7 }), trs(x + sx * 0.8, 0, z + sz * 0.8, R() * 6)); stats.debris++; }
      else if (r2 < 0.58) { placeAsset(ctx, swordField(M, tx * 13 + ty * 7, { count: 5 + Math.floor(R() * 4), radius: 0.7 }), trs(x + sx * 0.9, 0, z + sz * 0.9, R() * 6)); stats.swordFields++; }
      else if (r2 < 0.68) { banners.fallenCloth(trs(x + sx * 0.5, 0, z + sz * 0.5, R() * 6), tx * 7 + ty, { color: 'blue' }); placeAsset(ctx, rubble(M, tx * 3 + ty, { radius: 0.8, count: 8 }), trs(x - sx * 0.5, 0, z - sz * 0.5)); }
      else if (r2 < 0.74 && !nearObj(tx, ty)) { placeAsset(ctx, fallenChandelier(M, tx * 29 + ty), trs(x, 0, z, R() * 6)); stats.chandeliers++; }
      else { placeAsset(ctx, rubble(M, tx * 11 + ty, { radius: 1.0, count: 10, drums: 1, voussoirs: 1 }), trs(x + sx * 0.7, 0, z + sz * 0.7, R() * 6)); }
    } else {
      if (r2 < 0.3) { placeAsset(ctx, battleDebris(M, tx * 17 + ty * 3, { radius: 0.9, dense: 0.8 }), trs(x + sx * 0.8, 0, z + sz * 0.8, R() * 6)); stats.debris++; }
      else if (r2 < 0.5) { placeAsset(ctx, candles(M, tx * 23 + ty, { count: 8, radius: 0.45 }), trs(x + sx, 0, z + sz)); stats.candles++; }
      else if (r2 < 0.65) { placeAsset(ctx, swordField(M, tx * 13 + ty * 7, { count: 6, radius: 0.7 }), trs(x + sx * 0.9, 0, z + sz * 0.9, R() * 6)); stats.swordFields++; }
      else { placeAsset(ctx, rubble(M, tx * 11 + ty, { radius: 0.9, count: 10, drums: 1, voussoirs: 1 }), trs(x + sx * 0.7, 0, z + sz * 0.7, R() * 6)); }
    }
    // 吊りシャンデリア：分岐や広い場所
    if ((deg >= 3 && R() < (f === 1 ? 0.75 : 0.45)) || (f === 1 && deg === 2 && R() < 0.12)) {
      const { apex } = heights(tx, ty), hang = apex - 3.6;
      placeAsset(ctx, chandelier(M, tx * 37 + ty, { radius: 1.05, chainTo: apex - hang + 0.2 }), trs(x, hang, z, R() * 6)); stats.chandeliers++;
    }
  }

  // ---------------------------------------------------------------- 破れ目：縁の瓦礫と、外へ流れる霧
  for (const b of breaches) {
    const x = b.tx * CELL + b.dx * 1.6, z = b.ty * CELL + b.dz * 1.6;
    placeAsset(ctx, rubble(M, b.tx * 7 + b.ty, { radius: 0.9, count: 12, drums: 0, voussoirs: 2 }), trs(x, 0, z));
    ctx.mist.add(x, z, 1.4);
  }

  // ---------------------------------------------------------------- 15F：開始地点の高い堂（紫のステンドグラス）と、魔王の間（金と白）
  if (f === 2) {
    const tall = arch.floorCells.filter(c => heights(c.tx, c.ty).apex > 12);
    const nave = tall.filter(c => holy(c.tx, c.ty)), anteroom = tall.filter(c => !holy(c.tx, c.ty));
    for (const fc of arch.faces) if (fc.win) {
      const to = fc.win.center.clone().addScaledVector(fc.normal, 7.5); to.y = 0;
      ctx.shafts.beam(fc.win.center.clone().addScaledVector(fc.normal, 0.3), to, 0.9, 2.2, fc.win.holy ? 0x9a8150 : 0x5e4f9e); stats.shafts++;
      ctx.addLight(fc.win.center.x + fc.normal.x * 2, 9, fc.win.center.z + fc.normal.z * 2, fc.win.holy ? 0xffd9a0 : 0x8a70ff, fc.win.holy ? 3.2 : 2.5, 10);
      if (fc.win.rose) {
        // 薔薇窓から玉座へ落ちる太い金の光
        const to2 = new THREE.Vector3(bossCell[0] * CELL, 0, bossCell[1] * CELL + 1.0);
        ctx.shafts.beam(fc.win.rose.clone(), to2, 1.6, 3.2, 0xb89a60); ctx.addLight(to2.x, 4, to2.z + 1.5, 0xffe2b0, 4.0, 10);
      }
    }
    // 前室（開始地点）：紫の燭台と篝火（従来の雰囲気）
    for (const c of anteroom) { const R = rng(c.tx * 77 + c.ty); if (!busy(c.tx, c.ty) && R() < 0.5) placeAsset(ctx, candles(M, c.tx * 5 + c.ty, { count: 8, radius: 0.45 }), trs(c.x + (R() - 0.5) * 2.4, 0, c.z + (R() - 0.5) * 2.4)); }
    if (nave.length) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const c of nave) { x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x); z0 = Math.min(z0, c.z); z1 = Math.max(z1, c.z); }
      const bx = bossCell[0] * CELL, bz = bossCell[1] * CELL;
      // 金のシャンデリア（身廊の軸の左右）
      for (const xx of [bx - 10, bx - 4.5, bx + 4.5, bx + 10]) { placeAsset(ctx, chandelier(M, Math.round(xx * 7), { radius: 1.6, chainTo: 16 - 7.2 + 0.4, gold: true }), trs(xx, 7.2, (z0 + z1) / 2, 0.3)); stats.chandeliers++; }
      // 白い垂れ幕（金の縁）
      for (let xx = x0; xx <= x1; xx += 4) if (Math.abs(xx - bx) > 3) for (const zz of [z0 - 1.2]) { banners.hangingBanner(trs(xx, 14.8, zz, 0), Math.round(xx * 3 + zz), { h: 8.0, color: 'white' }); stats.banners++; }
      // 赤い絨毯：身廊の入口から玉座まで
      const entry = nave.reduce((p, c) => (c.z > p.z ? c : p), nave[0]);
      const L = entry.z - bz + 1.6;
      placeAsset(ctx, { parts: [[new THREE.BoxGeometry(2.2, 0.03, L).translate(0, 0.015, 0), M.clothRed, { grime: 0.1, soot: 0.15, moss: 0, mottle: 0.3 }], [new THREE.BoxGeometry(0.12, 0.035, L).translate(1.15, 0.017, 0), M.gold, false], [new THREE.BoxGeometry(0.12, 0.035, L).translate(-1.15, 0.017, 0), M.gold, false]] }, trs(bx, 0, bz + L / 2 - 0.4, 0));
      // 玉座の前の段（白い大理石、3 段）
      for (let k = 0; k < 3; k++) placeAsset(ctx, { parts: [[new THREE.BoxGeometry(6.4 - k * 1.2, 0.16, 1.0), M.marble, { grime: 0, moss: 0, soot: 0, mottle: 0.1 }], [new THREE.BoxGeometry(6.44 - k * 1.2, 0.03, 0.06).translate(0, 0.08, 0.5), M.gold, false]] }, trs(bx, 0.08 + k * 0.16, bz + 2.6 - k * 0.55, 0));
      // 金の大燭台の列（絨毯の両脇）
      for (let zz = bz + 2.8; zz <= entry.z + 1; zz += 2.6) for (const sx of [-1.9, 1.9]) placeAsset(ctx, candelabrum(M, Math.round(zz * 10 + sx)), trs(bx + sx, 0, zz));
      // 身廊の両翼：白い騎士像（金の燭台を伴う）と、金の篝火
      for (const c of nave) {
        if (Math.abs(c.x - bx) < 6) continue;
        const R = rng(c.tx * 13 + c.ty * 101);
        for (const [dx, dz] of DIRS) {
          if (walk(c.tx + dx, c.ty + dz) || dx !== 0) continue;
          placeAsset(ctx, knightStatue(M, c.tx * 7 + c.ty, { damage: 'none' }), trs(c.x, 0, c.z + dz * 1.15, dz > 0 ? Math.PI : 0, 0.85)); stats.statues++;
          placeAsset(ctx, candles(M, c.tx * 5 + c.ty, { count: 10, radius: 0.45 }), trs(c.x + 1.2, 0, c.z + dz * 0.6));
        }
      }
      for (const [xx, zz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) { placeAsset(ctx, brazier(M, Math.round(xx + zz), { scale: 1.3, holy: true }), trs(xx, 0, zz)); stats.braziers++; }
      // 玉座の背後の光輪（金の環と放射状の光条）
      { const hp = [[new THREE.TorusGeometry(2.5, 0.07, 8, 64), M.goldGlow, false], [new THREE.TorusGeometry(2.05, 0.035, 6, 64), M.goldGlow, false], [new THREE.TorusGeometry(3.1, 0.025, 6, 64), M.goldGlow, false]];
        for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, L = k % 2 ? 0.7 : 1.3; hp.push([new THREE.BoxGeometry(0.05, L, 0.03).translate(0, 2.55 + L / 2, 0).rotateZ(a), M.goldGlow, false]); }
        placeAsset(ctx, { parts: hp, lights: [[0, 0, 1.2, 0xffe0a8, 3.0, 9]] }, trs(bx, 4.6, bz - 1.35, 0)); }
      // 金の光の粒（身廊いっぱい、高いところまで）
      for (const c of nave) ctx.goldMotes.add(c.x, 0.5, c.z, high ? 14 : 6, 1.8, 9);
      ctx.goldMotes.add(bx, 0.5, bz + 1.5, high ? 40 : 16, 1.6, 12);
    }
  }
  return stats;
}
