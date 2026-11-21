/* B4 黒き神殿：奈落（上下の空間）— docs/3d/B4_TEMPLE_REDESIGN.md 4.2
 * 迷宮の「壁の塊（# の連結成分）」の一部を、底に溶岩の流れる縦穴にする。通路に面した壁のいくつかを
 * 欠けた欄干に置き換え、そこから 26 m 下の溶岩と、16 m 上の天井の裂け目が見える。
 * 通行判定は変えない（# は # のまま。見た目だけ壁が開く）。 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { B4_VFX_TIME, deepLavaMaterial } from './b4-vfx.js?v=20261121-v2';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const CHASM_BOTTOM = -26, CHASM_TOP = 16;

// 縦穴にする壁の塊と、欄干にする面を決める（壁を作る前に呼ぶ）
export function planChasms({ map, ch, wallCell, hash, reservedCells = new Set(), maxRegions = 3, parapetsPerRegion = 4 }) {
  const W = map.w, H = map.h, seen = new Set(), regions = [];
  const walk = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !wallCell(x, y);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const k = x + ',' + y;
    if (seen.has(k) || ch(x, y) !== '#' || reservedCells.has(k)) continue;
    const cells = [], q = [[x, y]]; seen.add(k); let border = false;
    while (q.length) {
      const [cx, cy] = q.pop(); cells.push([cx, cy]);
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy, nk = nx + ',' + ny;
        if (nx <= 0 || ny <= 0 || nx >= W - 1 || ny >= H - 1) { if (ch(nx, ny) === '#') border = true; continue; }
        if (seen.has(nk) || ch(nx, ny) !== '#' || reservedCells.has(nk)) continue;
        seen.add(nk); q.push([nx, ny]);
      }
    }
    if (!border && cells.length >= 2 && cells.length <= 18) regions.push(cells);
  }
  regions.sort((a, b) => b.length - a.length || hash(a[0][0], a[0][1], 960) - hash(b[0][0], b[0][1], 960));
  const chosen = regions.slice(0, maxRegions);
  const parapets = new Map();   // faceKey(tx,ty,dx,dz)（通路側タイルから見た面）→ region index
  chosen.forEach((cells, ri) => {
    const set = new Set(cells.map(c => c + ''));
    const faces = [];
    for (const [cx, cy] of cells) for (const [dx, dy] of DIRS) {
      const tx = cx + dx, ty = cy + dy;
      if (set.has([tx, ty] + '') || !walk(tx, ty) || ch(tx, ty) === '~') continue;
      faces.push({ tx, ty, dx: -dx, dz: -dy });
    }
    faces.sort((a, b) => hash(a.tx, a.ty, 961) - hash(b.tx, b.ty, 961));
    for (const f of faces.slice(0, parapetsPerRegion)) parapets.set(`${f.tx},${f.ty},${f.dx},${f.dz}`, ri);
  });
  return { regions: chosen, parapets, cellSet: new Set(chosen.flat().map(c => c + '')) };
}

function lavafallMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: B4_VFX_TIME },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1,0)), u.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), u.x), u.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * n(p); p *= 2.1; a *= 0.5; } return v; }
      void main() {
        vec2 uv = vUv; float t = uTime;
        float streak = fbm(vec2(uv.x * 7.0, uv.y * 1.2 + t * 0.9));
        float body = smoothstep(0.0, 0.18, uv.x) * smoothstep(1.0, 0.82, uv.x);
        float heat = fbm(vec2(uv.x * 3.0, uv.y * 3.0 + t * 1.6)) * 0.6 + streak * 0.6;
        vec3 col = mix(vec3(0.6, 0.06, 0.01), vec3(1.0, 0.55, 0.1), smoothstep(0.35, 0.85, heat));
        col = mix(col, vec3(1.0, 0.9, 0.6), smoothstep(0.85, 1.0, heat) * 0.6);
        float crust = smoothstep(0.55, 0.75, fbm(vec2(uv.x * 9.0, uv.y * 6.0 + t * 1.1)));
        col = mix(col * 2.0, vec3(0.06, 0.02, 0.015), crust * 0.7);
        gl_FragColor = vec4(col * body, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// 欄干：欠けた上端の低い壁＋両端の柱。faces: [{ x, z, ry }]（壁の中心＝セル境界）
function parapetGeometry(hash, seed) {
  const parts = [];
  const segs = 6;
  for (let i = 0; i < segs; i++) {
    const w = 3.2 / segs, h = 0.78 + hash(seed, i, 970) * 0.32 - (hash(seed, i, 971) < 0.18 ? 0.35 : 0);
    const b = new THREE.BoxGeometry(w - 0.02, h, 0.42); b.translate(-1.6 + w * (i + 0.5), h / 2, 0); parts.push(b);
  }
  const cap = new THREE.BoxGeometry(3.3, 0.1, 0.52); cap.translate(0, 0.03, 0); parts.push(cap);
  for (const side of [-1, 1]) {
    const post = new THREE.BoxGeometry(0.5, 1.45, 0.55); post.translate(side * 1.8, 0.725, 0); parts.push(post);
    const top = new THREE.BoxGeometry(0.62, 0.16, 0.66); top.translate(side * 1.8, 1.53, 0); parts.push(top);
  }
  return mergeGeometries(parts.map(p => p.toNonIndexed()), false);
}

export function buildChasms({ root, plan, CELL, hash, trimMaterial, lights, gLights }) {
  const group = new THREE.Group(); group.name = 'b4:chasms';
  const owned = [];
  const info = { regions: plan.regions.length, parapets: plan.parapets.size };
  if (!plan.regions.length) { root.add(group); return { group, info, embers: [], parapetFaces: [], dispose() {} }; }
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0x1c1513, roughness: 0.95, emissive: 0x3a0c03, emissiveIntensity: 0.7, side: THREE.DoubleSide });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x120c0b, roughness: 1, emissive: 0x2a0802, emissiveIntensity: 0.6, side: THREE.DoubleSide });
  const lava = deepLavaMaterial({ flow: new THREE.Vector2(0.03, 0.05), scale: 0.18 });
  const fall = lavafallMaterial();
  owned.push(shaftMat, ceilMat, lava, fall);
  const embers = [];
  plan.regions.forEach((cells, ri) => {
    const set = new Set(cells.map(c => c + ''));
    const shaft = [];
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
    for (const [cx, cy] of cells) {
      minx = Math.min(minx, cx); maxx = Math.max(maxx, cx); minz = Math.min(minz, cy); maxz = Math.max(maxz, cy);
      for (const [dx, dy] of DIRS) {
        if (set.has([cx + dx, cy + dy] + '')) continue;
        // 縦穴の側壁：セル境界に、溶岩の面から天井の裂け目まで（通路の壁の 0〜4.2 m は既存の壁箱/欄干が受け持つ）
        const ex = cx * CELL + dx * CELL / 2, ez = cy * CELL + dy * CELL / 2, yaw = Math.atan2(dx, dy);
        for (const [y0, y1] of [[CHASM_BOTTOM - 1, -0.3], [4.2, CHASM_TOP]]) {
          const p = new THREE.PlaneGeometry(CELL + 0.1, y1 - y0, 6, 10);
          const pa = p.attributes.position;
          for (let i = 0; i < pa.count; i++) pa.setZ(i, (hash(cx * 31 + i, cy * 17 + dx * 3 + dy, 972) - 0.5) * 0.5);
          p.rotateY(yaw).translate(ex - dx * 0.2, (y0 + y1) / 2, ez - dy * 0.2);
          shaft.push(p);
        }
      }
      embers.push({ x: cx * CELL, z: cy * CELL, y0: CHASM_BOTTOM + 0.5, spread: 1.8, rise: 34, count: 40, hot: 1 });
    }
    const g = mergeGeometries(shaft.map(p => p.toNonIndexed()), false); shaft.forEach(p => p.dispose());
    const m = new THREE.Mesh(g, shaftMat); m.name = `b4:chasm-shaft-${ri}`; group.add(m); owned.push(g);
    // 底の溶岩と天井
    const w = (maxx - minx + 1) * CELL + 2, d = (maxz - minz + 1) * CELL + 2, cxw = (minx + maxx) / 2 * CELL, czw = (minz + maxz) / 2 * CELL;
    const lg = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2); const lm = new THREE.Mesh(lg, lava); lm.position.set(cxw, CHASM_BOTTOM, czw); group.add(lm); owned.push(lg);
    const cg = new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2); const cm = new THREE.Mesh(cg, ceilMat); cm.position.set(cxw, CHASM_TOP, czw); group.add(cm); owned.push(cg);
    // 溶岩の滝（側壁の1面に）
    const [fx, fy] = cells[Math.floor(hash(ri, 3, 973) * cells.length)];
    const fg = new THREE.PlaneGeometry(1.6, CHASM_TOP - CHASM_BOTTOM); const fm = new THREE.Mesh(fg, fall);
    fm.position.set(fx * CELL + 1.5, (CHASM_TOP + CHASM_BOTTOM) / 2, fy * CELL); fm.rotation.y = Math.PI / 2; group.add(fm); owned.push(fg);
    if (lights.length < 36) {
      const L = { world: new THREE.Vector3(cxw, CHASM_BOTTOM + 6, czw), color: 0xff5a18, intensity: 6, range: 36, off: false };
      lights.push(L); gLights.push(L);
    }
  });
  // 欄干
  const parapetFaces = [];
  for (const [key] of plan.parapets) {
    const [tx, ty, dx, dz] = key.split(',').map(Number);
    const ex = tx * CELL + dx * CELL / 2, ez = ty * CELL + dz * CELL / 2;
    const geo = parapetGeometry(hash, tx * 31 + ty);
    const pm = new THREE.Mesh(geo, trimMaterial); pm.position.set(ex - dx * 0.1, 0, ez - dz * 0.1); pm.rotation.y = Math.atan2(dx, dz) + Math.PI / 2 * 0;
    pm.rotation.y = dx !== 0 ? Math.PI / 2 : 0;
    pm.name = 'b4:parapet'; group.add(pm); owned.push(geo);
    parapetFaces.push({ tx, ty, dx, dz });
  }
  info.faces = parapetFaces;
  root.add(group);
  return { group, info, embers, parapetFaces, dispose() { owned.forEach(o => o.dispose()); group.removeFromParent(); } };
}
