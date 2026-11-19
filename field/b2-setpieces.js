/* ============================================================
   field/b2-setpieces.js — 第2階層「凍てつく水源」の見せ場（v4・見せ場班 S）
   ------------------------------------------------------------
   担当：Claude。field/field-3d-b2-water.js から呼ばれ、見た目だけを作る（通行判定・マップ文字・イベントは変えない）。
   設計書：docs/3d/B2_V4_FEEDBACK_DESIGN.md（F2・F4・F5・F6・F8）
     F2 階段   ：第1階層の苔の石段をやめ、霜の付いた青い石と氷の段を手続きで作る。
                 上り階段は「立ち位置の背中側へ上る」、下り階段は「奥へ降りる」。背後が壁なら壁にアーチの口を開け、
                 その奥へ続くトンネル（側壁・天井・奥のほのかな光）を作る。
     F4 背景   ：大型モニュメント（古代の氷橋＝水路橋・水車の中庭）を外周壁の向こうの「背景の空洞」に置き、
                 外周壁を低くした窓（岩の柱で縁取ったアーチ）から正面全体を見せる。窓の壁の通行判定は壁のまま。
     F5 柱     ：色を周囲の青い岩に寄せ、上面と縁に霜（シェーダーで上向きの面を白く）。
                 必ずまとまり（遺跡群＝柱2〜3本＋梁＋倒れた柱＋瓦礫＋土台の石畳）で置く。単独の柱は置かない。
     F6 橋     ：古代の氷橋（ancient_ice_bridge_v02）の橋桁と欄干を、水路をまたぐ通り道の高さに架け、たもとに氷岸。
     F8 水門   ：水門を壁の塊の奥へ下げ、手前を入れない水面（水門から流れ出る水路）にし、土台を水と氷に沈め、
                 左右と上の岩に氷柱・霜を密集させる。プレイヤーは水際まで。
   迷宮班 M の新しい役割（tileRoles: bridge / setpiece-watergate / backdrop-slot、a.random.meta の階段の向き）は
   readRole / readMeta で読む（名前が変わっても1か所の差し替えで済む）。役割が無い間は地図から自分で探す。
   ============================================================ */

// 迷宮班 M の役割名（変わったらここだけ直す）
export const SP_ROLES = { bridge: 'bridge', watergate: 'setpiece-watergate', backdrop: 'backdrop-slot', hazard: 'water-hazard', vista: 'vista' };

