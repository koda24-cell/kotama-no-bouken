/* B4 12F：反重力の柱の間・参道・竜の聖域の VFX（2026-11-22 ユーザー指示：新しい VFX を約 10 種＋燃える炎 5 種、エリア全体に）
 * 炎の絵はダウンロードした CC0 の連番（assets/vfx/flipbooks、出典は manifest.json）。粒・帯・輪などはシェーダー。
 *  炎 5 種：F1 火柱（5×5 連番を縦に 3 枚）/ F2 地を這う炎（Mikodrak 8×5）/ F3 聖火（白金の芯）/ F4 燠火と火花 / F5 炎の渦
 *  VFX 10 種：V1 陽炎の帯 / V2 床から立つ光の柱 / V3 舞う灰と燃えかす / V4 柱の間の電弧 / V5 火の粉の竜巻 /
 *             V6 溶岩の噴き上げ / V7 上から降る光の粒 / V8 壁を流れる炎の文字 / V9 床に広がる衝撃波の輪 / V10 重なる霧の層 */
import * as THREE from 'three';
import { B4_VFX_TIME, glyphMaterial } from './b4-vfx.js?v=20261122-n2';

const loader = new THREE.TextureLoader();
const TEX = {};
const tex = (name) => { if (!TEX[name]) { const t = loader.load(`assets/vfx/flipbooks/${name}.png`); t.colorSpace = THREE.SRGBColorSpace; TEX[name] = t; } return TEX[name]; };
const NOISE = /* glsl */`
  float fh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float fn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(fh(i), fh(i + vec2(1,0)), u.x), mix(fh(i + vec2(0,1)), fh(i + vec2(1,1)), u.x), u.y); }
  float ff(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * fn(p); p *= 2.03; a *= 0.5; } return v; }`;

// 連番の炎ビルボード（インスタンス）。sites: [{x,y,z,w,h,seed,tint?,int?}]
export function flipbook(sites, { sheet, cols, rows, fps = 24, tint = [1, 1, 1], intensity = 1, near = 1.6, additive = true, vertical = true }) {
  const base = new THREE.PlaneGeometry(1, 1); base.translate(0, 0.5, 0);
  const geo = new THREE.InstancedBufferGeometry(); geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
  const n = Math.max(1, sites.length), P = new Float32Array(n * 3), S = new Float32Array(n * 2), D = new Float32Array(n * 4);
  sites.forEach((s, i) => { P.set([s.x, s.y, s.z], i * 3); S.set([s.w, s.h], i * 2); const t = s.tint || tint; D.set([s.seed ?? Math.random(), t[0], t[1], t[2]], i * 4); });
  geo.setAttribute('iP', new THREE.InstancedBufferAttribute(P, 3)); geo.setAttribute('iS', new THREE.InstancedBufferAttribute(S, 2)); geo.setAttribute('iD', new THREE.InstancedBufferAttribute(D, 4));
  geo.instanceCount = sites.length;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: B4_VFX_TIME, uMap: { value: tex(sheet) }, uGrid: { value: new THREE.Vector2(cols, rows) }, uFps: { value: fps }, uInt: { value: intensity }, uNear: { value: near } },
    vertexShader: /* glsl */`
      attribute vec3 iP; attribute vec2 iS; attribute vec4 iD; uniform float uTime; uniform float uNear;
      varying vec2 vUv; varying float vSeed; varying vec3 vTint; varying float vFade;
      void main(){
        vUv = uv; vSeed = iD.x; vTint = iD.yzw;
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = ${vertical ? 'vec3(0.0, 1.0, 0.0)' : 'vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1])'};
        vec3 c = (modelMatrix * vec4(iP, 1.0)).xyz;
        vFade = smoothstep(uNear * 0.6, uNear, distance(c, cameraPosition));
        vec3 wp = c + right * (position.x * iS.x) + up * (position.y * iS.y);
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform vec2 uGrid; uniform float uFps; uniform float uTime; uniform float uInt;
      varying vec2 vUv; varying float vSeed; varying vec3 vTint; varying float vFade;
      void main(){
        float N = uGrid.x * uGrid.y, f = floor(mod(uTime * uFps + vSeed * N, N));
        vec2 cell = vec2(mod(f, uGrid.x), uGrid.y - 1.0 - floor(f / uGrid.x));
        vec4 c = texture2D(uMap, (cell + vUv) / uGrid);
        float a = max(c.a, 0.0) * smoothstep(0.0, 0.06, vUv.y);
        vec3 col = c.rgb * vTint * uInt;
        ${additive ? 'gl_FragColor = vec4(col * a * vFade, 1.0);' : 'gl_FragColor = vec4(col, a * vFade);'}
      }`,
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 6;
  return { mesh, dispose() { geo.dispose(); base.dispose(); mat.dispose(); } };
}

