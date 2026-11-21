/* B4 「竜炎の黒き神殿」VFX（docs/3d/B4_TEMPLE_REDESIGN.md 5章）
 *
 * BotW 系の手法を WebGL シェーダーで再現する：
 *  - 炎：形マスク（涙形のグラデーション × Kenney Particle Pack の flame テクスチャ）を、スクロールする
 *        ノイズ2層でUV歪ませ、高さに応じてアルファ浸食（alpha erosion）。加算合成のビルボードをインスタンス化。
 *  - 煙・砂煙：smoke テクスチャを同じ方式で上昇・拡散・浸食。
 *  - 火の粉：GPU の Points。寿命を時間から計算するので CPU 更新なし。
 *  - 幾何学紋様：極座標の距離関数（同心円・ルーン帯・放射線・星形多角形）を回転・脈動。
 *  - 溶岩（通れない深い溶岩）：ドメインワープしたノイズを流し、黒い殻のボロノイ板が割れて動く。
 *  - 光の筋：上から差す加算の板（縁をフェード）。
 * Kenney Particle Pack は CC0（assets/vfx/kenney-particle-pack/manifest.json）。
 * どの VFX も同じ時間 uniform（B4_VFX_TIME）を共有し、マップの tick() から進める。 */
import * as THREE from 'three';

const VFX_DIR = './assets/vfx/kenney-particle-pack/';
export const B4_VFX_TIME = { value: 0 };
const loader = new THREE.TextureLoader();
const texCache = new Map();
function vfxTex(name) {
  if (!texCache.has(name)) {
    const t = loader.load(VFX_DIR + name + '.png');
    t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    texCache.set(name, t);
  }
  return texCache.get(name);
}

const NOISE = /* glsl */`
float b4h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float b4n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(b4h(i), b4h(i + vec2(1,0)), u.x), mix(b4h(i + vec2(0,1)), b4h(i + vec2(1,1)), u.x), u.y); }
float b4fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * b4n(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
vec2 b4vor(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y);
    vec2 o = vec2(b4h(i + g), b4h(i + g + 17.3)); float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return vec2(d1, d2); }
`;

