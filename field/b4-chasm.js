/* B4 黒き神殿：奈落（上下の空間）— docs/3d/B4_TEMPLE_REDESIGN.md 4.2
 * 迷宮の「壁の塊（# の連結成分）」の一部を、底に溶岩の流れる縦穴にする。通路に面した壁のいくつかを
 * 欠けた欄干に置き換え、そこから 26 m 下の溶岩と、16 m 上の天井の裂け目が見える。
 * 通行判定は変えない（# は # のまま。見た目だけ壁が開く）。 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { B4_VFX_TIME, deepLavaMaterial } from './b4-vfx.js?v=20261122-j7';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const CHASM_BOTTOM = -26, CHASM_TOP = 16;

// 縦穴にする壁の塊と、欄干にする面を決める（壁を作る前に呼ぶ）
export function planChasms({ map, ch, wallCell, hash, reservedCells = new Set(), maxRegions = 6, parapetsPerRegion = 10 }) {
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
    if (!border && cells.length >= 3 && cells.length <= 18) regions.push(cells);   // 1〜2マスの細い穴は下が見えないので使わない
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


// 下（溶岩）からの照り返し：ワールド y が低いほど橙に発光する。奈落の側壁・欄干に使う
export function addUplight(material, { color = 0xff5a1c, base = 0.16, k = 0.11, max = 2.4, under = 0.9, topDark = null } = {}) {
  const c = new THREE.Color(color);
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uUpCol = { value: c }; sh.uniforms.uUpTime = B4_VFX_TIME;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vUpW; varying vec3 vUpN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvUpW = (modelMatrix * vec4(transformed, 1.0)).xyz; vUpN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uUpCol; uniform float uUpTime; varying vec3 vUpW; varying vec3 vUpN;\nfloat upH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat upN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(upH(i), upH(i + vec2(1, 0)), f.x), mix(upH(i + vec2(0, 1)), upH(i + vec2(1, 1)), f.x), f.y); }')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float heat = clamp(${base.toFixed(3)} * exp(-vUpW.y * ${k.toFixed(3)}), 0.0, ${max.toFixed(2)});
          heat *= 1.0 + ${under.toFixed(2)} * max(0.0, -vUpN.y);
          float flick = 0.75 + 0.5 * upN(vec2(vUpW.x * 0.35 + vUpW.z * 0.35, vUpW.y * 0.25 - uUpTime * 0.6));
          totalEmissiveRadiance += uUpCol * heat * flick; }
        ${topDark ? `{ float td = mix(1.0, ${(topDark[2] ?? 0.1).toFixed(2)}, smoothstep(${topDark[0].toFixed(2)}, ${topDark[1].toFixed(2)}, vUpW.y)); diffuseColor.rgb *= td; totalEmissiveRadiance *= td; }` : ''}`);
  };
  material.customProgramCacheKey = () => 'b4-uplight-' + base + k + max + under + (topDark || '');
  material.needsUpdate = true;
  return material;
}

export function hazeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: B4_VFX_TIME },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1,0)), u.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), u.x), u.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * n(p); p *= 2.07; a *= 0.5; } return v; }
      void main(){
        vec2 p = vW.xz * 0.45 + vW.y * 0.7;
        float a = fbm(p + vec2(uTime * 0.11, -uTime * 0.07)) * fbm(p * 1.7 - vec2(uTime * 0.05, uTime * 0.13));
        a = smoothstep(0.08, 0.5, a);
        vec3 col = mix(vec3(0.9, 0.18, 0.03), vec3(1.0, 0.6, 0.2), a);
        gl_FragColor = vec4(col * a * 0.32, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
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
        vec2 uv = vUv; float t = uTime; float Y = uv.y * 16.0;
        float edge = 0.12 + 0.1 * fbm(vec2(Y * 0.5 + t * 0.7, 1.3));
        float body = smoothstep(0.0, edge + 0.1, uv.x) * smoothstep(1.0, 0.9 - edge, uv.x) * smoothstep(1.0, 0.985, uv.y);
        float streak = fbm(vec2(uv.x * 6.0, Y * 0.35 + t * 1.4));
        float heat = fbm(vec2(uv.x * 3.0 + 7.0, Y * 0.6 + t * 2.2)) * 0.55 + streak * 0.55;
        vec3 col = mix(vec3(0.32, 0.03, 0.005), vec3(0.85, 0.3, 0.05), smoothstep(0.4, 0.8, heat));
        col = mix(col, vec3(1.0, 0.62, 0.22), smoothstep(0.8, 0.98, heat) * 0.7);
        float crust = smoothstep(0.5, 0.68, fbm(vec2(uv.x * 7.0 + 3.0, Y * 0.9 + t * 1.8)));
        col = mix(col, vec3(0.045, 0.016, 0.01), crust * 0.9);
        if (body < 0.02) discard;
        gl_FragColor = vec4(col, body);
      }`,
    side: THREE.DoubleSide, transparent: true,
  });
}

// 欄干（黒き神殿の手すり）：幅 4.0 m（セル境界）、高さ 1.05 m。
// 台座 3.7×0.22×0.56 / 手すり子 0.2×0.6×0.2 を 0.42 m 間隔（欠け・傾きあり）/ 笠木 3 分割（1つ欠ける）/ 端柱 0.5×1.32×0.5＋四角錐の頂部
export function parapetGeometry(hash, seed) {
  const parts = [];
  const box = (w, h, d, x, y, z, rz = 0, rx = 0) => { const b = new THREE.BoxGeometry(w, h, d); if (rz || rx) b.rotateZ(rz).rotateX(rx); b.translate(x, y, z); parts.push(b); };
  box(3.7, 0.22, 0.56, 0, 0.11, 0);
  box(3.5, 0.06, 0.46, 0, 0.25, 0);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const r = hash(seed, i, 974); if (r < 0.14) continue;                     // 欠けた手すり子
    const x = -1.26 + i * 0.42, tilt = r > 0.9 ? (hash(seed, i, 975) - 0.5) * 0.5 : 0;
    box(0.2, 0.6, 0.2, x, 0.58, 0, tilt);
    box(0.26, 0.06, 0.26, x, 0.31, 0); box(0.26, 0.06, 0.26, x, 0.86, 0);
  }
  const miss = Math.floor(hash(seed, 9, 976) * 4);                             // 0..2 番が欠け（3 なら全部ある）
  for (let k = 0; k < 3; k++) if (k !== miss) box(1.16, 0.14, 0.4, -1.2 + k * 1.2, 0.96, 0, (hash(seed, k, 977) - 0.5) * 0.04);
  for (const side of [-1, 1]) {
    box(0.5, 1.32, 0.5, side * 1.78, 0.66, 0);
    box(0.6, 0.1, 0.6, side * 1.78, 1.37, 0);
    const cone = new THREE.ConeGeometry(0.34, 0.34, 4); cone.rotateY(Math.PI / 4); cone.translate(side * 1.78, 1.59, 0); parts.push(cone);
  }
  return mergeGeometries(parts.map(p => (p.index ? p.toNonIndexed() : p)), false);
}

export function buildChasms({ root, plan, CELL, hash, trimMaterial, wallMaterial, lights, gLights, isWalk = () => false }) {
  const group = new THREE.Group(); group.name = 'b4:chasms';
  const owned = [];
  const info = { regions: plan.regions.length, parapets: plan.parapets.size };
  if (!plan.regions.length) { root.add(group); return { group, info, embers: [], parapetFaces: [], dispose() {} }; }
  // 2026-11-22：上下の色の切れ目をなくす。上（4.2 m〜）は暗い天井へ溶け、下は深いほど溶岩の照り返しが強い
  const mk = () => { const m = wallMaterial ? wallMaterial.clone() : new THREE.MeshStandardMaterial({ color: 0x2a201c, roughness: 0.95 }); m.emissive = new THREE.Color(0x140604); return m; };
  const shaftMat = addUplight(mk(), { base: 0.05, k: 0.13, max: 1.6, under: 0.6, topDark: [-6.0, -1.0, 0.5] });
  const shaftTopMat = addUplight(mk(), { base: 0.04, k: 0.13, max: 0.4, under: 0.3, topDark: [4.0, 11.0] });
  shaftMat.side = THREE.DoubleSide;
  const parMat = addUplight(trimMaterial.clone(), { base: 0.02, under: 2.0 }); parMat.color.setRGB(1.1, 0.85, 0.75);
  const haze = hazeMaterial();
  const glowVol = new THREE.ShaderMaterial({
    uniforms: { uTime: B4_VFX_TIME },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uTime; varying vec3 vW;
      void main(){ float d = clamp(-vW.y / 26.0, 0.0, 1.0);
        float g = pow(d, 1.1) * 1.0 + smoothstep(0.0, 0.08, d) * 0.5;
        float flick = 0.85 + 0.15 * sin(uTime * 0.9 + vW.x * 0.3 + vW.z * 0.2);
        gl_FragColor = vec4(mix(vec3(0.5, 0.06, 0.01), vec3(1.0, 0.42, 0.08), d) * g * flick, 1.0); }`,
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x120c0b, roughness: 1, emissive: 0x2a0802, emissiveIntensity: 0.6, side: THREE.DoubleSide });
  const lava = deepLavaMaterial({ flow: new THREE.Vector2(0.03, 0.05), scale: 0.18 });
  const fall = lavafallMaterial();
  owned.push(shaftMat, shaftTopMat, ceilMat, lava, fall, parMat, haze, glowVol);
  const embers = [];
  plan.regions.forEach((cells, ri) => {
    const set = new Set(cells.map(c => c + ''));
    const shaft = [], shaftHi = [], ledges = [];
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
    for (const [cx, cy] of cells) {
      minx = Math.min(minx, cx); maxx = Math.max(maxx, cx); minz = Math.min(minz, cy); maxz = Math.max(maxz, cy);
      for (const [dx, dy] of DIRS) {
        if (set.has([cx + dx, cy + dy] + '')) continue;
        // 縦穴の側壁：セル境界に、溶岩の面から天井の裂け目まで（通路の壁の 0〜4.2 m は既存の壁箱/欄干が受け持つ）
        const ex = cx * CELL + dx * CELL / 2, ez = cy * CELL + dy * CELL / 2, yaw = Math.atan2(dx, dy);
        // 隣が壁（通路に面していない外周）は 0〜4.2 m も側壁で埋める（縁から見て向こう側が黒い穴にならない）
        const solidSide = !isWalk(cx + dx, cy + dy);
        for (const [y0, y1] of solidSide ? [[CHASM_BOTTOM - 1, -0.3], [-0.3, 4.2], [4.2, CHASM_TOP]] : [[CHASM_BOTTOM - 1, -0.3], [4.2, CHASM_TOP]]) {
          const p = new THREE.PlaneGeometry(CELL + 0.1, y1 - y0, 6, 10);
          const pa = p.attributes.position;
          for (let i = 0; i < pa.count; i++) pa.setZ(i, (hash(cx * 31 + i, cy * 17 + dx * 3 + dy, 972) - 0.5) * 0.25);
          const uv = p.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (CELL + 0.1) / 4.08, uv.getY(i) * (y1 - y0) / 4.2);
          p.rotateY(yaw).translate(ex - dx * 0.2, (y0 + y1) / 2, ez - dy * 0.2);
          (y0 > -0.5 ? shaftHi : shaft).push(p);
        }
      }
      embers.push({ x: cx * CELL, z: cy * CELL, y0: CHASM_BOTTOM + 0.5, spread: 1.8, rise: 34, count: 40, hot: 1 });
    }
    const g = mergeGeometries(shaft.map(p => p.toNonIndexed()), false); shaft.forEach(p => p.dispose());
    const m = new THREE.Mesh(g, shaftMat); m.name = `b4:chasm-shaft-${ri}`; group.add(m); owned.push(g);
    const gh = mergeGeometries(shaftHi.map(p => p.toNonIndexed()), false); shaftHi.forEach(p => p.dispose());
    const mh = new THREE.Mesh(gh, shaftTopMat); mh.name = `b4:chasm-shaft-top-${ri}`; group.add(mh); owned.push(gh);
    // 深さの手がかり：側壁から張り出した崩れた床（y −4 / −9 / −15）と、途中で折れた橋桁
    {
      const per = [];
      for (const [cx, cy] of cells) for (const [dx, dy] of DIRS) if (!set.has([cx + dx, cy + dy] + '')) per.push([cx, cy, dx, dy]);
      [-2.4, -6, -11, -18].forEach((y, li) => {
        const [cx, cy, dx, dy] = per[Math.floor(hash(ri, li, 975) * per.length)];
        const dep = 1.0 + hash(ri, li, 976) * 0.9, wid = CELL * (0.5 + hash(ri, li, 977) * 0.4);
        const b = dx ? new THREE.BoxGeometry(dep, 0.45, wid) : new THREE.BoxGeometry(wid, 0.45, dep);
        b.rotateY((hash(ri, li, 978) - 0.5) * 0.15);
        b.translate(cx * CELL + dx * (CELL / 2 - dep / 2 - 0.15) + (dy ? (hash(ri, li, 979) - 0.5) * 1.2 : 0), y, cy * CELL + dy * (CELL / 2 - dep / 2 - 0.15) + (dx ? (hash(ri, li, 979) - 0.5) * 1.2 : 0));
        ledges.push(b);
        for (let k = 0; k < 3; k++) { const r = new THREE.IcosahedronGeometry(0.18 + hash(ri, li * 5 + k, 980) * 0.2, 0); r.translate(cx * CELL + dx * (CELL / 2 - dep) + (hash(ri, k, 981) - 0.5), y + 0.3, cy * CELL + dy * (CELL / 2 - dep) + (hash(ri, k, 982) - 0.5)); ledges.push(r); }
      });
      if (maxx - minx >= 1 || maxz - minz >= 1) {
        const alongX = maxx - minx >= maxz - minz, L = ((alongX ? maxx - minx : maxz - minz) + 1) * CELL * 0.55;
        const beam = alongX ? new THREE.BoxGeometry(L, 0.55, 0.9) : new THREE.BoxGeometry(0.9, 0.55, L);
        beam.rotateZ(alongX ? -0.12 : 0); beam.rotateX(alongX ? 0 : 0.12);
        beam.translate(alongX ? minx * CELL - CELL / 2 + L / 2 : (minx + maxx) / 2 * CELL, -6.5, alongX ? (minz + maxz) / 2 * CELL : minz * CELL - CELL / 2 + L / 2);
        ledges.push(beam);
      }
      const lg2 = mergeGeometries(ledges.map(p => p.index ? p.toNonIndexed() : p), false); ledges.forEach(p => p.dispose());
      const lm2 = new THREE.Mesh(lg2, parMat); lm2.name = `b4:chasm-ledges-${ri}`; group.add(lm2); owned.push(lg2);
    }
    // 奈落の中の光の霞：内向きの箱。深いほど橙が濃く、縁の近くでほぼ透明（縁から見ると下から光が満ちている）
    {
      const vg = new THREE.BoxGeometry((maxx - minx + 1) * CELL - 0.6, -CHASM_BOTTOM + 0.5, (maxz - minz + 1) * CELL - 0.6);
      vg.translate((minx + maxx) / 2 * CELL, CHASM_BOTTOM / 2 + 0.25, (minz + maxz) / 2 * CELL); owned.push(vg);
      const vm = new THREE.Mesh(vg, glowVol); vm.name = `b4:chasm-glow-${ri}`; vm.renderOrder = 2; group.add(vm);
    }
    // 底の溶岩と天井
    const w = (maxx - minx + 1) * CELL + 2, d = (maxz - minz + 1) * CELL + 2, cxw = (minx + maxx) / 2 * CELL, czw = (minz + maxz) / 2 * CELL;
    const lg = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2); const lm = new THREE.Mesh(lg, lava); lm.position.set(cxw, CHASM_BOTTOM, czw); group.add(lm); owned.push(lg);
    const cg = new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2); const cm = new THREE.Mesh(cg, ceilMat); cm.position.set(cxw, CHASM_TOP, czw); group.add(cm); owned.push(cg);
    // 溶岩の滝：側壁の裂け目（y 7.5）から底へ。外周の面に沿わせる
    {
      const opts = [];
      for (const [cx, cy] of cells) for (const [dx, dy] of DIRS) if (!set.has([cx + dx, cy + dy] + '')) opts.push([cx, cy, dx, dy]);
      const [fx, fy, dx, dy] = opts[Math.floor(hash(ri, 3, 973) * opts.length)];
      const top = 7.5, H = top - CHASM_BOTTOM;
      const fg = new THREE.PlaneGeometry(2.2, H, 1, 24); fg.translate(0, top - H / 2, 0);
      const fm = new THREE.Mesh(fg, fall);
      fm.position.set(fx * CELL + dx * (CELL / 2 - 0.45), 0, fy * CELL + dy * (CELL / 2 - 0.45)); fm.rotation.y = Math.atan2(dx, dy);
      fm.name = 'b4:lavafall'; group.add(fm); owned.push(fg);
    }
    // 縁の照り返し（光プールは近い順なので、底ではなく縁の少し下に置く）
    if (lights.length < 40) {
      const L = { world: new THREE.Vector3(cxw, -1.6, czw), color: 0xff5a18, intensity: 3.6, range: 9, off: false };
      lights.push(L); gLights.push(L);
    }
    // 下から立ちのぼる熱の霞（2層）
    for (const [hy, sc] of [[-1.3, 1], [-4.2, 1.15]]) {
      const hg = new THREE.PlaneGeometry(w * sc, d * sc).rotateX(-Math.PI / 2); const hm = new THREE.Mesh(hg, haze);
      hm.position.set(cxw, hy, czw); hm.renderOrder = 3; hm.name = 'b4:chasm-haze'; group.add(hm); owned.push(hg);
    }
  });
  // 欄干
  const parapetFaces = [];
  for (const [key] of plan.parapets) {
    const [tx, ty, dx, dz] = key.split(',').map(Number);
    const ex = tx * CELL + dx * CELL / 2, ez = ty * CELL + dz * CELL / 2;
    const geo = parapetGeometry(hash, tx * 31 + ty); geo.scale(1, 0.72, 1);   // 低めの欄干（目線から縁の下まで見える）
    const pm = new THREE.Mesh(geo, parMat); pm.position.set(ex - dx * 0.1, 0, ez - dz * 0.1); pm.rotation.y = Math.atan2(dx, dz) + Math.PI / 2 * 0;
    pm.rotation.y = dx !== 0 ? Math.PI / 2 : 0;
    pm.name = 'b4:parapet'; group.add(pm); owned.push(geo);
    parapetFaces.push({ tx, ty, dx, dz });
  }
  info.faces = parapetFaces;
  root.add(group);
  return { group, info, embers, parapetFaces, dispose() { owned.forEach(o => o.dispose()); group.removeFromParent(); } };
}
