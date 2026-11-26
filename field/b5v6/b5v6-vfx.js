/* 5層 V6：VFX（A11）— 紫の魔炎・火の粉・床の霧・光の柱
 * すべて 1 種類につき 1 回の描画（インスタンス／点群）。霧（FogExp2）には独自に対応。 */
import * as THREE from 'three';

const NOISE = /* glsl */`
  float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h1(i),h1(i+vec2(1,0)),f.x), mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x), f.y); }
  float fbm(vec2 p){ float a=0.0, m=0.5; for(int i=0;i<4;i++){ a+=m*n2(p); p=p*2.07+vec2(1.7,9.2); m*=0.5; } return a; }`;
const FOG = /* glsl */`
  uniform vec3 fogColor; uniform float fogDensity;
  float fogF(float d){ return 1.0 - exp(-fogDensity*fogDensity*d*d); }`;

/* 炎：kind 0=炎 1=周囲の光暈。色は palette（0=紫 1=琥珀のろうそく 2=青白い霊火） */
export class FlameSystem {
  constructor() { this.items = []; }
  add(x, y, z, size = 1, palette = 0, seed = Math.random()) { this.items.push([x, y, z, size, palette, seed]); }
  build(parent) {
    if (!this.items.length) return null;
    const n = this.items.length * 2;
    const base = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    const geo = new THREE.InstancedBufferGeometry(); geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
    const P = new Float32Array(n * 3), S = new Float32Array(n), K = new Float32Array(n), C = new Float32Array(n), D = new Float32Array(n);
    this.items.forEach(([x, y, z, s, pal, seed], i) => {
      for (const k of [0, 1]) { const j = i * 2 + k; P.set([x, y - (k ? s * 0.35 : 0), z], j * 3); S[j] = k ? s * 2.6 : s; K[j] = k; C[j] = pal; D[j] = seed; }
    });
    geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(P, 3)); geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(S, 1));
    geo.setAttribute('aKind', new THREE.InstancedBufferAttribute(K, 1)); geo.setAttribute('aPal', new THREE.InstancedBufferAttribute(C, 1)); geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(D, 1));
    geo.instanceCount = n;
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]), fog: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aPos; attribute float aSize; attribute float aKind; attribute float aPal; attribute float aSeed; uniform float uTime;
        varying vec2 vUv; varying float vKind; varying float vPal; varying float vSeed; varying float vDist;
        void main(){
          vUv = uv; vKind = aKind; vPal = aPal; vSeed = aSeed;
          vec4 mv = viewMatrix * vec4(aPos, 1.0);
          float flick = 1.0 + 0.08 * sin(uTime * 13.0 + aSeed * 40.0) + 0.05 * sin(uTime * 23.0 + aSeed * 11.0);
          float w = aSize * (aKind > 0.5 ? 1.0 : 0.62), hgt = aSize * (aKind > 0.5 ? 1.0 : 1.35) * flick;
          mv.xy += vec2((position.x) * w, (position.y - (aKind > 0.5 ? 0.5 : 0.0)) * hgt);
          vDist = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: NOISE + FOG + `uniform float uTime; varying vec2 vUv; varying float vKind; varying float vPal; varying float vSeed; varying float vDist;
        vec3 ramp(float t, float pal){
          vec3 a, b, c;
          if (pal < 0.5)      { a = vec3(0.16,0.02,0.42); b = vec3(0.62,0.22,1.0); c = vec3(1.0,0.82,1.0); }   // 紫
          else if (pal < 1.5) { a = vec3(0.35,0.06,0.0);  b = vec3(1.0,0.45,0.08); c = vec3(1.0,0.92,0.7); }   // 琥珀
          else                { a = vec3(0.02,0.1,0.35);  b = vec3(0.3,0.6,1.0);   c = vec3(0.9,0.98,1.0); }   // 青白
          return t < 0.5 ? mix(a, b, t * 2.0) : mix(b, c, (t - 0.5) * 2.0);
        }
        void main(){
          float fog = 1.0 - fogF(vDist);
          if (vKind > 0.5) {
            float d = length(vUv - 0.5) * 2.0;
            float g = pow(max(0.0, 1.0 - d), 2.4) * (0.85 + 0.15 * sin(uTime * 9.0 + vSeed * 30.0));
            gl_FragColor = vec4(ramp(0.45, vPal) * g * 0.5 * fog, 1.0); return;
          }
          vec2 uv = vUv; float t = uTime * (vPal > 0.5 && vPal < 1.5 ? 1.6 : 2.4);
          float n = fbm(vec2(uv.x * 3.2 + vSeed * 9.0, uv.y * 2.4 - t));
          float n2v = fbm(vec2(uv.x * 6.0 - vSeed * 3.0, uv.y * 4.5 - t * 1.7));
          float x = uv.x - 0.5 + (n - 0.5) * 0.35 * uv.y;
          float width = 0.42 * pow(max(0.0, 1.0 - uv.y), 0.55) * smoothstep(0.0, 0.12, uv.y);
          float body = smoothstep(width, width * 0.25, abs(x));
          float top = smoothstep(1.0, 0.25, uv.y + (n2v - 0.5) * 0.5);
          float a = body * top;
          float heat = clamp(a * 1.25 - uv.y * 0.35 + (n2v - 0.5) * 0.2, 0.0, 1.0);
          vec3 col = ramp(heat, vPal) * a * 1.8;
          gl_FragColor = vec4(col * fog, 1.0);
        }`
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 5; parent.add(mesh);
    this.mesh = mesh; this.mat = mat; this.geo = geo; base.dispose?.();
    return mesh;
  }
  update(t) { if (this.mat) this.mat.uniforms.uTime.value = t; }
  dispose() { this.geo?.dispose(); this.mat?.dispose(); this.mesh?.removeFromParent(); }
}

