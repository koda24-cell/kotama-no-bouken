/* 5層 V6：建築（A2 全高壁／A3 束ね柱／A4 リブ・ヴォールト／A5 床）
 * マップのマス（4 m）に沿って、通路側の面だけを造形する。通行判定はマップが正で、ここでは何も書き換えない。
 * 座標：マス (tx,ty) の中心 = (tx*CELL, 0, ty*CELL)。up = -z。 */
import * as THREE from 'three';
import { prep, boxUV, weather, chip, sweep, PROFILES, lathe, pointedArch, archOutline, rng, fbm, vnoise } from './b5v6-geom.js';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// 面の外向き（通路側）を +z にする回転
function faceMatrix(x, z, dx, dz, y = 0) {
  const m = new THREE.Matrix4().makeRotationY(Math.atan2(-dx, -dz));
  m.setPosition(x + dx * 2, y, z + dz * 2);
  return m;
}

function jaggedHole(cx, cy, rx, ry, R, n = 8) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (R() - 0.5) * 0.5, k = 0.65 + R() * 0.45;
    pts.push(new THREE.Vector2(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k));
  }
  return pts;
}

// 崩れた尖頭窓の破れ目（外周の遠景用）
function breachOutline(w, y0, y1, R) {
  const pts = [], n = 22;
  for (let i = 0; i <= n; i++) {
    const t = 1 - (i / n) * 2, y = y0 + 1.2 + (y1 - y0 - 1.2) * pointedArch(t, 0.5);
    const j = (R() - 0.5) * 0.35 * (0.4 + Math.abs(t));
    pts.push(new THREE.Vector2(t * w / 2 + j * 0.5, y + j));
  }
  // 下辺はぎざぎざに崩れる
  for (let i = 1; i < 6; i++) pts.push(new THREE.Vector2(-w / 2 + (i / 6) * w + (R() - 0.5) * 0.2, y0 + R() * 0.35));
  return pts.reverse();
}

