/* ============================================================
   field/b2-water-tiles.js — 第2階層「凍てつく水源」の危険な水面（非通行の水域）と床の模様の調整
   ------------------------------------------------------------
   担当：Claude（B2 v4 水面班 W）。設計：docs/3d/B2_V4_FEEDBACK_DESIGN.md の F7・F10c・F10d。
   ・危険な水面は GPT の水面タイル v0.7（16種。tools/b2-render/build-modular-water-tiles.py、
     docs/3d/B2_WATER_TILE_CLAUDE_HANDOFF.md）で描く。ファイルは assets/models/floor2/water-tiles/v07/lite/
     （Actions で再生成し、平らな格子だけを間引いた版。未承認素材）。
   ・各マスの「水がつながる方向」から N=8 / E=2 / S=1 / W=4 のビットマスクを作り、water_tile_<mask>.glb を選ぶ。
     マスクは隣どうしで同じ判定（両方が水面か）から作るので、A.E == B.W・A.S == B.N が必ず成り立つ（接合線で水と陸が食い違わない）。
     念のため組み立てごとに全ての隣接を検査し、食い違い・外周に接する水面を info() に記録する（外周に接するマスは描かない）。
   ・通行判定は従来どおりマップ側（'~' は FIELD_SOLID）。ここは見た目だけ。
   ・どのマスが危険な水面かは B2V4W_ROLES で決める（迷宮班 M の tileRoles 確定後に名前を差し替えられる）。
   ・使うマスクの GLB だけを1回だけ読み、マスごとに Batcher（区画×素材でまとめる既存の仕組み）へ渡して描画回数を抑える。
     読み込み時に軽くする：川底・浅い棚・岸の石板（平らなのに1枚 数千三角形）は海岸線の式による 12×12 の格子1枚に置き換え、
     岸の岩は間引き（SimplifyModifier）、水の中に立つ小岩（遠目に黒い棘）は置かず、水中の岩は低くして水面の下へ沈める。
   ・読み込めない場合は、従来の水面（平らな水＋暗い底）で描く（画面を壊さない）。
   ・水たまり（通れる浅瀬 '*'）は従来の浅く明るい水のまま。危険な水面は岸ぎわのターコイズ → 中央の深い青（頂点色）、縁に泡、
     岸の岩は #203 の青い岩の色に霜をのせ、床との境の帯に霜の縁取り（少し盛り上がった白い青の線）を付けて「入れない」ことを示す。
   ・床（F10c）：岩盤の UV を世界座標にそろえ、光る水脈がマスの境で直線に切れないようにした。光る水たまりの楕円は縁へ向けて消えるにじみにした。
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// 役割名（迷宮班 M の確定後に差し替える）。hazard＝危険な水面（非通行）。chars はマップ文字で判定する場合
export const B2V4W_ROLES = { hazard: new Set(['water-hazard']), hazardChars: new Set(['~']) };
export function setB2WaterRoles({ hazard, hazardChars } = {}) {
  if (hazard) B2V4W_ROLES.hazard = new Set(hazard);
  if (hazardChars) B2V4W_ROLES.hazardChars = new Set(hazardChars);
}
// 水面の上の四角い石板（壊れた橋の飛び石）は廃止（F7）
export const B2V4W_REMOVE_STEPPING_STONES = true;

const TILE_DIR = './assets/models/floor2/water-tiles/v07/lite/';
const BIT = { up: 8, right: 2, down: 1, left: 4 };            // N=8 E=2 S=1 W=4（DIR_VEC の up は ty-1＝北）
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const WATER_Y = -0.035;                                         // タイルの原点（水面）の高さ。床（0.03前後）より一段下（岸の縁で段差が見える）

// GPT の生成スクリプトと同じ海岸線（水の内側で正、陸で負）。x・y はタイル内の -0.5〜0.5（y は北が正）
function coast(x, y, mask) {
  let m = 1, any = false;
  for (const [bit, coord] of [[8, y], [1, -y], [2, x], [4, -x]]) {
    if (mask & bit) continue;
    const along = (bit === 8 || bit === 1) ? x : y;
    const wob = 0.052 * Math.sin(along * 12 + bit * 2) + 0.031 * Math.sin(along * 23 + bit) + 0.015 * Math.sin(along * 43 + bit * 0.7);
    const v = 0.32 - coord + wob; m = any ? Math.min(m, v) : v; any = true;
  }
  return any ? m : 1;
}
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function canvasTex(n, draw, srgb) {
  const cv = document.createElement('canvas'); cv.width = cv.height = n; draw(cv.getContext('2d'), n);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; return t;
}
// さざ波の法線マップ（周期的。スクロールさせて流れを出す）
function rippleNormal() {
  const n = 256, H = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = x / n * Math.PI * 2, v = y / n * Math.PI * 2;
    H[y * n + x] = Math.sin(u * 3 + Math.sin(v * 2) * 1.1) * 0.5 + Math.sin(v * 5 + Math.sin(u * 3) * 0.9) * 0.35
      + Math.sin(u * 11 + v * 7 + Math.sin(v * 3)) * 0.14 + Math.sin(u * 19 - v * 13) * 0.06;
  }
  return canvasTex(n, (c) => {
    const img = c.createImageData(n, n), at = (x, y) => H[((y + n) % n) * n + ((x + n) % n)];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = (at(x - 1, y) - at(x + 1, y)) * 2.2, dy = (at(x, y + 1) - at(x, y - 1)) * 2.2, l = Math.hypot(dx, dy, 1), i = (y * n + x) * 4;
      img.data[i] = (dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }, false);
}

/* ------------------------------------------------------------
   床の模様（F10c）：斑点（光る水たまりの楕円と、岩盤の濃淡）を小さく・低コントラストにし、水脈・岩盤の青に寄せる。消しはしない
   ------------------------------------------------------------ */
