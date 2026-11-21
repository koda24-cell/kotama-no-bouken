/* B4：岩盤・鉱石・炭鉱の密度を上げる（2026-11-22 ユーザー指摘「石壁すぎて炭鉱要素が減った。岩と鉱石をもっともっと」）
 *   ・岩盤区域 rockyZone：5 マス格子の値ノイズで、フロアの約半分を連続した「岩盤・炭鉱」の区域にする（神殿の石積みと交互に現れる）。
 *     その区域の壁は rock_face_02 の岩肌（変位した壁）。
 *   ・壁際の岩塊：岩盤区域の面の 55%、神殿区域の 18%。大岩 0.55–1.1 m ＋小岩 2–4 個（0.15–0.4 m）、地面に半分埋める。
 *   ・赤い鉱石：岩盤区域の面の 32%。結晶 4–9 本（長さ 0.25–0.7 m）を岩と壁に刺す。発光 1.1 ＋ 加算の赤い光の殻（不透明度 0.22）。
 *   ・坑木の枠：岩盤区域のまっすぐな通路の 30%（3 マス以上離す）。柱 0.24×3.3 m ×2、梁 3.4 m、方杖 2。
 *   ・赤い霞：鉱石のあるマスの床に、ゆっくり動く赤い霞（加算、弱め）。
 * 1 種類 1 draw（InstancedMesh）。 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { B4_VFX_TIME } from './b4-vfx.js?v=20261122-i5';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export function makeRockyZone(hash) {
  const S = 5;
  const v = (gx, gy) => hash(gx * 13 + 7, gy * 17 + 3, 1301);
  return (tx, ty) => {
    const fx = tx / S, fy = ty / S, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, w = fy - y0;
    const sm = t => t * t * (3 - 2 * t);
    const a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
    const n = (a * (1 - sm(u)) + b * sm(u)) * (1 - sm(w)) + (c * (1 - sm(u)) + d * sm(u)) * sm(w);
    return n > 0.5;
  };
}

function boulderGeo(seed) {
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 - seed * 0.7) * 0.18 + Math.sin(z * 6.3 + x * 2.1 + seed) * 0.07;
    const flat = y < -0.2 ? 0.75 : 1;                       // 底を平らに
    const f = 1 + n;
    p.setXYZ(i, x * f, y * f * 0.78 * flat, z * f);
  }
  g.computeVertexNormals();
  return g;
}

function mistMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: B4_VFX_TIME },
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec2 vUv; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1,0)), u.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), u.x), u.y); }
      void main(){
        vec2 p = vW.xz * 0.6;
        float a = n(p + vec2(uTime * 0.07, uTime * 0.04)) * n(p * 1.9 - vec2(uTime * 0.05, -uTime * 0.06));
        float r = length(vUv - 0.5) * 2.0;
        a = smoothstep(0.12, 0.55, a) * smoothstep(1.0, 0.3, r);
        gl_FragColor = vec4(vec3(0.75, 0.08, 0.02) * a * 0.38, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}

export function buildRockPass({ root, map, ch, wallCell, hash, CELL, reserved = new Set(), openFaces = new Set(), rocky, mats, lights, gLights, nearCull }) {
  const group = new THREE.Group(); group.name = 'b4:rock-pass';
  const owned = [], info = { boulders: 0, ores: 0, frames: 0, mists: 0 };
  const walk = (x, y) => x >= 0 && y >= 0 && x < map.w && y < map.h && !wallCell(x, y);
  const rockMat = mats.boulder || mats.rock;
  const oreMat = new THREE.MeshStandardMaterial({ color: 0x4a0804, roughness: 0.22, metalness: 0.2, emissive: 0xff260a, emissiveIntensity: 1.1 });
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xff3010, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.86 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x2a2220, roughness: 0.45, metalness: 0.85 });
  owned.push(oreMat, haloMat, woodMat, ironMat);
  if (nearCull) { for (const m of [oreMat, woodMat, ironMat]) nearCull(m, 1.2); nearCull(haloMat, 1.8); }
  const bGeos = [0, 1, 2].map(i => boulderGeo(i * 2.3 + 0.7)); owned.push(...bGeos);
  const shardG = new THREE.OctahedronGeometry(1, 0); shardG.scale(0.11, 1, 0.11); shardG.translate(0, 0.5, 0); owned.push(shardG);
  const bM = [[], [], []], oreM = [], frameParts = [], mistM = [];
  const Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3();
  const SKIN = 2 - 0.33;
  const oreTiles = new Set();
  const addOre = (base, nrm, k, n) => {
    for (let i = 0; i < n; i++) {
      const len = 0.2 + hash(k, i, 1311) * 0.36;
      const tilt = new THREE.Vector3(nrm.x + (hash(k, i, 1312) - 0.5) * 1.2, 0.6 + hash(k, i, 1313) * 0.9, nrm.z + (hash(k, i, 1314) - 0.5) * 1.2).normalize();
      Q.setFromUnitVectors(V.set(0, 1, 0), tilt);
      const p = base.clone().add(new THREE.Vector3((hash(k, i, 1315) - 0.5) * 0.5, (hash(k, i, 1316) - 0.5) * 0.3, (hash(k, i, 1317) - 0.5) * 0.5));
      oreM.push(new THREE.Matrix4().compose(p, Q.clone(), new THREE.Vector3(0.8 + hash(k, i, 1318) * 0.7, len, 0.8 + hash(k, i, 1318) * 0.7)));
    }
    info.ores++;
  };
  for (let ty = 1; ty < map.h - 1; ty++) for (let tx = 1; tx < map.w - 1; tx++) {
    if (!walk(tx, ty) || ch(tx, ty) === '~') continue;
    const zone = rocky(tx, ty), busy = reserved.has(tx + ',' + ty);
    DIRS.forEach(([dx, dz], di) => {
      if (!wallCell(tx + dx, ty + dz) || openFaces.has(`${tx},${ty},${dx},${dz}`)) return;
      const k = tx * 97 + ty * 31 + di;
      const nrm = new THREE.Vector3(-dx, 0, -dz), lat = new THREE.Vector3(-dz, 0, dx);
      if (!busy && hash(k, 1, 1320) < (zone ? 0.55 : 0.18)) {
        const along = (hash(k, 2, 1320) - 0.5) * 2.4;
        const big = 0.55 + hash(k, 3, 1320) * 0.55;
        const base = new THREE.Vector3(tx * CELL + dx * (SKIN - big * 0.35), 0, ty * CELL + dz * (SKIN - big * 0.35)).addScaledVector(lat, along);
        E.set(0, hash(k, 4, 1320) * 6.28, (hash(k, 5, 1320) - 0.5) * 0.3); Q.setFromEuler(E);
        bM[Math.floor(hash(k, 6, 1320) * 3)].push(new THREE.Matrix4().compose(base.clone().setY(big * 0.32), Q.clone(), new THREE.Vector3(big * (1 + hash(k, 7, 1320) * 0.4), big, big)));
        info.boulders++;
        const smalls = 2 + Math.floor(hash(k, 8, 1320) * 3);
        for (let i = 0; i < smalls; i++) {
          const s = 0.15 + hash(k, 10 + i, 1321) * 0.25;
          const p = base.clone().addScaledVector(lat, (hash(k, 20 + i, 1321) - 0.5) * 1.8).addScaledVector(nrm, 0.2 + hash(k, 30 + i, 1321) * 0.5);
          E.set(hash(k, 40 + i, 1321) * 3, hash(k, 50 + i, 1321) * 6, 0); Q.setFromEuler(E);
          bM[i % 3].push(new THREE.Matrix4().compose(p.setY(s * 0.3), Q.clone(), new THREE.Vector3(s, s, s)));
          info.boulders++;
        }
        if (zone && hash(k, 60, 1322) < 0.55) { addOre(base.clone().setY(big * 0.55).addScaledVector(nrm, big * 0.2), nrm, k, 4 + Math.floor(hash(k, 61, 1322) * 5)); oreTiles.add(tx + ',' + ty); }
      } else if (zone && hash(k, 62, 1322) < 0.22) {
        // 壁に直接刺さった鉱脈
        const along = (hash(k, 63, 1322) - 0.5) * 2.6, y = 0.6 + hash(k, 64, 1322) * 1.8;
        const base = new THREE.Vector3(tx * CELL + dx * (SKIN + 0.02), y, ty * CELL + dz * (SKIN + 0.02)).addScaledVector(lat, along);
        addOre(base, nrm, k, 4 + Math.floor(hash(k, 65, 1322) * 4)); oreTiles.add(tx + ',' + ty);
      }
    });
    // 坑木の枠（岩盤区域のまっすぐな通路）
    const ns = wallCell(tx - 1, ty) && wallCell(tx + 1, ty) && walk(tx, ty - 1) && walk(tx, ty + 1);
    const ew = wallCell(tx, ty - 1) && wallCell(tx, ty + 1) && walk(tx - 1, ty) && walk(tx + 1, ty);
    if (zone && !busy && (ns || ew) && hash(tx, ty, 1330) < 0.3 && frameParts.length < 22) {
      const near = frameParts.some(f => Math.abs(f.tx - tx) + Math.abs(f.ty - ty) < 3); if (!near) {
        frameParts.push({ tx, ty, rot: ns ? Math.PI / 2 : 0, s: hash(tx, ty, 1331) });
        info.frames++;
      }
    }
  }
  bM.forEach((ms, i) => {
    if (!ms.length) return;
    const im = new THREE.InstancedMesh(bGeos[i], rockMat, ms.length); ms.forEach((m, j) => im.setMatrixAt(j, m));
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.name = 'b4:boulders-' + i; group.add(im); owned.push(im);
  });
  if (oreM.length) {
    const im = new THREE.InstancedMesh(shardG, oreMat, oreM.length); oreM.forEach((m, j) => im.setMatrixAt(j, m));
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.name = 'b4:red-ore'; group.add(im); owned.push(im);
    const halo = new THREE.InstancedMesh(shardG, haloMat, oreM.length);
    oreM.forEach((m, j) => { const M = m.clone(); const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); M.decompose(pos, q, sc); halo.setMatrixAt(j, M.compose(pos, q, sc.multiply(new THREE.Vector3(1.7, 1.12, 1.7)))); });
    halo.instanceMatrix.needsUpdate = true; halo.computeBoundingSphere(); halo.name = 'b4:red-ore-halo'; halo.renderOrder = 4; group.add(halo); owned.push(halo);
  }
  // 鉱石の赤い光（近い順に使われるので多めに登録）と床の霞
  let nL = 0;
  for (const key of oreTiles) {
    const [tx, ty] = key.split(',').map(Number);
    if (nL < 30 && hash(tx, ty, 1340) < 0.6) { const L = { world: new THREE.Vector3(tx * CELL, 0.9, ty * CELL), color: 0xff2a0c, intensity: 1.3, range: 4.5, off: false }; lights.push(L); gLights.push(L); nL++; }
    if (hash(tx, ty, 1341) < 0.7) { mistM.push(new THREE.Matrix4().compose(new THREE.Vector3(tx * CELL, 0.03, ty * CELL), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, hash(tx, ty, 1342) * 6.28)), new THREE.Vector3(1, 1, 1))); }
  }
  if (mistM.length) {
    const g = new THREE.PlaneGeometry(3.6, 3.6), m = mistMaterial(); owned.push(g, m);
    const im = new THREE.InstancedMesh(g, m, mistM.length); mistM.forEach((M, j) => im.setMatrixAt(j, M));
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.name = 'b4:red-mist'; im.renderOrder = 3; group.add(im); owned.push(im); info.mists = mistM.length;
  }
  // 坑木の枠（ローカル：通路は z 方向、柱は x=±1.5）
  if (frameParts.length) {
    const post = new THREE.BoxGeometry(0.24, 3.3, 0.24); post.translate(0, 1.65, 0);
    const beam = new THREE.BoxGeometry(3.4, 0.26, 0.28); beam.translate(0, 3.38, 0);
    const brace = new THREE.BoxGeometry(0.14, 0.9, 0.16);
    const wood = [], iron = [];
    for (const f of frameParts) {
      const M = new THREE.Matrix4().compose(new THREE.Vector3(f.tx * CELL, 0, f.ty * CELL), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, f.rot, (f.s - 0.5) * 0.04)), new THREE.Vector3(1, 1, 1));
      for (const sx of [-1.5, 1.5]) {
        wood.push(post.clone().applyMatrix4(new THREE.Matrix4().makeTranslation(sx, 0, 0).premultiply(M)));
        const br = brace.clone(); br.rotateZ(sx < 0 ? -0.75 : 0.75); br.translate(sx * 0.8, 3.0, 0); wood.push(br.applyMatrix4(M));
        const band = new THREE.BoxGeometry(0.28, 0.05, 0.28); band.translate(sx, 0.6 + f.s, 0); iron.push(band.applyMatrix4(M));
      }
      const bm = beam.clone(); if (f.s < 0.25) bm.rotateZ(0.06); wood.push(bm.applyMatrix4(M));
    }
    const wg = mergeGeometries(wood.map(g => g.index ? g.toNonIndexed() : g), false), ig = mergeGeometries(iron.map(g => g.index ? g.toNonIndexed() : g), false);
    [...wood, ...iron, post, beam, brace].forEach(g => g.dispose());
    const wm = new THREE.Mesh(wg, woodMat), imesh = new THREE.Mesh(ig, ironMat); wm.name = 'b4:mine-frames'; imesh.name = 'b4:mine-frame-bands';
    group.add(wm, imesh); owned.push(wg, ig);
  }
  root.add(group);
  return { group, info, dispose() { owned.forEach(o => o.dispose()); group.removeFromParent(); } };
}
