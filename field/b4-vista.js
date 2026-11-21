/* B4：眺めの窓（overlook）の外側を「一枚絵」に見せない（2026-11-22 ユーザー指摘：横から見ると足りない部分が見える）
 * 窓の外（ローカル −Z）を囲む：
 *   ・空の殻：半径 80 m・高さ 110 m の半円筒（内向き）。地平の橙の照り返し→上は暗い煙の空、2 層の山の稜線、流れる煙。
 *   ・両脇の崖：窓の端から外へ 35°に開く岩壁（幅 34 m・高さ −28〜+34 m、dark_rock_02、凹凸あり）。斜めから覗いても空と崖しか見えない。
 *   ・中景の岩山のシルエット 2 枚（z −32 / −48、視差）と、下の溶岩の海（y −16）。
 *   ・窓の枠：柱 4 本（0.8 m 角、台座・柱頭）、まぐさのルーン帯、低い欄干 3 枚。
 * 窓の位置・向きは b4-game-scenery.js の vista（mine-alcove と同じ規則）。 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { B4_VFX_TIME, deepLavaMaterial, glyphMaterial } from './b4-vfx.js?v=20261122-i5';
import { parapetGeometry } from './b4-chasm.js?v=20261122-i5';

const NOISE = /* glsl */`
  float vh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(vh(i), vh(i + vec2(1,0)), u.x), mix(vh(i + vec2(0,1)), vh(i + vec2(1,1)), u.x), u.y); }
  float vf(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * vn(p); p *= 2.02; a *= 0.5; } return v; }`;

function skyMaterial(center) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: B4_VFX_TIME, uC: { value: center } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uC; varying vec3 vW;
      ${NOISE}
      void main(){
        vec3 v = normalize(vW - uC); float e = v.y, az = atan(v.x, v.z);
        vec3 horizon = vec3(0.62, 0.16, 0.04), mid = vec3(0.22, 0.05, 0.03), top = vec3(0.05, 0.02, 0.02);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.18, e)); col = mix(col, top, smoothstep(0.18, 0.55, e));
        float smoke = vf(vec2(az * 3.0 + uTime * 0.01, e * 6.0 - uTime * 0.02));
        col *= 0.7 + 0.5 * smoke;
        // 遠い山（2 層）
        float r1 = 0.05 + vf(vec2(az * 2.2, 1.7)) * 0.13, r2 = 0.02 + vf(vec2(az * 4.1 + 9.0, 3.1)) * 0.09;
        if (e < r1) col = mix(vec3(0.16, 0.05, 0.035), col, 0.35) * (0.8 + 0.4 * smoothstep(r1 - 0.02, r1, e));
        if (e < r2) col = vec3(0.07, 0.025, 0.02) + vec3(0.25, 0.05, 0.01) * smoothstep(r2 - 0.012, r2, e);
        col += vec3(0.5, 0.12, 0.02) * smoothstep(0.06, -0.02, e) * 0.8;      // 下からの溶岩の照り返し
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
}

