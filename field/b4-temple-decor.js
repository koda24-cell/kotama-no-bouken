/* B4 黒き神殿：通路の密度を上げる小さな演出（docs/3d/B4_TEMPLE_REDESIGN.md 5章・6章の「どの視界にも光るもの2つ以上」）
 *   ・壁の溶岩の亀裂：神殿の面の 18%。幅 0.9 × 高さ 3.4 m の板に、ぎざぎざの亀裂と枝分かれ、脈打つ光。
 *   ・床の溶岩の亀裂：歩けるマスの 22%（物のあるマス以外）。3.2 m 角の板、マスを斜めに走る亀裂。
 *   ・天井の梁から下がる鎖：梁のあるマスの 30%。輪 0.16 m × 9〜14 個、下端に火の籠（35%）。
 * すべて 1 種類につき 1 draw（InstancedMesh）。 */
import * as THREE from 'three';
import { B4_VFX_TIME, createFlames } from './b4-vfx.js?v=20261122-g6';

const NOISE = /* glsl */`
  float dh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float dn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(dh(i), dh(i + vec2(1,0)), u.x), mix(dh(i + vec2(0,1)), dh(i + vec2(1,1)), u.x), u.y); }
  float dfbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * dn(p); p *= 2.03; a *= 0.5; } return v; }`;