/* ------------------------------------------------------------------ */
/* 炎・煙のビルボード（1フロア1ドローコール／種類）                      */
/* ------------------------------------------------------------------ */
// sites: [{ x, y, z, w, h, seed, intensity }]
export function createFlames(sites, kind = 'fire') {
  const base = new THREE.PlaneGeometry(1, 1, 1, 1); base.translate(0, 0.5, 0);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
  const n = Math.max(1, sites.length);
  const pos = new Float32Array(n * 3), size = new Float32Array(n * 2), seed = new Float32Array(n), inten = new Float32Array(n);
  sites.forEach((s, i) => { pos.set([s.x, s.y, s.z], i * 3); size.set([s.w, s.h], i * 2); seed[i] = s.seed ?? Math.random(); inten[i] = s.intensity ?? 1; });
  geo.setAttribute('iPos', new THREE.InstancedBufferAttribute(pos, 3));
  geo.setAttribute('iSize', new THREE.InstancedBufferAttribute(size, 2));
  geo.setAttribute('iSeed', new THREE.InstancedBufferAttribute(seed, 1));
  geo.setAttribute('iInt', new THREE.InstancedBufferAttribute(inten, 1));
  geo.instanceCount = sites.length;
  const fire = kind === 'fire';
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: B4_VFX_TIME, uShape: { value: vfxTex(fire ? 'flame_04' : 'smoke_04') }, uShape2: { value: vfxTex(fire ? 'flame_01' : 'smoke_07') } },
    vertexShader: /* glsl */`
      attribute vec3 iPos; attribute vec2 iSize; attribute float iSeed; attribute float iInt;
      varying vec2 vUv; varying float vSeed; varying float vInt;
      uniform float uTime;
      void main() {
        vUv = uv; vSeed = iSeed; vInt = iInt;
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        float sway = ${fire ? '0.06' : '0.25'} * sin(uTime * ${fire ? '3.1' : '0.7'} + iSeed * 40.0) * position.y;
        vec3 wp = (modelMatrix * vec4(iPos, 1.0)).xyz + right * (position.x * iSize.x + sway) + vec3(0.0, 1.0, 0.0) * position.y * iSize.y;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform sampler2D uShape; uniform sampler2D uShape2;
      varying vec2 vUv; varying float vSeed; varying float vInt;
      ${NOISE}
      void main() {
        vec2 uv = vUv; float t = uTime + vSeed * 31.0;
        ${fire ? `
        float n1 = b4fbm(vec2(uv.x * 3.0 + vSeed * 9.0, uv.y * 2.2 - t * 1.9));
        float n2 = b4fbm(vec2(uv.x * 6.0 - 3.0, uv.y * 4.5 - t * 3.1));
        vec2 d = vec2((n1 - 0.5) * 0.28, (n2 - 0.5) * 0.18) * (0.25 + uv.y);
        vec2 q = uv + d;
        // 涙形：下が太く上が細い
        float width = mix(0.48, 0.05, pow(clamp(q.y, 0.0, 1.0), 0.75));
        float body = smoothstep(width, width * 0.35, abs(q.x - 0.5)) * smoothstep(0.0, 0.08, q.y) * smoothstep(1.0, 0.55, q.y);
        float tex = texture2D(uShape, q * vec2(0.9, 0.9) + vec2(0.05, 0.0)).r * 0.6 + texture2D(uShape2, q + vec2(0.0, -t * 0.08)).r * 0.4;
        float shape = body * (0.55 + 0.75 * tex);
        float erode = smoothstep(q.y * 0.75 - 0.05, q.y * 0.75 + 0.25, n2 * shape + 0.18);
        float a = clamp(shape * erode * 1.6, 0.0, 1.0);
        float core = smoothstep(0.55, 0.95, a) * (1.0 - q.y) * 0.7;
        vec3 col = mix(vec3(0.85, 0.12, 0.02), vec3(1.0, 0.55, 0.12), smoothstep(0.1, 0.6, a));
        col = mix(col, vec3(1.0, 0.78, 0.38), core);
        gl_FragColor = vec4(col * a * vInt * 1.05, 1.0);` : `
        float n1 = b4fbm(vec2(uv.x * 2.5 + vSeed * 7.0, uv.y * 1.8 - t * 0.35));
        vec2 q = uv + (n1 - 0.5) * 0.25;
        float tex = texture2D(uShape, q).r;
        float fade = smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.4, uv.y) * smoothstep(0.5, 0.2, abs(uv.x - 0.5));
        float erode = smoothstep(uv.y * 0.6, uv.y * 0.6 + 0.35, tex * n1 + 0.15);
        float a = tex * fade * erode * vInt;
        gl_FragColor = vec4(vec3(0.16, 0.11, 0.09) * a, a * 0.55);`}
      }`,
    transparent: true, depthWrite: false,
    blending: fire ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.name = `b4:vfx-${kind}`; mesh.renderOrder = fire ? 6 : 5;
  return { mesh, dispose() { geo.dispose(); mat.dispose(); base.dispose(); } };
}

