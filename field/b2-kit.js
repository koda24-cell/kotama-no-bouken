/* B2 凍てつく水源：2層専用の配置物（1層の森の部品・4層の鉱山トロッコの使い回しをやめる）
 * docs/3d/B2_OBJECT_REUSE_AUDIT.md。原点はマスの中心、+Z が通路側。寸法は m。
 *   セーブ地点：直径 2.6 m の霜の魔法陣＋氷石の六角祭壇（0.85 m）＋浮かぶ氷晶（0.55 m、水色に発光）。
 *   石碑      ：霜をかぶった青灰の碑 0.7×1.55×0.28、水色のルーン、上端に氷の房。
 *   宝箱      ：0.9×0.6×0.6、色の抜けた木＋青鉄の帯、蓋に氷の殻。開くと中が水色に光る。
 *   補給の木箱：置き去りの木箱 2 つ＋樽＋ロープ、霜と小さな氷柱（イベント用）。 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const merge = parts => { const g = mergeGeometries(parts.map(p => (p.index ? p.toNonIndexed() : p)), false); parts.forEach(p => p.dispose()); return g; };
const box = (w, h, d, x, y, z, ry = 0) => { const b = new THREE.BoxGeometry(w, h, d); if (ry) b.rotateY(ry); b.translate(x, y, z); return b; };
const light = (obj, pos, color, intensity, range) => { (obj.userData.b1 ||= {}).lights = [...(obj.userData.b1.lights || []), { pos, color, intensity, range }]; };

function frostCircleMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      varying vec2 vUv;
      float ring(float r, float R, float w){ return smoothstep(w, 0.0, abs(r - R)); }
      void main(){
        vec2 p = vUv * 2.0 - 1.0; float r = length(p), a = atan(p.y, p.x);
        float g = ring(r, 0.95, 0.014) + ring(r, 0.86, 0.006) + ring(r, 0.5, 0.01);
        float an = mod(a, 6.2831853 / 6.0) - 3.14159 / 6.0;
        g += ring(r * cos(an), 0.43, 0.008) * step(r, 0.5);                   // 六角
        g += smoothstep(0.012, 0.0, abs(sin(a * 3.0)) * r) * step(0.5, r) * step(r, 0.86) * 0.7;   // 雪の結晶の腕
        float tick = step(0.82, fract(a / 6.2831853 * 36.0)) * step(0.87, r) * step(r, 0.93);
        g += tick * 0.6;
        g *= smoothstep(1.0, 0.97, r);
        gl_FragColor = vec4(vec3(0.45, 0.85, 1.0) * g * 0.9, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}
function runeBandMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        float y = vUv.y, x = vUv.x * 7.0; float id = floor(x); vec2 c = vec2(fract(x), y);
        vec2 g = floor(c * 3.0), f = fract(c * 3.0); float v = 0.0;
        if (h(vec2(id, g.x * 3.0 + g.y)) > 0.5) v = max(v, smoothstep(0.18, 0.07, abs(f.x - 0.5)));
        if (h(vec2(id + 7.0, g.y)) > 0.55) v = max(v, smoothstep(0.18, 0.07, abs(f.y - 0.5)));
        v *= step(0.08, c.x) * step(c.x, 0.92) * step(0.06, y) * step(y, 0.94);
        gl_FragColor = vec4(vec3(0.3, 0.7, 1.0) * v * 0.75, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}

export function createB2Kit() {
  const owned = [];
  const iceStone = new THREE.MeshStandardMaterial({ color: 0x5c7181, roughness: 0.62, metalness: 0.05 });
  const frost = new THREE.MeshStandardMaterial({ color: 0x9cc4da, roughness: 0.22, metalness: 0.0, transparent: true, opacity: 0.78, emissive: 0x06121a, emissiveIntensity: 1 });
  const crystal = new THREE.MeshStandardMaterial({ color: 0x9fe6ff, roughness: 0.1, metalness: 0.1, emissive: 0x3ab8ff, emissiveIntensity: 1.6, transparent: true, opacity: 0.9 });
  const blueIron = new THREE.MeshStandardMaterial({ color: 0x3a4654, roughness: 0.4, metalness: 0.85 });
  const paleWood = new THREE.MeshStandardMaterial({ color: 0x6e5a4c, roughness: 0.8 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x0a1c26, emissive: 0x4ad2ff, emissiveIntensity: 2.4 });
  const rope = new THREE.MeshStandardMaterial({ color: 0x8a7a62, roughness: 0.95 });
  const circleM = frostCircleMaterial(), runeM = runeBandMaterial();
  owned.push(iceStone, frost, crystal, blueIron, paleWood, glow, rope, circleM, runeM);
  const mesh = (geo, mat, name) => { owned.push(geo); const m = new THREE.Mesh(geo, mat); m.name = name; return m; };
  const icicles = (pts, len = 0.22) => merge(pts.map(([x, y, z], i) => { const c = new THREE.ConeGeometry(0.035 + (i % 3) * 0.01, len * (0.6 + (i % 4) * 0.25), 5); c.rotateX(Math.PI); c.translate(x, y - len * 0.4, z); return c; }));

  // セーブ地点
  const save = new THREE.Group(); save.name = 'b2kit:save';
  {
    const cg = new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2); cg.translate(0, 0.02, 0); const c = mesh(cg, circleM, 'circle'); c.renderOrder = 3; save.add(c);
    const hex = (r0, r1, h, y) => { const g = new THREE.CylinderGeometry(r1, r0, h, 6); g.translate(0, y, 0); return g; };
    save.add(mesh(merge([hex(0.58, 0.54, 0.14, 0.07), hex(0.42, 0.36, 0.56, 0.42), hex(0.54, 0.56, 0.12, 0.76)]), iceStone, 'altar'));
    save.add(mesh(merge([hex(0.6, 0.56, 0.05, 0.165), hex(0.57, 0.6, 0.05, 0.845)]), frost, 'frost-rims'));
    const xt = new THREE.OctahedronGeometry(0.3, 0); xt.scale(0.75, 1.35, 0.75); xt.translate(0, 1.42, 0); save.add(mesh(xt, crystal, 'crystal'));
    const shards = [];
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const s = new THREE.OctahedronGeometry(0.07, 0); s.scale(0.6, 1.8, 0.6); s.translate(Math.cos(a) * 0.45, 1.25 + (i % 2) * 0.22, Math.sin(a) * 0.45); shards.push(s); }
    save.add(mesh(merge(shards), crystal, 'shards'));
    const band = new THREE.CylinderGeometry(0.43, 0.43, 0.16, 6, 1, true); band.translate(0, 0.46, 0); const bm = mesh(band, runeM, 'rune'); bm.renderOrder = 4; save.add(bm);
    light(save, [0, 1.6, 0], 0x7fdcff, 2.2, 7);
  }
  // 石碑
  const sign = new THREE.Group(); sign.name = 'b2kit:stele';
  {
    const s = new THREE.Shape(); s.moveTo(-0.35, 0); s.lineTo(-0.35, 1.25); s.quadraticCurveTo(-0.35, 1.55, 0, 1.55); s.quadraticCurveTo(0.35, 1.55, 0.35, 1.25); s.lineTo(0.35, 0); s.lineTo(-0.35, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 8 }); g.translate(0, 0.18, -0.14);
    sign.add(mesh(g, iceStone, 'stele'));
    sign.add(mesh(merge([box(0.9, 0.18, 0.44, 0, 0.09, 0), box(0.94, 0.04, 0.48, 0, 0.19, 0)]), frost, 'base'));
    const cap = new THREE.SphereGeometry(0.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); cap.scale(1, 0.22, 0.48); cap.translate(0, 1.68, 0); sign.add(mesh(cap, frost, 'snow-cap'));
    sign.add(mesh(icicles([[-0.28, 1.5, 0.16], [-0.12, 1.66, 0.17], [0.05, 1.7, 0.17], [0.2, 1.62, 0.17], [0.3, 1.48, 0.16]]), frost, 'icicles'));
    const rg = new THREE.PlaneGeometry(0.42, 0.95); const r = mesh(rg, runeM, 'rune'); r.position.set(0, 0.9, 0.175); r.renderOrder = 4; sign.add(r);
    light(sign, [0, 1.1, 0.5], 0x7fdcff, 0.7, 3);
  }
  // 宝箱
  const body = () => {
    const g = new THREE.Group();
    g.add(mesh(box(0.9, 0.38, 0.6, 0, 0.23, 0), paleWood, 'body'));
    const bands = [box(0.94, 0.06, 0.64, 0, 0.08, 0), box(0.94, 0.05, 0.64, 0, 0.4, 0)];
    for (const x of [-0.33, 0.33]) bands.push(box(0.07, 0.4, 0.64, x, 0.24, 0));
    g.add(mesh(merge(bands), blueIron, 'bands'));
    g.add(mesh(merge([box(0.96, 0.05, 0.66, 0, 0.03, 0)]), frost, 'frost-foot'));
    return g;
  };
  const lidGeo = () => { const c = new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12, 1, false, 0, Math.PI); c.rotateZ(Math.PI / 2); c.rotateX(Math.PI / 2); return c; };
  const lid = () => {
    const g = new THREE.Group();
    g.add(mesh(lidGeo(), paleWood, 'lid'));
    const crust = new THREE.CylinderGeometry(0.315, 0.315, 0.5, 10, 1, false, 1.0, 1.1); crust.rotateZ(Math.PI / 2); crust.rotateX(Math.PI / 2); crust.translate(0.1, 0, 0); g.add(mesh(crust, frost, 'ice-crust'));
    g.add(mesh(icicles([[-0.4, 0, 0.3], [-0.2, 0, 0.31], [0.05, 0, 0.31], [0.3, 0, 0.3]], 0.16), frost, 'icicles'));
    const clasp = new THREE.OctahedronGeometry(0.07, 0); clasp.translate(0, -0.02, 0.31); g.add(mesh(clasp, crystal, 'clasp'));
    return g;
  };
  const chest = new THREE.Group(); chest.name = 'b2kit:chest';
  { const c = new THREE.Group(); c.scale.setScalar(1.25); c.add(body()); const l = lid(); l.position.set(0, 0.42, 0); c.add(l); chest.add(c); light(chest, [0, 0.7, 0.7], 0x7fdcff, 0.5, 2.5); }
  const chestOpen = new THREE.Group(); chestOpen.name = 'b2kit:chest-open';
  {
    const c = new THREE.Group(); c.scale.setScalar(1.25); chestOpen.add(c); c.add(body());
    const pivot = new THREE.Group(); pivot.position.set(0, 0.42, -0.3); pivot.rotation.x = -1.9; const l = lid(); l.position.set(0, 0, 0.3); pivot.add(l); c.add(pivot);
    const inner = new THREE.PlaneGeometry(0.8, 0.5).rotateX(-Math.PI / 2); inner.translate(0, 0.36, 0); c.add(mesh(inner, glow, 'glow'));
    light(chestOpen, [0, 0.9, 0], 0x6ad4ff, 1.8, 4);
  }
  // 補給の木箱（イベント）
  const crate = new THREE.Group(); crate.name = 'b2kit:supply-crates';
  {
    const w = [], f = [], ir = [];
    w.push(box(0.8, 0.7, 0.8, -0.35, 0.35, 0, 0.2), box(0.6, 0.55, 0.6, 0.42, 0.275, 0.18, -0.35), box(0.55, 0.45, 0.55, -0.3, 0.925, 0.05, 0.55));
    for (const [x, y, z, s, r] of [[-0.35, 0.35, 0, 0.8, 0.2], [0.42, 0.275, 0.18, 0.6, -0.35]]) { ir.push(box(s + 0.03, 0.05, s + 0.03, x, y + s * 0.35, z, r), box(s + 0.03, 0.05, s + 0.03, x, y - s * 0.3, z, r)); }
    const barrel = new THREE.CylinderGeometry(0.26, 0.26, 0.7, 12); barrel.translate(0.15, 0.35, -0.55); w.push(barrel);
    f.push(box(0.84, 0.05, 0.84, -0.35, 0.72, 0, 0.2), box(0.58, 0.04, 0.58, -0.3, 1.17, 0.05, 0.55), box(0.64, 0.04, 0.64, 0.42, 0.57, 0.18, -0.35));
    crate.add(mesh(merge(w), paleWood, 'crates'), mesh(merge(ir), blueIron, 'bands'), mesh(merge(f), frost, 'frost'));
    const rp = new THREE.TorusGeometry(0.42, 0.025, 5, 16); rp.rotateX(Math.PI / 2); rp.translate(-0.35, 0.5, 0); crate.add(mesh(rp, rope, 'rope'));
    crate.add(mesh(icicles([[-0.7, 0.7, 0.1], [-0.5, 0.7, 0.38], [-0.2, 0.7, 0.42], [0.2, 0.55, 0.45], [0.6, 0.55, 0.3]], 0.2), frost, 'icicles'));
  }
  // 採取ポイント（2026-11-22）：採掘＝青石に氷晶の鉱脈、採取＝霜の百合、伐採＝凍った流木。尽きたときの暗さは共通処理の dimObj
  const lump = (n, r0, spread, seed) => { const out = []; for (let i = 0; i < n; i++) { const a = i * 2.399 + seed, rr = spread * Math.sqrt((i + 0.5) / n), sc = r0 * (1.15 - i / n * 0.5); const g = new THREE.IcosahedronGeometry(1, 1); g.scale(sc, sc * 0.75, sc); g.rotateY(a); g.translate(Math.cos(a) * rr, sc * 0.3 + 0.05, Math.sin(a) * rr); out.push(g); } return merge(out); };
  const gMine = new THREE.Group(); gMine.name = 'b2kit:gather-mine';
  {
    gMine.add(mesh(lump(7, 0.4, 0.5, 2.1), iceStone, 'rock'));
    const sh = []; for (let i = 0; i < 6; i++) { const o = new THREE.OctahedronGeometry(0.09, 0); o.scale(0.8, 3.6 + (i % 3), 0.8); o.rotateZ((i - 2.5) * 0.25); o.rotateX((i % 2 ? 1 : -1) * 0.3); o.translate(-0.25 + i * 0.1, 0.55 + (i % 2) * 0.08, (i % 3 - 1) * 0.15); sh.push(o); }
    gMine.add(mesh(merge(sh), crystal, 'ice-ore'));
    gMine.add(mesh(merge([box(0.9, 0.04, 0.7, 0, 0.6, 0, 0.3)].map(b => { b.scale(0.6, 1, 0.6); return b; })), frost, 'frost'));
    light(gMine, [0, 0.8, 0.3], 0x7fdcff, 0.9, 3);
  }
  const gHerb = new THREE.Group(); gHerb.name = 'b2kit:gather-herb';
  {
    const st = [], pe = [];
    for (let i = 0; i < 7; i++) {
      const a = i * 2.399, r = 0.1 + (i % 3) * 0.13, h = 0.3 + (i % 3) * 0.12, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const c = new THREE.CylinderGeometry(0.008, 0.014, h, 4); c.translate(x, h / 2, z); st.push(c);
      for (let k = 0; k < 5; k++) { const p = new THREE.SphereGeometry(0.05, 6, 4); p.scale(0.45, 0.12, 1); p.translate(0, 0, 0.05); p.rotateX(-0.5); p.rotateY(k * 1.257); p.translate(x, h, z); pe.push(p); }
    }
    gHerb.add(mesh(merge(st), new THREE.MeshStandardMaterial({ color: 0x4f7a78, roughness: 0.7 }), 'stems'));
    gHerb.add(mesh(merge(pe), crystal, 'frost-lily'));
    const snow = new THREE.CircleGeometry(0.6, 12).rotateX(-Math.PI / 2); snow.translate(0, 0.012, 0); gHerb.add(mesh(snow, frost, 'snow'));
    light(gHerb, [0, 0.5, 0], 0x7fdcff, 0.8, 2.6);
  }
  const gChop = new THREE.Group(); gChop.name = 'b2kit:gather-driftwood';
  {
    const t = new THREE.CylinderGeometry(0.16, 0.2, 1.6, 8); t.rotateZ(Math.PI / 2); t.rotateY(0.4); t.translate(0, 0.2, 0); gChop.add(mesh(t, paleWood, 'log'));
    const t2 = new THREE.CylinderGeometry(0.1, 0.13, 1.0, 7); t2.rotateZ(Math.PI / 2); t2.rotateY(-0.7); t2.translate(0.15, 0.48, 0.1); gChop.add(mesh(t2, paleWood, 'log2'));
    gChop.add(mesh(icicles([[-0.5, 0.05, 0.1], [-0.2, 0.05, 0.2], [0.2, 0.05, -0.05], [0.5, 0.05, -0.2]], 0.18), frost, 'icicles'));
  }
  return { save, sign, chest, chestOpen, crate, gather: { mine: gMine, herb: gHerb, chop: gChop }, dispose() { owned.forEach(o => o.dispose()); } };
}
