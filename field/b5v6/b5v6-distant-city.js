/* 5層 V6：遠景（A12）— 奈落の底から林立する光るビル群
 * ・実写（CC0、Wikimedia Commons の夜景 3 枚）を切り抜いたカードを主役に、
 *   ambientCG の夜の外壁（発光マップ）を貼った箱のビルで密度を出す。出典は field/assets/b5v6/CREDITS.md
 * ・霧の影響を受けない独自シェーダーで、距離と高さに応じて紫の霞に溶かす（ゲームの指数霧では 50 m 先が消えるため）
 * ・アニメーション：窓の点灯・消灯、航空障害灯の点滅、屋上の光帯の明滅、霞の流れ
 * 壁の破れ目・崩れた天井からだけ見える（全高壁が手前を遮る）。 */
import * as THREE from 'three';
import { rng } from './b5v6-geom.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const BASE = new URL('../assets/b5v6/city/', import.meta.url).href;
const HAZE = new THREE.Color(0x120c22), HAZE_LOW = new THREE.Color(0x1e0f3a);

const hazeChunk = /* glsl */`
  uniform vec3 uHaze; uniform vec3 uHazeLow; uniform vec3 uCenter; uniform float uTime;
  vec3 applyHaze(vec3 col, vec3 wp, float amount) {
    float d = length(wp.xz - uCenter.xz);
    float far = smoothstep(40.0, 175.0, d);
    float low = smoothstep(-5.0, -70.0, wp.y);          // 奈落の底ほど紫の霧
    vec3 hz = mix(uHaze, uHazeLow, low);
    return mix(col, hz, clamp(far * 0.5 + low * 0.7, 0.0, 0.9) * amount);
  }`;