/* 火の粉・魔力の粒：発生点ごとに数個、上へ昇って消える */
export class EmberSystem {
  constructor() { this.src = []; }
  add(x, y, z, count = 6, spread = 0.25, height = 2.2, palette = 0) { this.src.push([x, y, z, count, spread, height, palette]); }
  build(parent) {
    const P = [], A = [];
    for (const [x, y, z, c, s, h, pal] of this.src) for (let i = 0; i < c; i++) { P.push(x, y, z); A.push(Math.random(), Math.random() * 6.28, s, h + Math.random() * h * 0.5); }
    if (!P.length) return null;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('aP', new THREE.Float32BufferAttribute(A, 4));
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uScale: { value: 1 } }]), fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec4 aP; uniform float uTime; uniform float uScale; varying float vA; varying float vDist;
        void main(){
          float life = fract(uTime * (0.18 + aP.x * 0.22) + aP.x * 7.0);
          vec3 p = position + vec3(sin(aP.y + life * 5.0) * aP.z * (0.4 + life), life * aP.w, cos(aP.y * 1.3 + life * 4.0) * aP.z * (0.4 + life));
          vec4 mv = viewMatrix * vec4(p, 1.0); vDist = -mv.z;
          vA = smoothstep(0.0, 0.1, life) * (1.0 - life);
          gl_PointSize = uScale * (2.5 + 3.0 * aP.x) * (8.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: FOG + `varying float vA; varying float vDist;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * vA * (1.0 - fogF(vDist));
          gl_FragColor = vec4(vec3(0.8, 0.45, 1.0) * a * 1.4, 1.0); }`
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 6; parent.add(pts);
    this.pts = pts; this.mat = mat; this.geo = geo; return pts;
  }
  update(t, pixelRatio = 1) { if (this.mat) { this.mat.uniforms.uTime.value = t; this.mat.uniforms.uScale.value = pixelRatio * (innerHeight / 800); } }
  dispose() { this.geo?.dispose(); this.mat?.dispose(); this.pts?.removeFromParent(); }
}