export function buildB5V6Architecture({ a, ch, wallCell, hash, CELL = 4, M, bucket, heights, breachFaces = new Set(), openFaces = new Set(), collapse = 0.1, high = true, holy = () => false, roseAt = null }) {
  const openCells = new Set([...openFaces].map(k => k.split(',').slice(0, 2).join(',')));
  const faces = [], piers = [], collapsed = [], floorCells = [];
  const walk = (x, y) => x >= 0 && y >= 0 && x < a.w && y < a.h && !wallCell(x, y);
  const H = (tx, ty) => heights(tx, ty);   // {spring, apex}
  const wx = (o = {}) => ({ seed: 3, ...o });

  // ---------------------------------------------------------------- A5 床
  for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
    if (!walk(tx, ty)) continue;
    if (ch(tx, ty) === '>') { floorCells.push({ tx, ty, x: tx * CELL, z: ty * CELL, stairwell: true }); continue; }   // 下り階段の吹き抜け（床は抜く）
    const x = tx * CELL, z = ty * CELL, seg = high ? 8 : 4;
    const g = new THREE.PlaneGeometry(CELL + 0.04, CELL + 0.04, seg, seg).rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const gx = p.getX(i) + x, gz = p.getZ(i) + z;
      // 石畳の微妙な起伏と沈下
      p.setY(i, (fbm(gx * 0.45, 0, gz * 0.45, 3) - 0.5) * 0.06 - Math.pow(Math.max(0, fbm(gx * 0.2 + 7, 1, gz * 0.2, 2) - 0.62), 2) * 1.2);
    }
    g.translate(x, 0, z); g.computeVertexNormals();
    const region = fbm(tx * 0.23 + 11, 0, ty * 0.23, 2);
    if (holy(tx, ty)) bucket.add(g, M.marble, { wx: wx({ grime: 0, moss: 0, soot: 0, mottle: 0.12, seed: 5 }) });
    else bucket.add(g, region > 0.52 ? M.floor2 : M.floor, { wx: wx({ grime: 0.05, moss: 0.12, soot: 0, mottle: 0.35, seed: 5 }) });
    floorCells.push({ tx, ty, x, z });
  }

  // ---------------------------------------------------------------- A2 全高壁
  for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
    if (!walk(tx, ty)) continue;
    const x = tx * CELL, z = ty * CELL, { spring, apex } = H(tx, ty), WH = apex + 0.4;
    DIRS.forEach(([dx, dz], di) => {
      if (walk(tx + dx, ty + dz)) return;
      const key = `${tx},${ty},${dx},${dz}`, R = rng(Math.floor(hash(tx * 7 + dx, ty * 7 + dz, 401) * 1e9));
      const breach = breachFaces.has(key) || openFaces.has(key), open = openFaces.has(key);
      const mat = faceMatrix(x, z, dx, dz);
      const shape = new THREE.Shape([new THREE.Vector2(-2.02, 0), new THREE.Vector2(2.02, 0), new THREE.Vector2(2.02, WH), new THREE.Vector2(-2.02, WH)]);
      const holes = [], backs = [];
      let variant = 'plain';
      if (open) {
        // 開廊：手すりの上が大きく開いたアーチ（奈落を見渡すバルコニー）
        variant = 'open';
        const ol = archOutline(3.5, spring + 0.3 - 0.95, Math.min(spring + 2.0, apex - 0.5) - 0.95, 20, 0.6).map(v => new THREE.Vector2(v.x, v.y + 0.95));
        holes.push(ol);
      } else if (breach) {
        variant = 'breach';
        const ol = breachOutline(3.25, 0.8, Math.min(spring + 1.4, 8.0), R);
        holes.push(ol);
      } else {
        const k = R();
        if (k < 0.55) {
          // ブラインドアーチ（壁の窪み）
          variant = 'arch';
          const w = 2.0 + R() * 0.4, sill = 0.95, h0 = 3.5, h1 = Math.min(spring - 0.25, 5.2);
          const ol = archOutline(w, h0 - sill, h1 - sill, 14, 0.6).map(v => new THREE.Vector2(v.x, v.y + sill));
          holes.push(ol); backs.push({ x0: -w / 2, x1: w / 2, y0: sill, y1: h1, mat: M.wall, depth: 0.5, arch: { w, sill, h0, h1 } });
        }
        // 欠け落ちた石（穴の奥に割石）
        const nd = holy(tx, ty) ? 0 : R() < 0.6 ? 1 + (R() < 0.35 ? 1 : 0) : 0;
        for (let i = 0; i < nd; i++) {
          for (let tries = 0; tries < 6; tries++) {
            const rx = 0.28 + R() * 0.45, ry = 0.22 + R() * 0.38;
            const cx = (R() - 0.5) * (4 - rx * 2 - 0.4), cy = 1.0 + ry + R() * (spring - 1.6 - ry * 2);
            const bb = { x0: cx - rx, x1: cx + rx, y0: cy - ry, y1: cy + ry };
            if (backs.some(b => b.x0 < bb.x1 + 0.15 && b.x1 > bb.x0 - 0.15 && b.y0 < bb.y1 + 0.15 && b.y1 > bb.y0 - 0.15)) continue;
            holes.push(jaggedHole(cx, cy, rx, ry, R, 7 + Math.floor(R() * 3)));
            backs.push({ ...bb, mat: M.rubble, depth: 0.34 });
            break;
          }
        }
      }
      shape.holes = holes.map(h => new THREE.Path(h));
      const depth = breach ? 1.6 : backs.some(b => b.arch) ? 0.5 : 0.34;
      const slab = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 12 });
      slab.translate(0, 0, -depth);
      const H0 = holy(tx, ty), wallM = H0 ? M.holyWall : M.wall;
      bucket.add(slab, wallM, { matrix: mat, wx: wx(H0 ? { grime: 0.4, soot: 0.15, moss: 0, seed: 7 } : { grime: 1.1, soot: 0.35, moss: 0.18, seed: 7 }) });
      // 窪み・欠けの奥の面
      for (const b of backs) {
        const pg = new THREE.PlaneGeometry(b.x1 - b.x0 + 0.1, b.y1 - b.y0 + 0.1, 6, 6);
        pg.translate((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, -b.depth + 0.005);
        if (b.mat === M.rubble) { pg.computeVertexNormals(); chip(pg, 0.06, 3.5, R() * 10); }
        bucket.add(pg, b.mat, { matrix: mat, wx: wx({ grime: 1.2, soot: 0.6, moss: 0.25, base: b.arch ? 0.55 : 0.6, seed: 9 }) });
        if (b.arch) {
          // アーチ枠の繰形
          const pts = archOutline(b.arch.w + 0.02, b.arch.h0 - b.arch.sill, b.arch.h1 - b.arch.sill, 18, 0.6).slice(2)
            .map(v => new THREE.Vector3(v.x, v.y + b.arch.sill, 0.0));
          pts.unshift(new THREE.Vector3(b.arch.w / 2 + 0.01, b.arch.sill, 0)); pts.push(new THREE.Vector3(-b.arch.w / 2 - 0.01, b.arch.sill, 0));
          const mould = sweep(pts, [[-0.05, 0], [-0.05, 0.12], [0.02, 0.2], [0.14, 0.2], [0.22, 0.12], [0.24, 0]], { up: new THREE.Vector3(0, 0, 1), closed: false, caps: false });
          bucket.add(mould, M.dressed, { matrix: mat, wx: wx({ grime: 1.0, soot: 0.4, moss: 0.15, seed: 11 }) });
          // 窪みの下の台（祭壇棚）
          const shelf = new THREE.BoxGeometry(b.arch.w + 0.3, 0.14, 0.5, 6, 1, 2).translate(0, b.arch.sill - 0.07, -0.12);
          chip(shelf, 0.025, 4, R() * 9);
          bucket.add(shelf, M.dressed, { matrix: mat, wx: wx({ grime: 1.0, soot: 0.3, moss: 0.3, seed: 12 }) });
        }
      }
      if (open) {
        const bw = 3.5, gap = R() < 0.6 ? (R() - 0.5) * 2.2 : null;
        bucket.add(new THREE.BoxGeometry(bw + 0.2, 0.2, 0.5, 6, 1, 1).translate(0, 0.1, -0.15), M.dressed, { matrix: mat, wx: wx({ grime: 0.6, moss: 0.4, seed: 19 }) });
        for (const [x0, x1] of gap === null ? [[-bw / 2, bw / 2]] : [[-bw / 2, gap - 0.4], [gap + 0.4, bw / 2]]) {
          if (x1 - x0 < 0.3) continue;
          bucket.add(new THREE.BoxGeometry(x1 - x0, 0.14, 0.46, 4, 1, 1).translate((x0 + x1) / 2, 0.95, -0.15), M.dressed, { matrix: mat, wx: wx({ grime: 0, soot: 0.3, moss: 0.3, seed: 20 }) });
          for (let bx = x0 + 0.15; bx < x1 - 0.1; bx += 0.3) bucket.add(lathe([[0, 0], [0.08, 0], [0.1, 0.14], [0.06, 0.36], [0.1, 0.58], [0.07, 0.75], [0, 0.75]], 8).translate(bx, 0.2, -0.15), M.dressed, { matrix: mat, wx: wx({ grime: 0.3, moss: 0.3, seed: 21 }) });
        }
        // 外側の張り出し（崩れた縁）と、奈落へ落ちる外壁
        const ledge = new THREE.BoxGeometry(4.0, 0.5, 1.8, 8, 1, 4).translate(0, -0.25, -2.4); chip(ledge, 0.12, 1.5, R() * 9);
        bucket.add(ledge, M.wall, { matrix: mat, wx: wx({ grime: 0, moss: 0.4, seed: 22 }) });
        const cliff = new THREE.BoxGeometry(4.04, 36, 0.6, 2, 18, 1).translate(0, -18.4, -3.1); chip(cliff, 0.25, 0.6, R() * 9);
        bucket.add(cliff, M.wall, { matrix: mat, wx: wx({ grime: 0, soot: 0.6, base: 0.6, floorY: -36, seed: 23 }) });
      }
      // 台座の繰形（ときどき欠ける）
      const plinthGap = !breach && R() < 0.35 ? { c: (R() - 0.5) * 2.4, w: 0.5 + R() * 0.7 } : null;
      const spans = plinthGap ? [[-2.02, plinthGap.c - plinthGap.w / 2], [plinthGap.c + plinthGap.w / 2, 2.02]] : [[-2.02, 2.02]];
      if (!breach) for (const [x0, x1] of spans) {
        if (x1 - x0 < 0.2) continue;
        const n = Math.max(2, Math.round((x1 - x0) * 3));
        const pts = Array.from({ length: n + 1 }, (_, i) => new THREE.Vector3(x0 + (x1 - x0) * i / n, 0, 0));
        const pl = sweep(pts, PROFILES.plinth.slice().reverse(), {});
        chip(pl, 0.02, 3, R() * 7);
        bucket.add(pl, M.dressed, { matrix: mat, wx: wx({ grime: 0.9, soot: 0.15, moss: 0.35, seed: 13 }) });
      }
      // 帯状の繰形（起拱点の下）
      {
        const y = spring - 0.35, gap = !breach && R() < 0.25 ? (R() - 0.5) * 2.6 : null;
        const sp = gap === null ? [[-2.02, 2.02]] : [[-2.02, gap - 0.35], [gap + 0.35, 2.02]];
        for (const [x0, x1] of sp) {
          const pts = [new THREE.Vector3(x0, y, 0), new THREE.Vector3((x0 + x1) / 2, y, 0), new THREE.Vector3(x1, y, 0)];
          const sc = sweep(pts, PROFILES.stringCourse.slice().reverse(), {});
          bucket.add(sc, M.dressed, { matrix: mat, wx: wx({ grime: 0, soot: 0.5, moss: 0.05, seed: 14 }) });
        }
      }
      // 大聖堂（高い身廊）の壁：上部に光るステンドグラスの尖頭窓
      let win = null;
      if (!breach && apex > 12) {
        const w = 2.3, y0 = 6.6, y1 = Math.min(apex - 1.6, 14.0);
        const ol = archOutline(w, 5.2, y1 - y0, 18, 0.6);
        const sh = new THREE.Shape(ol); const pg = new THREE.ShapeGeometry(sh, 12);
        const isRose = roseAt && roseAt[0] === tx && roseAt[1] === ty && roseAt[2] === dx && roseAt[3] === dz;
        const uv = pg.attributes.uv, pp = pg.attributes.position; for (let i = 0; i < pp.count; i++) uv.setXY(i, pp.getX(i) / w + 0.5, pp.getY(i) / (y1 - y0));
        pg.translate(0, y0, 0.035);
        if (!isRose) bucket.add(pg, holy(tx, ty) ? M.glassGold : M.glass, { matrix: mat, uv: 'keep', wx: false });
        // 枠・方立て（2 本）・円の狭間飾り
        const frame = archOutline(w + 0.04, 5.2, y1 - y0, 20, 0.6).slice(2).map(v => new THREE.Vector3(v.x, v.y + y0, 0.04));
        frame.unshift(new THREE.Vector3(w / 2 + 0.02, y0, 0.04)); frame.push(new THREE.Vector3(-w / 2 - 0.02, y0, 0.04));
        bucket.add(sweep(frame, [[-0.06, 0], [-0.06, 0.12], [0.02, 0.2], [0.14, 0.2], [0.2, 0.1], [0.2, 0]], { up: new THREE.Vector3(0, 0, 1), closed: false, caps: false }), M.dressed, { matrix: mat, wx: wx({ grime: 0, soot: 0.6, moss: 0.05, floorY: y0 - 6, seed: 15 }) });
        for (const mx of [-w / 6, w / 6]) bucket.add(new THREE.BoxGeometry(0.07, 5.0, 0.09).translate(mx, y0 + 2.5, 0.06), M.dressed, { matrix: mat, wx: wx({ grime: 0, soot: 0.6, floorY: y0 - 6, seed: 16 }) });
        bucket.add(new THREE.TorusGeometry(0.42, 0.045, 6, 24).translate(0, y1 - 1.05, 0.07), M.dressed, { matrix: mat, wx: wx({ grime: 0, soot: 0.6, floorY: y0 - 6, seed: 17 }) });
        bucket.add(new THREE.BoxGeometry(w + 0.4, 0.16, 0.36, 4, 1, 1).translate(0, y0 - 0.08, 0.12), M.dressed, { matrix: mat, wx: wx({ grime: 0, soot: 0.4, floorY: y0 - 6, seed: 18 }) });
        win = { center: new THREE.Vector3(0, (y0 + y1) / 2, 0.1).applyMatrix4(mat), y0, y1, holy: holy(tx, ty) };
        if (isRose) {
          // 玉座の真上の薔薇窓：円の色ガラスと、放射状の狭間飾り（金）
          const rc = new THREE.Vector3(0, y1 - 2.4, 0), R0 = 1.95;
          const disc = new THREE.CircleGeometry(R0, 48); const du = disc.attributes.uv, dp = disc.attributes.position;
          for (let i = 0; i < dp.count; i++) du.setXY(i, dp.getX(i) / (R0 * 2) + 0.5, dp.getY(i) / (R0 * 2) + 0.5);
          disc.translate(rc.x, rc.y, 0.05); bucket.add(disc, M.rose, { matrix: mat, uv: 'keep', wx: false });
          for (const rr of [0.45, 1.15, R0]) bucket.add(new THREE.TorusGeometry(rr, rr === R0 ? 0.12 : 0.05, 6, 48).translate(rc.x, rc.y, 0.1), M.gold, { matrix: mat, wx: false });
          for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; bucket.add(new THREE.BoxGeometry(0.05, R0 - 0.45, 0.06).translate(0, 0.45 + (R0 - 0.45) / 2, 0).rotateZ(a).translate(rc.x, rc.y, 0.1), M.gold, { matrix: mat, wx: false }); }
          win.rose = new THREE.Vector3(rc.x, rc.y, 0.2).applyMatrix4(mat);
          // 下半分のランセット 2 つ（金のガラス）
          for (const lx of [-0.62, 0.62]) { const lg = new THREE.ShapeGeometry(new THREE.Shape(archOutline(0.9, 2.6, 3.4, 12, 0.6)), 8); const lu = lg.attributes.uv, lp = lg.attributes.position; for (let i = 0; i < lp.count; i++) lu.setXY(i, lp.getX(i) / 0.9 + 0.5, lp.getY(i) / 3.4); lg.translate(lx, y0, 0.05); bucket.add(lg, M.glassGold, { matrix: mat, uv: 'keep', wx: false }); }
        }
      }
      const world = new THREE.Vector3(x + dx * 2, 0, z + dz * 2);
      faces.push({ win, tx, ty, dx, dz, key, variant, world, normal: new THREE.Vector3(-dx, 0, -dz), matrix: mat, spring, apex,
        plinthGap: plinthGap ? new THREE.Vector3(plinthGap.c, 0, 0.2).applyMatrix4(mat) : null, seed: R() });
    });
  }

  // ---------------------------------------------------------------- A3 束ね柱（格子点）
  const pierBase = lathe([[0, 0], [0.64, 0], [0.64, 0.38], [0.58, 0.46], [0.52, 0.5], [0.52, 0.62], [0.46, 0.7], [0, 0.7]], 8);
  for (let vy = 0; vy <= a.h; vy++) for (let vx = 0; vx <= a.w; vx++) {
    const cells = [[vx - 1, vy - 1], [vx, vy - 1], [vx - 1, vy], [vx, vy]];
    const w = cells.filter(([x, y]) => walk(x, y));
    if (!w.length || w.length === 4) {
      // 4 マスとも通路：大広間の独立柱（ときどき）
      // 広い場所の独立柱は、普通の床（. * ,）に囲まれたときだけ（開始地点・安全地帯・広間の中央には立てない）
      if (w.length === 4 && hash(vx, vy, 431) < 0.35 && cells.every(([x, y]) => '.*,'.includes(ch(x, y)))) {} else continue;
    }
    const px = (vx - 0.5) * CELL, pz = (vy - 0.5) * CELL;
    const hs = w.map(([x, y]) => H(x, y)), spring = Math.min(...hs.map(h => h.spring)), top = spring - 0.15;
    const R = rng(Math.floor(hash(vx, vy, 433) * 1e9));
    const broken = R() < 0.18;
    const T = new THREE.Matrix4().makeTranslation(px, 0, pz);
    bucket.add(pierBase.clone(), M.dressed, { matrix: T, wx: wx({ grime: 0.9, moss: 0.4, soot: 0.1, seed: 21 }) });
    // 芯
    const core = new THREE.CylinderGeometry(0.3, 0.32, top - 0.7 - 0.45, 8, high ? 10 : 4).translate(0, 0.7 + (top - 0.7 - 0.45) / 2, 0);
    core.computeVertexNormals(); chip(core, 0.02, 2.5, R() * 9);
    bucket.add(core, M.dressed, { matrix: T, wx: wx({ grime: 1.0, soot: 0.4, moss: 0.2, seed: 22, joints: 0.66 }) });
    // 細柱 8 本
    for (let i = 0; i < 8; i++) {
      const ang = i * Math.PI / 4 + Math.PI / 8 * 0, r = i % 2 ? 0.37 : 0.35, rad = i % 2 ? 0.08 : 0.12;
      const sx = Math.cos(ang) * r, sz = Math.sin(ang) * r;
      const h0 = 0.7, h1 = top - 0.45;
      if (broken && i === Math.floor(R() * 8)) {
        // 途中で折れた細柱
        const cut = h0 + (h1 - h0) * (0.25 + R() * 0.4);
        const s1 = new THREE.CylinderGeometry(rad, rad, cut - h0, 8, 3).translate(sx, (h0 + cut) / 2, sz);
        const s2 = new THREE.CylinderGeometry(rad, rad, h1 - cut - 0.6, 8, 3).translate(sx, (cut + 0.6 + h1) / 2, sz);
        for (const s of [s1, s2]) { s.computeVertexNormals(); chip(s, 0.03, 6, R() * 9); bucket.add(s, M.dressed, { matrix: T, wx: wx({ grime: 1, soot: 0.4, moss: 0.2, seed: 23 }) }); }
        continue;
      }
      const sh = new THREE.CylinderGeometry(rad, rad, h1 - h0, 10, 1).translate(sx, (h0 + h1) / 2, sz);
      bucket.add(sh, M.dressed, { matrix: T, wx: wx({ grime: 1.0, soot: 0.4, moss: 0.2, seed: 23, joints: 0.66 }) });
    }
    // 中ほどの環（アニュレット）と柱頭
    const ring = lathe([[0, 0], [0.47, 0], [0.5, 0.05], [0.47, 0.1], [0, 0.1]], 8).translate(0, 0.7 + (top - 1.15) * 0.48, 0);
    const cap = lathe([[0, 0], [0.42, 0], [0.47, 0.08], [0.52, 0.2], [0.6, 0.3], [0.66, 0.36], [0.66, 0.45], [0, 0.45]], 8).translate(0, top - 0.45, 0);
    const holyPier = w.some(([x, y]) => holy(x, y));
    for (const c of [ring, cap]) bucket.add(c, holyPier ? M.gold : M.dressed, { matrix: T, wx: holyPier ? false : wx({ grime: 0, soot: 0.6, moss: 0.1, seed: 24, edgeAO: 0.6 }) });
    piers.push({ vx, vy, x: px, z: pz, top, broken, free: w.length === 4 });
  }

  // ---------------------------------------------------------------- A4 リブ・ヴォールト
  const edgeDone = new Set();
  const N = high ? 18 : 10;
  for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
    if (!walk(tx, ty)) continue;
    const x = tx * CELL, z = ty * CELL, { spring, apex } = H(tx, ty), rise = apex - spring;
    const ch0 = ch(tx, ty);
    const cR = rng(Math.floor(hash(tx, ty, 451) * 1e9));
    const openCell = openCells.has(tx + ',' + ty);
    const isCollapsed = openCell || (collapse > 0 && !holy(tx, ty) && ch0 !== '<' && ch0 !== '>' && hash(tx, ty, 452) < collapse);
    const holeR = openCell ? 0.85 + cR() * 0.15 : 0.55 + cR() * 0.25, hcx = (cR() - 0.5) * 0.4, hcz = (cR() - 0.5) * 0.4;
    const inHole = (u, v) => {
      if (!isCollapsed) return false;
      const du = u - hcx, dv = v - hcz, ang = Math.atan2(dv, du);
      return Math.hypot(du, dv) < holeR * (0.7 + 0.55 * fbm(Math.cos(ang) * 2 + tx, Math.sin(ang) * 2 + ty, 3, 3));
    };
    const surfH = (u, v) => spring + rise * Math.max(pointedArch(u), pointedArch(v));
    // 天井面（下向き）。穴の三角形は捨てる
    const pos = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const u0 = -1 + 2 * i / N, u1 = -1 + 2 * (i + 1) / N, v0 = -1 + 2 * j / N, v1 = -1 + 2 * (j + 1) / N;
      const P = (u, v) => [x + u * 2.02, surfH(u, v), z + v * 2.02];
      // 対角の折れ線（グロイン）に合わせて三角形の分割方向を変える
      const flip = (u0 + u1) * (v0 + v1) > 0;
      const tris = flip ? [[[u0, v0], [u1, v1], [u1, v0]], [[u0, v0], [u0, v1], [u1, v1]]] : [[[u0, v0], [u0, v1], [u1, v0]], [[u1, v0], [u0, v1], [u1, v1]]];
      for (const tri of tris) {
        if (tri.every(([u, v]) => inHole(u, v))) continue;
        if (inHole((tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][1] + tri[1][1] + tri[2][1]) / 3)) continue;
        for (const [u, v] of tri) pos.push(...P(u, v));
      }
    }
    const vg = new THREE.BufferGeometry(); vg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); vg.computeVertexNormals();
    // 法線が下を向くよう確認（上向きなら三角形を反転）
    const nA = vg.attributes.normal; let sumY = 0; for (let i = 0; i < nA.count; i++) sumY += nA.getY(i);
    if (sumY > 0) { const p = vg.attributes.position; for (let i = 0; i < p.count; i += 3) { const t = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)]; p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)); p.setXYZ(i + 2, ...t); } vg.computeVertexNormals(); }
    bucket.add(vg, M.wall, { wx: wx({ grime: 0, soot: 0.9, moss: 0.05, base: 0.8, floorY: spring - 6, seed: 31 }) });
    // 対角リブ（穴のところで折れる）
    const ribProf = [[-0.06, -0.12], [0.12, -0.13], [0.22, -0.07], [0.26, 0], [0.22, 0.07], [0.12, 0.13], [-0.06, 0.12]];
    for (const sgn of [1, -1]) {
      const D = new THREE.Vector3(1, 0, sgn).normalize(), Nrm = new THREE.Vector3().crossVectors(D, new THREE.Vector3(0, 1, 0));
      let run = [];
      const flush = () => { if (run.length > 2) bucket.add(sweep(run, ribProf, { up: Nrm, closed: true }), M.dressed, { wx: wx({ grime: 0, soot: 0.7, moss: 0.05, floorY: spring - 6, seed: 32 }) }); run = []; };
      for (let i = 0; i <= 24; i++) {
        const s = -0.98 + 1.96 * i / 24, u = s, v = s * sgn;
        if (inHole(u, v)) { flush(); continue; }
        run.push(new THREE.Vector3(x + u * 2, surfH(u, v) + 0.02, z + v * 2));
      }
      flush();
    }
    // 頂部の要石（崩落していなければ）
    if (!inHole(0, 0)) {
      const boss = lathe([[0, 0], [0.26, 0], [0.3, -0.08], [0.24, -0.18], [0.12, -0.24], [0, -0.26]], 10).translate(x, apex - 0.02, z);
      bucket.add(boss, M.dressed, { wx: wx({ grime: 0, soot: 0.5, moss: 0, floorY: spring - 6, seed: 33 }) });
    }
    // 辺のリブ（横断アーチ／壁付きアーチ）。隣のマスと共有
    DIRS.forEach(([dx, dz]) => {
      const ek = dx + dz > 0 ? `${tx},${ty},${dx},${dz}` : `${tx + dx},${ty + dz},${-dx},${-dz}`;
      if (edgeDone.has(ek)) return; edgeDone.add(ek);
      const ex = x + dx * 2, ez = z + dz * 2, along = new THREE.Vector3(dz !== 0 ? 1 : 0, 0, dx !== 0 ? 1 : 0);
      const Nrm = new THREE.Vector3().crossVectors(along, new THREE.Vector3(0, 1, 0));
      const other = walk(tx + dx, ty + dz) ? H(tx + dx, ty + dz) : null;
      const lowSpring = other ? Math.min(spring, other.spring) : spring, lowApex = other ? Math.min(apex, other.apex) : apex;
      const pts = [];
      for (let i = 0; i <= 20; i++) { const t = -1 + 2 * i / 20; pts.push(new THREE.Vector3(ex + along.x * t * 2, lowSpring + (lowApex - lowSpring) * pointedArch(t) + 0.02, ez + along.z * t * 2)); }
      const wide = other ? 1.5 : 1.0;   // 横断アーチは太く
      bucket.add(sweep(pts, ribProf.map(([r, w]) => [r * wide, w * wide]), { up: Nrm, closed: true }), M.dressed, { wx: wx({ grime: 0, soot: 0.6, moss: 0.05, floorY: lowSpring - 6, seed: 34 }) });
      // 高さの違うマスの境：低い側のアーチの上を壁で埋める
      if (other && (other.apex !== apex)) {
        const hiApex = Math.max(apex, other.apex) + 0.4;
        const sh = new THREE.Shape([new THREE.Vector2(-2.02, 0), new THREE.Vector2(2.02, 0), new THREE.Vector2(2.02, hiApex), new THREE.Vector2(-2.02, hiApex)]);
        sh.holes = [new THREE.Path(archOutline(4.0, lowSpring, lowApex, 20, 0.55))];
        const hg = new THREE.ExtrudeGeometry(sh, { depth: 0.8, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -0.4);
        const m = new THREE.Matrix4().makeRotationY(dx !== 0 ? Math.PI / 2 : 0); m.setPosition(ex, 0, ez);
        bucket.add(hg, M.wall, { matrix: m, wx: wx({ grime: 0, soot: 0.7, moss: 0.05, seed: 35 }) });
      }
    });
    if (isCollapsed) collapsed.push({ tx, ty, x: x + hcx * 2, z: z + hcz * 2, r: holeR * 2, apex });
  }
  return { faces, piers, collapsed, floorCells };
}