function tuneFloor(mats, proc, owned) {
  if (proc.__b2v4wFloor) return; proc.__b2v4wFloor = true;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  // 岩盤の UV を世界座標にそろえる（マスごとに 0〜1 だったため、光る水脈と石の模様がマスの境で直線に切れていた）
  const ground = proc.continuousGround;
  proc.continuousGround = (wx, wz, cell) => {
    const pc = ground(wx, wz, cell), g = pc.parts[0].geo, p = g.attributes.position, uv = g.attributes.uv;
    if (uv) for (let i = 0; i < p.count; i++) uv.setXY(i, (wx + p.getX(i)) / cell, -(wz + p.getZ(i)) / cell);
    return pc;
  };
  // 光る水たまり（床の斑点）：硬い楕円＋淡い石の縁 → 縁へ向けて消える、岩盤と同じ青の濡れたにじみ（頂点の透明度）。縁の石は使わない
  mats['wt:puddle'] = std({ color: 0x3fb4d8, roughness: 0.1, metalness: 0.1, emissive: 0x1689b8, emissiveIntensity: 0.32, envMapIntensity: 1.0, vertexColors: true, transparent: true, depthWrite: false });
  const soft = (v) => {
    const n = 22, pos = [0, 0, 0], col = [1, 1, 1, 0.5], idx = [];
    for (let i = 0; i < n; i++) {
      const t = i / n * Math.PI * 2, r = 0.62 * (1 + 0.16 * Math.sin(t * 3 + v * 2.1) + 0.08 * Math.sin(t * 5 + v));
      pos.push(Math.cos(t) * r * (1.15 + v * 0.2), 0, Math.sin(t) * r * (0.78 + v * 0.08)); col.push(1, 1, 1, 0);
      idx.push(0, 1 + ((i + 1) % n), 1 + i);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); g.setIndex(idx);
    g.computeVertexNormals(); owned.push(g);
    return g;
  };
  (proc.puddles || []).forEach((pc, v) => { pc.parts = [{ geo: soft(v), mat: 'wt:puddle' }]; });
  // 岩盤の色テクスチャ：濃淡（大きな斑）を平均へ 45% 寄せ、少しだけ青へ。水脈（emissiveMap）はそのまま
  const fl = mats.caveFloor, src = fl && fl.map && fl.map.image;
  if (src && src.getContext) {
    const n = src.width, cv = document.createElement('canvas'); cv.width = cv.height = n;
    const c = cv.getContext('2d'); c.drawImage(src, 0, 0);
    const img = c.getImageData(0, 0, n, n), d = img.data;
    let mr = 0, mg = 0, mb = 0; for (let i = 0; i < d.length; i += 4) { mr += d[i]; mg += d[i + 1]; mb += d[i + 2]; }
    const k = d.length / 4; mr /= k; mg /= k; mb /= k;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = mr + (d[i] - mr) * 0.55 - 2; d[i + 1] = mg + (d[i + 1] - mg) * 0.55 + 2; d[i + 2] = mb + (d[i + 2] - mb) * 0.55 + 5;
    }
    c.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = fl.map.anisotropy; t.repeat.copy(fl.map.repeat);
    fl.map = t; fl.normalScale = new THREE.Vector2(0.75, 0.75); fl.needsUpdate = true;
    owned.push(t);
  }
}