function ridgeMaterial(seed, color, rim) {
  return new THREE.ShaderMaterial({
    uniforms: { uSeed: { value: seed }, uCol: { value: new THREE.Color(color) }, uRim: { value: new THREE.Color(rim) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform float uSeed; uniform vec3 uCol; uniform vec3 uRim; varying vec2 vUv;
      ${NOISE}
      void main(){
        float h = 0.35 + vf(vec2(vUv.x * 5.0 + uSeed, uSeed)) * 0.45 + vn(vec2(vUv.x * 23.0, uSeed)) * 0.06;
        if (vUv.y > h) discard;
        float rim = smoothstep(h - 0.025, h, vUv.y);
        gl_FragColor = vec4(mix(uCol, uRim, rim), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

export function buildVista({ root, site, CELL, mats, hash }) {
  const group = new THREE.Group(); group.name = 'b4:vista-world';
  const owned = [];
  const W = new THREE.Vector3((site.tx + site.dx / 2) * CELL, 0, (site.ty + site.dz / 2) * CELL);
  group.position.copy(W); group.rotation.y = Math.atan2(-site.dx, -site.dz);
  // 空の殻（外側の半分）
  {
    const g = new THREE.CylinderGeometry(80, 80, 110, 48, 1, true, Math.PI / 2, Math.PI); g.translate(0, 20, 0); owned.push(g);
    const m = skyMaterial(new THREE.Vector3()); owned.push(m);
    const mesh = new THREE.Mesh(g, m); mesh.name = 'b4:vista-sky'; mesh.renderOrder = -5; group.add(mesh);
    mesh.onBeforeRender = () => { mesh.getWorldPosition(m.uniforms.uC.value); m.uniforms.uC.value.y += 2; };
  }
  // 崖（両脇）
  {
    const cliffM = mats.rock.clone(); cliffM.side = THREE.DoubleSide; owned.push(cliffM);
    for (const side of [-1, 1]) {
      const g = new THREE.PlaneGeometry(34, 62, 24, 30), p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        p.setZ(i, (Math.sin(x * 0.7 + y * 0.31 + side) * 0.9 + Math.sin(x * 2.1 - y * 1.3) * 0.35 + (hash(i, side + 2, 1501) - 0.5) * 0.4) * (0.4 + Math.abs(x) / 17));
        uv.setXY(i, uv.getX(i) * 34 / 6, uv.getY(i) * 62 / 6);
      }
      g.computeVertexNormals(); owned.push(g);
      const mesh = new THREE.Mesh(g, cliffM); mesh.name = 'b4:vista-cliff';
      // 窓の端 (±6.3, 0) から外へ 35°。面の法線が窓の中心線の側を向く角度：左 2.18 rad／右 −2.18 rad
      mesh.rotation.y = side < 0 ? 2.18 : -2.18; mesh.position.set(side * (6.3 + 0.574 * 17), 3, -0.819 * 17);
      group.add(mesh);
    }
  }
  // 中景の岩山（視差）と溶岩の海
  {
    for (const [z, w, hgt, seed, col, rim] of [[-32, 90, 26, 1.3, 0x1a0806, 0x7a2408], [-50, 130, 34, 4.7, 0x2a0c08, 0x5a1a08]]) {
      const g = new THREE.PlaneGeometry(w, hgt); g.translate(0, hgt / 2 - 16, z); owned.push(g);
      const m = ridgeMaterial(seed, col, rim); owned.push(m);
      const mesh = new THREE.Mesh(g, m); mesh.name = 'b4:vista-ridge'; group.add(mesh);
    }
    const lg = new THREE.PlaneGeometry(170, 90).rotateX(-Math.PI / 2); lg.translate(0, -16, -45); owned.push(lg);
    const lm = deepLavaMaterial({ flow: new THREE.Vector2(0.01, 0.02), scale: 0.06 }); owned.push(lm);
    const lava = new THREE.Mesh(lg, lm); lava.name = 'b4:vista-lava-sea'; group.add(lava);
  }
  // 窓の枠（神殿の柱・まぐさ・欄干）
  {
    const parts = [];
    for (const x of [-5.75, -1.95, 1.95, 5.75]) {
      parts.push(new THREE.BoxGeometry(0.8, 3.3, 0.8).translate(x, 0.55 + 1.65, 0.1));
      parts.push(new THREE.BoxGeometry(1.05, 0.3, 1.05).translate(x, 0.7, 0.1), new THREE.BoxGeometry(1.05, 0.3, 1.05).translate(x, 3.7, 0.1));
    }
    parts.push(new THREE.BoxGeometry(12.6, 0.5, 1.0).translate(0, 4.05, 0.1));
    for (const x of [-3.85, 0, 3.85]) { const pg = parapetGeometry(hash, x * 7 + 3); pg.scale(0.88, 0.62, 1); pg.translate(x, 0.55, -0.05); parts.push(pg); }
    const g = mergeGeometries(parts.map(q => q.index ? q.toNonIndexed() : q), false); parts.forEach(q => q.dispose()); owned.push(g);
    const mesh = new THREE.Mesh(g, mats.boulder || mats.trim); mesh.name = 'b4:vista-frame'; group.add(mesh);
    const rg = new THREE.PlaneGeometry(10.8, 0.34), rm = glyphMaterial({ style: 2, seed: 6.6, intensity: 0.5, speed: 0.3, broken: 0.4 }); owned.push(rg, rm);
    const r = new THREE.Mesh(rg, rm); r.position.set(0, 4.05, 0.62); r.renderOrder = 4; group.add(r);
  }
  root.add(group);
  return { group, dispose() { owned.forEach(o => o.dispose()); group.removeFromParent(); } };
}