function crackMaterial({ floor = false } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: B4_VFX_TIME, uInt: { value: floor ? 0.42 : 0.85 } },
    vertexShader: /* glsl */`
      varying vec2 vUv; varying float vS;
      void main(){ vUv = uv; vec4 p = instanceMatrix * vec4(position, 1.0);
        vS = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
        gl_Position = projectionMatrix * modelViewMatrix * p; }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform float uInt; varying vec2 vUv; varying float vS;
      ${NOISE}
      float crack(vec2 uv, float seed, float w){
        float off = (dfbm(vec2(uv.y * 5.0, seed * 17.0)) - 0.5) * 0.55 + (dn(vec2(uv.y * 22.0, seed)) - 0.5) * 0.06;
        return smoothstep(w, 0.0, abs(uv.x - 0.5 - off));
      }
      void main(){
        vec2 uv = vUv;
        ${floor ? 'uv = vec2(fract(uv.x * 0.85 + uv.y * 0.35), uv.y);' : ''}
        float w = 0.03 + 0.035 * dn(vec2(uv.y * 6.0, vS * 9.0));
        float c = crack(uv, vS, w);
        // 枝分かれ
        vec2 b = vec2(uv.x + (uv.y - 0.45) * 0.9, uv.y);
        float br = crack(b, vS + 3.1, w * 0.7) * smoothstep(0.42, 0.5, uv.y) * smoothstep(0.85, 0.6, uv.y);
        vec2 b2 = vec2(uv.x - (uv.y - 0.25) * 0.8, uv.y);
        float br2 = crack(b2, vS + 6.3, w * 0.6) * smoothstep(0.2, 0.28, uv.y) * smoothstep(0.55, 0.38, uv.y);
        float g = max(c, max(br, br2));
        float halo = smoothstep(0.16, 0.0, abs(uv.x - 0.5 - (dfbm(vec2(uv.y * 5.0, vS * 17.0)) - 0.5) * 0.55)) * 0.22;
        float ends = smoothstep(0.0, 0.12, uv.y) * smoothstep(1.0, 0.86, uv.y);
        float pulse = 0.7 + 0.3 * sin(uTime * 1.6 + uv.y * 6.0 + vS * 20.0) + 0.25 * dn(vec2(uv.y * 8.0 - uTime * 0.8, vS));
        float a = (g * 1.6 + halo * 0.9) * ends * pulse * uInt;
        vec3 col = mix(vec3(0.8, 0.12, 0.02), vec3(1.0, 0.5, 0.14), g * 0.8);
        gl_FragColor = vec4(col * a, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });
}

export function buildTempleDecor({ root, faces, tiles, beams, CELL, hash, ironMaterial, ceiling = 4.05 }) {
  const group = new THREE.Group(); group.name = 'b4:temple-decor';
  const owned = [], info = { wallCracks: 0, floorCracks: 0, chains: 0, cages: 0 };
  // 壁の亀裂
  {
    const sel = faces.filter(f => hash(Math.round(f.x * 3), Math.round(f.z * 3), 1101) < 0.18).slice(0, 60);
    if (sel.length) {
      const g = new THREE.PlaneGeometry(0.9, 3.4); g.translate(0, 1.9, 0);
      const m = crackMaterial(); const im = new THREE.InstancedMesh(g, m, sel.length);
      sel.forEach((f, i) => {
        const along = (hash(Math.round(f.x), Math.round(f.z), 1102) - 0.5) * 2.6;
        const nx = -f.dx, nz = -f.dz;
        const p = new THREE.Vector3(f.x + nx * 0.345 + (-nz) * along, 0, f.z + nz * 0.345 + nx * along);
        im.setMatrixAt(i, new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(nx, nz), 0)), new THREE.Vector3(1, 0.8 + hash(i, 3, 1103) * 0.3, 1)));
      });
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.name = 'b4:wall-cracks'; im.renderOrder = 4;
      group.add(im); owned.push(g, m, im); info.wallCracks = sel.length;
    }
  }
  // 床の亀裂
  {
    const sel = tiles.filter(t => hash(t.tx, t.ty, 1111) < 0.22).slice(0, 70);
    if (sel.length) {
      const g = new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2);
      const m = crackMaterial({ floor: true }); const im = new THREE.InstancedMesh(g, m, sel.length);
      sel.forEach((t, i) => im.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(t.tx * CELL, 0.014, t.ty * CELL), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.floor(hash(t.tx, t.ty, 1112) * 4) * Math.PI / 2, 0)), new THREE.Vector3(1, 1, 1))));
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.name = 'b4:floor-cracks'; im.renderOrder = 3;
      group.add(im); owned.push(g, m, im); info.floorCracks = sel.length;
    }
  }
  // 鎖と火の籠
  {
    const link = new THREE.TorusGeometry(0.075, 0.018, 5, 10); owned.push(link);
    const ms = [], cageMs = [], fire = [];
    beams.filter(b => hash(b.tx, b.ty, 1121) < 0.3).slice(0, 26).forEach((b, k) => {
      const off = (hash(b.tx, b.ty, 1122) - 0.5) * 2.4;
      const x = b.tx * CELL + (b.rot ? 0 : off), z = b.ty * CELL + (b.rot ? off : 0);
      const n = 9 + Math.floor(hash(b.tx, b.ty, 1123) * 6), yaw0 = hash(b.tx, b.ty, 1124) * 3;
      for (let i = 0; i < n; i++) ms.push(new THREE.Matrix4().compose(new THREE.Vector3(x, ceiling - 0.45 - i * 0.125, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw0 + (i % 2) * Math.PI / 2, 0)), new THREE.Vector3(1, 1, 1)));
      info.chains++;
      if (hash(b.tx, b.ty, 1125) < 0.35) {
        const y = ceiling - 0.45 - n * 0.125 - 0.25;
        cageMs.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)));
        fire.push({ x, y: y - 0.12, z, w: 0.32, h: 0.55, seed: hash(b.tx, b.ty, 1126), intensity: 0.95 });
      }
    });
    if (ms.length) {
      const im = new THREE.InstancedMesh(link, ironMaterial, ms.length); ms.forEach((M, i) => im.setMatrixAt(i, M));
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.name = 'b4:chains'; group.add(im); owned.push(im);
    }
    if (cageMs.length) {
      const bars = [];
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const b = new THREE.CylinderGeometry(0.012, 0.012, 0.36, 4); b.translate(Math.cos(a) * 0.16, 0, Math.sin(a) * 0.16); bars.push(b.toNonIndexed()); }
      const ring = new THREE.TorusGeometry(0.16, 0.016, 4, 12); ring.rotateX(Math.PI / 2); const r1 = ring.clone().translate(0, 0.18, 0), r2 = ring.clone().translate(0, -0.18, 0);
      const bowl = new THREE.CylinderGeometry(0.15, 0.1, 0.08, 8); bowl.translate(0, -0.16, 0);
      const parts = [...bars, r1.toNonIndexed(), r2.toNonIndexed(), bowl.toNonIndexed()];
      const cg = mergeCage(parts); [ring, r1, r2, bowl, ...bars].forEach(p => p.dispose()); owned.push(cg);
      const im = new THREE.InstancedMesh(cg, ironMaterial, cageMs.length); cageMs.forEach((M, i) => im.setMatrixAt(i, M));
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.name = 'b4:fire-cages'; group.add(im); owned.push(im);
      const fl = createFlames(fire, 'fire'); fl.mesh.name = 'b4:cage-flames'; group.add(fl.mesh); owned.push(fl);
      info.cages = cageMs.length;
    }
  }
  root.add(group);
  return { group, info, dispose() { owned.forEach(o => o.dispose()); group.removeFromParent(); } };
}

// toNonIndexed の部品を 1 つに（position / normal / uv だけ）
function mergeCage(parts) {
  const total = parts.reduce((s, p) => s + p.attributes.position.count, 0);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3);
  let o = 0;
  for (const p of parts) { pos.set(p.attributes.position.array, o * 3); nor.set(p.attributes.normal.array, o * 3); o += p.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return g;
}