// 汎用：GPU で動く粒（Points）。mode で動きを変える
function particles(count, { area, mode, color = [1, 0.5, 0.15], size = 3, intensity = 1, seed = 0 }) {
  const P = new Float32Array(count * 3), R = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) { const h = (k) => { const x = Math.sin((i + 1) * 12.9898 + k * 78.233 + seed * 3.1) * 43758.5453; return x - Math.floor(x); };
    P.set([area.x + (h(1) - 0.5) * area.w, area.y + h(2) * area.h, area.z + (h(3) - 0.5) * area.d], i * 3); R.set([h(4), h(5), h(6), h(7)], i * 4); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('aR', new THREE.BufferAttribute(R, 4));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: B4_VFX_TIME, uCol: { value: new THREE.Color(...color) }, uSize: { value: size }, uInt: { value: intensity }, uArea: { value: new THREE.Vector4(area.x, area.y, area.z, area.h) } },
    vertexShader: /* glsl */`
      attribute vec4 aR; uniform float uTime; uniform float uSize; uniform vec4 uArea; varying float vA; varying float vK;
      void main(){
        vec3 p = position; float t = uTime;
        ${mode === 'tornado' ? `
          float life = fract(t * (0.08 + aR.x * 0.05) + aR.y); float ang = aR.z * 6.283 + t * (1.2 + aR.w) + life * 9.0; float r = 0.4 + life * (1.2 + aR.x * 1.5);
          p = vec3(uArea.x + cos(ang) * r, uArea.y + life * uArea.w, uArea.z + sin(ang) * r); vA = sin(life * 3.14159);` :
        mode === 'fall' ? `
          float life = fract(t * (0.03 + aR.x * 0.03) + aR.y); p.y = uArea.y + uArea.w * (1.0 - life); p.x += sin(t * 0.5 + aR.z * 6.0) * 0.4; vA = sin(life * 3.14159);` :
        mode === 'ash' ? `
          float life = fract(t * (0.02 + aR.x * 0.02) + aR.y); p.y = uArea.y + uArea.w * life; p.x += sin(t * 0.3 + aR.z * 6.0) * 1.2; p.z += cos(t * 0.27 + aR.w * 6.0) * 1.2; vA = sin(life * 3.14159);` :
        `float life = fract(t * (0.06 + aR.x * 0.08) + aR.y); p.y += life * 3.0; vA = sin(life * 3.14159);`}
        vK = aR.w;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (0.6 + aR.z) * (10.0 / max(0.5, -mv.z));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCol; uniform float uInt; varying float vA; varying float vK;
      void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard;
        ${mode === 'ash' ? 'float a = smoothstep(0.5, 0.2, r); vec3 c = mix(vec3(0.08, 0.05, 0.04), uCol, step(0.75, vK) * smoothstep(0.5, 0.0, r)); gl_FragColor = vec4(c * uInt, a * vA * 0.8);' :
          'float a = smoothstep(0.5, 0.0, r); gl_FragColor = vec4(uCol * a * vA * uInt, 1.0);'}
      }`,
    transparent: true, depthWrite: false, blending: mode === 'ash' ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 7;
  return { mesh: pts, dispose() { geo.dispose(); mat.dispose(); } };
}

function shaderPlane(geo, frag, uniforms = {}, { additive = true, side = THREE.DoubleSide } = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: B4_VFX_TIME, ...uniforms },
    vertexShader: 'varying vec2 vUv; varying vec3 vW; varying float vFace; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec3 n = normalize(mat3(modelMatrix) * normal); vFace = abs(dot(n, normalize(cameraPosition - w.xyz))); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vW; varying float vFace; ${NOISE}\n${frag}`,
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, side,
  });
  return new THREE.Mesh(geo, mat);
}