/* ------------------------------------------------------------------ */
/* 火の粉・灰（GPU Points）                                             */
/* ------------------------------------------------------------------ */
// sources: [{ x, z, y0, spread, rise, count, hot }]
export function createEmbers(sources) {
  const all = [];
  for (const s of sources) for (let i = 0; i < s.count; i++) all.push(s);
  const n = Math.max(1, all.length);
  const base = new Float32Array(n * 3), seed = new Float32Array(n), prm = new Float32Array(n * 3);
  all.forEach((s, i) => {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * s.spread;
    base.set([s.x + Math.cos(a) * r, s.y0 ?? 0.1, s.z + Math.sin(a) * r], i * 3);
    seed[i] = Math.random();
    prm.set([s.rise ?? 4, 0.25 + Math.random() * 0.5, s.hot ?? 1], i * 3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(base, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aPrm', new THREE.BufferAttribute(prm, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: B4_VFX_TIME, uPx: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float aSeed; attribute vec3 aPrm; uniform float uTime; uniform float uPx;
      varying float vA; varying float vHot;
      void main() {
        float speed = aPrm.y; float life = fract(uTime * speed * 0.18 + aSeed);
        vec3 p = position;
        p.y += life * aPrm.x;
        p.x += sin(uTime * 1.3 + aSeed * 40.0) * 0.35 * life + sin(uTime * 3.7 + aSeed * 9.0) * 0.06;
        p.z += cos(uTime * 1.1 + aSeed * 23.0) * 0.35 * life;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vA = sin(life * 3.14159) * (0.6 + 0.4 * sin(uTime * 9.0 + aSeed * 60.0));
        vHot = aPrm.z * (1.0 - life * 0.6);
        gl_PointSize = (1.6 + 2.6 * aSeed) * uPx * (8.0 / max(0.5, -mv.z));
      }`,
    fragmentShader: /* glsl */`
      varying float vA; varying float vHot;
      void main() {
        vec2 c = gl_PointCoord - 0.5; float d = length(c);
        float a = smoothstep(0.5, 0.0, d) * vA;
        vec3 col = mix(vec3(1.0, 0.25, 0.04), vec3(1.0, 0.75, 0.3), vHot);
        gl_FragColor = vec4(col * a * 1.4, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  mat.uniforms.uPx.value = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1));
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.name = 'b4:vfx-embers'; pts.renderOrder = 7;
  return { mesh: pts, count: all.length, dispose() { geo.dispose(); mat.dispose(); } };
}

/* ------------------------------------------------------------------ */
/* 幾何学紋様（魔法陣・ルーン帯・回る輪）                                 */
/* ------------------------------------------------------------------ */
// style: 0 床の魔法陣 / 1 細い輪（柱のまわり）/ 2 壁のルーン帯（横長）
export function glyphMaterial({ style = 0, seed = 0, intensity = 1, color = 0xff7a1e, speed = 1 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: B4_VFX_TIME, uSeed0: { value: seed }, uInt: { value: intensity }, uCol: { value: new THREE.Color(color) }, uSpeed: { value: speed } },
    vertexShader: /* glsl */`
      varying vec2 vUv; varying float vIS;
      void main(){ vUv = uv; vec4 p = vec4(position, 1.0); vIS = 0.0;
        #ifdef USE_INSTANCING
        p = instanceMatrix * p; vIS = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * p; }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform float uInt; uniform vec3 uCol; uniform float uSpeed; uniform float uSeed0;
      varying vec2 vUv; varying float vIS;
      #define uSeed (uSeed0 + vIS * 10.0)
      ${NOISE}
      float ring(float r, float R, float w){ return smoothstep(w, 0.0, abs(r - R)); }
      float glyphCell(vec2 c, float id){
        // 3x3 の格子に、id から決まる線を2〜4本引いてルーンにする
        vec2 g = c * 3.0; vec2 f = fract(g); vec2 i = floor(g); float v = 0.0;
        float h = b4h(vec2(id, i.x * 3.0 + i.y));
        if (h > 0.45) v = max(v, smoothstep(0.16, 0.06, abs(f.x - 0.5)));
        if (b4h(vec2(id + 7.0, i.y)) > 0.55) v = max(v, smoothstep(0.16, 0.06, abs(f.y - 0.5)));
        return v;
      }
      void main() {
        float t = uTime * uSpeed * (0.8 + 0.4 * vIS) + uSeed * 10.0;
        float glow = 0.0;
        ${'' /* style switch */}
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p), a = atan(p.y, p.x);
        float TAU = 6.2831853;
        int st = ${'int(' + style + ')'};
        if (st == 2) {
          // 横長のルーン帯：上下の罫線＋流れるルーン
          float y = vUv.y, x = vUv.x * 18.0 + t * 0.15;
          float lines = ring(y, 0.12, 0.03) + ring(y, 0.88, 0.03);
          float id = floor(x); vec2 c = vec2(fract(x), (y - 0.22) / 0.56);
          float rune = (c.y > 0.0 && c.y < 1.0) ? glyphCell(vec2(c.x * 0.8 + 0.1, c.y), id + uSeed * 13.0) : 0.0;
          float flick = 0.55 + 0.45 * sin(t * 1.7 + id * 1.3);
          glow = lines * 0.8 + rune * flick;
          float edge = smoothstep(0.0, 0.04, vUv.x) * smoothstep(1.0, 0.96, vUv.x);
          glow *= edge;
        } else if (st == 1) {
          // 柱の周りの輪：太い輪＋目盛り＋流れる破線
          float rot = t * 0.4;
          float aa = mod(a + rot, TAU);
          glow = ring(r, 0.92, 0.035) + ring(r, 0.80, 0.012) * 0.7;
          float ticks = step(0.5, fract(aa / TAU * 64.0)) * smoothstep(0.86, 0.84, r) * smoothstep(0.82, 0.84, r);
          float dash = step(0.35, fract(aa / TAU * 12.0 - t * 0.3)) * ring(r, 0.70, 0.01);
          glow += ticks * 0.6 + dash * 0.8;
        } else {
          // 床の魔法陣
          float rot1 = t * 0.12, rot2 = -t * 0.08;
          float rings = ring(r, 0.96, 0.012) + ring(r, 0.90, 0.006) + ring(r, 0.64, 0.010) + ring(r, 0.58, 0.004) + ring(r, 0.28, 0.008);
          float aa = mod(a + rot1, TAU);
          float seg = floor(aa / TAU * 40.0); float cu = fract(aa / TAU * 40.0);
          float band = (r > 0.905 && r < 0.955) ? glyphCell(vec2(cu, (r - 0.905) / 0.05), seg + uSeed * 31.0) : 0.0;
          float ticks = (r > 0.66 && r < 0.88) ? step(0.85, fract(mod(a + rot2, TAU) / TAU * 48.0)) * smoothstep(0.88, 0.80, r) : 0.0;
          // 星形多角形（N 角形の辺）
          float N = 6.0 + floor(b4h(vec2(uSeed, 3.0)) * 3.0);
          float an = mod(a + rot2, TAU / N) - TAU / N * 0.5;
          float poly = ring(r * cos(an), 0.56 * cos(3.14159 / N), 0.008) * step(r, 0.62);
          float an2 = mod(a - rot1 * 1.5, TAU / N) - TAU / N * 0.5;
          float poly2 = ring(r * cos(an2), 0.27, 0.006) * step(r, 0.33);
          float spokes = smoothstep(0.012, 0.0, abs(sin((a + rot2) * N * 0.5)) * r) * step(0.28, r) * step(r, 0.58) * 0.5;
          glow = rings + band + ticks * 0.7 + poly + poly2 + spokes;
          glow *= 0.75 + 0.25 * sin(t * 1.6 - r * 7.0);
          glow += smoothstep(0.25, 0.0, r) * 0.25;
          glow *= smoothstep(1.0, 0.97, r);
        }
        float n = b4fbm(p * 6.0 + t * 0.2);
        glow *= 0.75 + 0.5 * n;
        vec3 col = mix(uCol, vec3(1.0, 0.88, 0.55), smoothstep(0.9, 1.6, glow));
        gl_FragColor = vec4(col * glow * uInt, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}

/* ------------------------------------------------------------------ */
/* 通れない深い溶岩（流れる溶岩＋割れて動く黒い殻）                       */
/* ------------------------------------------------------------------ */
export function deepLavaMaterial({ flow = new THREE.Vector2(0.06, 0.02), scale = 0.33 } = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uFlow: { value: flow }, uScale: { value: scale } }]),
    vertexShader: /* glsl */`
      varying vec3 vW;
      #include <fog_pars_vertex>
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec2 uFlow; uniform float uScale;
      varying vec3 vW;
      #include <fog_pars_fragment>
      ${NOISE}
      void main() {
        vec2 p = vW.xz * uScale; float t = uTime;
        vec2 warp = vec2(b4fbm(p * 0.7 + t * 0.05), b4fbm(p * 0.7 + 7.3 - t * 0.04));
        vec2 q = p + warp * 1.6 - uFlow * t * 6.0;
        float heat = b4fbm(q * 1.3);
        vec2 v = b4vor(q * 1.7 + vec2(t * 0.03, 0.0));
        float edge = v.y - v.x;                               // 殻の板の境目
        float crust = smoothstep(0.08, 0.22, edge) * smoothstep(0.42, 0.62, heat + 0.12 * sin(t * 0.6 + p.x));
        float vein = smoothstep(0.10, 0.0, edge);
        vec3 molten = mix(vec3(0.75, 0.10, 0.01), vec3(1.0, 0.55, 0.08), smoothstep(0.35, 0.8, heat));
        molten = mix(molten, vec3(1.0, 0.9, 0.55), smoothstep(0.78, 0.95, heat) * 0.7);
        vec3 crustCol = mix(vec3(0.035, 0.02, 0.016), vec3(0.11, 0.035, 0.015), b4n(q * 9.0));
        vec3 col = mix(molten * 2.2, crustCol, crust);
        col += vec3(1.0, 0.35, 0.05) * vein * crust * 1.2;
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
    fog: true,
  });
  mat.uniforms.uTime = B4_VFX_TIME;
  return mat;
}

/* ------------------------------------------------------------------ */
/* 光の筋（天井の穴・窓から）                                            */
/* ------------------------------------------------------------------ */
export function lightShaftMaterial({ color = 0xff8a3a, intensity = 0.5, seed = 0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: B4_VFX_TIME, uCol: { value: new THREE.Color(color) }, uInt: { value: intensity }, uSeed: { value: seed } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uCol; uniform float uInt; uniform float uSeed; varying vec2 vUv;
      ${NOISE}
      void main() {
        float side = exp(-pow((vUv.x - 0.5) * 3.6, 2.0));
        float vert = smoothstep(0.0, 0.25, vUv.y) * (0.4 + 0.6 * vUv.y);
        float streak = 0.6 + 0.4 * b4n(vec2(vUv.x * 9.0 + uSeed, uTime * 0.3));
        float dust = b4fbm(vec2(vUv.x * 4.0, vUv.y * 3.0 - uTime * 0.15) + uSeed);
        float a = side * vert * streak * (0.6 + 0.6 * dust) * uInt;
        gl_FragColor = vec4(uCol * a, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

/* ------------------------------------------------------------------ */
/* 崩落（天井から小石が落ち、床で砂煙）                                   */
/* ------------------------------------------------------------------ */
// sites: [{ x, z, top, seed }]  時間だけで位置を決める（CPUで行列を更新、1フロア数十個）
export function createRockfall(sites, rockMaterial) {
  const per = 5;
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const inst = new THREE.InstancedMesh(geo, rockMaterial, Math.max(1, sites.length * per));
  inst.name = 'b4:vfx-rockfall'; inst.frustumCulled = false;
  const dustSites = sites.map((s, i) => ({ x: s.x, y: 0.02, z: s.z, w: 1.6, h: 1.2, seed: s.seed, intensity: 0 }));
  const dust = createFlames(dustSites, 'smoke');
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const PERIOD = 9.0, FALL = 1.1;
  function update(time) {
    const iAttr = dust.mesh.geometry.getAttribute('iInt');
    sites.forEach((s, i) => {
      const ph = ((time / PERIOD) + s.seed) % 1 * PERIOD;      // 0..PERIOD 秒
      for (let k = 0; k < per; k++) {
        const delay = k * 0.12, tt = ph - delay;
        const idx = i * per + k;
        if (tt < 0 || tt > FALL + 0.6) { m.makeScale(0, 0, 0); inst.setMatrixAt(idx, m); continue; }
        const fallT = Math.min(tt, FALL);
        const y = Math.max(0.05, s.top - 0.5 * 9.8 * fallT * fallT * (s.top / (0.5 * 9.8 * FALL * FALL)));
        const off = (k - 2) * 0.18;
        v.set(s.x + off + Math.sin(s.seed * 50 + k) * 0.2, y, s.z + Math.cos(s.seed * 30 + k) * 0.2);
        e.set(tt * 4 + k, tt * 3, 0); q.setFromEuler(e);
        const r = 0.04 + 0.05 * ((k * 37 + s.seed * 100) % 1);
        sc.setScalar(r); m.compose(v, q, sc); inst.setMatrixAt(idx, m);
      }
      const after = ph - FALL;                                   // 着地後 0〜2.5 秒だけ砂煙
      iAttr.array[i] = after > 0 && after < 2.5 ? Math.sin(after / 2.5 * Math.PI) * 0.9 : 0;
    });
    inst.instanceMatrix.needsUpdate = true; iAttr.needsUpdate = true;
  }
  return { mesh: inst, dust: dust.mesh, update, dispose() { geo.dispose(); inst.dispose(); dust.dispose(); } };
}