/* 床に溜まる紫の霧：通路のマスごとに低い板（ソフトパーティクル風に縁を消す）。2 層を逆向きに流す */
export class GroundMist {
  constructor() { this.cells = []; }
  add(x, z, density = 1, y = 0.05) { this.cells.push([x, z, density, y]); }
  build(parent, cell = 4) {
    if (!this.cells.length) return null;
    const pos = [], dens = [];
    for (const [x, z, d, y] of this.cells) for (const layer of [0, 1]) {
      const yy = y + layer * 0.35, s = cell * 0.62;
      const quad = [[-s, -s], [s, -s], [s, s], [-s, -s], [s, s], [-s, s]];
      for (const [qx, qz] of quad) { pos.push(x + qx, yy, z + qz); dens.push(d * (layer ? 0.6 : 1)); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aD', new THREE.Float32BufferAttribute(dens, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x4a3a7c) } }]), fog: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `attribute float aD; varying float vD; varying vec3 vWp; varying float vDist; void main(){ vD = aD; vec4 wp = modelMatrix * vec4(position,1.0); vWp = wp.xyz; vec4 mv = viewMatrix * wp; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: NOISE + FOG + `uniform float uTime; uniform vec3 uColor; varying float vD; varying vec3 vWp; varying float vDist;
        void main(){
          float layer = step(0.2, vWp.y);
          vec2 p = vWp.xz * 0.32 + (layer > 0.5 ? vec2(-uTime * 0.05, uTime * 0.03) : vec2(uTime * 0.04, uTime * 0.02));
          float f = fbm(p) * fbm(p * 2.3 + 4.0);
          float a = smoothstep(0.08, 0.42, f) * vD;
          // 近すぎる霧は薄く（カメラが霧の中にいても白くならない）
          a *= smoothstep(0.6, 2.5, vDist) * (1.0 - fogF(vDist) * 0.85);
          gl_FragColor = vec4(uColor * a * 0.24, 1.0);
        }`
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 4; parent.add(mesh);
    this.mesh = mesh; this.mat = mat; this.geo = geo; return mesh;
  }
  update(t) { if (this.mat) this.mat.uniforms.uTime.value = t; }
  dispose() { this.geo?.dispose(); this.mat?.dispose(); this.mesh?.removeFromParent(); }
}

/* 崩れた天井から落ちる光の柱（上が明るく下で消える円錐）と、漂う塵 */
export class LightShafts {
  constructor() { this.items = []; }
  add(x, z, top, r = 1.2, color = 0x9c7cff) { this.items.push([x, z, top, r, color]); }
  // 斜めの光線（窓から床へ）。from=上端、to=下端
  beam(from, to, r0 = 0.9, r1 = 1.8, color = 0x9c7cff) { this.items.push({ from, to, r0, r1, color }); }
  build(parent) {
    if (!this.items.length) return null;
    const geos = [];
    for (const it of this.items) {
      let g, color;
      if (Array.isArray(it)) { const [x, z, top, r, c] = it; color = c; g = new THREE.CylinderGeometry(r * 0.75, r * 1.7, top, 18, 1, true).translate(x, top / 2, z); }
      else {
        color = it.color; const d = it.to.clone().sub(it.from), L = d.length();
        g = new THREE.CylinderGeometry(it.r0, it.r1, L, 18, 1, true).translate(0, -L / 2, 0);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), d.normalize())); g.translate(it.from.x, it.from.y, it.from.z);
      }
      const c = new THREE.Color(color), col = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < col.length; i += 3) col.set([c.r, c.g, c.b], i);
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); geos.push(g);
    }
    const geo = geos.length === 1 ? geos[0] : mergeAll(geos);
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]), fog: true, vertexColors: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; varying vec3 vCol; varying vec3 vN; varying vec3 vV; varying float vDist; void main(){ vUv = uv; vCol = color; vec4 mv = modelViewMatrix * vec4(position,1.0); vDist = -mv.z; vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: NOISE + FOG + `uniform float uTime; varying vec2 vUv; varying vec3 vCol; varying vec3 vN; varying vec3 vV; varying float vDist;
        void main(){
          float rim = pow(1.0 - abs(dot(vN, vV)), 1.5);
          float edge = 1.0 - rim;                      // 中心ほど濃い
          float stripes = 0.65 + 0.35 * fbm(vec2(vUv.x * 14.0, vUv.y * 2.0 - uTime * 0.05));
          float a = edge * stripes * smoothstep(0.0, 0.55, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
          gl_FragColor = vec4(vCol * a * 0.085 * (1.0 - fogF(vDist) * 0.7), 1.0);
        }`
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 4; parent.add(mesh);
    this.mesh = mesh; this.mat = mat; this.geo = geo; geos.forEach(g => g !== geo && g.dispose()); return mesh;
  }
  update(t) { if (this.mat) this.mat.uniforms.uTime.value = t; }
  dispose() { this.geo?.dispose(); this.mat?.dispose(); this.mesh?.removeFromParent(); }
}

function mergeAll(geos) {
  // 単純な結合（属性 position/normal/uv/color と index）
  let vcount = 0, icount = 0; for (const g of geos) { vcount += g.attributes.position.count; icount += g.index.count; }
  const out = new THREE.BufferGeometry(), attrs = ['position', 'normal', 'uv', 'color'];
  const arrays = Object.fromEntries(attrs.map(k => [k, new Float32Array(vcount * geos[0].attributes[k].itemSize)]));
  const index = new Uint32Array(icount); let vo = 0, io = 0;
  for (const g of geos) {
    for (const k of attrs) arrays[k].set(g.attributes[k].array, vo * g.attributes[k].itemSize);
    for (let i = 0; i < g.index.count; i++) index[io + i] = g.index.getX(i) + vo;
    vo += g.attributes.position.count; io += g.index.count;
  }
  for (const k of attrs) out.setAttribute(k, new THREE.BufferAttribute(arrays[k], geos[0].attributes[k].itemSize));
  out.setIndex(new THREE.BufferAttribute(index, 1)); return out;
}