/* ------------------------------------------------------------
   本体
   ctx: { CELL, DIR_VEC, DIR_ORDER, FACE_YAW, hash, M4, proc, mats, CEIL_H, ceilY }
   ------------------------------------------------------------ */
export function createB2WaterTiles(ctx) {
  const { CELL, DIR_VEC, DIR_ORDER, FACE_YAW, hash, M4, proc, mats, ceilY } = ctx;
  const owned = [];          // 階層を離れるときに破棄する物（テクスチャ・形）
  tuneFloor(mats, proc, owned);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const ripple = rippleNormal(); ripple.repeat.set(0.42, 0.42); owned.push(ripple);
  const glow = { value: 0.5 };
  // 危険な水面：#203 の明るいシアンと同じ色域で、岸ぎわは明るいターコイズ → 中央ほど深い青（頂点色）、縁に泡。
  // 水たまり（'*'、通れる浅い水）より濃く深く見せ、「入れない深さ」を色で伝える
  // 白く見えた原因：多数の点光源の照り返しと拡散光が水面全体を白く飛ばしていた。拡散色を暗くし（色は頂点色の発光で出す）、
  // 照り返しは弱く・少し広く（MeshPhysical の specularIntensity）。さざ波の揺らぎと、わずかな映り込みだけ残す
  const water = new THREE.MeshPhysicalMaterial({ color: 0x3a6a86, vertexColors: true, roughness: 0.16, metalness: 0.0, specularIntensity: 0.32, normalMap: ripple, normalScale: new THREE.Vector2(0.45, 0.45),
    envMapIntensity: 0.4, transparent: true, opacity: 0.92, depthWrite: false });
  water.onBeforeCompile = (sh) => {
    sh.uniforms.wtGlow = glow;
    sh.fragmentShader = 'uniform float wtGlow;\n' + sh.fragmentShader.replace('#include emissivemap_fragment', '#include emissivemap_fragment\n  totalEmissiveRadiance += vColor.rgb * wtGlow;');
  };
  water.customProgramCacheKey = () => 'b2v4w-water';
  const rockMap = mats['Deep cavern rock'].map, rockNormal = mats['Deep cavern rock'].normalMap;
  Object.assign(mats, {
    'wt:water': water,
    // 水底（頂点色で 岸の淡い鉱物 → 深い青緑）。水を通して見える
    'wt:bed': std({ color: 0xffffff, map: rockMap, normalMap: rockNormal, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.8, emissive: 0x05304c, emissiveIntensity: 1.0, envMapIntensity: 0.4, vertexColors: true }),
    // 岸の岩：#203 の鮮やかな青い岩の色で、上を向いた面に霜（頂点色）。黒く沈ませない
    'wt:ledge': std({ color: 0xffffff, map: rockMap, normalMap: rockNormal, normalScale: new THREE.Vector2(1.1, 1.1), roughness: 0.62, emissive: 0x0b3c62, emissiveIntensity: 0.9, envMapIntensity: 0.8, vertexColors: true }),
    'wt:film': std({ color: 0x2c98c4, roughness: 0.08, metalness: 0.1, emissive: 0x0f6a96, emissiveIntensity: 0.4, envMapIntensity: 0.7 }),
    'wt:fallback': std({ color: 0x3c9ec4, map: mats['Clear blue water'].map, roughness: 0.06, metalness: 0.1, emissive: 0x0b5f86, emissiveIntensity: 0.5, envMapIntensity: 1.4, transparent: true, opacity: 0.82, depthWrite: false }),
    'wt:deepbed': std({ color: 0x1a5272, roughness: 0.9, emissive: 0x04203a, emissiveIntensity: 1.0, vertexColors: true }),
    // 岸の帯：濡れた岩 → 霜の縁取り → 床（頂点色）
    'wt:bank': std({ color: 0xffffff, map: mats['Wet slate stone'].map, normalMap: mats['Wet slate stone'].normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.4, metalness: 0.02, emissive: 0x0a3550, emissiveIntensity: 0.7, envMapIntensity: 0.9, vertexColors: true }),
  });
  const COLORS = { deep: new THREE.Color(0x032a4e), mid: new THREE.Color(0x0a5f8e), shallow: new THREE.Color(0x13a0bf), foam: new THREE.Color(0xbfeeff),
    bedLand: new THREE.Color(0x2f5f84), bedShelf: new THREE.Color(0x2f86a8), bedDeep: new THREE.Color(0x0c3558),
    rock: new THREE.Color(0x6aa6d6), rockLow: new THREE.Color(0x3f78a8), frost: new THREE.Color(0xa6d8ee) };

  let tiles = new Array(16).fill(null), loading = new Map(), failed = false, mode = 'none', stats = {};
  let hz = new Set(), W = 0, Hh = 0;
  const simplifier = new SimplifyModifier();

  // 水底＋岸の地面：GPT の川底（平らでも 3600 三角形あった）・浅い棚・岸の石板を、同じ海岸線の式による 12×12 の格子 1 枚にまとめる。
  // 陸（海岸線の外）は岸の石板の高さ、水の中は岸から中央へ深くなる。頂点色で 陸の岩 → 淡い鉱物の棚 → 深い青緑
  function bedGrid(mask) {
    const N = 12, pos = [], col = [], idx = [], c = new THREE.Color();
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const x = i / N - 0.5, y = 0.5 - j / N, d = coast(x, y, mask);
      const depth = d <= 0 ? 0 : smooth(0, 0.22, d);
      const h = d <= -0.015 ? 0.004 : -0.035 - 0.125 * depth;
      pos.push(x, h, -y);
      if (d <= -0.015) c.copy(COLORS.bedLand).multiplyScalar(0.9 + 0.1 * Math.sin(x * 37 + y * 23));
      else c.copy(COLORS.bedShelf).lerp(COLORS.bedDeep, smooth(0.05, 0.85, depth));
      col.push(c.r, c.g, c.b);
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, cc = a + N + 1, dd = cc + 1; idx.push(a, cc, b, b, cc, dd); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  // 部品の分類（GLB の形の名前・素材名 → このゲームの素材と扱い）
  function kind(meshName, matName) {
    const n = (meshName || '').toLowerCase(), m = (matName || '').toLowerCase();
    if (/glacial water surface|isolated flooded/.test(n) || /turquoise water/.test(m)) return 'water';
    if (/riverbed|shallow mineral shelves|dark slate shoreline/.test(n) || /riverbed|mineral shallows/.test(m)) return 'drop';   // bedGrid が代わる
    if (/erosion water finger/.test(n) || /water film/.test(m)) return 'film';
    if (/underwater worn boulder/.test(n)) return 'boulder';
    return 'ledge';
  }
  // 岩を間引く（GPT の岩は 1 個 360〜560 三角形。4m のマスでは 4 割で十分。失敗したら元のまま）
  function lighten(geo, keep) {
    try {
      // 削る数は「溶接した後の頂点数」に対して決める（GLB の三角形ごとの頂点数で決めると全部つぶれて失敗していた）
      const wd = mergeVertices(geo), n = wd.attributes.position.count, out = simplifier.modify(wd, Math.floor(n * (1 - keep)));
      wd.dispose();
      if (out && out.index && out.index.count >= 12) { geo.dispose(); return out; }
    } catch (e) { /* 元のまま */ }
    return geo;
  }
  // 岩の頂点色：上を向いた面ほど霜（白い青）、根元ほど濃い青
  function frostColors(geo, base) {
    geo.computeVertexNormals();
    const p = geo.attributes.position, nm = geo.attributes.normal, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const up = nm.getY(i), y = p.getY(i);
      c.copy(COLORS.rockLow).lerp(COLORS.rock, smooth(base - 0.04, base + 0.08, y)).lerp(COLORS.frost, smooth(0.7, 0.95, up) * smooth(base, base + 0.06, y) * 0.3);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  function prepTile(gltf, mask) {
    gltf.scene.updateMatrixWorld(true);
    const parts = [];
    gltf.scene.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      const mat = Array.isArray(o.material) ? o.material[0] : o.material, k = kind(o.name, mat && mat.name);
      if (k === 'drop') return;
      let geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
      for (const a of Object.keys(geo.attributes)) if (a !== 'position') geo.deleteAttribute(a);
      const p = geo.attributes.position;
      if (k === 'water') {   // 水面は真上向きの法線（間引いた細い三角形の陰の筋を出さない。さざ波は法線マップ）。頂点色：海岸線からの距離で水深の色＋縁の泡
        geo.computeVertexNormals();
        const nm = geo.attributes.normal; for (let i = 0; i < nm.count; i++) nm.setXYZ(i, 0, 1, 0);
        const col = new Float32Array(p.count * 3), pool = /isolated/i.test(o.name), c = new THREE.Color();
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = -p.getZ(i), d = pool ? 0.04 : coast(x, y, mask);
          const depth = smooth(0.0, 0.18, d);
          c.copy(COLORS.shallow).lerp(COLORS.mid, smooth(0, 0.45, depth)).lerp(COLORS.deep, smooth(0.5, 1, depth));
          const foam = pool ? 0 : (1 - smooth(0.0, 0.022, d)) * (0.6 + 0.4 * Math.sin(x * 61 + y * 47) * Math.sin(y * 29 - x * 13));
          c.lerp(COLORS.foam, Math.max(0, Math.min(0.6, foam)));
          col.set([c.r, c.g, c.b], i * 3);
        }
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        parts.push({ geo, mat: 'wt:water' });
      } else if (k === 'boulder') {   // 水中の岩：細い棒のように水面から突き出ていたので、低くして水面のすぐ下に沈める（水を通して見える深さの目印）
        geo.computeBoundingBox(); const y0 = geo.boundingBox.min.y;
        for (let i = 0; i < p.count; i++) p.setY(i, y0 + (p.getY(i) - y0) * 0.38);
        geo = lighten(geo, 0.25); frostColors(geo, -0.06);
        parts.push({ geo, mat: 'wt:ledge' });
      } else if (k === 'ledge') {     // 岸の岩：背を 6 割に、マスの外へ大きくはみ出さないよう内へ寄せる。上面に霜
        geo.computeBoundingBox(); const bb = geo.boundingBox, cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
        // 水の中に立つ小さな岩は、遠目に黒い棘に見えたので置かない（岸に沿った岩だけ残す＝「ここから先は水」の縁取り）
        if (coast(cx, -cz, mask) > 0.03) return;
        if (bb.max.y - bb.min.y < 0.09 || (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z) < 0.004) return;   // 小さすぎる岩は省く（三角形の節約）
        const sx = Math.max(0, bb.max.x - 0.52) - Math.max(0, -0.52 - bb.min.x), sz = Math.max(0, bb.max.z - 0.52) - Math.max(0, -0.52 - bb.min.z);
        for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setXYZ(i, p.getX(i) - sx, y > 0 ? y * 0.62 : y, p.getZ(i) - sz); }
        geo = lighten(geo, 0.26); frostColors(geo, 0.0);
        parts.push({ geo, mat: 'wt:ledge' });
      } else { geo.computeVertexNormals(); parts.push({ geo, mat: 'wt:film' }); }
    });
    parts.push({ geo: bedGrid(mask), mat: 'wt:bed' });
    // 長さ 0 の法線（間引きでつぶれた三角形）は上向きにする。シェーダーで正規化すると数でなくなり、後処理の光のにじみで画面全体が黒くなる
    for (const pt of parts) {
      const nm = pt.geo.attributes.normal; if (!nm) continue;
      for (let i = 0; i < nm.count; i++) { const x = nm.getX(i), y = nm.getY(i), z = nm.getZ(i), l = Math.hypot(x, y, z); if (!(l > 1e-6)) nm.setXYZ(i, 0, 1, 0); else if (Math.abs(l - 1) > 1e-3) nm.setXYZ(i, x / l, y / l, z / l); }
    }
    // 数でない頂点（間引きの失敗など）が 1 つでもある部品は捨てる（後処理の光のにじみで画面全体が黒くなるのを防ぐ）
    for (let i = parts.length - 1; i >= 0; i--) {
      const bad = Object.values(parts[i].geo.attributes).some((at) => { for (let k = 0; k < at.array.length; k++) if (!Number.isFinite(at.array[k])) return true; return false; });
      if (bad) { stats.nanParts = (stats.nanParts || 0) + 1; console.warn('[B2] 水面タイルの部品に数でない頂点', mask, parts[i].mat); parts[i].geo.dispose(); parts.splice(i, 1); }
    }
    if (parts.length < 2) throw new Error('empty water tile ' + mask);
    // 同じ素材の部品をまとめる（Batcher の手間を減らす）
    const by = new Map(); for (const pt of parts) { if (!by.has(pt.mat)) by.set(pt.mat, []); by.get(pt.mat).push(pt.geo); }
    const merged = [];
    for (const [mat, geos] of by) {
      const idx = geos.map((g) => (g.index ? g.toNonIndexed() : g));
      const names = Object.keys(idx[0].attributes), ok = idx.every((g) => Object.keys(g.attributes).length === names.length && names.every((nm) => g.attributes[nm] && g.attributes[nm].itemSize === idx[0].attributes[nm].itemSize));
      if (idx.length === 1 || !ok) { for (const g of idx) merged.push({ geo: g, mat }); continue; }
      const m = mergeSimple(idx); geos.forEach((g) => g.dispose()); idx.forEach((g) => g !== m && g.dispose && g.dispose());
      merged.push({ geo: m, mat });
    }
    let tris = 0; for (const pt of merged) tris += (pt.geo.index ? pt.geo.index.count : pt.geo.attributes.position.count) / 3;
    return { name: 'b2_water_tile_' + mask, parts: merged, tris };
  }
  function mergeSimple(geos) {
    const out = new THREE.BufferGeometry(), names = Object.keys(geos[0].attributes);
    for (const nm of names) {
      const size = geos[0].attributes[nm].itemSize, total = geos.reduce((s, g) => s + g.attributes[nm].count, 0), arr = new Float32Array(total * size);
      let o = 0; for (const g of geos) { arr.set(g.attributes[nm].array, o); o += g.attributes[nm].count * size; }
      out.setAttribute(nm, new THREE.BufferAttribute(arr, size));
    }
    return out;
  }
  // 使うマスクの GLB だけを読む（1 度読んだら階層にいる間は使い回す）。1 枚でも読めなければ従来の水面で描く
  const loader = new GLTFLoader();
  function loadTiles(masks) {
    const jobs = [];
    for (const m of masks) {
      if (tiles[m]) continue;
      if (!loading.has(m)) loading.set(m, loader.loadAsync(`${TILE_DIR}water_tile_${String(m).padStart(2, '0')}.glb`).then((g) => { tiles[m] = prepTile(g, m); }));
      jobs.push(loading.get(m));
    }
    return Promise.all(jobs).then(() => true).catch((e) => { console.warn('[B2] 水面タイルを読めなかったため従来の水面で描きます', e); for (const m of masks) if (!tiles[m]) loading.delete(m); return false; });
  }

  // 組み立ての始め：危険な水面のマスを決め、必要ならタイルを読む
  async function begin(a, info, roles) {
    const { ch } = info; W = a.w; Hh = a.h; hz = new Set(); stats = { cells: 0, masks: {}, mismatches: 0, borderSkipped: 0, tris: 0, mode: 'none', edgesChecked: 0 };
    const role = (tx, ty) => (roles && roles[ty] && roles[ty][tx]) || '';
    for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
      if (!(B2V4W_ROLES.hazardChars.has(ch(tx, ty)) || B2V4W_ROLES.hazard.has(role(tx, ty)))) continue;
      if (tx <= 0 || ty <= 0 || tx >= a.w - 1 || ty >= a.h - 1) { stats.borderSkipped++; continue; }   // 外周に接する水面は描かない（仕様違反として記録）
      hz.add(`${tx},${ty}`);
    }
    stats.cells = hz.size;
    // 隣接の検査：A の東と B の西（南北も）が同じ種類か
    for (const k of hz) {
      const [tx, ty] = k.split(',').map(Number), m = maskAt(tx, ty);
      stats.masks[m] = (stats.masks[m] || 0) + 1;
      for (const d of ['right', 'down']) {
        const nx = tx + DIR_VEC[d][0], ny = ty + DIR_VEC[d][1];
        const mine = !!(m & BIT[d]), theirs = hz.has(`${nx},${ny}`) ? !!(maskAt(nx, ny) & BIT[OPP[d]]) : false;
        stats.edgesChecked++; if (mine !== theirs) stats.mismatches++;
      }
    }
    if (stats.mismatches) console.warn('[B2] 水面タイルの接合が食い違う', stats.mismatches);
    if (hz.size) { const ok = await loadTiles(Object.keys(stats.masks).map(Number)); mode = ok ? 'tiles' : 'fallback'; } else mode = 'none';
    stats.loaded = tiles.filter(Boolean).length;
    stats.mode = mode;
    if (typeof window !== 'undefined') window.KotamaB2WaterTiles = { info: statsInfo };
  }
  const isHazard = (tx, ty) => hz.has(`${tx},${ty}`);
  function maskAt(tx, ty) {
    let m = 0; for (const d of DIR_ORDER) if (hz.has(`${tx + DIR_VEC[d][0]},${ty + DIR_VEC[d][1]}`)) m |= BIT[d];
    return m;
  }

  // 1マス：水面タイル（または従来の水面）、天井、壁、陸との境の岸
  // opts: { ch, wallCell, ceiling: bool, skipWall: (key) => bool }
  function addCell(B, tx, ty, opts) {
    const x = tx * CELL, z = ty * CELL, m = maskAt(tx, ty);
    if (mode === 'tiles' && tiles[m]) { B.add('water_tiles', tiles[m], M4(x, WATER_Y, z, 0, CELL), tx, ty); stats.tris += tiles[m].tris; }
    else {
      B.add('water_tiles', { name: 'wt_fallback', parts: [{ geo: proc.poolFull.parts[0].geo, mat: 'wt:fallback' }] }, M4(x, WATER_Y - 0.04, z), tx, ty);
      B.add('water_tiles', { name: 'wt_fallback_bed', parts: [{ geo: proc.bed.parts[0].geo, mat: 'wt:deepbed' }] }, M4(x, -0.62, z), tx, ty);
    }
    if (opts.ceiling) B.add('ceiling', proc.continuousCeiling(x, z, CELL), M4(x, ctx.CEIL_H, z), tx, ty);
    for (const d of DIR_ORDER) {
      const [dx, dy] = DIR_VEC[d], nx = tx + dx, ny = ty + dy, nk = `${nx},${ny}`;
      if (hz.has(nk)) continue;
      const ex = x + dx * CELL / 2, ez = z + dy * CELL / 2, di = DIR_ORDER.indexOf(d);
      if (opts.wallCell(nx, ny)) {
        if (opts.skipWall && opts.skipWall(nk)) continue;
        const ry = FACE_YAW[d] + Math.PI;
        B.add('walls', proc.continuousWall(ex, ez, ry, CELL), M4(ex, 0, ez, ry), tx, ty);
        // 水から立ち上がる岩（石筍）と、上の鍾乳石：壁ぎわに寄せる
        const along = [dy ? 1 : 0, dx ? 1 : 0];
        if (hash(tx, ty, 880 + di) < 0.32) {
          const t = (hash(tx, ty, 884 + di) - 0.5) * 3.0, inw = 0.3 + hash(tx, ty, 888 + di) * 0.25, h = 0.7 + hash(tx, ty, 892 + di) * 1.6;
          B.add('spires', proc.stalagmites[Math.floor(hash(tx, ty, 896 + di) * proc.stalagmites.length) % proc.stalagmites.length], M4(ex + along[0] * t - dx * inw, -0.45, ez + along[1] * t - dy * inw, hash(tx, ty, 900 + di) * 6.28, [h * 0.85, h, h * 0.85]), tx, ty);
        }
        if (opts.ceiling && hash(tx, ty, 904 + di) < 0.8) {
          const t = (hash(tx, ty, 908 + di) - 0.5) * 3.2, inw = 0.2 + hash(tx, ty, 912 + di) * 0.7, h = 1.1 + hash(tx, ty, 916 + di) * 2.0;
          const sx = ex + along[0] * t - dx * inw, sz = ez + along[1] * t - dy * inw;
          B.add('spires', proc.stalactites[Math.floor(hash(tx, ty, 920 + di) * proc.stalactites.length) % proc.stalactites.length], M4(sx, ceilY(sx, sz) + 0.1, sz, hash(tx, ty, 924 + di) * 6.28, [h * 0.75, h, h * 0.75]), tx, ty);
        }
        continue;
      }
      // 歩ける床（または浅瀬）との境：濡れた岸の帯で段差とすき間を隠す
      B.add('water_tiles', bankStrip(ex, ez, d, opts.ch(nx, ny) === '*'), M4(0, 0, 0), tx, ty);
    }
  }
  // 境界線に沿った帯（世界座標で作る）。床の側は床の高さ、水の側はタイルの岸の高さへつなぐ。浅瀬の側は浅瀬の底まで下げる。
  // 床の側の縁に、少し盛り上がった霜の縁取り（白い青の帯）を付け、「ここから先は入れない水」を見た目で示す
  const BANK = { wet: new THREE.Color(0x3f7fa6), frost: new THREE.Color(0xd9f3ff), floor: new THREE.Color(0x9cc6dc) };
  function bankStrip(ex, ez, d, shallow) {
    const [dx, dy] = DIR_VEC[d], ax = dy ? 1 : 0, az = dx ? 1 : 0, SEG = 10, ROWS = 8;
    const g = new THREE.PlaneGeometry(1, 1, SEG, ROWS), p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5;                 // u：境界に沿う、v：0＝水の側 → 1＝床の側
      const s = (u - 0.5) * (CELL + 0.04), off = -0.6 + v * 1.0;    // 境界から水側 0.6m 〜 床側 0.4m
      const wx = ex + ax * s + dx * off, wz = ez + az * s + dy * off;
      const floorY = shallow ? -0.33 : groundY(wx, wz) + 0.015, waterSide = WATER_Y + 0.02;
      const wob = 0.04 * Math.sin(wx * 2.3 + wz * 1.7) + 0.025 * Math.sin(wx * 5.9 - wz * 4.3);   // 縁取りの線を直線にしない
      const lipC = 0.62 + wob, lip = shallow ? 0 : Math.exp(-Math.pow((v - lipC) / 0.09, 2));
      const bump = 0.03 * Math.sin(wx * 3.1 + wz * 2.3) + 0.02 * Math.sin(wx * 7.7 - wz * 5.9);
      const y = waterSide + (floorY - waterSide) * smooth(0.1, 0.62 + wob, v) + bump * Math.sin(v * Math.PI) + lip * 0.045;
      p.setXYZ(i, wx, y, wz);
      c.copy(BANK.wet).lerp(BANK.floor, smooth(0.55, 1, v)).lerp(BANK.frost, lip * 0.85);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    if (g.attributes.normal.getY(0) < 0) { g.index.array.reverse(); g.computeVertexNormals(); }
    return { name: 'wt_bank', transient: true, parts: [{ geo: g, mat: shallow ? 'Wet slate stone' : 'wt:bank' }] };
  }
  // 床の高さ（field-3d-b2-water.js の groundY と同じ式）
  function groundY(wx, wz) { return 0.03 + 0.09 * Math.sin(wx * 0.47) * Math.cos(wz * 0.39) + 0.04 * Math.sin(wx * 1.14 + wz * 0.58) + 0.02 * Math.cos(wx * 2.37 - wz * 1.81); }

  let t = 0;
  function tick(dt) {
    t += dt || 0.016;
    ripple.offset.set((t * 0.011) % 1, (t * 0.017) % 1);
    glow.value = 0.5 + 0.04 * Math.sin(t * 0.9);
  }
  function dispose() {
    for (const o of owned) o.dispose && o.dispose();
    owned.length = 0;
    for (const tl of tiles) if (tl) for (const p of tl.parts) p.geo.dispose();
    tiles = new Array(16).fill(null); loading.clear();
  }
  function statsInfo() { return { ...stats, hazard: [...B2V4W_ROLES.hazard], hazardChars: [...B2V4W_ROLES.hazardChars] }; }
  return { begin, isHazard, maskAt, addCell, tick, dispose, info: statsInfo };
}
