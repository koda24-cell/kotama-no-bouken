/* 第5階層「魔王城・回廊」の見た目専用レイヤー（V5 遠景・瘴気・照明の統合）。
 * マップ・通行判定・物の判定には一切触れない。field-3d-b4-b5-map.js の第5階層分岐からのみ呼ぶ。
 * - 床・壁の石材テクスチャ（目地・面取り・ラフネス差で淡い反射）
 * - 胸壁の笠石、広間の胴蛇腹・幅木、小物の台座（壁マスの小物が宙に浮かないように）
 * - 燭台（既存の点光源プールに登録）、カメラ追従の補助光、リムライト
 * - V5 遠景（窓光・紫の瘴気・閃光）と魔力の火の粉、通路脇の瘴気（高画質のみ）
 * - 出口マーカーを第5階層用の石の門に置き換え（第1階層の根のアーチを使わない）
 * build() ごとのものは clear() で、テーマ寿命のテクスチャ・材質は dispose() で解放する。 */
import * as THREE from 'three';
import { createB5DistantFogBackground } from './b5-distant-fog-background.js';
import { createB5ArcaneSparks, createB5PathEdgeMist } from './b5-vfx-presets.js';

function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; }; }

// 石積み（敷石・切石）を手続き的に描く。色・ラフネス・高さの3枚を同じ配置で作る。
function masonry({ w, h, rows, stoneW, base, seed, grout = 2.6, bevel = 9, cracks = 0 }) {
  const r = rng(seed), canvases = ['color', 'rough', 'bump'].map(() => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  });
  const ctxs = canvases.map(c => c.getContext('2d'));
  if (ctxs.some(c => !c)) return null;
  const rowList = []; let y = 0;
  for (let i = 0; i < rows.length; i++) { rowList.push([y, rows[i]]); y += rows[i]; }
  const rowStones = rowList.map(() => {
    const xs = [], tones = []; let x = 0;
    while (x < w) {
      let sw = stoneW[0] + r() * (stoneW[1] - stoneW[0]);
      if (w - x - sw < stoneW[0] * 0.6) sw = w - x;
      xs.push(x); tones.push(0.78 + r() * 0.36); x += sw;
    }
    xs.push(w);
    return { xs, tones, off: Math.floor(r() * w), tint: r() };
  });
  const imgs = ctxs.map(c => c.createImageData(w, h));
  for (let py = 0; py < h; py++) {
    let ri = 0; while (ri < rowList.length - 1 && py >= rowList[ri + 1][0]) ri++;
    const [ry, rh] = rowList[ri], row = rowStones[ri], yy = py - ry;
    for (let px = 0; px < w; px++) {
      const sx = (px - row.off + w) % w;
      let si = 0; while (si < row.xs.length - 2 && sx >= row.xs[si + 1]) si++;
      const dx = Math.min(sx - row.xs[si], row.xs[si + 1] - sx), dy = Math.min(yy, rh - yy);
      const d = Math.min(dx, dy), i = (py * w + px) * 4;
      const grain = Math.sin(px * 1.37 + py * 2.11) * Math.cos(px * 0.77 - py * 1.53) * 0.5 + (Math.sin(px * 12.9898 + py * 78.233) * 43758.5453 % 1) * 0.5;
      const mottle = Math.sin(px * 0.045 + py * 0.031 + seed) * Math.cos(py * 0.052 - px * 0.02) * 0.08;
      let cr, cg, cb, rough, height;
      if (d < grout) {
        cr = 26; cg = 23; cb = 36; rough = 250; height = 18;
      } else {
        const t = Math.min(1, (d - grout) / bevel), edge = 0.7 + 0.3 * t;
        // 左上の縁を少し明るく、右下を暗くして面取りを読ませる
        const lit = (dy === yy && yy - grout < bevel) || (dx === sx - row.xs[si] && dx - grout < bevel) ? 1.06 : 0.95;
        const tone = row.tones[si] * edge * (t < 1 ? lit : 1) * (1 + mottle + grain * 0.07);
        const warm = (row.tint + si * 0.37) % 1 < 0.2 ? 1.06 : 1;
        cr = base[0] * tone * warm; cg = base[1] * tone; cb = base[2] * tone / warm;
        rough = 92 + Math.abs(grain) * 46 + (1 - t) * 40; height = 70 + 160 * t + grain * 12;
      }
      imgs[0].data[i] = cr; imgs[0].data[i + 1] = cg; imgs[0].data[i + 2] = cb; imgs[0].data[i + 3] = 255;
      imgs[1].data[i] = imgs[1].data[i + 1] = imgs[1].data[i + 2] = rough; imgs[1].data[i + 3] = 255;
      imgs[2].data[i] = imgs[2].data[i + 1] = imgs[2].data[i + 2] = height; imgs[2].data[i + 3] = 255;
    }
  }
  imgs.forEach((img, k) => ctxs[k].putImageData(img, 0, 0));
  // 細いひび（色と高さだけ）
  for (let k = 0; k < cracks; k++) {
    let x = r() * w, cy = r() * h; const pts = [[x, cy]];
    for (let s = 0; s < 6; s++) { x += (r() - 0.3) * w * 0.06; cy += (r() - 0.5) * h * 0.06; pts.push([x, cy]); }
    for (const [ctx, style] of [[ctxs[0], 'rgba(18,14,26,0.75)'], [ctxs[2], 'rgba(30,30,30,0.9)']]) {
      ctx.strokeStyle = style; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(...pts[0]);
      pts.slice(1).forEach(p => ctx.lineTo(...p)); ctx.stroke();
    }
  }
  return canvases.map((c, k) => {
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    if (k === 0) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d'); if (!ctx) return null;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, inner); grad.addColorStop(0.35, outer); grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function portalTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const ctx = c.getContext('2d'); if (!ctx) return null;
  const grad = ctx.createRadialGradient(32, 80, 4, 32, 70, 70);
  grad.addColorStop(0, 'rgba(10,4,22,0.96)'); grad.addColorStop(0.55, 'rgba(46,16,84,0.9)'); grad.addColorStop(1, 'rgba(150,90,255,0.75)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createB5Look({ g, mat }) {
  const high = !!g.high;
  // ---- テーマ寿命の資源 ----
  const textures = [], materials = [], geometries = [];
  const keepT = t => (t && textures.push(t), t), keepM = m => (materials.push(m), m), keepG = x => (geometries.push(x), x);
  const floorTex = masonry({ w: 512, h: 512, rows: [118, 136, 128, 130], stoneW: [92, 176], base: [128, 121, 148], seed: 5151, cracks: 5 }) || [];
  floorTex.forEach(keepT);
  const wallTex = masonry({ w: 512, h: 128, rows: [64, 64], stoneW: [96, 168], base: [118, 110, 140], seed: 5252, bevel: 7 }) || [];
  wallTex.forEach(keepT);
  // 広間の高い壁（約4m×14.7m）：1.05m間隔の14段
  const tallTex = masonry({ w: 256, h: 1022, rows: Array(14).fill(73), stoneW: [58, 104], base: [112, 102, 128], seed: 5353, grout: 2, bevel: 6 }) || [];
  tallTex.forEach(keepT);
  const surface = (tex, opts) => keepM(new THREE.MeshStandardMaterial({ map: tex[0] || null, roughnessMap: tex[1] || null, bumpMap: tex[2] || null, ...opts }));
  const M = {
    floor: surface(floorTex, { color: 0xa49dc0, roughness: 0.92, bumpScale: 2.4 }),
    wall: surface(wallTex, { color: 0x938cb0, roughness: 1, bumpScale: 1.8 }),
    tall: surface(tallTex, { color: 0x8a82a6, roughness: 1, bumpScale: 1.6 }),
    cap: keepM(new THREE.MeshStandardMaterial({ color: 0xa79fc6, roughness: 0.62, map: wallTex[0] || null })),
    trim: keepM(new THREE.MeshStandardMaterial({ color: 0x6e6590, roughness: 0.7 })),
    iron: keepM(new THREE.MeshStandardMaterial({ color: 0x3b3546, roughness: 0.45, metalness: 0.7 })),
    wax: keepM(new THREE.MeshStandardMaterial({ color: 0xf0dcc0, emissive: 0x9a5a24, emissiveIntensity: 0.55, roughness: 0.6 })),
    gateStone: keepM(new THREE.MeshStandardMaterial({ color: 0x8c84ab, roughness: 0.8, map: wallTex[0] || null, bumpMap: wallTex[2] || null, bumpScale: 1.2 })),
    portal: keepM(new THREE.MeshBasicMaterial({ map: keepT(portalTexture()), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false })),
    rune: keepM(new THREE.MeshBasicMaterial({ color: 0xb48cff, fog: false }))
  };
  const flameTex = keepT(glowTexture('rgba(255,244,214,1)', 'rgba(255,140,52,0.75)'));
  const haloTex = keepT(glowTexture('rgba(255,170,90,0.55)', 'rgba(170,70,40,0.16)'));
  const G = {
    cap: keepG(new THREE.BoxGeometry(4.18, 0.14, 0.86)),
    course: keepG(new THREE.BoxGeometry(4.16, 0.24, 0.82)),
    skirting: keepG(new THREE.BoxGeometry(4.14, 0.5, 0.8)),
    plinth: keepG(new THREE.BoxGeometry(3.7, 0.6, 3.7)),
    standBase: keepG(new THREE.CylinderGeometry(0.1, 0.15, 0.08, 8)),
    stem: keepG(new THREE.CylinderGeometry(0.025, 0.035, 0.56, 6)),
    bar: keepG(new THREE.BoxGeometry(0.5, 0.035, 0.035)),
    candle: keepG(new THREE.CylinderGeometry(0.032, 0.036, 0.15, 6)),
    bracket: keepG(new THREE.BoxGeometry(0.08, 0.08, 0.42)),
    pillar: keepG(new THREE.BoxGeometry(0.62, 3.5, 0.62)),
    pillarBase: keepG(new THREE.BoxGeometry(0.9, 0.32, 0.9)),
    lintel: keepG(new THREE.BoxGeometry(3.7, 0.5, 0.78)),
    portal: keepG(new THREE.PlaneGeometry(2.3, 3.15)),
    runeBar: keepG(new THREE.BoxGeometry(2.3, 0.04, 0.04))
  };
  // ---- build() ごとの資源 ----
  let fx = null, owned = [], poolLights = [], fog = null, sparks = null, mist = null;
  let lantern = null, spot = null, flames = null, halos = null, flameGeo = null, rim = null, stats = null;
  const fwd = new THREE.Vector3();

  function addPool(x, y, z, color, intensity, range) {
    const L = { world: new THREE.Vector3(x, y, z), color, intensity, range, off: false };
    g.lights.push(L); poolLights.push(L);
  }

  function build({ root, a, ch, wallCell, hash, CELL, hall, dressingInfo }) {
    clear();
    stats = { floors: 0, parapets: 0, tallWalls: 0, caps: 0, candles: 0, plinths: 0, exitGates: 0, windowTexture: 'procedural', edgeMist: high };
    const add = (geo, material, x, y, z, ry = 0, parent = root) => {
      const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m;
    };
    const tile = v => Math.round(v / CELL);
    const faces = [];
    // 地図から作られた床・壁の材質だけを第5階層専用に差し替える（形・位置は変えない）
    for (const m of [...root.children]) {
      if (!m.isMesh) continue;
      if (m.material === mat.floor) { m.material = M.floor; stats.floors++; continue; }
      if (m.material !== mat.wall) continue;
      const tall = m.scale.y > 1;
      m.material = tall ? M.tall : M.wall;
      const ry = m.rotation.y, nx = Math.sin(ry), nz = Math.cos(ry);
      // 通路側（開いているマス）の向きを調べる
      let side = 0;
      for (const s of [1, -1]) {
        const tx = tile(m.position.x + nx * s * 2), ty = tile(m.position.z + nz * s * 2);
        if (!wallCell(tx, ty)) { side = s; break; }
      }
      const top = m.position.y + 2.1 * m.scale.y;
      if (tall) {
        stats.tallWalls++;
        add(G.skirting, M.trim, m.position.x, 0.25, m.position.z, ry);
        add(G.course, M.trim, m.position.x, 3.9, m.position.z, ry);
        add(G.course, M.trim, m.position.x, 8.4, m.position.z, ry);
      } else {
        stats.parapets++;
        add(G.cap, M.cap, m.position.x, top + 0.07, m.position.z, ry); stats.caps++;
      }
      faces.push({ x: m.position.x, z: m.position.z, ry, nx: nx * side, nz: nz * side, tall, top: top + 0.14, side,
        rank: hash(tile(m.position.x * 2), tile(m.position.z * 2), 571) });
    }
    // 壁マスに置かれた小物の下に石の台座（壁マスには床がなく、宙に浮いて見えていた）
    for (const p of dressingInfo?.placements || []) {
      if (p.bottom !== 0) continue;
      const tx = tile(p.x), ty = tile(p.z);
      if (tx < 0 || ty < 0 || tx >= a.w || ty >= a.h || !wallCell(tx, ty)) continue;
      add(G.plinth, M.cap, tx * CELL, -0.3, ty * CELL); stats.plinths++;
    }
    // 燭台：通路に面した壁の上（胸壁）か、広間の壁の腕木に置く。物の近くは避ける。
    fx = new THREE.Group(); fx.name = 'b5:look-fx'; root.add(fx);
    const objNear = (x, z) => a.objects.some(o => Math.abs(o.tx * CELL - x) < CELL * 1.2 && Math.abs(o.ty * CELL - z) < CELL * 1.2);
    const picked = [];
    const candidates = faces.filter(f => f.side && !objNear(f.x, f.z)).sort((p, q) => p.rank - q.rank);
    const maxCandles = hall ? 14 : 20, spacing = hall ? 9 : 10;
    for (const f of candidates) {
      if (picked.some(p => Math.hypot(p.x - f.x, p.z - f.z) < spacing)) continue;
      picked.push(f); if (picked.length >= maxCandles) break;
    }
    const flamePos = [];
    for (const f of picked) {
      // 壁面から通路側へ少し出した位置
      const ox = f.x + f.nx * (f.tall ? 0.62 : 0.05), oz = f.z + f.nz * (f.tall ? 0.62 : 0.05);
      const baseY = f.tall ? 2.55 : f.top;
      if (f.tall) {
        const b = add(G.bracket, M.iron, f.x + f.nx * 0.45, baseY - 0.05, f.z + f.nz * 0.45, Math.atan2(f.nx, f.nz));
        b.rotation.y = Math.atan2(f.nx, f.nz);
      }
      add(G.standBase, M.iron, ox, baseY + 0.04, oz);
      add(G.stem, M.iron, ox, baseY + 0.36, oz);
      add(G.bar, M.iron, ox, baseY + 0.62, oz, f.ry);
      const lx = Math.cos(f.ry), lz = -Math.sin(f.ry);
      for (const k of [-1, 0, 1]) {
        const cx = ox + lx * k * 0.22, cz = oz + lz * k * 0.22, cy = baseY + 0.64 + (k ? 0 : 0.1) + 0.075;
        add(G.candle, M.wax, cx, cy, cz);
        flamePos.push(cx, cy + 0.13, cz);
      }
      addPool(ox, baseY + 0.9, oz, 0xffa45c, f.tall ? 2.6 : 2.2, f.tall ? 6 : 5);
      stats.candles++;
    }
    if (flamePos.length) {
      flameGeo = new THREE.BufferGeometry(); flameGeo.setAttribute('position', new THREE.Float32BufferAttribute(flamePos, 3));
      flames = new THREE.Points(flameGeo, new THREE.PointsMaterial({ map: flameTex, size: 0.22, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe2b0, fog: false }));
      halos = new THREE.Points(flameGeo, new THREE.PointsMaterial({ map: haloTex, size: 1.25, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffb070, opacity: 0.7, fog: true }));
      flames.name = 'b5:candle-flames'; halos.name = 'b5:candle-halos'; flames.frustumCulled = halos.frustumCulled = false;
      fx.add(halos, flames);
    }
    // カメラ追従の補助光（承認プレビューの faceFill を実ゲームへ）。既存の点光源プールとは別に2灯だけ。
    spot = new THREE.SpotLight(0xb9a8dd, hall ? 48 : 40, hall ? 28 : 23, Math.PI / 3.4, 0.78, 1.45);
    lantern = new THREE.PointLight(0xc6b4ff, 9, 13, 1.6);
    // リムライト：既存のキーライトと反対側から、壁の縁と柱の輪郭を拾う低い角度の寒色光
    rim = new THREE.DirectionalLight(0x8f7dff, hall ? 1.1 : 1.35);
    const cx = (a.w - 1) * CELL / 2, cz = (a.h - 1) * CELL / 2;
    rim.position.set(cx + 40, 14, cz - 34); rim.target.position.set(cx, 0, cz);
    fx.add(spot, spot.target, lantern, rim, rim.target);
    // V5 遠景・火の粉・瘴気（窓テクスチャは未昇格のため手続き的な窓光）
    fog = createB5DistantFogBackground({ width: 230, height: 135, seed: 514 });
    fog.mesh.name = 'b5:v5-distant-miasma'; fog.mesh.frustumCulled = false;
    sparks = createB5ArcaneSparks({ count: high ? 42 : 18 });
    fx.add(fog.mesh, sparks.points);
    if (high) { mist = createB5PathEdgeMist(); fx.add(mist.mesh); }
    owned.push(fog, sparks); if (mist) owned.push(mist);
  }

  // 出口（E）：第1階層の根のアーチを外し、背後の壁際に石の門を立てる。判定・位置情報（e.at）は変えない。
  function decorateExits({ entries, facing, DIR_VEC, CELL }) {
    if (!fx) return;
    for (const e of entries) {
      if (e.kind !== 'exit') continue;
      if (e.obj) { e.obj.parent?.remove(e.obj); for (const L of e.obj.userData?.lights || []) L.off = true; }
      const f = facing(e.o.tx, e.o.ty), [dx, dz] = DIR_VEC[f];
      const gate = new THREE.Group(); gate.name = 'b5:exit-gate';
      const x = e.o.tx * CELL - dx * 1.62, z = e.o.ty * CELL - dz * 1.62;
      gate.position.set(x, 0, z); gate.rotation.y = dx ? Math.PI / 2 : 0;
      const part = (geo, material, px, py, pz) => { const m = new THREE.Mesh(geo, material); m.position.set(px, py, pz); gate.add(m); return m; };
      for (const s of [-1, 1]) {
        part(G.pillarBase, M.gateStone, s * 1.48, 0.16, 0);
        part(G.pillar, M.gateStone, s * 1.48, 0.32 + 1.75, 0);
      }
      part(G.lintel, M.gateStone, 0, 4.07 + 0.25 - 0.25, 0);
      part(G.portal, M.portal, 0, 0.32 + 1.6, 0.05);
      part(G.runeBar, M.rune, 0, 3.55, 0.36);
      fx.add(gate); e.obj = gate;
      const lx = dx ? 0 : 1, lz = dx ? 1 : 0;
      for (const s of [-1, 1]) addPool(x + lx * s * 1.48 + dx * 0.6, 2.4, z + lz * s * 1.48 + dz * 0.6, 0xb48cff, 1.8, 5);
      stats.exitGates++;
    }
  }

  function tick(now) {
    if (!fx || !g.camera) return;
    const cam = g.camera, t = now * 0.001;
    fwd.set(0, 0, -1).applyQuaternion(cam.quaternion); fwd.y = 0; fwd.normalize();
    spot.position.copy(cam.position).addScaledVector(fwd, -0.8); spot.position.y += 2.6;
    spot.target.position.copy(cam.position).addScaledVector(fwd, 10); spot.target.position.y = 0.4;
    lantern.position.copy(cam.position).addScaledVector(fwd, -0.3); lantern.position.y += 0.55;
    lantern.intensity = 9 * (0.94 + 0.06 * Math.sin(t * 2.3));
    fog.mesh.position.copy(cam.position).addScaledVector(fwd, 90);
    fog.mesh.quaternion.copy(cam.quaternion);
    fog.update(t); sparks.update(t, cam.position); mist?.update(t, cam);
    if (flames) {
      flames.material.size = 0.22 * (0.9 + 0.1 * Math.sin(t * 11) + 0.05 * Math.sin(t * 23));
      halos.material.opacity = 0.62 + 0.08 * Math.sin(t * 7.3);
    }
  }

  function clear() {
    for (const L of poolLights) L.off = true;
    poolLights = [];
    owned.forEach(o => o.dispose()); owned = [];
    if (flames) { flames.material.dispose(); halos.material.dispose(); flameGeo.dispose(); }
    rim?.dispose(); spot?.dispose(); lantern?.dispose();
    fx?.removeFromParent();
    fx = null; fog = null; sparks = null; mist = null; flames = null; halos = null; flameGeo = null; rim = null; spot = null; lantern = null;
  }

  function dispose() {
    clear();
    geometries.forEach(x => x.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    geometries.length = materials.length = textures.length = 0;
  }

  return { build, decorateExits, tick, clear, dispose, info: () => stats };
}