// 浮かんでは消える一文字のルーン（ダウンロードした CC0 の encircled-runes から文字だけ抜いたアトラス runes_6x6）
// 1 文字ごとに周期で現れて消え、消えるたびに別の場所・別の文字になる。カメラ 2.2 m 以内では見えない
export function floatingRunes(count, { area, color = [1, 0.6, 0.2], size = [0.35, 0.7], intensity = 1, seed = 0 }) {
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry(); geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
  const R = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) { const h = (k) => { const x = Math.sin((i + 1) * 91.17 + k * 17.31 + seed * 5.7) * 43758.5453; return x - Math.floor(x); }; R.set([h(1), h(2), h(3), h(4)], i * 4); }
  geo.setAttribute('aR', new THREE.InstancedBufferAttribute(R, 4)); geo.instanceCount = count;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: B4_VFX_TIME, uMap: { value: tex('runes_6x6') }, uCol: { value: new THREE.Color(...color) }, uInt: { value: intensity },
      uMin: { value: new THREE.Vector3(area.x0, area.y0, area.z0) }, uMax: { value: new THREE.Vector3(area.x1, area.y1, area.z1) }, uSize: { value: new THREE.Vector2(...size) } },
    vertexShader: /* glsl */`
      attribute vec4 aR; uniform float uTime; uniform vec3 uMin; uniform vec3 uMax; uniform vec2 uSize;
      varying vec2 vUv; varying float vA; varying float vCell;
      float h1(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
      void main(){
        float per = 4.0 + aR.x * 5.0, t = uTime / per + aR.y * 7.0, c = floor(t), life = fract(t);
        float k = c * 7.13 + aR.z * 113.0;
        vec3 p = mix(uMin, uMax, vec3(h1(k + 1.0), h1(k + 2.0), h1(k + 3.0)));
        p.y += life * 0.6; p.x += sin(uTime * 0.6 + aR.w * 6.0) * 0.08;
        vCell = floor(h1(k + 4.0) * 36.0);
        vA = smoothstep(0.0, 0.25, life) * smoothstep(1.0, 0.6, life);
        vA *= smoothstep(2.2, 3.4, distance(p, cameraPosition));
        float sz = mix(uSize.x, uSize.y, h1(k + 5.0));
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * vec4(p + (right * position.x + up * position.y) * sz, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform vec3 uCol; uniform float uInt; varying vec2 vUv; varying float vA; varying float vCell;
      void main(){
        vec2 cell = vec2(mod(vCell, 6.0), 5.0 - floor(vCell / 6.0));
        float g = texture2D(uMap, (cell + vUv) / 6.0).a;
        float glow = texture2D(uMap, (cell + vUv) / 6.0, 2.5).a;
        vec3 col = uCol * (g * 1.4 + glow * 0.5) + vec3(1.0, 0.9, 0.7) * g * 0.35;
        gl_FragColor = vec4(col * vA * uInt, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 7;
  return { mesh, dispose() { geo.dispose(); base.dispose(); mat.dispose(); } };
}

// area: { x0, z0, x1, z1, lavaCells?: [[x,z]...], pillars?: [[x,z]...], walls?: [{x,z,yaw,len}], kind }
export function build12FFX({ root, areas, hash, lights, gLights }) {
  const group = new THREE.Group(); group.name = 'b4:fx12';
  const owned = [], update = [];
  const add = (o) => { group.add(o.mesh || o); owned.push(o); return o.mesh || o; };
  const own = (m) => { group.add(m); owned.push(m.geometry, m.material); return m; };
  const light = (p, c, i, r) => { if (lights.length < 100) { const L = { world: p, color: c, intensity: i, range: r, off: false }; lights.push(L); gLights.push(L); } };
  const fire1 = [], fire2 = [], holy = [], vortex = [];
  for (const A of areas) {
    const cx = (A.x0 + A.x1) / 2, cz = (A.z0 + A.z1) / 2, W = A.x1 - A.x0, D = A.z1 - A.z0, top = A.top || 18;
    const H = (k) => hash(Math.round(cx), Math.round(cz) + k, 1700 + k);
    // ---- 炎 ----
    if (A.kind !== 'sanctum') {
      // F1 火柱：溶岩から 3 本（縦に 3 枚重ねて 6 m）
      (A.lava || []).filter((_, i) => i % 5 === 1).slice(0, 3).forEach(([x, z], i) => { for (let k = 0; k < 3; k++) fire1.push({ x, y: -0.5 + k * 1.5, z, w: 1.5 - k * 0.3, h: 2.1, seed: H(i * 3 + k) }); light(new THREE.Vector3(x, 2.5, z), 0xff6a20, 3.5, 12); });
      // F2 地を這う炎：溶岩の縁
      (A.lava || []).forEach(([x, z], i) => { if (i % 2 === 0) fire2.push({ x: x + (H(i + 40) - 0.5) * 2, y: -0.2, z: z + (H(i + 41) - 0.5) * 2, w: 1.6, h: 1.2, seed: H(i + 42) }); });
      // F5 炎の渦（柱の間の穴の上 / 参道の奥）
      for (let k = 0; k < 10; k++) vortex.push({ k, cx: A.kind === 'hall' ? cx : cx, cz: A.kind === 'hall' ? cz : A.z0 + D * 0.15, r: 1.2 + (k % 3) * 0.5, y: 0.3 + k * 0.5, seed: H(k + 60) });
    } else {
      // F3 聖火：聖域の火鉢・柱頭に白金の炎
      (A.braziers || []).forEach(([x, y, z], i) => holy.push({ x, y, z, w: 1.0, h: 1.9, seed: H(i + 80), tint: [1.0, 0.95, 0.75] }));
    }
    // ---- VFX ----
    // V1 陽炎の帯：溶岩の上に立つ揺らぐ縦の帯
    if (A.kind !== 'sanctum') {
      const g = new THREE.PlaneGeometry(W * 0.9, 6, 24, 6); const m = shaderPlane(g, `void main(){ float w = ff(vec2(vW.x * 0.8 + vW.z * 0.8, vW.y * 0.6 - uTime * 0.9)); float a = smoothstep(0.55, 0.75, w) * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.6, vUv.y); gl_FragColor = vec4(vec3(1.0, 0.45, 0.12) * a * 0.1 * smoothstep(0.15, 0.6, vFace), 1.0); }`);
      m.position.set(cx, 3, cz); m.rotation.y = W > D ? 0 : Math.PI / 2; m.renderOrder = 5; own(m);
      const m2 = m.clone(); m2.rotation.y += Math.PI / 2; group.add(m2);
    }
    // V2 光の柱：床から上へ（聖域は金、他は橙）
    const pillarSpots = A.kind === 'sanctum' ? [] : (A.lava || []).filter((_, i) => i % 6 === 3).slice(0, 3);
    for (const [x, z] of pillarSpots) {
      const g = new THREE.CylinderGeometry(0.7, 1.0, top, 20, 1, true); g.translate(0, top / 2, 0);
      const gold = A.kind === 'sanctum';
      const m = shaderPlane(g, `void main(){ float s = ff(vec2(vUv.x * 8.0, vUv.y * 3.0 - uTime * 0.6)); float a = (0.35 + 0.65 * s) * smoothstep(1.0, 0.2, vUv.y) * smoothstep(0.0, 0.05, vUv.y) * (0.75 + 0.25 * sin(uTime * 1.5 + ${(x * 0.1).toFixed(2)}));
        a *= pow(vFace, 3.0); gl_FragColor = vec4(${gold ? 'vec3(1.0, 0.82, 0.45)' : 'vec3(1.0, 0.4, 0.1)'} * a * 0.09, 1.0); }`);
      m.position.set(x, 0, z); m.renderOrder = 5; own(m);
    }
    // V3 舞う灰と燃えかす
    add(particles(A.kind === 'sanctum' ? 120 : 220, { area: { x: cx, y: 0.5, z: cz, w: W, h: top - 2, d: D }, mode: 'ash', color: [1, 0.45, 0.1], size: 2.4, seed: H(1) }));
    // V4 電弧：柱（または四隅）の間をはしる稲妻（毎フレーム作り直し）
    if (A.kind !== 'sanctum') {
      const N = 4, segs = 14, pos = new Float32Array(N * segs * 2 * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const m = new THREE.LineBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
      const line = new THREE.LineSegments(g, m); line.frustumCulled = false; group.add(line); owned.push(g, m);
      const ends = A.arcs || [[A.x0 + 1, A.z0 + 1, A.x1 - 1, A.z1 - 1], [A.x1 - 1, A.z0 + 1, A.x0 + 1, A.z1 - 1], [cx, A.z0 + 1, cx, A.z1 - 1], [A.x0 + 1, cz, A.x1 - 1, cz]];
      update.push((t) => {
        let o = 0; const flash = (Math.sin(t * 2.3) > 0.6) || (Math.sin(t * 5.1 + 1) > 0.95);
        for (let a = 0; a < N; a++) {
          const [ax, az, bx, bz] = ends[a % ends.length], y0 = 3 + a * 1.5, on = flash && ((Math.floor(t * 8) + a) % 3 === 0);
          let px = ax, py = y0, pz = az;
          for (let k = 1; k <= segs; k++) { const f = k / segs, j = k === segs ? 0 : 1; const nx = ax + (bx - ax) * f + (Math.random() - 0.5) * 0.8 * j, ny = y0 + Math.sin(f * 3.14) * 1.5 + (Math.random() - 0.5) * 0.8 * j, nz = az + (bz - az) * f + (Math.random() - 0.5) * 0.8 * j;
            pos.set(on ? [px, py, pz, nx, ny, nz] : [0, -99, 0, 0, -99, 0], o); o += 6; px = nx; py = ny; pz = nz; }
        }
        g.attributes.position.needsUpdate = true; m.opacity = 0.5 + 0.4 * Math.random();
      });
    }
    // V5 火の粉の竜巻
    if (A.kind !== 'sanctum') add(particles(260, { area: { x: A.kind === 'hall' ? cx : cx, y: 0, z: A.kind === 'hall' ? cz : A.z0 + D * 0.15, w: 1, h: 12, d: 1 }, mode: 'tornado', color: [1, 0.5, 0.12], size: 3, seed: H(2) }));
    // V6 溶岩の噴き上げ：周期的に 4 m 吹き上がる炎＋飛沫
    if (A.lava && A.lava.length) {
      const jets = A.lava.filter((_, i) => i % 4 === 2).slice(0, 4).map(([x, z], i) => ({ x, y: -0.4, z, w: 1.4, h: 4.2, seed: H(i + 90) }));
      const fb = flipbook(jets, { sheet: 'flame_5x5', cols: 5, rows: 5, fps: 30, tint: [1.2, 0.7, 0.4], intensity: 1.0 }); add(fb);
      update.push((t) => { const k = Math.max(0, Math.sin(t * 0.9)); fb.mesh.material.uniforms.uInt.value = 0.2 + 1.1 * Math.pow(k, 3); });
    }
    // V7 上から降る光の粒（聖域は金）
    add(particles(A.kind === 'sanctum' ? 260 : 120, { area: { x: cx, y: 0.3, z: cz, w: W * 0.8, h: top - 1, d: D * 0.8 }, mode: 'fall', color: A.kind === 'sanctum' ? [1, 0.85, 0.5] : [1, 0.55, 0.2], size: 2.2, seed: H(3) }));
    // V8 壁を流れる炎の文字（上の回廊の下、y 5.5 の帯。文字が順に灯って流れる）
    for (const [x, z, yaw, len] of A.walls || []) {
      const mat = glyphMaterial({ style: 2, seed: H(4) * 5, intensity: 1.2, speed: 1.6, color: A.kind === 'sanctum' ? 0xffc060 : 0xff6a1a });
      const g = new THREE.PlaneGeometry(len, 0.55); const m = new THREE.Mesh(g, mat); m.position.set(x, 5.6, z); m.rotation.y = yaw; m.renderOrder = 4; group.add(m); owned.push(g, mat);
    }
    // V9 衝撃波の輪：床に 4 秒ごとに広がる
    {
      const mat = glyphMaterial({ style: 1, seed: H(5), intensity: 1.2, color: A.kind === 'sanctum' ? 0xffd080 : 0xff7a2a });
      const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mat); m.position.set(cx, 0.06, cz); m.renderOrder = 4; group.add(m); owned.push(g, mat);
      update.push((t) => { const p = (t * 0.25) % 1; const s = 1 + p * Math.min(W, D) * 0.9; m.scale.set(s, 1, s); mat.uniforms.uInt.value = 1.3 * (1 - p) * (1 - p); });
    }
    // V11 浮かんでは消える一文字のルーン
    add(floatingRunes(A.kind === 'sanctum' ? 46 : 38, { area: { x0: A.x0 + 0.8, y0: 1.0, z0: A.z0 + 0.8, x1: A.x1 - 0.8, y1: A.kind === 'sanctum' ? 9 : 6.5, z1: A.z1 - 0.8 }, color: A.kind === 'sanctum' ? [1, 0.78, 0.4] : [1, 0.45, 0.12], seed: H(6) * 10 }));
    // V10 霧の層（3 段）
    for (const [y, k] of [[0.35, 0], [5.2, 1], [10.5, 2]]) {
      const g = new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2); const m = shaderPlane(g, `void main(){ vec2 p = vW.xz * ${(0.12 + k * 0.05).toFixed(2)}; float a = ff(p + vec2(uTime * 0.02, -uTime * 0.015)) * ff(p * 1.7 - uTime * 0.01); a = smoothstep(0.15, 0.55, a) * smoothstep(0.08, 0.45, vFace);
        gl_FragColor = vec4(${A.kind === 'sanctum' ? 'vec3(0.9, 0.7, 0.4)' : 'vec3(0.8, 0.22, 0.06)'} * a * ${(0.14 - k * 0.03).toFixed(2)}, 1.0); }`);
      m.position.set(cx, y, cz); m.renderOrder = 3; own(m);
    }
    // F4 燠火と火花：床の何か所かに赤い燠の床と小さな火花
    if (A.kind !== 'sanctum') for (let i = 0; i < 4; i++) {
      const x = A.x0 + 1.5 + H(i + 100) * (W - 3), z = A.z0 + 1.5 + H(i + 110) * (D - 3);
      const g = new THREE.CircleGeometry(0.9, 16).rotateX(-Math.PI / 2);
      const m = shaderPlane(g, `void main(){ float r = length(vUv - 0.5) * 2.0; float n = ff(vW.xz * 3.0 + uTime * 0.2); float a = smoothstep(1.0, 0.2, r) * smoothstep(0.35, 0.7, n); gl_FragColor = vec4(vec3(1.0, 0.3, 0.05) * a * (0.6 + 0.4 * sin(uTime * 2.0 + n * 6.0)), 1.0); }`);
      m.position.set(x, 0.03, z); own(m);
      add(particles(24, { area: { x, y: 0.05, z, w: 1.2, h: 0.2, d: 1.2 }, mode: 'spark', color: [1, 0.55, 0.15], size: 2, seed: i }));
    }
  }
  if (fire1.length) add(flipbook(fire1, { sheet: 'flame_5x5', cols: 5, rows: 5, fps: 28, tint: [1.1, 0.75, 0.5], intensity: 1.0 }));
  if (fire2.length) add(flipbook(fire2, { sheet: 'mikodrak_fire_1b_8x5', cols: 8, rows: 5, fps: 24, tint: [1.2, 0.6, 0.35], intensity: 0.9 }));
  if (holy.length) add(flipbook(holy, { sheet: 'mikodrak_fire_1f_8x5', cols: 8, rows: 5, fps: 22, tint: [1.0, 0.95, 0.8], intensity: 1.1 }));
  if (vortex.length) {
    const sites = vortex.map(v => ({ x: v.cx, y: v.y, z: v.cz, w: 0.9, h: 1.3, seed: v.seed }));
    const fb = flipbook(sites, { sheet: 'tauran_flame_12x6', cols: 12, rows: 6, fps: 24, tint: [1.2, 0.7, 0.4], intensity: 1.0 }); add(fb);
    const P = fb.mesh.geometry.attributes.iP;
    update.push((t) => { vortex.forEach((v, i) => { const a = t * 1.4 + i * 0.63; P.setXYZ(i, v.cx + Math.cos(a) * v.r, v.y + (Math.sin(t * 0.7 + i) * 0.3), v.cz + Math.sin(a) * v.r); }); P.needsUpdate = true; });
  }
  root.add(group);
  return { group, update: () => { const t = B4_VFX_TIME.value; for (const u of update) u(t); }, dispose() { owned.forEach(o => o.dispose?.()); group.removeFromParent(); } };
}