export function createSetpieces(S) {
  const { THREE, CELL, CEIL_H, DIR_VEC, DIR_ORDER, FACE_YAW, hash, rnd, mats, proc, kit, M4, groundY, ceilY, mergeGeometries } = S;
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

  /* ---------------- 素材（霜の付いた青い石・石畳・トンネルの奥の光） ---------------- */
  // 上向きの面（と面取りされた縁）を霜の白にする。位置から決まる細かいむらで、白い塗りつぶしに見せない
  function frostify(base, key, amt = 0.85, lo = 0.42, hi = 0.86) {
    const m = base.clone();
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSpWN; varying vec3 vSpWP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSpWN = normalize(mat3(modelMatrix) * objectNormal); vSpWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSpWN; varying vec3 vSpWP;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          float spN = fract(sin(dot(floor(vSpWP.xz * 7.0 + vSpWP.y * 3.0), vec2(12.9898, 78.233))) * 43758.5453);
          float spN2 = fract(sin(dot(floor(vSpWP.xz * 2.3 - vSpWP.y * 1.7), vec2(39.346, 11.135))) * 24634.6345);
          float spUp = clamp(normalize(vSpWN).y, 0.0, 1.0);
          float spFrost = smoothstep(${lo.toFixed(2)}, ${hi.toFixed(2)}, spUp + (spN - 0.5) * 0.28 + (spN2 - 0.5) * 0.12) * ${amt.toFixed(2)};
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.80, 0.94, 1.0), spFrost);`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.035, 0.10, 0.14) * spFrost;');
    };
    m.customProgramCacheKey = () => 'b2spfrost:' + key;
    return m;
  }
  const rockM = mats['Deep cavern rock'], paleM = mats['Pale mineral stone'];
  const std = (o) => new THREE.MeshStandardMaterial(o);
  function ensureMats() {
    if (mats['sp:stairStone']) return;
    // 階段の石：周りの岩（0x74a8d4）より少し明るい青。凹凸は洞窟の岩と同じ法線
    mats['sp:stairStone'] = frostify(std({ color: 0x80b6de, map: rockM.map, normalMap: rockM.normalMap, normalScale: new THREE.Vector2(1.0, 1.0), roughness: 0.66, metalness: 0.0, emissive: 0x08304c, emissiveIntensity: 1.0, envMapIntensity: 0.7, vertexColors: true }), 'stair2', 0.62, 0.55, 0.9);
    // 側壁・トンネル：洞窟の岩そのもの（霜は少なめ）
    mats['sp:frostRock'] = frostify(rockM, 'rock', 0.55, 0.55, 0.92);
    // 土台の石畳・梁：淡い石に霜
    mats['sp:flag'] = frostify(std({ color: 0x8cc0e2, map: paleM.map, normalMap: rockM.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.6, emissive: 0x0a3550, emissiveIntensity: 1.0, envMapIntensity: 0.6, vertexColors: true }), 'flag', 0.75);
    // 階段の奥・背景の空洞の奥にかすむ光（霧の色に近い。白く光らせない）
    mats['sp:tunnelGlow'] = new THREE.MeshBasicMaterial({ color: 0x2f9cc4, fog: true, side: THREE.DoubleSide });
    // 下り階段の奥：暗めの青（段の霜の白と差をつけ、奥へ沈んでいく深さに見せる）
    mats['sp:tunnelGlowDeep'] = new THREE.MeshBasicMaterial({ color: 0x175d80, fog: true, side: THREE.DoubleSide });
  }
  // 柱（GLB）の石の素材を、洞窟の青と霜の素材に差し替える（1回だけ）。氷・光る結晶はそのまま
  const styled = new WeakSet();
  function restylePillar(piece) {
    if (!piece || styled.has(piece)) return; styled.add(piece);
    for (const pt of piece.parts) {
      const nm = (pt.src || '').toLowerCase(), src = mats[pt.mat];
      if (!src || /ice|glacier|crystal|glow/.test(nm) || src.transparent) continue;
      // 折れ口・欠け（fracture/broken/chip）と霜の粒（scattered frost）は霜をほとんど乗せず暗めの青：上を向いた折れ口が白い楕円に見えない
      const frac = /fractur|broken|chip|frost/.test(nm);
      const col = frac ? 0x4f86b4 : /joint|seam/.test(nm) ? 0x4a7eac : /highlight|carv/.test(nm) ? 0x8fc4e6 : 0x67a4d6;
      const m = frostify(std({ color: col, map: rockM.map, normalMap: rockM.normalMap, normalScale: new THREE.Vector2(1.1, 1.1), roughness: 0.7, emissive: 0x072a44, emissiveIntensity: 1.0, envMapIntensity: 0.6, vertexColors: true }), 'pillar:' + col.toString(16) + (frac ? 'f' : ''), frac ? 0.25 : 0.9, frac ? 0.7 : 0.38, frac ? 0.98 : 0.8);
      src.dispose(); mats[pt.mat] = m;
    }
  }

  /* ---------------- 形の部品 ---------------- */
  const noUv = (g) => { if (g.attributes.uv) g.deleteAttribute('uv'); if (g.attributes.uv1) g.deleteAttribute('uv1'); return g; };
  const flat = (g) => { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); return noUv(n); };
  // 欠けた切石：角を位置から決まる量だけずらす（同じ角を共有する面は同じだけ動くので割れない）
  function stone(w, h, d, seed, chip = 0.05) {
    const g = new THREE.BoxGeometry(w, h, d); noUv(g);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = Math.round(x * 97) * 7 + Math.round(y * 89) * 13 + Math.round(z * 83) * 29 + seed * 31;
      p.setXYZ(i, x + (rnd(k) - 0.5) * chip * 2, y + (rnd(k + 1) - 0.5) * chip * (y > 0 ? 1.2 : 0.4), z + (rnd(k + 2) - 0.5) * chip * 2);
    }
    g.computeVertexNormals();
    return g;
  }
  const at = (g, x, y, z, ry = 0, rz = 0, rx = 0) => { if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };
  function icicle(r, len, seed) { const g = new THREE.ConeGeometry(r, len, 5, 1); noUv(g); g.rotateX(Math.PI); g.translate(0, -len / 2, 0); g.rotateZ((rnd(seed) - 0.5) * 0.12); return g; }
  // 岩肌の面（法線 +Z）。amp は前後の起伏
  function rockSheet(w, h, sw, shh, seed, amp) {
    const g = new THREE.PlaneGeometry(w, h, sw, shh); noUv(g);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const z = amp * (0.45 * Math.sin(x * 0.83 + seed) * Math.cos(y * 0.41 + seed * 0.7) + 0.3 * Math.sin(x * 2.1 - y * 0.9 + seed * 2.3) + 0.25 * Math.pow(Math.abs(Math.sin(x * 1.7 + Math.sin(y * 0.5) * 0.8 + seed)), 2.0));
      p.setZ(i, z);
    }
    g.computeVertexNormals();
    return g;
  }
  // 面の向きで投影する UV（2.4m で1巡）。岩のテクスチャ・法線を切石にも乗せ、模様のない板に見せない
  function boxUv(g) {
    if (!g.attributes.normal) g.computeVertexNormals();
    const P = g.attributes.position, N = g.attributes.normal, uv = new Float32Array(P.count * 2), k = 1 / 2.4;
    for (let i = 0; i < P.count; i++) {
      const ax = Math.abs(N.getX(i)), ay = Math.abs(N.getY(i)), az = Math.abs(N.getZ(i)), x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      if (ay >= ax && ay >= az) { uv[i * 2] = x * k; uv[i * 2 + 1] = z * k; } else if (ax >= az) { uv[i * 2] = z * k; uv[i * 2 + 1] = y * k; } else { uv[i * 2] = x * k; uv[i * 2 + 1] = y * k; }
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return g;
  }
  // 素材ごとの形の束 → 1つの部品（transient：B.add の後で形を破棄）
  function Bag() {
    const by = new Map();
    return {
      add(mat, g) { if (!g) return; if (!by.has(mat)) by.set(mat, []); by.get(mat).push(boxUv(flat(g))); },
      piece(name) {
        const parts = [];
        for (const [mat, list] of by) {
          for (const g of list) { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k); if (!g.attributes.normal) g.computeVertexNormals(); }
          const m = list.length > 1 ? mergeGeometries(list, false) : list[0];
          if (list.length > 1) list.forEach((g) => g.dispose());
          if (m) parts.push({ geo: m, mat });
        }
        by.clear();
        return { name, parts, transient: true };
      },
    };
  }
  // 洞窟の壁（proc.continuousWall と同じ形）から、窓・アーチの口の三角形を抜いた部品
  function wallWithHole(ex, ez, ry, inHole) {
    const src = proc.continuousWall(ex, ez, ry, CELL), out = [];
    for (const pt of src.parts) {
      const g = pt.geo.index ? pt.geo.toNonIndexed() : pt.geo.clone();
      pt.geo.dispose();
      const P = g.attributes.position, N = g.attributes.normal, keep = [];
      for (let i = 0; i + 2 < P.count; i += 3) {
        const cx = (P.getX(i) + P.getX(i + 1) + P.getX(i + 2)) / 3, cy = (P.getY(i) + P.getY(i + 1) + P.getY(i + 2)) / 3;
        if (!inHole(cx, cy)) keep.push(i);
      }
      const pos = new Float32Array(keep.length * 9), nor = new Float32Array(keep.length * 9);
      keep.forEach((i, k) => { for (let v = 0; v < 3; v++) { pos.set([P.getX(i + v), P.getY(i + v), P.getZ(i + v)], k * 9 + v * 3); nor.set([N.getX(i + v), N.getY(i + v), N.getZ(i + v)], k * 9 + v * 3); } });
      g.dispose();
      const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g2.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      out.push({ geo: g2, mat: pt.mat });
    }
    return { name: 'b2sp_wall_hole', parts: out, transient: true };
  }
  // GLB の部品から、条件に合う三角形だけ残した複製（橋桁・欄干の切り出し）
  function cutPiece(piece, keep, name) {
    const parts = [];
    for (const pt of piece.parts) {
      const P = pt.geo.attributes.position, N = pt.geo.attributes.normal, idx = [];
      for (let i = 0; i + 2 < P.count; i += 3) {
        const cx = (P.getX(i) + P.getX(i + 1) + P.getX(i + 2)) / 3, cy = (P.getY(i) + P.getY(i + 1) + P.getY(i + 2)) / 3, cz = (P.getZ(i) + P.getZ(i + 1) + P.getZ(i + 2)) / 3;
        if (keep(cx, cy, cz, pt.src || '')) idx.push(i);
      }
      if (!idx.length) continue;
      const pos = new Float32Array(idx.length * 9), nor = new Float32Array(idx.length * 9);
      idx.forEach((i, k) => { for (let v = 0; v < 3; v++) { pos.set([P.getX(i + v), P.getY(i + v), P.getZ(i + v)], k * 9 + v * 3); nor.set([N.getX(i + v), N.getY(i + v), N.getZ(i + v)], k * 9 + v * 3); } });
      const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g2.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      parts.push({ geo: g2, mat: pt.mat, src: pt.src });
    }
    const box = new THREE.Box3(); for (const p of parts) { p.geo.computeBoundingBox(); box.union(p.geo.boundingBox); }
    return { name, parts, size: box.getSize(new THREE.Vector3()), min: box.min.clone(), lights: [] };
  }
  const cache = new Map();   // 切り出した部品（作り直しても使い回す。階層を離れるときに破棄）

  /* ============================================================
     1回の組み立て（build）ごとの処理
     ============================================================ */
  function begin(b) {
    ensureMats();
    const { a, ch, wallCell, objAt, B, light, placeAsset } = b;
    const roles = b.roles || null;
    const readRole = (tx, ty) => (roles && roles[ty] && roles[ty][tx]) || null;
    const meta = (a.random && a.random.meta) || a.meta || {};
    const X = (tx) => tx * CELL, Z = (ty) => ty * CELL;
    const vec = (d) => DIR_VEC[d];
    const walk = (tx, ty) => !wallCell(tx, ty);
    const skip = new Set(), ownFloor = new Set();
    const log = { stairs: [], backdrops: [], watergate: null, bridge: null, bridges: [], clusters: [] };
    // 局所座標（+Z が向き d）→ 世界座標
    const toW = (ox, oz, yaw, lx, lz) => { const cs = Math.cos(yaw), sn = Math.sin(yaw); return [ox + cs * lx + sn * lz, oz - sn * lx + cs * lz]; };

    /* ---------------- F2 階段 ---------------- */
    // 階段の「奥」（上り＝上っていく先、下り＝降りていく先）の向き。
    // M の情報（a.random.meta.stairs.up / .down に 'up'|'down'|'left'|'right'、または { back, dir, arrive }）があれば使う。
    // 無ければ：通れる隣（出口）のうち、反対側が壁のもの（トンネルを掘れる）を選び、その反対を奥にする。
    function stairBack(o) {
      const m = meta.stairs && meta.stairs[o.dir];
      // 上り階段：ゲームは開始位置に「上向き」で立たせる（fieldPlaceAtStart）。背中側（下）が壁なら、そこへ上る＝進行方向に段が見えない
      if (o.dir !== 'down' && !walk(o.tx, o.ty + 1)) return 'down';
      if (m) {
        if (typeof m === 'string' && DIR_VEC[m]) return m;
        if (m.flight && DIR_VEC[m.flight]) return m.flight;   // 迷宮班 M の fieldRandomMazeStairInfo：flight＝段の続く向き
        if (m.back && DIR_VEC[m.back]) return m.back;
        if (m.dir && DIR_VEC[m.dir]) return m.dir;
        if (m.arrive && DIR_VEC[m.arrive]) return OPP[m.arrive];   // 到着時に向く向き → 背中側が奥
      }
      const opens = DIR_ORDER.filter((d) => walk(o.tx + vec(d)[0], o.ty + vec(d)[1]));
      const sight = (d) => { let s = 0; for (let x = o.tx + vec(d)[0], y = o.ty + vec(d)[1]; s < 8 && walk(x, y); x += vec(d)[0], y += vec(d)[1]) s++; return s; };
      const cand = opens.map((d) => ({ d, back: OPP[d], wall: !walk(o.tx - vec(d)[0], o.ty - vec(d)[1]), s: sight(d) }))
        .sort((p, q) => (q.wall - p.wall) || (q.s - p.s));
      if (cand.length) return cand[0].back;
      return 'up';
    }
    const stairs = [];
    function planStairs() {
      for (const o of a.objects) {
        if (o.kind !== 'stairs') continue;
        const back = stairBack(o), tunnel = wallCell(o.tx + vec(back)[0], o.ty + vec(back)[1]);
        stairs.push({ o, back, tunnel });
        if (tunnel) skip.add(`${o.tx},${o.ty},${back}`);
        if (o.dir === 'down') ownFloor.add(`${o.tx},${o.ty}`);
      }
    }
    const R = 0.25, T = 0.44, SW = 2.5;   // 1段の高さ・奥行き、段の幅
    function buildStairs(st) {
      const { o, back, tunnel } = st, up = o.dir !== 'down', yaw = FACE_YAW[back], ox = X(o.tx), oz = Z(o.ty);
      const bag = Bag(), sd = o.tx * 131 + o.ty * 17 + (up ? 0 : 7);
      const zs = up ? 0.15 : -0.15, zEnd = tunnel ? 6.6 : 1.85, n = Math.max(3, Math.round((zEnd - zs) / T));
      const stepTop = (i) => up ? (i + 1) * R : -(i + 1) * R;
      // 段：1段を2〜3個の切石に割る（割り方は段ごとに変える）。上面は霜、踏み面の手前に薄い氷
      for (let i = 0; i < n; i++) {
        const z0 = zs + i * T, top = stepTop(i), bot = up ? (i === 0 ? -0.15 : top - 0.55) : top - 0.5;
        const pieces = 2 + (rnd(sd + i * 3) < 0.4 ? 1 : 0);
        let x = -SW / 2;
        for (let k = 0; k < pieces; k++) {
          const w = k === pieces - 1 ? SW / 2 - x : (SW / pieces) * (0.75 + rnd(sd + i * 7 + k) * 0.5);
          // 踏み面の奥側は暗い岩、段鼻（手前 0.13m）は霜の付いた明るい石 → 段ごとに明暗の縞ができ、上から見ても段が読める
          const h = top - bot, jy = (rnd(sd + i * 5 + k) - 0.5) * 0.025, jr = (rnd(sd + i + k * 9) - 0.5) * 0.03, NZ = 0.13;
          const back = up ? 1 : -1;   // 段鼻は「手前」（上りは z の小さい側、下りも見る人の側＝z の小さい側）
          bag.add('sp:frostRock', at(stone(w - 0.03, h, T + 0.06 - NZ, sd + i * 11 + k, 0.035), x + w / 2, bot + h / 2 + jy, z0 + NZ + (T + 0.06 - NZ) / 2 - 0.03, jr));
          bag.add('sp:stairStone', at(stone(w - 0.03, h + 0.01, NZ + 0.02, sd + i * 13 + k, 0.02), x + w / 2, bot + h / 2 + jy + 0.005, z0 + NZ / 2 - 0.02, jr));
          void back;
          x += w;
        }
        // 氷：踏み面の手前半分を覆う薄い氷（全段ではない）と、段鼻から垂れる短い氷柱（両端寄り）
        if (rnd(sd + i * 13) < 0.62) {
          const iw = 0.6 + rnd(sd + i * 17) * 1.1, ix = (rnd(sd + i * 19) - 0.5) * (SW - iw);
          bag.add('crystalIce', at(stone(iw, 0.035, T * (0.45 + rnd(sd + i) * 0.35), sd + i * 23, 0.012), ix, top + 0.012, z0 + T * 0.32));
        }
        if (rnd(sd + i * 29) < 0.5) for (const side of [-1, 1]) {
          if (rnd(sd + i * 31 + side) < 0.45) continue;
          for (let q = 0; q < 3; q++) bag.add('ice', at(icicle(0.025 + rnd(sd + i + q) * 0.02, 0.08 + rnd(sd + i * 3 + q) * 0.16, sd + i + q), side * (0.75 + rnd(sd + i * 37 + q) * 0.4), top - 0.01, z0 - 0.015));
        }
      }
      // 側壁（段の両脇の低い岩の縁）：段に沿って上下する
      const wallTop = (z) => up ? Math.max(0.35, (z - zs) / T * R + 0.45) : 0.32;
      for (const side of [-1, 1]) {
        const zA = zs - 0.25, zB = tunnel ? 2.05 : zEnd + 0.1;
        for (let z = zA, k = 0; z < zB - 0.05; k++) {
          const len = Math.min(zB - z, 0.55 + rnd(sd + k * 3 + side) * 0.45), zc = z + len / 2;
          const top = up ? wallTop(zc) + (rnd(sd + k + side * 5) - 0.5) * 0.12 : 0.28 + rnd(sd + k * 7 + side) * 0.14;
          const bot = up ? -0.15 : -((zc - zs) / T) * R - 0.6;
          const g = stone(0.42 + rnd(sd + k * 11 + side) * 0.12, top - bot, len, sd + k * 13 + (side > 0 ? 500 : 0), 0.06);
          bag.add('sp:frostRock', at(g, side * (SW / 2 + 0.24), bot + (top - bot) / 2, zc));
          z += len;
        }
      }
      // 下り階段：段の脇・手前の床（このマスの床は自分で作る）と、穴の内側の壁
      if (!up) {
        const ground = (lx0, lz0, lx1, lz1, segX, segZ) => {
          const g = new THREE.PlaneGeometry(lx1 - lx0, lz1 - lz0, segX, segZ).rotateX(-Math.PI / 2); noUv(g);
          g.translate((lx0 + lx1) / 2, 0, (lz0 + lz1) / 2);
          const p = g.attributes.position;
          for (let i = 0; i < p.count; i++) { const [wx, wz] = toW(ox, oz, yaw, p.getX(i), p.getZ(i)); p.setY(i, groundY(wx, wz)); }
          g.computeVertexNormals(); return g;
        };
        bag.add('caveFloor', ground(-2, -2, 2, zs - 0.02, 8, 4));
        bag.add('caveFloor', ground(-2, zs - 0.02, -SW / 2 - 0.45, 2, 2, 6));
        bag.add('caveFloor', ground(SW / 2 + 0.45, zs - 0.02, 2, 2, 2, 6));
        for (const side of [-1, 1]) {   // 穴の内壁（段より下まで）
          const len = (tunnel ? 2.0 : zEnd) - zs, h = len / T * R + 0.9;
          const g = rockSheet(len + 0.2, h, 6, 4, sd + side, 0.06); g.rotateY(side > 0 ? -Math.PI / 2 : Math.PI / 2);
          bag.add('Deep cavern rock', at(g, side * (SW / 2 + 0.03), -h / 2 + 0.05, zs + len / 2));
        }
        { const g = rockSheet(SW + 0.2, 0.7, 4, 1, sd + 9, 0.03); bag.add('Deep cavern rock', at(g, 0, -0.3, zs - 0.01)); }   // 最初の段の前の縁
      }
      // 背後の壁：アーチの口を開けた洞窟の壁＋霜の石のアーチ枠＋その奥のトンネル
      const archR = 1.32, archY = up ? 2.75 : 0.95, archTop = archY + archR * 0.55;
      if (tunnel) {
        const [ex, ez] = [ox + vec(back)[0] * CELL / 2, oz + vec(back)[1] * CELL / 2];
        const hole = wallWithHole(ex, ez, FACE_YAW[back] + Math.PI, (x, y) => Math.abs(x) < archR + 0.18 && y < archY + (archR + 0.18) * 0.55 * Math.sqrt(Math.max(0, 1 - (x / (archR + 0.18)) ** 2)));
        B.add('walls', hole, M4(ex, 0, ez, FACE_YAW[back] + Math.PI), o.tx, o.ty);
        // 枠：両脇の柱石（床から）と、迫石のアーチ。氷柱を垂らす
        const jambBot = up ? -0.2 : -2.0;
        for (const side of [-1, 1]) for (let y = jambBot, k = 0; y < archY; k++) {
          const h = Math.min(archY - y, 0.42 + rnd(sd + k * 5 + side) * 0.3);
          bag.add('sp:stairStone', at(stone(0.5, h - 0.02, 0.62, sd + k * 7 + side * 3, 0.04), side * (archR + 0.22), y + h / 2, 1.98));
          y += h;
        }
        const nV = 9;
        for (let k = 0; k < nV; k++) {
          const t0 = Math.PI * (k + 0.5) / nV, px = Math.cos(t0) * (archR + 0.22), py = archY + Math.sin(t0) * (archR + 0.22) * 0.55;
          bag.add('sp:stairStone', at(stone(0.5, 0.36, 0.64, sd + k * 19, 0.03), px, py, 1.98, 0, t0 - Math.PI / 2));
        }
        for (let k = 0; k < 7; k++) {
          const t0 = Math.PI * (0.1 + 0.8 * rnd(sd + k * 41)), px = Math.cos(t0) * archR, py = archY + Math.sin(t0) * archR * 0.55 - 0.12;
          bag.add('ice', at(icicle(0.04 + rnd(sd + k) * 0.03, 0.2 + rnd(sd + k * 3) * 0.35, sd + k), px, py, 1.75 + rnd(sd + k * 5) * 0.2));
        }
        // トンネル：側壁・天井（段に沿って傾く）・奥のかすむ光
        const tz0 = 2.0, tz1 = 7.0, L = tz1 - tz0, rise = (up ? 1 : -1) * L / T * R;
        const yAt = (z) => (up ? 1 : -1) * (z - zs) / T * R;
        for (const side of [-1, 1]) {
          const h = 3.6, g = rockSheet(L + 0.4, h, 8, 4, sd + 40 + side, 0.12);
          const sk = new THREE.Matrix4().set(1, 0, 0, 0, side * rise / L, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);   // 局所 x（＝奥行き）に沿って上下へ傾ける（回したあとの奥行きの向きが左右で逆なので符号を変える）
          g.applyMatrix4(sk); g.rotateY(side > 0 ? -Math.PI / 2 : Math.PI / 2);
          bag.add('sp:frostRock', at(g, side * (archR + 0.15), yAt(tz0 + L / 2) + h / 2 - 0.9, tz0 + L / 2));
        }
        {
          const g = rockSheet(archR * 2 + 0.6, L + 0.4, 4, 8, sd + 60, 0.1); g.rotateX(Math.PI / 2);
          const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + (p.getZ(i) / L) * rise);
          g.computeVertexNormals();
          bag.add('ceiling', at(g, 0, archTop + rise / 2 - 0.05, tz0 + L / 2));
        }
        // 奥：平たい光の板をやめ、霜の岩の行き止まり（折り返し）＋その上（上り）／下（下り）に細く漏れる光
        { const g = rockSheet(archR * 2 + 0.8, 4.6, 5, 5, sd + 77, 0.18); g.rotateY(Math.PI); bag.add('sp:frostRock', at(g, 0, yAt(tz1) + 1.2, tz1 - 0.02)); }
        { const g = new THREE.PlaneGeometry(archR * 2 - 0.4, 0.35); noUv(g); g.rotateY(Math.PI); bag.add(up ? 'sp:tunnelGlow' : 'sp:tunnelGlowDeep', at(g, 0, up ? yAt(tz1) + 2.5 : yAt(tz1) + 0.05, tz1 - 0.12)); }
        // 段に沿って壁に付いた小さな氷の結晶（奥へ行くほど低い位置に並び、「奥へ降りる／上る」向きが一目でわかる）。光らせすぎない
        for (const side of [-1, 1]) for (let z = tz0 + 0.5, k = 0; z < tz1 - 0.6; z += 1.05, k++) {
          const yy = yAt(z) + 1.0 + (rnd(sd + k * 3 + side) - 0.5) * 0.2, wx = side * (archR + 0.02);
          for (let q = 0; q < 3; q++) {
            const hh = 0.16 + rnd(sd + k * 7 + q + side) * 0.18, g = new THREE.ConeGeometry(0.035 + rnd(sd + k + q * 5) * 0.03, hh, 5); noUv(g); g.translate(0, hh / 2, 0);
            bag.add('crystalIce', at(g, wx - side * 0.04, yy + (q - 1) * 0.07, z + (q - 1) * 0.1, 0, side * (0.9 + rnd(sd + k * 11 + q) * 0.5), (rnd(sd + k * 13 + q) - 0.5) * 0.6));
          }
          bag.add('ice', at(stone(0.28, 0.06, 0.34, sd + k * 17 + side, 0.03), wx - side * 0.1, yy - 0.12, z));   // 結晶の下の霜の棚
        }
        const [lx, lz] = toW(ox, oz, yaw, 0, 4.2);
        light(lx, yAt(4.2) + 1.8, lz, 0x7ad8ff, 0.9, 5.5);
      } else {
        // 背後が通れる床（開けた広間）：段の奥に岩の塊を置き、その正面にアーチの口（口の奥はかすむ光）
        const bz = zEnd + 0.05;
        const mass = rockSheet(SW + 1.4, up ? 4.2 : 2.2, 6, 5, sd + 70, 0.18); mass.rotateY(Math.PI);
        bag.add('sp:frostRock', at(mass, 0, (up ? 4.2 : 2.2) / 2 + (up ? 0 : 0) - 0.1, bz + 0.25));
        for (const side of [-1, 1]) {
          const g = rockSheet(0.6, up ? 4.2 : 2.2, 2, 5, sd + 80 + side, 0.15); g.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2);
          bag.add('sp:frostRock', at(g, side * (SW / 2 + 0.7), (up ? 4.2 : 2.2) / 2 - 0.1, bz - 0.05));
        }
        { const g = new THREE.PlaneGeometry(SW - 0.2, up ? 2.4 : 1.0); noUv(g); bag.add('sp:tunnelGlow', at(g, 0, up ? (n * R) + 1.1 : -0.4, bz + 0.2)); }
        for (let k = 0; k < 6; k++) bag.add('ice', at(icicle(0.05, 0.25 + rnd(sd + k) * 0.4, sd + k), (rnd(sd + k * 7) - 0.5) * SW, up ? 3.9 : 1.95, bz - 0.05));
      }
      B.add('stairs', bag.piece('b2sp_stairs'), M4(ox, 0, oz, yaw), o.tx, o.ty);
      log.stairs.push({ dir: o.dir, tx: o.tx, ty: o.ty, back, tunnel, face: OPP[back] });
      return null;
    }

    /* ---------------- F4 背景のモニュメント ---------------- */
    // 外周壁に面した通れるマス（窓）を探す。M の backdrop-slot 役割（外周壁のマス）または meta.backdrops があればそれを使う
    function edgeOf(tx, ty) { return tx <= 0 || ty <= 0 || tx >= a.w - 1 || ty >= a.h - 1; }
    function windowOk(tx, ty, d, keep) {
      const wx = tx + vec(d)[0], wy = ty + vec(d)[1], k = `${tx},${ty}`, c = ch(tx, ty);
      if (!walk(tx, ty) || !wallCell(wx, wy) || !edgeOf(wx, wy)) return false;
      if (objAt.has(k) || objAt.has(`${wx},${wy}`) || c === '<' || c === '>') return false;
      if (b.falls.has(k) || b.openCells.has(k) || b.zoneCells.has(k) || b.monumentCells.has(`${wx},${wy}`) || keep.has(k)) return false;
      if (readRole(tx, ty) === 'fixed') return false;
      return true;
    }
    function planBackdrops(names) {
      const out = [], keep = new Set();
      let cands = [];
      const fromMeta = Array.isArray(meta.backdrops) ? meta.backdrops : Array.isArray(meta.backdropSlots) ? meta.backdropSlots : null;
      for (let ty = 1; ty < a.h - 1; ty++) for (let tx = 1; tx < a.w - 1; tx++) for (const d of DIR_ORDER) {
        if (!windowOk(tx, ty, d, keep)) continue;
        const wx = tx + vec(d)[0], wy = ty + vec(d)[1];
        let s = 0; for (let x = tx - vec(d)[0], y = ty - vec(d)[1]; s < 8 && walk(x, y); x -= vec(d)[0], y -= vec(d)[1]) s++;
        const lat = [Math.abs(vec(d)[1]), Math.abs(vec(d)[0])];
        let span = 1; for (const sg of [-1, 1]) if (windowOk(tx + lat[0] * sg, ty + lat[1] * sg, d, keep)) span++;
        const tagged = readRole(wx, wy) === SP_ROLES.backdrop || readRole(tx, ty) === SP_ROLES.backdrop || (fromMeta && fromMeta.some((m) => (m.x === wx && m.y === wy) || (m.tx === tx && m.ty === ty)));
        const vista = readRole(tx, ty) === SP_ROLES.vista;
        cands.push({ tx, ty, d, sight: s, span, score: (tagged ? 100 : 0) + (vista ? 6 : 0) + Math.min(s, 6) + span * 1.6 + hash(tx, ty, 880) * 0.5 });
      }
      if (fromMeta || cands.some((c) => c.score >= 100)) cands = cands.filter((c) => c.score >= 100);
      cands.sort((p, q) => q.score - p.score);
      const rects = [];
      for (const name of names) {
        const halfW = name === 'bridge' ? 26 : 15, depth = 27;
        let pick = null;
        for (const c of cands) {
          if (c.sight < 2) continue;
          // 背景の空洞の外形（世界座標の長方形）がほかの背景と重ならないこと
          const lat = [Math.abs(vec(c.d)[1]), Math.abs(vec(c.d)[0])], fx = X(c.tx) + vec(c.d)[0] * CELL / 2, fz = Z(c.ty) + vec(c.d)[1] * CELL / 2;
          const xs = [fx + lat[0] * halfW, fx - lat[0] * halfW, fx + vec(c.d)[0] * depth], zs = [fz + lat[1] * halfW, fz - lat[1] * halfW, fz + vec(c.d)[1] * depth];
          const r = { x0: Math.min(...xs) , x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
          if (rects.some((q) => r.x0 < q.x1 && r.x1 > q.x0 && r.z0 < q.z1 && r.z1 > q.z0)) continue;
          if (out.some((q) => Math.abs(q.tx - c.tx) + Math.abs(q.ty - c.ty) < 8)) continue;
          pick = c; rects.push(r); break;
        }
        if (!pick) continue;
        // 窓の幅：中央のマス＋左右の続くマス（最大3マス）
        const lat = [Math.abs(vec(pick.d)[1]), Math.abs(vec(pick.d)[0])], cells = [[pick.tx, pick.ty]];
        for (const sg of [-1, 1]) if (windowOk(pick.tx + lat[0] * sg, pick.ty + lat[1] * sg, pick.d, keep)) cells.push([pick.tx + lat[0] * sg, pick.ty + lat[1] * sg]);
        for (const [x, y] of cells) { skip.add(`${x},${y},${pick.d}`); keep.add(`${x},${y}`); }
        out.push({ name, tx: pick.tx, ty: pick.ty, d: pick.d, cells, halfW, depth, sight: pick.sight });
      }
      return out;
    }
    function buildBackdrop(bd, assets) {
      const { d, cells, halfW, depth } = bd, yaw = FACE_YAW[d], ox = X(bd.tx) + vec(d)[0] * CELL / 2, oz = Z(bd.ty) + vec(d)[1] * CELL / 2;
      const sd = bd.tx * 71 + bd.ty * 23, bag = Bag(), lat = [Math.abs(vec(d)[1]), Math.abs(vec(d)[0])];
      const FLOOR = -2.7, WATER = -2.25, TOP = CEIL_H + 3.5;
      // 窓：各マスの外周壁を、腰の高さの縁と上のアーチを残して抜く。マスの境目と両端に岩の柱（床から天井まで）
      const OW = 1.78, SILL = 0.95, OTOP = 4.6;
      for (const [cx, cy] of cells) {
        const ex = X(cx) + vec(d)[0] * CELL / 2, ez = Z(cy) + vec(d)[1] * CELL / 2, wr = FACE_YAW[d] + Math.PI;
        B.add('walls', wallWithHole(ex, ez, wr, (x, y) => Math.abs(x) < OW && y > SILL && y < OTOP + 0.9 * Math.sqrt(Math.max(0, 1 - (x / OW) ** 2))), M4(ex, 0, ez, wr), cx, cy);
        // 窓の下の縁に霜の岩棚、上の縁に氷柱と霜の庇
        for (let k = 0; k < 3; k++) {
          const t = (k - 1) * 1.15 + (rnd(sd + cx * 3 + cy + k) - 0.5) * 0.3, [px, pz] = [ex + lat[0] * t - vec(d)[0] * 0.12, ez + lat[1] * t - vec(d)[1] * 0.12];
          B.add('backdrop', proc.frostLedges[(k + cx) % proc.frostLedges.length], M4(px, SILL + 0.08, pz, FACE_YAW[d] + (rnd(sd + k) - 0.5) * 0.3, 0.55), cx, cy);
          // 氷柱の根元（平たい笠）は窓のアーチの縁より上の壁に埋める（空中に浮いた円盤に見せない）
          const tt = t + 0.4, archEdge = OTOP + 0.9 * Math.sqrt(Math.max(0, 1 - (tt / OW) ** 2));
          B.add('backdrop', proc.iceStalactites[(k + cy) % proc.iceStalactites.length], M4(px + lat[0] * 0.4 + vec(d)[0] * 0.18, archEdge + 0.3, pz + lat[1] * 0.4 + vec(d)[1] * 0.18, rnd(sd + k * 5) * 6.28, 1.3 + rnd(sd + k * 7) * 0.6), cx, cy);
        }
      }
      // 窓の両端・境目の岩の柱（壁の切れ目の薄さを隠す）
      const ts = cells.map(([cx, cy]) => (cx - bd.tx) * lat[0] + (cy - bd.ty) * lat[1]).sort((p, q) => p - q);
      const edges = new Set(); for (const t of ts) { edges.add(t * CELL - CELL / 2); edges.add(t * CELL + CELL / 2); }
      for (const e of edges) {
        const [px, pz] = [ox + lat[0] * e + vec(d)[0] * 0.15, oz + lat[1] * e + vec(d)[1] * 0.15];
        B.add('backdrop', proc.columns[Math.floor(rnd(sd + e * 3) * 3)], M4(px, 0, pz, rnd(sd + e) * 6.28, [0.75, 1, 0.75]), Math.round(px / CELL), Math.round(pz / CELL));
      }
      // 空洞：水をたたえた低い床・奥と左右の岩壁・高い天井（局所座標 +Z が外向き）
      const W2 = halfW * 2;
      { const g = rockSheet(W2 + 2, depth + 1, 20, 14, sd, 0.35); g.rotateX(-Math.PI / 2); bag.add('Deep cavern rock', at(g, 0, FLOOR, depth / 2 + 0.2)); }
      { const g = rockSheet(W2 + 4, TOP - FLOOR + 1, 26, 10, sd + 1, 0.9); g.rotateY(Math.PI); bag.add('sp:frostRock', at(g, 0, (TOP + FLOOR) / 2, depth)); }
      for (const side of [-1, 1]) { const g = rockSheet(depth + 2, TOP - FLOOR + 1, 14, 10, sd + 2 + side, 0.8); g.rotateY(side > 0 ? -Math.PI / 2 : Math.PI / 2); bag.add('sp:frostRock', at(g, side * halfW, (TOP + FLOOR) / 2, depth / 2)); }
      { const g = rockSheet(W2 + 2, depth + 2, 18, 12, sd + 5, 0.7); g.rotateX(Math.PI / 2); bag.add('ceiling', at(g, 0, TOP, depth / 2)); }
      B.add('backdrop', bag.piece('b2sp_backdrop_cave'), M4(ox, 0, oz, yaw), bd.tx, bd.ty);
      // 水面（UV は 4m で1巡）
      {
        const g = new THREE.PlaneGeometry(W2, depth - 0.6, 1, 1).rotateX(-Math.PI / 2); g.translate(0, WATER, depth / 2 + 0.3);
        const p = g.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / 4; uv[i * 2 + 1] = p.getZ(i) / 4; }
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        B.add('water', { name: 'b2sp_backdrop_water', parts: [{ geo: g, mat: 'Clear blue water' }], transient: true }, M4(ox, 0, oz, yaw), bd.tx, bd.ty);
      }
      const W = (lx, lz) => toW(ox, oz, yaw, lx, lz);
      // 鍾乳石・石筍・氷柱で空洞の大きさを見せる
      for (let k = 0; k < 26; k++) {
        const lx = (rnd(sd + k * 3) - 0.5) * (W2 - 3), lz = 3 + rnd(sd + k * 5) * (depth - 5), [px, pz] = W(lx, lz), h = 1.5 + rnd(sd + k * 7) * 3.2;
        B.add('backdrop', proc.stalactites[k % proc.stalactites.length], M4(px, TOP - 0.2, pz, rnd(sd + k) * 6.28, [h * 0.8, h, h * 0.8]), bd.tx, bd.ty);
        if (k % 2) B.add('backdrop', proc.iceStalactites[k % proc.iceStalactites.length], M4(px + 0.6, TOP - 0.3, pz, rnd(sd + k * 9) * 6.28, 1.6 + rnd(sd + k * 11)), bd.tx, bd.ty);
      }
      for (let k = 0; k < 14; k++) {
        const side = k % 2 ? 1 : -1, lx = side * (halfW - 1.2 - rnd(sd + k * 13) * 3), lz = 3 + rnd(sd + k * 17) * (depth - 6), [px, pz] = W(lx, lz), h = 2 + rnd(sd + k * 19) * 4;
        B.add('backdrop', proc.stalagmites[k % proc.stalagmites.length], M4(px, FLOOR + 0.2, pz, rnd(sd + k * 23) * 6.28, [h * 0.9, h, h * 0.9]), bd.tx, bd.ty);
      }
      // モニュメント本体：正面（+Z）を窓へ向ける
      const piece = assets[bd.name];
      if (piece) {
        if (bd.name === 'bridge') {
          const s = 0.78, L = 23.0 * s, lz = 11.5, by = WATER - 0.35, [px, pz] = W(0, lz);
          placeAsset(B, 'backdrop', piece, px, by, pz, yaw, s, bd.tx, bd.ty);
          if (assets.aqueduct) for (const side of [-1, 1]) {
            const [ux, uz] = W(side * L, lz);
            placeAsset(B, 'backdrop', assets.aqueduct, ux, by, uz, yaw, side > 0 ? [-s, s, s] : s, bd.tx, bd.ty);
          }
          if (assets.shoreline) for (const side of [-1, 1]) { const [sx, sz] = W(side * 9, lz + 5.5); placeAsset(B, 'backdrop', assets.shoreline, sx, WATER - 0.55, sz, yaw + (side > 0 ? Math.PI : 0), [0.7, 0.6, 0.7], bd.tx, bd.ty); }
          bd.monument = { size: [L, 10.18 * s], z: lz };
        } else {
          // 水車の中庭：水車は水路に沿う軸（模型の x）に付いていて、真正面（模型の +Z）からは車輪が縦の線にしか見えない。
          // 約30°ひねって、窓から車輪の面と中庭の奥行きが両方見える向きにする
          const turn = bd.name === 'waterwheel' ? -0.52 : 0, cT = Math.abs(Math.cos(turn)), sT = Math.abs(Math.sin(turn));
          const ex = piece.size.x * cT + piece.size.z * sT, ez = piece.size.x * sT + piece.size.z * cT;
          const sc = Math.min((W2 - 5) / ex, (depth - 7) / ez, (TOP - FLOOR - 2.5) / piece.size.y, 0.95);
          const lz = 4.0 + ez * sc / 2, [px, pz] = W(0, lz);
          // 足もとの島（岩と霜の岩棚）
          for (let k = 0; k < 10; k++) {
            const a0 = k / 10 * 6.28, rx = ex * sc * 0.52, rz = ez * sc * 0.52, [qx, qz] = W(Math.cos(a0) * rx, lz + Math.sin(a0) * rz);
            B.add('backdrop', kit.boulders[k % kit.boulders.length], M4(qx, WATER - 0.6, qz, a0, 1.2 + rnd(sd + k) * 0.8), bd.tx, bd.ty);
          }
          placeAsset(B, 'backdrop', piece, px, WATER - 0.25, pz, yaw + Math.PI + turn, sc, bd.tx, bd.ty);
          bd.monument = { size: [ex * sc, piece.size.y * sc], z: lz, turn };
        }
      }
      // 照明：手前から正面を照らす（白飛びさせない強さ）
      const [l1x, l1z] = W(0, 4.5), [l2x, l2z] = W(-halfW * 0.4, 10), [l3x, l3z] = W(halfW * 0.4, 10);
      light(l1x, 2.2, l1z, 0x8fe0ff, 1.5, 14); light(l2x, 4, l2z, 0x6fd0ff, 1.1, 12); light(l3x, 4, l3z, 0x6fd0ff, 1.1, 12);
      log.backdrops.push({ name: bd.name, tx: bd.tx, ty: bd.ty, d: bd.d, cells: cells.map((c) => c.join(',')), sight: bd.sight, view: [bd.tx - vec(d)[0] * Math.min(2, bd.sight), bd.ty - vec(d)[1] * Math.min(2, bd.sight)] });
    }

    /* ---------------- F8 水門 ---------------- */
    // m：壁の塊（x, y, w=4, h=2、正面は北＝y-1 の通路）。M の setpiece-watergate 役割があれば、その区画を優先して使う（呼び出し側）
    function buildWatergate(m, piece) {
      const sd = m.x * 53 + m.y * 29, W = m.w * CELL, D = m.h * CELL, cx = (m.x + (m.w - 1) / 2) * CELL, frontZ = (m.y - 0.5) * CELL, tx = m.x, ty = m.y;
      const bag = Bag(), WATER = -0.42;
      // 塊の天井と内向きの壁（床は水の下の暗い底）
      for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) {
        const x = (m.x + i) * CELL, z = (m.y + j) * CELL;
        B.add('ceiling', proc.continuousCeiling(x, z, CELL), M4(x, CEIL_H, z), m.x + i, m.y + j);
        for (const d of DIR_ORDER) {
          const nx = m.x + i + vec(d)[0], ny = m.y + j + vec(d)[1];
          if (!wallCell(nx, ny) || b.monumentCells.has(`${nx},${ny}`)) continue;
          const ex = x + vec(d)[0] * CELL / 2, ez = z + vec(d)[1] * CELL / 2, wr = FACE_YAW[d] + Math.PI;
          B.add('walls', proc.continuousWall(ex, ez, wr, CELL), M4(ex, 0, ez, wr), m.x + i, m.y + j);
        }
      }
      { const g = new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2); noUv(g); bag.add('bed', at(g, cx, -1.3, frontZ + D / 2)); }
      // 水門：塊の奥へ下げ、土台を水に沈める
      const s = Math.min((W - 5.0) / piece.size.x, (D - 2.6) / piece.size.z, 5.6 / piece.size.y);
      const gz = frontZ + D - piece.size.z * s / 2 - 0.15, gy = WATER - 0.55;
      placeAsset(B, 'monuments', piece, cx, gy, gz, Math.PI, s, tx, ty);
      const gateFront = gz - piece.size.z * s / 2, gw = piece.size.x * s, gh = piece.size.y * s + gy;
      // 水面：水門の下から手前の縁まで（水が流れ出る水路）
      {
        const g = new THREE.PlaneGeometry(W - 0.2, D - 0.1, 1, 1).rotateX(-Math.PI / 2); g.translate(cx, WATER, frontZ + D / 2);
        const p = g.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / 4; uv[i * 2 + 1] = p.getZ(i) / 4; }
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        B.add('water', { name: 'b2sp_gate_water', parts: [{ geo: g, mat: 'Clear blue water' }], transient: true }, new THREE.Matrix4(), tx, ty);
      }
      // 水際（通路との境目）：氷の縁と霜の岩棚。歩ける床の端が水へ落ちる形
      for (let k = 0; k < 7; k++) {
        const lx = cx - W / 2 + (k + 0.5) * W / 7 + (rnd(sd + k) - 0.5) * 0.6;
        B.add('monuments', proc.frostLedges[k % proc.frostLedges.length], M4(lx, 0.0, frontZ + 0.15, (rnd(sd + k * 9) - 0.5) * 0.3, 0.8), tx, ty);
      }
      // 水面の氷の欠片と、水門の足もとの泡
      for (let i = 0; i < 4; i++) B.add('water_foam', kit.ripples[(i + sd) % kit.ripples.length], M4(cx + (i - 1.5) * gw * 0.22, WATER + 0.03, gateFront - 0.3, rnd(sd + i) * 6.28, 1.0 + i * 0.25), tx, ty);
      // 左右：水から立ち上がる氷に覆われた岩の塊（石筍・岩・結晶の氷）。正面の幅に収める
      const sideW = (W - gw) / 2;
      for (const side of [-1, 1]) {
        const sx = cx + side * (gw / 2 + sideW / 2);
        for (let k = 0; k < 4; k++) {
          const px = sx + (rnd(sd + k * 3 + side) - 0.5) * sideW * 0.7, pz = frontZ + 1.6 + rnd(sd + k * 5 + side) * (D - 2.2);
          B.add('monuments', kit.boulders[(k + (side > 0 ? 2 : 0)) % kit.boulders.length], M4(px, WATER - 0.4, pz, rnd(sd + k) * 6.28, 1.1 + rnd(sd + k * 7) * 0.7), tx, ty);
          const h = 2.4 + rnd(sd + k * 9 + side) * 3.6;
          B.add('monuments', proc.stalagmites[(k + 3) % proc.stalagmites.length], M4(px + 0.3, WATER - 0.2, pz + 0.4, rnd(sd + k * 11) * 6.28, [h * 0.9, h, h * 0.9]), tx, ty);
        }
        // 氷の幕（壁ぎわに垂れる太い氷柱の列）
        for (let k = 0; k < 6; k++) {
          const px = sx + (rnd(sd + k * 13 + side) - 0.5) * sideW, pz = frontZ + 1.2 + rnd(sd + k * 15 + side) * (D - 1.8);
          B.add('monuments', proc.iceStalactites[k % proc.iceStalactites.length], M4(px, ceilY(px, pz) + 0.05, pz, rnd(sd + k * 17) * 6.28, 2.4 + rnd(sd + k * 19) * 1.6), tx, ty);
        }
      }
      // 上：水門の上の岩（天井まで）に氷柱を密集させる
      {
        const g = rockSheet(W - 0.2, CEIL_H - gh + 0.6, 10, 3, sd + 8, 0.25); bag.add('sp:frostRock', at(g, cx, gh + (CEIL_H - gh) / 2, gateFront + 0.6));
        for (let k = 0; k < 18; k++) {
          const px = cx + (rnd(sd + k * 23) - 0.5) * (W - 0.8), pz = gateFront + 0.35 + rnd(sd + k * 29) * 0.5;
          B.add('monuments', proc.iceStalactites[k % proc.iceStalactites.length], M4(px, gh + 0.25 + rnd(sd + k) * 0.3, pz, rnd(sd + k * 31) * 6.28, 1.6 + rnd(sd + k * 37) * 1.8), tx, ty);
        }
        for (let k = 0; k < 6; k++) {
          const px = cx + (k - 2.5) * (W / 6.5);
          B.add('monuments', proc.frostCornices[k % proc.frostCornices.length], M4(px, gh + 0.2, gateFront + 0.2, 0, 1.6), tx, ty);
        }
      }
      B.add('monuments', bag.piece('b2sp_watergate'), new THREE.Matrix4(), tx, ty);
      light(cx, 2.4, frontZ - 1.0, 0x8fdcff, 1.3, 8);
      light(cx, 0.6, gateFront - 0.8, 0x5fd0ff, 1.0, 6);
      log.watergate = { x: m.x, y: m.y, w: m.w, h: m.h, front: [Math.round(cx / CELL), m.y - 1], gateZ: +(gz / CELL).toFixed(2) };
    }

    // 迷宮班 M の水門の展示区画（a.b2Features.watergates の1件）。
    //   g.view＝見る床 V（行き止まり）、g.facing＝V から水門を見る向き、g.basin＝手前の水（3×2、危険な水面）、g.gate＝水門のマス（水の中）。
    //   水面と水まわりの壁は水面班 W のタイルが描く。ここでは水門本体を区画の奥の壁に据え、土台を水と氷に沈め、
    //   左右の岩・上の岩に氷柱と霜を密集させ、水門から V の足もとへ流れ出る水路（泡・氷の欠片）を足す。
    function buildMazeWatergate(gt, piece) {
      if (!gt || !gt.view || !piece || !DIR_VEC[gt.facing]) return false;
      const f = gt.facing, yaw = FACE_YAW[f], [vx, vy] = gt.view, ox = X(vx), oz = Z(vy), W = (lx, lz) => toW(ox, oz, yaw, lx, lz);
      const [gtx, gty] = gt.gate || [vx + vec(f)[0] * 2, vy + vec(f)[1] * 2];
      const sd = vx * 53 + vy * 29, bag = Bag(), WATER = BR_WATER;
      const Z0 = CELL / 2, Z1 = CELL * 2.5, HWB = CELL * 1.5;   // 水の区画：局所 z＝Z0〜Z1（V の前の辺〜奥の壁）、幅 ±HWB
      // 水門：奥の壁に背を付け、正面（模型の +Z）を V へ向ける。土台は水面より 0.6m 沈める
      const s = Math.min((HWB * 2 - 1.6) / piece.size.x, (Z1 - Z0 - 3.0) / piece.size.z, 6.1 / piece.size.y);
      const gd = piece.size.z * s, gw = piece.size.x * s, gy = WATER - 0.6, gzc = Z1 - gd / 2 - 0.05, gh = gy + piece.size.y * s;
      { const [px, pz] = W(0, gzc); placeAsset(B, 'monuments', piece, px, gy, pz, yaw + Math.PI, s, gtx, gty); }
      const gateFront = Z1 - gd;
      // 局所座標で作って最後に V の位置・向きへ置く（bag の形はすべて局所座標）
      // 上：水門の上（天井まで）を岩でふさぎ、霜の庇と密集した氷柱
      {
        const g = rockSheet(HWB * 2 + 0.4, CEIL_H - gh + 0.8, 12, 4, sd + 8, 0.3); g.rotateY(Math.PI);
        bag.add('sp:frostRock', at(g, 0, gh - 0.4 + (CEIL_H - gh + 0.8) / 2, Z1 - 0.35));
        for (let k = 0; k < 9; k++) bag.add('sp:stairStone', at(stone(1.1 + rnd(sd + k) * 0.6, 0.22, 0.5, sd + k * 3, 0.06), (k - 4) * 1.25 + (rnd(sd + k * 5) - 0.5) * 0.3, gh + 0.05 + rnd(sd + k * 7) * 0.15, Z1 - 0.75, (rnd(sd + k * 9) - 0.5) * 0.2));
      }
      const Wd = (lx, lz) => W(lx, lz);
      for (let k = 0; k < 26; k++) {   // 水門の上の氷柱（太い幕＋細い氷柱）
        const lx = (rnd(sd + k * 23) - 0.5) * (HWB * 2 - 0.8), lz = Z1 - 0.6 - rnd(sd + k * 29) * 0.5, [px, pz] = Wd(lx, lz);
        B.add('monuments', proc.iceStalactites[k % proc.iceStalactites.length], M4(px, gh + 0.35 + rnd(sd + k) * 0.5, pz, rnd(sd + k * 31) * 6.28, 1.4 + rnd(sd + k * 37) * 1.9), gtx, gty);
      }
      for (let k = 0; k < 7; k++) { const [px, pz] = Wd((k - 3) * (HWB * 2 / 7.2), Z1 - 0.55); B.add('monuments', proc.frostCornices[k % proc.frostCornices.length], M4(px, gh + 0.15, pz, yaw, 1.7), gtx, gty); }
      // 左右：水から立ち上がる氷に覆われた岩（水門の両脇〜区画の側壁）。氷の幕が天井から垂れる
      for (const side of [-1, 1]) {
        const sx0 = gw / 2 - 0.3, sx1 = HWB - 0.2;
        for (let k = 0; k < 5; k++) {
          const lx = side * (sx0 + rnd(sd + k * 3 + side) * (sx1 - sx0)), lz = Z0 + 2.2 + rnd(sd + k * 5 + side) * (Z1 - Z0 - 2.6), [px, pz] = Wd(lx, lz);
          B.add('monuments', kit.boulders[(k + (side > 0 ? 2 : 0)) % kit.boulders.length], M4(px, WATER - 0.45, pz, rnd(sd + k) * 6.28, 1.0 + rnd(sd + k * 7) * 0.7), gtx, gty);
          const h = 2.0 + rnd(sd + k * 9 + side) * 3.2;
          B.add('monuments', proc.stalagmites[(k + 3) % proc.stalagmites.length], M4(px + 0.25, WATER - 0.25, pz + 0.3, rnd(sd + k * 11) * 6.28, [h * 0.85, h, h * 0.85]), gtx, gty);
        }
        for (let k = 0; k < 8; k++) {
          const lx = side * (HWB - 0.35 - rnd(sd + k * 13 + side) * 1.6), lz = Z0 + 0.6 + rnd(sd + k * 15 + side) * (Z1 - Z0 - 0.8), [px, pz] = Wd(lx, lz);
          B.add('monuments', proc.iceStalactites[k % proc.iceStalactites.length], M4(px, ceilY(px, pz) + 0.05, pz, rnd(sd + k * 17) * 6.28, 2.2 + rnd(sd + k * 19) * 1.8), gtx, gty);
        }
        // 側壁の水際に霜の岩棚（壁の根元を水に沈める）
        for (let k = 0; k < 4; k++) { const [px, pz] = Wd(side * (HWB - 0.3), Z0 + 0.8 + k * (Z1 - Z0 - 1.2) / 3); B.add('monuments', proc.frostLedges[(k + (side > 0 ? 1 : 0)) % proc.frostLedges.length], M4(px, WATER + 0.02, pz, yaw + side * Math.PI / 2, 0.9), gtx, gty); }
      }
      // 水門の土台：水に沈んだ切石と、その上に張った厚い氷（水門の足もとを水と氷に埋める）
      for (let k = 0; k < 9; k++) {
        const lx = (k - 4) * (gw / 8.6) + (rnd(sd + k) - 0.5) * 0.3, lz = gateFront + 0.1 + rnd(sd + k * 3) * 0.35;
        bag.add('sp:frostRock', at(stone(gw / 8 + 0.35, 0.7, 0.9, sd + k * 41, 0.08), lx, WATER - 0.3, lz, (rnd(sd + k * 43) - 0.5) * 0.25));

      }
      // 水路の白い氷の板は置かない（廃止した飛び石に見えるため）。水門の足もとの泡だけ
      for (let i = 0; i < 5; i++) { const [px, pz] = Wd((i - 2) * gw * 0.18, gateFront - 0.35); B.add('water_foam', kit.ripples[(i + sd) % kit.ripples.length], M4(px, WATER + 0.03, pz, rnd(sd + i) * 6.28, 1.0 + (i % 3) * 0.3), gtx, gty); }
      B.add('monuments', bag.piece('b2sp_watergate_basin'), M4(ox, 0, oz, yaw), gtx, gty);
      // 光：手前から水門の正面を照らす（白飛びさせない）＋水門の足もとの水
      { const [px, pz] = W(0, Z0 + 1.0); light(px, 2.6, pz, 0x8fdcff, 1.3, 9); }
      { const [px, pz] = W(0, gateFront - 0.9); light(px, 0.6, pz, 0x5fd0ff, 1.0, 6); }
      log.watergate = { maze: true, view: [vx, vy], facing: f, gate: [gtx, gty], x: vx, y: vy, w: 3, h: 2, front: [vx, vy], scale: +s.toFixed(3), gateFrontCells: +((Z1 - gd) / CELL).toFixed(2) };
      return true;
    }

    /* ---------------- F6 橋 ---------------- */
    // br：{ tx, ty, ry, len }（中央のマス・向き・マス数。len が偶数なら tx/ty は中央の手前のマスで、off で半マスずらす）。
    // 古代の氷橋の橋桁と欄干を通り道の高さに置き、Pinterest C（暗い洞窟で水路をまたぐ石の橋）のように
    //  ・橋桁の側面（霜の切石の帯）と、水へ降りる橋脚（水切りの尖った石＋根元の氷の縁）
    //  ・桁の縁から水面近くまで垂れる氷柱
    //  ・両端の親柱（霜の石を積み、上に小さな氷の結晶。光は弱い）
    //  ・たもとの踏み石と氷岸（V11）
    // で「水路をまたぐ古い橋」に見せる。通行判定は変えない（橋のマスは迷宮班 M が床にしている）。
    const Y0 = 0.24, DECK = 8.45 + Y0, RAIL0 = 8.5 + Y0;   // 古代の氷橋 v02：橋桁の上面と欄干の根元の高さ（読み込み後）
    const BR_WATER = -0.08;                                // 水面（水面班 W のタイルと同じ高さ）
    function buildBridge(br, deckSrc, EX) {
      if (!deckSrc) return false;
      let deck = cache.get('deck');
      if (!deck) {
        // 橋桁（7.4m〜8.5m）と欄干（8.5m 以上）を切り出す。下の橋脚・瓦礫・水面は使わない
        // 読み込み時に底面を y=0 へ移しているので、元の高さ（底面 -0.24m）から +0.24m ずれる
        const slab = cutPiece(deckSrc, (x, y, z, src) => y > 7.35 + Y0 && y <= 8.5 + Y0 && !/water|pool/i.test(src), 'b2sp_bridge_deck');
        const rail = cutPiece(deckSrc, (x, y, z, src) => y > 8.5 + Y0 && !/water|pool|lantern/i.test(src), 'b2sp_bridge_rail');
        // 模型全体の中心で原点を合わせているため、橋桁だけを見ると左右に 0.4m ほどずれる → 橋桁の中心へ合わせ直す
        const cx = slab.min.x + slab.size.x / 2, cz = slab.min.z + slab.size.z / 2;
        for (const pc of [slab, rail]) for (const pt of pc.parts) pt.geo.translate(-cx, 0, -cz);
        deck = { slab, rail, w: slab.size.z }; cache.set('deck', deck);
      }
      const nC = br.len || 3, len = nC * CELL + 1.2, sx = len / 21.9, along = Math.abs(Math.sin(br.ry)) < 0.5;
      const [x, z] = toW(X(br.tx), Z(br.ty), br.ry, br.off || 0, 0), yaw = br.ry, TOP = 0.26;
      // 橋桁：厚さ 1.1m → 0.34m、上面を TOP に。欄干：高さ 1.7m → 0.9m。幅は 1マス（4m）の 85%
      const sySlab = 0.31, syRail = 0.53, szW = Math.min(1.25, 3.3 / Math.max(deck.w, 0.1));
      placeAsset(B, 'bridge', deck.slab, x, TOP - DECK * sySlab, z, yaw, [sx, sySlab, szW], br.tx, br.ty);
      placeAsset(B, 'bridge', deck.rail, x, TOP + (RAIL0 - DECK) * sySlab - RAIL0 * syRail, z, yaw, [sx, syRail, szW], br.tx, br.ty);
      const HW = deck.w * szW / 2;   // 橋桁の半幅
      const bag = Bag(), sd = br.tx * 37 + br.ty * 11, L2 = len / 2;
      // 側面：橋桁の下から水の中まで、霜の切石を2段（上段は少し張り出す蛇腹）。白飛びしない霜の青い石
      for (const side of [-1, 1]) {
        for (let lx = -L2 + 0.55, k = 0; lx < L2 - 0.55; k++) {
          const w = Math.min(L2 - 0.55 - lx, 0.7 + rnd(sd + k * 3 + side) * 0.6);
          bag.add('sp:stairStone', at(stone(w - 0.03, 0.5, 0.34, sd + k * 7 + side * 3, 0.03), lx + w / 2, TOP - 0.36, side * (HW + 0.06)));
          bag.add('sp:frostRock', at(stone(w - 0.02, 0.7, 0.4, sd + k * 9 + side * 5, 0.05), lx + w / 2, TOP - 0.95, side * (HW + 0.02)));
          lx += w;
        }
        // 蛇腹（桁の縁の張り出し）
        bag.add('sp:stairStone', at(stone(len - 1.0, 0.12, 0.2, sd + side * 13, 0.02), 0, TOP - 0.07, side * (HW + 0.2)));
      }
      // 橋脚：マスの境目（と1マスの橋なら中央）の両側に、水を切る尖った石の脚。根元に氷の縁、上に霜の笠石
      const piers = []; for (let i = 1; i < nC; i++) piers.push(-nC * CELL / 2 + i * CELL); if (!piers.length) piers.push(0);
      for (const px of piers) for (const side of [-1, 1]) {
        const ps = sd + Math.round(px * 7) + side * 101, h = TOP - 0.1 + 1.1, cy = TOP - 0.1 - h / 2;
        bag.add('sp:frostRock', at(stone(1.0, h, 0.9, ps, 0.06), px, cy, side * (HW + 0.3)));
        { const g = stone(0.72, h * 0.96, 0.72, ps + 1, 0.05); bag.add('sp:frostRock', at(g, px, cy - 0.02, side * (HW + 0.72), Math.PI / 4)); }   // 水切り（45°の角）
        bag.add('sp:stairStone', at(stone(1.2, 0.16, 1.15, ps + 2, 0.03), px, TOP - 0.02, side * (HW + 0.38)));   // 笠石
        // 橋脚の上の控え柱（欄干の外側に欄干より少し高く立ち上げ、横から見たときに橋脚の並びがわかるように）
        { const ph = 0.95; bag.add('sp:frostRock', at(stone(0.62, ph, 0.5, ps + 4, 0.05), px, TOP + 0.06 + ph / 2, side * (HW + 0.33))); bag.add('sp:stairStone', at(stone(0.76, 0.12, 0.64, ps + 5, 0.03), px, TOP + 0.06 + ph + 0.06, side * (HW + 0.33))); }
        for (let q = 0; q < 4; q++) bag.add('ice', at(icicle(0.04 + rnd(ps + q) * 0.03, 0.18 + rnd(ps + q * 3) * 0.22, ps + q), px + (rnd(ps + q * 5) - 0.5) * 1.0, TOP - 0.1, side * (HW + 0.85 + rnd(ps + q * 7) * 0.12)));
      }
      // 桁の縁の氷柱（蛇腹の下から水面近くまで。両端寄りは短く）
      for (const side of [-1, 1]) for (let k = 0; k < 22; k++) {
        const lx = (rnd(sd + k * 5 + side) - 0.5) * (len - 1.4), edge = 1 - Math.abs(lx) / L2;
        const ln = (0.1 + rnd(sd + k * 3 + side * 7) * 0.26) * (0.5 + edge * 0.7);
        bag.add('ice', at(icicle(0.025 + rnd(sd + k + side) * 0.03, ln, sd + k * 11 + side), lx, TOP - 0.14, side * (HW + 0.24 + rnd(sd + k * 13) * 0.05)));
      }
      // 親柱：両端の左右。霜の石を3〜4段積み、笠石の上に小さな氷の結晶
      for (const end of [-1, 1]) for (const side of [-1, 1]) {
        const lx = end * (L2 - 0.45), lz = side * (HW + 0.1), ps = sd + end * 17 + side * 29;
        let y = TOP - 0.05; const nS = 3 + (rnd(ps) < 0.5 ? 1 : 0);
        for (let q = 0; q < nS; q++) { const h = 0.3 + rnd(ps + q) * 0.08; bag.add('sp:stairStone', at(stone(0.4 - q * 0.02, h, 0.4 - q * 0.02, ps + q * 3, 0.03), lx, y + h / 2, lz, (rnd(ps + q * 5) - 0.5) * 0.1)); y += h; }
        bag.add('sp:stairStone', at(stone(0.54, 0.13, 0.54, ps + 9, 0.02), lx, y + 0.07, lz));
        for (let q = 0; q < 2; q++) {
          const g = new THREE.ConeGeometry(0.04 + rnd(ps + q) * 0.03, 0.16 + rnd(ps + q * 3) * 0.14, 5); noUv(g); g.translate(0, (0.22 + rnd(ps + q * 3) * 0.2) / 2, 0);
          bag.add('crystalIce', at(g, lx + (rnd(ps + q * 7) - 0.5) * 0.2, y + 0.13, lz + (rnd(ps + q * 9) - 0.5) * 0.2, 0, (rnd(ps + q * 11) - 0.5) * 0.6, (rnd(ps + q * 13) - 0.5) * 0.6));
        }
        for (let q = 0; q < 3; q++) bag.add('ice', at(icicle(0.025, 0.1 + rnd(ps + q) * 0.12, ps + q), lx + (rnd(ps + q * 3) - 0.5) * 0.5, y, lz + (rnd(ps + q * 5) - 0.5) * 0.5));
      }
      // たもと：岸側に霜の石の踏み台（段差をなじませる）
      for (const end of [-1, 1]) {
        const lx = end * (L2 - 0.2);
        // 1枚の長い板にせず、幅を3つに割った不揃いの石（霜は控えめ＝白い帯に見せない）
        for (let q = 0; q < 3; q++) {
          const w = (HW * 2 - 0.3) / 3, lzq = -HW + 0.15 + w * (q + 0.5);
          bag.add('sp:frostRock', at(stone(0.85 + rnd(sd + end * 7 + q) * 0.15, 0.3, w - 0.05, sd + end * 7 + q * 3, 0.06), lx + end * 0.35, TOP - 0.18 - rnd(sd + q) * 0.03, lzq, (rnd(sd + end + q * 5) - 0.5) * 0.1));
          bag.add('sp:frostRock', at(stone(0.65 + rnd(sd + end * 9 + q) * 0.15, 0.22, w - 0.08, sd + end * 9 + q * 3, 0.06), lx + end * 1.0, TOP - 0.25 - rnd(sd + q * 3) * 0.03, lzq + (rnd(sd + q * 7) - 0.5) * 0.1, (rnd(sd + end * 3 + q) - 0.5) * 0.12));
        }
      }
      B.add('bridge', bag.piece('b2sp_bridge_ice'), M4(x, 0, z, yaw), br.tx, br.ty);
      // 氷岸 V11：両端の左右に1つずつ（水から立ち上がる氷の岸）
      const banks = [];
      for (const end of [-1, 1]) for (const side of [-1, 1]) {
        const id = side < 0 ? 'bankL' : 'bankR', pc = EX && (EX[id] || EX.bankL || EX.bankR); if (!pc) continue;
        const lx = end * (L2 - 1.0), lz = side * (HW + 1.0), [px, pz] = toW(x, z, yaw, lx, lz);
        const sc = Math.min(2.1 / Math.max(pc.size.x, pc.size.z, 0.01), 1.25 / Math.max(pc.size.y, 0.01));
        placeAsset(B, 'bridge', pc, px, -0.62, pz, yaw + (side > 0 ? Math.PI : 0) + (rnd(sd + end + side) - 0.5) * 0.3, sc, Math.round(px / CELL), Math.round(pz / CELL));
        banks.push([+(px / CELL).toFixed(2), +(pz / CELL).toFixed(2)]);
      }
      // 光：親柱の結晶の上（弱く）と、橋の下の水（ほのかに）
      for (const end of [-1, 1]) { const [lx, lz] = toW(x, z, yaw, end * (L2 - 0.45), 0); light(lx, 1.6, lz, 0x8fe0ff, 0.55, 5.5); }
      light(x, 0.2, z, 0x5fd0ff, 0.45, 5);
      const rec = { tx: br.tx, ty: br.ty, ry: br.ry, len: nC, banks, along, cells: br.cells || null, ends: br.ends || null };
      log.bridge = log.bridge || rec; log.bridges.push(rec);
      return true;
    }
    // 迷宮班 M の橋（a.b2Features.bridges の1件：cells＝橋のマス、ends＝両端の岸のマス、dir＝渡る向き 'x'|'y'）
    function buildMazeBridge(fb, deckSrc, EX) {
      if (!fb || !fb.cells || !fb.cells.length) return false;
      const alongX = fb.dir ? fb.dir === 'x' : fb.cells.every(([, y]) => y === fb.cells[0][1]);
      const cells = fb.cells.slice().sort((p, q) => alongX ? p[0] - q[0] : p[1] - q[1]), n = cells.length, mid = cells[Math.floor((n - 1) / 2)];
      // ry=0：局所 x＝世界 x。ry=π/2：局所 x＝世界 -z → 偶数マスの半マスずらしの向きを合わせる
      const ry = alongX ? 0 : Math.PI / 2, off = n % 2 ? 0 : (alongX ? CELL / 2 : -CELL / 2);
      return buildBridge({ tx: mid[0], ty: mid[1], ry, len: n, off, cells, ends: fb.ends }, deckSrc, EX);
    }

    /* ---------------- F5 柱のまとまり ---------------- */
    // (cx, cz) を中心に、霜の石畳＋柱2〜3本（2本に梁を渡す）＋倒れた柱＋瓦礫。fwd：壁から離れる向き（角・行き止まりのとき）
    // mode 'point'：4マスの角の点（中心から 1.35m 以内に収める）／'corner'：部屋の角／'deadend'：行き止まりの奥
    function pillarCluster(cx, cz, mode, fwd, assets, EX, tx, ty, seedIn) {
      const A = assets.pillarA || assets.pillarG; if (!A) return false;
      for (const k of ['pillarA', 'pillarG', 'pillarR']) restylePillar(assets[k]);
      const sd = seedIn || Math.round(cx * 13 + cz * 7), bag = Bag();
      const rot = (lx, lz, yaw) => toW(cx, cz, yaw, lx, lz);
      // 局所の向き：+Z が fwd（壁から離れる向き）。点のときは斜め45°
      const yaw = fwd ? Math.atan2(fwd[0], fwd[1]) : Math.PI / 4 + Math.floor(rnd(sd) * 4) * Math.PI / 2;
      let spots;
      if (mode === 'point') spots = [[-0.66, -0.5], [0.66, -0.5]];
      else if (mode === 'deadend') spots = [[-1.22, -1.0], [1.22, -1.0]];
      else spots = [[-0.55, -0.55], [0.55, -0.85]];
      const third = mode !== 'point' && rnd(sd + 3) < 0.6;
      // 石畳：不揃いな平たい石を敷く（隙間あり・少し傾く）
      const fr = mode === 'point' ? 1.2 : 1.45;
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
        if (rnd(sd + i * 7 + j * 13) < 0.28) continue;
        let lx = i * fr / 2.3 + (rnd(sd + i * 3 + j) - 0.5) * 0.18, lz = j * fr / 2.3 + (rnd(sd + i + j * 5) - 0.5) * 0.18;
        if (mode !== 'point') lz -= 0.35;
        if (Math.hypot(lx, lz) > fr + 0.15) continue;
        const w = 0.42 + rnd(sd + i * 11 + j) * 0.26, dd = 0.36 + rnd(sd + i + j * 17) * 0.26, h = 0.08 + rnd(sd + i * 5 + j * 3) * 0.06;
        const [wx, wz] = rot(lx, lz, yaw);
        bag.add('sp:flag', at(stone(w, h, dd, sd + i * 19 + j * 23, 0.03), wx, groundY(wx, wz) - 0.02 + h / 2 - 0.03, wz, rnd(sd + i * 29 + j) * 0.6, (rnd(sd + i + j * 31) - 0.5) * 0.06, (rnd(sd + i * 37 + j) - 0.5) * 0.06));
      }
      // 柱：2本（＋3本目）。2本の上に梁（片側が落ちかけ）
      // 大きさ：通り道（マスの中心・辺の中点）をふさがない太さのまま、背を高くして「門のような柱と梁」に見せる
      const scXZ = mode === 'point' ? 0.6 : 0.56, scY = mode === 'point' ? 0.78 : mode === 'deadend' ? 0.8 : 0.86;
      const sc = [scXZ, scY, scXZ], hP = (A.size.y || 4.42) * scY;
      spots.forEach(([lx, lz], i) => {
        const [wx, wz] = rot(lx, lz, yaw), pc = i === 1 && assets.pillarG && rnd(sd + 5) < 0.3 ? assets.pillarG : A;   // 氷河の柱（発光する結晶つき）はまれに＝光の点を増やさない
        placeAsset(B, 'pillars', pc, wx, groundY(wx, wz) - 0.06, wz, yaw + Math.floor(rnd(sd + i * 3) * 4) * Math.PI / 2, sc, tx, ty);
      });
      {
        const [l0, l1] = spots, mx = (l0[0] + l1[0]) / 2, mz = (l0[1] + l1[1]) / 2, span = Math.hypot(l1[0] - l0[0], l1[1] - l0[1]) + 0.9;
        const [wx, wz] = rot(mx, mz, yaw), ang = yaw + Math.atan2(-(l1[1] - l0[1]), l1[0] - l0[0]);
        const tilt = (rnd(sd + 9) - 0.5) * 0.08;
        bag.add('sp:flag', at(stone(span, 0.42, 0.62, sd + 41, 0.05), wx, groundY(wx, wz) + hP + 0.17, wz, ang, tilt));
        bag.add('sp:flag', at(stone(span * 0.92, 0.14, 0.7, sd + 43, 0.03), wx, groundY(wx, wz) + hP + 0.45, wz, ang, tilt));
        // 梁の上に積もった霜の塊と、梁の端の欠け（片側が少し落ちかけ）
        for (let q = 0; q < 3; q++) bag.add('ice', at(stone(0.3 + rnd(sd + q * 61) * 0.35, 0.07, 0.4, sd + q * 63, 0.04), wx + Math.cos(ang) * (q - 1) * span * 0.3, groundY(wx, wz) + hP + 0.54, wz - Math.sin(ang) * (q - 1) * span * 0.3, ang + (rnd(sd + q) - 0.5) * 0.4));
        for (let q = 0; q < 10; q++) bag.add('ice', at(icicle(0.03 + rnd(sd + q) * 0.03, 0.15 + rnd(sd + q * 3) * 0.3, sd + q), wx + Math.cos(ang) * (rnd(sd + q * 5) - 0.5) * span * 0.8, groundY(wx, wz) + hP - 0.04, wz - Math.sin(ang) * (rnd(sd + q * 5) - 0.5) * span * 0.8));
      }
      if (third && assets.pillarR) {
        const [wx, wz] = rot(mode === 'deadend' ? 0 : 0.85, mode === 'deadend' ? -1.35 : 0.2, yaw);
        placeAsset(B, 'pillars', assets.pillarR, wx, groundY(wx, wz) - 0.06, wz, yaw + Math.PI / 2 + (rnd(sd + 11) - 0.5) * 0.4, mode === 'deadend' ? 0.52 : 0.45, tx, ty);
      }
      // 倒れた柱（石造遺跡V4）と瓦礫：石畳の上、手前寄り（通り道の中央には出さない）
      if (EX && EX.ruinFallen) {
        const pc = EX.ruinFallen, s = Math.min(1.7 / Math.max(pc.size.x, 0.01), 0.55 / Math.max(pc.size.y, 0.01));
        const [wx, wz] = rot(mode === 'point' ? -0.1 : -0.3, mode === 'point' ? 0.35 : 0.15, yaw);
        placeAsset(B, 'extras', pc, wx, groundY(wx, wz) - 0.05, wz, yaw + (rnd(sd + 13) - 0.5) * 0.5, s, tx, ty);
      }
      if (EX && EX.ruinRubble) {
        const pc = EX.ruinRubble, s = Math.min(1.3 / Math.max(pc.size.x, 0.01), 0.4 / Math.max(pc.size.y, 0.01));
        const [wx, wz] = rot(mode === 'point' ? 0.55 : 0.6, mode === 'point' ? 0.4 : -0.1, yaw);
        placeAsset(B, 'extras', pc, wx, groundY(wx, wz) - 0.06, wz, rnd(sd + 17) * 6.28, s, tx, ty);
      }
      for (let q = 0; q < 5; q++) {
        const [wx, wz] = rot((rnd(sd + q * 41) - 0.5) * fr * 1.4, (rnd(sd + q * 43) - 0.5) * fr * 1.2 - (mode === 'point' ? 0 : 0.3), yaw), w = 0.16 + rnd(sd + q * 47) * 0.2;
        bag.add('sp:flag', at(stone(w, w * 0.7, w * 0.9, sd + q * 53, 0.05), wx, groundY(wx, wz) + w * 0.25, wz, rnd(sd + q * 59) * 6.28, rnd(sd + q) * 0.5));
      }
      B.add('pillars', bag.piece('b2sp_ruin_cluster'), new THREE.Matrix4(), tx, ty);
      light(cx, 2.2, cz, 0x6fd0ff, 0.45, 4.5);
      log.clusters.push({ mode, tx, ty, x: +(cx / CELL).toFixed(2), z: +(cz / CELL).toFixed(2), fwd: fwd ? fwd.slice() : null });
      return true;
    }

    // マップ内に残すモニュメント：正面（模型の +Z）を、塊のまわりで最も開けた側へ向ける
    function monumentYaw(m) {
      let best = null;
      for (const d of DIR_ORDER) {
        let open = 0;
        const [dx, dy] = vec(d);
        const n = dx ? m.h : m.w;
        for (let k = 0; k < n; k++) {
          const tx = dx ? (dx > 0 ? m.x + m.w : m.x - 1) : m.x + k, ty = dy ? (dy > 0 ? m.y + m.h : m.y - 1) : m.y + k;
          let s = 0; for (let x = tx, y = ty; s < 4 && walk(x, y); x += dx, y += dy) s++;
          open += s;
        }
        if (!best || open > best.open) best = { d, open };
      }
      return best ? FACE_YAW[best.d] : 0;
    }

    return {
      planStairs, buildStairs: (o) => { const st = stairs.find((q) => q.o === o); return st ? buildStairs(st) : null; },
      skipWall: (tx, ty, d) => skip.has(`${tx},${ty},${d}`),
      ownsFloor: (tx, ty) => ownFloor.has(`${tx},${ty}`),
      planBackdrops, buildBackdrop, buildWatergate, buildMazeWatergate, buildBridge, buildMazeBridge, pillarCluster, monumentYaw, readRole,
      info: () => log,
    };
  }

  function dispose() {
    for (const v of cache.values()) for (const p of [v.slab, v.rail]) p && p.parts.forEach((pt) => pt.geo.dispose());
    cache.clear();
  }
  return { begin, dispose, restylePillar };
}
