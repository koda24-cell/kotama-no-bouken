/* 5層 V6：旗（A9）— 壁掛けの長旗と、瓦礫に突き立った軍旗
 * 布は裂け・穴・焦げを形として作り、風で揺れる（頂点シェーダー）。紋章は物語設定が未確定のため入れず、縁取りの帯だけ。 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, fbm, sweep, lathe, boxUV } from './b5v6-geom.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ROUND = n => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; });
const rod = (pts, r = 0.02, n = 6) => sweep(pts, ROUND(n).map(([c, s]) => [c * r, s * r]), { closed: true });

/* 布 1 枚（原点＝上辺の中央、-y へ垂れる、表は +z）。属性 aSway（上 0 → 下 1）と aPhase を持つ */
function cloth(w, h, R, { tail = 'swallow', holes = 0.08, burn = 0.3, cols = 10, rows = 26, curl = 0.06 } = {}) {
  const pos = [], uv = [], sway = [], col = [];
  const bottom = (u) => {        // 下辺の形（u ∈ [-1,1]）
    let y = -h;
    if (tail === 'swallow') y += (1 - Math.abs(u)) * h * 0.16;           // 燕尾
    else if (tail === 'point') y -= (1 - Math.abs(u)) * h * 0.12;        // 剣先
    y += (fbm(u * 3 + R() * 10, 0, 0, 3) - 0.5) * h * 0.12;              // 裂け
    return y;
  };
  const P = (i, j) => {
    const u = i / cols * 2 - 1, v = j / rows, yb = bottom(u), y = yb * v;
    const fold = Math.sin(u * 5.0 + R() * 0.0) * curl * v + Math.sin(v * 6 + u * 2) * 0.02;
    return [u * w / 2 * (1 - 0.06 * v), y, fold];
  };
  const keep = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const v = j / rows; let k = true;
    if (v > 0.35 && R() < holes * v) k = false;                          // 穴
    keep.push(k);
  }
  const grid = []; for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) grid.push(P(i, j));
  const at = (i, j) => grid[j * (cols + 1) + i];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (!keep[j * cols + i]) continue;
    const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
    for (const [a, b, c] of [[0, 3, 2], [0, 2, 1]]) for (const k of [a, b, c]) {
      const [ii, jj] = q[k], p = at(ii, jj), v = jj / rows, u = ii / cols;
      pos.push(...p); uv.push(u * w, -p[1]); sway.push(v);
      // 縁の帯（明るい）・下ほど焦げ・まだら
      const edge = Math.min(u, 1 - u) * w < 0.07 || (v < 0.05);
      let c = edge ? 1.65 : 1.0;
      const b = burn * Math.pow(v, 3) * (0.6 + 0.4 * fbm(u * 6, v * 6, 2, 2));
      c *= 1 - b * 1.4; c *= 0.85 + 0.25 * fbm(u * 4, v * 9, 5, 3);
      col.push(c * (edge ? 1.0 : 1), c * (edge ? 0.82 : 1), c * (edge ? 0.55 : 1));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aSway', new THREE.Float32BufferAttribute(sway, 1)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

export class BannerSystem {
  constructor(M) { this.M = M; this.cloth = new Map(); this.parts = []; this.uniform = { value: 0 }; }
  _push(mat, geo, phase) {
    const n = geo.attributes.position.count; geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(new Float32Array(n).fill(phase), 1));
    if (!this.cloth.has(mat)) this.cloth.set(mat, []); this.cloth.get(mat).push(geo);
  }
  /* 壁掛けの長旗。matrix は壁面（z=0、+z が通路）の位置。top は吊り下げ高さ */
  wallBanner(matrix, seed, { top = 5.2, w = 1.05, h = 3.6, color = 'red' } = {}) {
    const R = rng(seed), M = this.M;
    const mat = color === 'blue' ? M.clothBlue : color === 'black' ? M.clothBlack : M.clothRed;
    const g = cloth(w, h, R, { tail: R() < 0.5 ? 'swallow' : 'point', holes: 0.1, burn: 0.45 });
    g.applyMatrix4(new THREE.Matrix4().makeTranslation(0, top, 0.32)); g.applyMatrix4(matrix);
    this._push(mat, g, R() * 6.28);
    // 竿と腕金
    const pole = new THREE.CylinderGeometry(0.03, 0.03, w + 0.3, 8).rotateZ(Math.PI / 2).translate(0, top + 0.02, 0.32);
    const knobs = [-1, 1].map(s => new THREE.SphereGeometry(0.05, 8, 6).translate(s * (w / 2 + 0.17), top + 0.02, 0.32));
    const arms = [-1, 1].map(s => rod([V(s * w * 0.42, top + 0.25, 0.01), V(s * w * 0.42, top + 0.16, 0.2), V(s * w * 0.42, top + 0.02, 0.32)], 0.018));
    for (const p of [pole, ...knobs, ...arms]) this.parts.push([p.applyMatrix4(matrix), M.iron, { grime: 0, soot: 0.5, moss: 0, seed: 91 }]);
  }
  /* 天井から吊る長い垂れ幕（身廊用）。matrix は吊り点 */
  hangingBanner(matrix, seed, { w = 1.4, h = 7.5, color = 'red' } = {}) {
    const R = rng(seed), M = this.M;
    const mat = color === 'blue' ? M.clothBlue : color === 'black' ? M.clothBlack : M.clothRed;
    const g = cloth(w, h, R, { tail: 'swallow', holes: 0.06, burn: 0.35, rows: 34, curl: 0.09 });
    g.applyMatrix4(matrix); this._push(mat, g, R() * 6.28);
    const bar = new THREE.CylinderGeometry(0.035, 0.035, w + 0.25, 8).rotateZ(Math.PI / 2);
    this.parts.push([bar.applyMatrix4(matrix), M.iron, { grime: 0, soot: 0.5, moss: 0, seed: 92 }]);
  }
  /* 瓦礫に突き立った軍旗（竿＋横木＋裂けた旗）。matrix は地面の根元 */
  warStandard(matrix, seed, { height = 3.4, color = 'red', lean = 0.12 } = {}) {
    const R = rng(seed), M = this.M;
    const tilt = new THREE.Matrix4().makeRotationZ((R() - 0.5) * lean * 2).premultiply(new THREE.Matrix4().makeRotationX((R() - 0.5) * lean));
    const m = matrix.clone().multiply(tilt);
    const pole = new THREE.CylinderGeometry(0.035, 0.045, height, 8).translate(0, height / 2 - 0.2, 0);
    const cross = new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6).rotateZ(Math.PI / 2).translate(0, height - 0.45, 0);
    const finial = new THREE.ConeGeometry(0.05, 0.22, 6).translate(0, height - 0.08, 0);
    this.parts.push([pole.applyMatrix4(m), M.wood, { grime: 0.6, soot: 0.4, moss: 0.1, seed: 93 }]);
    this.parts.push([cross.applyMatrix4(m), M.wood, { grime: 0, soot: 0.4, moss: 0, seed: 93 }]);
    this.parts.push([finial.applyMatrix4(m), M.iron, { grime: 0, soot: 0.5, moss: 0, seed: 93 }]);
    const mat = color === 'blue' ? M.clothBlue : color === 'black' ? M.clothBlack : M.clothRed;
    const g = cloth(0.9, 1.7 + R() * 0.5, R, { tail: 'swallow', holes: 0.16, burn: 0.6, rows: 16, cols: 8 });
    g.applyMatrix4(new THREE.Matrix4().makeTranslation(0, height - 0.45, 0.03)); g.applyMatrix4(m);
    this._push(mat, g, R() * 6.28);
  }
  /* 床に落ちた布の切れ端 */
  fallenCloth(matrix, seed, { w = 1.0, h = 1.4, color = 'red' } = {}) {
    const R = rng(seed), M = this.M;
    const g = cloth(w, h, R, { tail: 'swallow', holes: 0.2, burn: 0.7, rows: 10, cols: 8, curl: 0.0 });
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setXYZ(i, p.getX(i), 0.02 + Math.max(0, Math.sin(p.getX(i) * 4 + y * 3) * 0.06), y + h / 2); }
    g.computeVertexNormals(); g.applyMatrix4(matrix);
    g.attributes.aSway.array.fill(0);
    this._push(color === 'blue' ? M.clothBlue : M.clothRed, g, 0);
  }
  /* 布を材質ごとに結合して、揺れるシェーダーを差し込む。金具は bucket（静的）へ */
  build(parent, bucket) {
    for (const [geo, mat, wx] of this.parts) bucket.add(geo, mat, { wx });
    this.parts = []; this.meshes = []; this.mats = [];
    for (const [mat, geos] of this.cloth) {
      const merged = mergeGeometries(geos); geos.forEach(g => g.dispose());
      // 布目テクスチャを実寸 UV で使う（uv は m 単位）
      const m = mat.clone(); m.vertexColors = true; m.side = THREE.DoubleSide;
      const u = this.uniform;
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = u;
        sh.vertexShader = 'attribute float aSway; attribute float aPhase; uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          float s = aSway * aSway;
          transformed.z += (sin(uTime * 1.3 + aPhase + position.y * 0.9) * 0.10 + sin(uTime * 2.7 + aPhase * 1.7 + position.x * 3.0) * 0.035) * s;
          transformed.x += sin(uTime * 0.9 + aPhase * 0.6) * 0.05 * s;`);
      };
      m.customProgramCacheKey = () => 'b5v6-cloth';
      const mesh = new THREE.Mesh(merged, m); mesh.name = 'b5v6:cloth'; parent.add(mesh); this.meshes.push(mesh); this.mats.push(m);
    }
    this.cloth.clear();
  }
  update(t) { this.uniform.value = t; }
  dispose() { (this.meshes || []).forEach(m => { m.geometry.dispose(); m.removeFromParent(); }); (this.mats || []).forEach(m => m.dispose()); }
}