export function createB5V6DistantCity({ center = new THREE.Vector3(), radius = [62, 125], count = 46, seed = 5, high = true, focus = [] } = {}) {
  const group = new THREE.Group(); group.name = 'b5v6:distant-city';
  const owned = [], updaters = [], loader = new THREE.TextureLoader();
  const R = rng(seed);
  const tex = (f, srgb = true) => { const t = loader.load(BASE + f); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; owned.push(t); return t; };
  const common = { uHaze: { value: HAZE.clone() }, uHazeLow: { value: HAZE_LOW.clone() }, uCenter: { value: center.clone() }, uTime: { value: 0 } };

  // ---------------------------------------------------------------- 奈落の背景（内向きの球）
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { ...common }, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime; varying vec3 vDir;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float a=0.0, m=0.5; for(int i=0;i<5;i++){ a+=m*n(p); p*=2.03; m*=0.5; } return a; }
      void main(){
        float y = vDir.y; float az = atan(vDir.z, vDir.x);
        vec3 top = vec3(0.006,0.005,0.012), hor = vec3(0.03,0.02,0.055), abyss = vec3(0.05,0.018,0.09);
        vec3 col = mix(hor, top, smoothstep(0.0, 0.7, y));
        col = mix(col, abyss, smoothstep(0.0, -0.6, y));
        // 流れる星雲（上空）と、奈落の底から立ちのぼる紫の光
        float neb = fbm(vec2(az*3.0 + uTime*0.004, y*4.0 - uTime*0.002));
        col += vec3(0.05,0.025,0.09) * smoothstep(0.55, 0.95, neb) * smoothstep(-0.1, 0.5, y) * 0.8;
        float glow = fbm(vec2(az*5.0, y*2.5 + uTime*0.01));
        col += vec3(0.16,0.05,0.30) * pow(smoothstep(-0.05, -0.75, y), 2.0) * (0.45 + 0.55*glow);
        // 星
        vec2 sp = vec2(az*90.0, y*90.0); float s = h(floor(sp));
        col += vec3(0.8,0.75,1.0) * step(0.9975, s) * smoothstep(0.05, 0.4, y) * (0.6 + 0.4*sin(uTime*2.0 + s*50.0));
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  skyMat.uniforms = { ...common };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(170, 48, 24), skyMat); sky.position.copy(center); sky.renderOrder = -10; sky.frustumCulled = false;
  group.add(sky); owned.push(sky.geometry, skyMat);

  // ---------------------------------------------------------------- 箱のビル（外壁の発光マップ）
  const winTex = [tex('win_a.jpg'), tex('win_b.jpg'), tex('win_c.jpg')];
  const towerMats = winTex.map((t, k) => {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...common, uWin: { value: t }, uTint: { value: new THREE.Color([0xd8d0ff, 0xffe2c0, 0xc8d8ff][k]) } }, fog: false,
      vertexShader: `attribute float aSeed; varying vec2 vUv; varying vec3 vWp; varying float vSeed; varying float vSide;
        void main(){ vUv = uv; vSeed = aSeed; vec4 wp = modelMatrix * vec4(position,1.0); vWp = wp.xyz; vSide = abs(normal.y) > 0.5 ? 0.0 : 1.0; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: hazeChunk + `uniform sampler2D uWin; uniform vec3 uTint; varying vec2 vUv; varying vec3 vWp; varying float vSeed; varying float vSide;
        float h(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1))) * 15731.743); }
        void main(){
          vec3 win = texture2D(uWin, vUv).rgb;
          // 窓の区画ごとに、ゆっくり点いたり消えたりする
          vec2 cell = floor(vUv * vec2(10.0, 10.0));
          float slot = floor(uTime * 0.12 + h(cell + vSeed) * 7.0);
          float on = step(0.28, h(cell * 1.7 + slot + vSeed * 3.1));
          float flick = 0.85 + 0.15 * sin(uTime * (1.0 + h(cell)) * 3.0 + vSeed * 20.0);
          vec3 body = vec3(0.012, 0.011, 0.02) * (0.6 + 0.4 * vSide);
          vec3 col = body + win * uTint * 1.05 * on * flick * vSide;
          gl_FragColor = vec4(applyHaze(col, vWp, 1.0), 1.0);
        }`
    });
    owned.push(m); return m;
  });
  const towerParts = [[], [], []], tops = [];
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + (R() - 0.5) * 0.12, rad = radius[0] + R() * (radius[1] - radius[0]);
    const w = 7 + R() * 12, d = 7 + R() * 12, h = 50 + Math.pow(R(), 1.6) * 110, base = -95 - R() * 20;
    const x = center.x + Math.cos(ang) * rad, z = center.z + Math.sin(ang) * rad;
    const g = new THREE.BoxGeometry(w, h, d);
    // 窓の UV を実寸に合わせる（1 枚の発光マップ ≒ 幅 24 m × 高さ 24 m）
    const uv = g.attributes.uv, nrm = g.attributes.normal, pos = g.attributes.position;
    for (let k = 0; k < uv.count; k++) {
      const nx = Math.abs(nrm.getX(k)), ny = Math.abs(nrm.getY(k));
      const across = nx > 0.5 ? pos.getZ(k) : pos.getX(k);
      uv.setXY(k, (across + 50) / 15, (pos.getY(k) + h / 2) / 15);
      if (ny > 0.5) uv.setXY(k, 0, 0);
    }
    g.translate(x, base + h / 2, z); g.rotateY(0);
    const seedA = new Float32Array(pos.count).fill(R() * 10); g.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));
    towerParts[Math.floor(R() * 3)].push(g);
    tops.push(new THREE.Vector3(x, base + h + 0.5, z));
    // ときどき段のある塔（上に細い塔を重ねる）
    if (R() < 0.35) {
      const h2 = 12 + R() * 30, g2 = new THREE.BoxGeometry(w * 0.6, h2, d * 0.6);
      const uv2 = g2.attributes.uv, n2 = g2.attributes.normal, p2 = g2.attributes.position;
      for (let k = 0; k < uv2.count; k++) { const across = Math.abs(n2.getX(k)) > 0.5 ? p2.getZ(k) : p2.getX(k); uv2.setXY(k, (across + 50) / 15, (p2.getY(k) + h2 / 2) / 15); if (Math.abs(n2.getY(k)) > 0.5) uv2.setXY(k, 0, 0); }
      g2.translate(x, base + h + h2 / 2, z);
      g2.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(p2.count).fill(R() * 10), 1));
      towerParts[Math.floor(R() * 3)].push(g2);
      tops[tops.length - 1].y += h2;
    }
  }
  {
    towerParts.forEach((parts, k) => {
      if (!parts.length) return;
      const merged = mergeGeometries(parts); parts.forEach(p => p.dispose());
      const mesh = new THREE.Mesh(merged, towerMats[k]); mesh.frustumCulled = false; mesh.renderOrder = -5; group.add(mesh); owned.push(merged);
    });
  }

  // ---------------------------------------------------------------- 実写カード（主役のビル群）
  const cardDefs = [['sj_a', 0.294, 95], ['sj_b', 0.198, 88], ['sj_c', 0.143, 100], ['sj_d', 0.56, 40], ['sj_e', 0.337, 48], ['sj_f', 0.725, 30], ['hk_skyline', 1.074, 70], ['mh_fogcity', 1.548, 60]];
  const cardMat = (file) => {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...common, uMap: { value: tex(file) }, uGain: { value: file.startsWith('mh') ? 0.22 : file.startsWith('hk') ? 0.9 : 1.25 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: `varying vec2 vUv; varying vec3 vWp; void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); vWp = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: hazeChunk + `uniform sampler2D uMap; uniform float uGain; varying vec2 vUv; varying vec3 vWp;
        void main(){
          vec3 c = texture2D(uMap, vUv).rgb;
          float edge = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x) * smoothstep(0.0, 0.25, vUv.y);
          c *= uGain * edge * (0.92 + 0.08 * sin(uTime * 0.7 + vWp.x));
          // 加算なので、霞は「暗くする」方向に効かせる
          float d = length(vWp.xz - uCenter.xz);
          c *= mix(1.0, 0.35, smoothstep(50.0, 170.0, d)) * mix(1.0, 0.25, smoothstep(-10.0, -70.0, vWp.y));
          c = mix(c, c * vec3(0.85, 0.75, 1.15), 0.5);
          gl_FragColor = vec4(c, 1.0);
        }`
    });
    owned.push(m); return m;
  };
  const cardMats = new Map(cardDefs.map(([f]) => [f, cardMat(f + '.jpg')]));
  const plane = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0); owned.push(plane);
  const nCards = high ? 30 : 16;
  for (let i = 0; i < nCards; i++) {
    const [file, aspect, hBase] = cardDefs[i % cardDefs.length];
    const ang = (i / nCards) * Math.PI * 2 + 0.17 + (R() - 0.5) * 0.2, rad = radius[0] - 4 + R() * (radius[1] - radius[0] + 10);
    const h = hBase * (0.8 + R() * 0.6) * (file === 'hk_skyline' || file === 'mh_fogcity' ? 1.2 : 1), w = h * aspect;
    const m = new THREE.Mesh(plane, cardMats.get(file));
    m.scale.set(w, h, 1); m.position.set(center.x + Math.cos(ang) * rad, -70 - R() * 25 + (file === 'hk_skyline' ? 25 : 0), center.z + Math.sin(ang) * rad);
    m.lookAt(center.x, m.position.y, center.z); m.renderOrder = -4; m.frustumCulled = false;
    group.add(m);
  }

  // 破れ目の正面には必ず実写のビルを置く（どの破れ目からも主役が見える）
  const hero = ['sj_a', 'hk_skyline', 'sj_c', 'sj_b', 'sj_e'];
  focus.forEach((fc, fi) => {
    const dir = fc.dir.clone().normalize(), side = new THREE.Vector3(-dir.z, 0, dir.x);
    for (let j = 0; j < 3; j++) {
      const file = hero[(fi + j) % hero.length], def = cardDefs.find(d => d[0] === file);
      const dist = 70 + j * 22 + R() * 10, lat = (j - 1) * (14 + R() * 8);
      const h = def[2] * (1.0 + R() * 0.3), w = h * def[1];
      const m = new THREE.Mesh(plane, cardMats.get(file)); m.scale.set(w, h, 1);
      m.position.copy(fc.pos).addScaledVector(dir, dist).addScaledVector(side, lat); m.position.y = -h * 0.55 + (file === 'hk_skyline' ? 8 : 0);
      m.lookAt(fc.pos.x, m.position.y, fc.pos.z); m.renderOrder = -4; m.frustumCulled = false; group.add(m);
    }
  });

  // ---------------------------------------------------------------- 航空障害灯・屋上の光帯
  const beaconGeo = new THREE.BufferGeometry().setFromPoints(tops);
  const phases = new Float32Array(tops.length).map(() => R() * 6.28); beaconGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  const beaconMat = new THREE.ShaderMaterial({
    uniforms: { uTime: common.uTime, uSize: { value: high ? 9.0 : 7.0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `attribute float aPhase; uniform float uTime; uniform float uSize; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); float b = step(0.55, fract(uTime*0.55 + aPhase)); vA = 0.25 + 0.75*b; gl_PointSize = uSize * (120.0 / -mv.z) * (0.6 + 0.6*b); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vec3(1.0, 0.18, 0.22) * a * vA * 1.6, 1.0); }`
  });
  const beacons = new THREE.Points(beaconGeo, beaconMat); beacons.frustumCulled = false; beacons.renderOrder = -3; group.add(beacons); owned.push(beaconGeo, beaconMat);

  // ---------------------------------------------------------------- 流れる霞（ビルの間を水平に）
  const mistMat = new THREE.ShaderMaterial({
    uniforms: { ...common }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vWp; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWp = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uCenter; varying vec3 vWp;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float a=0.0, m=0.5; for(int i=0;i<5;i++){ a+=m*n(p); p*=2.07; m*=0.5; } return a; }
      void main(){
        vec2 p = (vWp.xz - uCenter.xz) * 0.018;
        float f = fbm(p + vec2(uTime*0.012, uTime*0.007)) * fbm(p*1.7 - vec2(uTime*0.009, 0.0));
        float d = length(vWp.xz - uCenter.xz);
        float ring = smoothstep(38.0, 60.0, d) * smoothstep(175.0, 120.0, d);
        gl_FragColor = vec4(vec3(0.30, 0.13, 0.55) * smoothstep(0.15, 0.5, f) * ring * 0.3, 1.0);
      }`
  });
  for (const y of [-34, -58, -80]) {
    const mg = new THREE.RingGeometry(36, 175, 64, 1).rotateX(-Math.PI / 2);
    const mm = new THREE.Mesh(mg, mistMat); mm.position.set(center.x, y, center.z); mm.renderOrder = -2; mm.frustumCulled = false; group.add(mm); owned.push(mg);
  }
  owned.push(mistMat);

  return {
    group,
    update(t) { common.uTime.value = t; },
    dispose() { owned.forEach(o => o.dispose?.()); group.removeFromParent(); }
  };
}
