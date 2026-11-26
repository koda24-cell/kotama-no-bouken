/* 5層 V6：固有オブジェクトの部品（1層の苔むした素材を引き継がないための 5層専用品）
 * 上り階段・下り階段・導きの灯（セーブ）・碑（看板）・宝箱（開/閉）・騎士団の扉・採取点・調べる物・亡霊の騎士・出口のアーチ・ボスの結界
 * どれも「ローカル +z が通路側」。place() で複製して置ける THREE.Group を返す。灯りは userData.b1.lights（place が登録）。 */
import * as THREE from 'three';
import { Bucket, sweep, lathe, chip, rng, archOutline } from './b5v6-geom.js';
import { FlameSystem } from './b5v6-vfx.js';
import { knightStatue } from './b5v6-knight-statue.js';
import { candles } from './b5v6-fixtures.js';
import { rubble, sword, shield } from './b5v6-war-props.js';
import { pale_flowers } from './b5v6-overgrowth.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const W = (o = {}) => ({ grime: 0.6, soot: 0.4, moss: 0.15, seed: 121, ...o });

export function createB5V6Kit(M, { high = true } = {}) {
  const owned = [], flameSystems = [];
  // 出口の光の膜：中心が白く、縁が青紫。ゆっくり渦を巻く
  const portalTime = { value: 0 };
  const portalMat = new THREE.ShaderMaterial({
    uniforms: { uTime: portalTime }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime; varying vec2 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 c = vP - vec2(0.0, 1.8); float r = length(c * vec2(1.0, 0.7)); float a = atan(c.y, c.x);
        float sw = n(vec2(a * 2.0 + uTime * 0.4 - r * 2.5, r * 3.0 - uTime * 0.6)) * 0.6 + n(vec2(a * 5.0 - uTime * 0.2, r * 6.0)) * 0.4;
        float core = exp(-r * 1.3);
        vec3 col = mix(vec3(0.25, 0.22, 0.6), vec3(0.95, 0.96, 1.0), core) * (0.55 + 0.7 * sw);
        gl_FragColor = vec4(col, 0.92);
      }`
  });
  owned.push(portalMat);
  // 部品の配列から Group を作る。flames: [[x,y,z,size,palette]]、lights: [[x,y,z,color,intensity,range]]
  function make(name, parts, { flames = [], lights = [], extra = [] } = {}) {
    const b = new Bucket(64), g = new THREE.Group(); g.name = 'b5v6-kit:' + name;
    for (const [geo, mat, wx, matrix] of parts) b.add(geo, mat, { matrix: matrix || null, wx: wx === false ? false : W(wx) });
    for (const m of b.build(g, name)) { owned.push(m.geometry); }
    if (flames.length) { const fs = new FlameSystem(); flames.forEach(f => fs.add(...f, Math.random())); const mesh = fs.build(g); flameSystems.push(fs); }
    for (const m of extra) g.add(m);
    if (lights.length && g.children[0]) g.children[0].userData.b1 = { lights: lights.map(([x, y, z, color, intensity, range]) => ({ pos: [x, y, z], color, intensity, range })) };
    return g;
  }
  const add = (arr, src, matrix) => { for (const p of src.parts) arr.push([p[0], p[1], p[2], matrix]); };
  const T = (x, y, z, ry = 0, s = 1) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V(s, s, s));

  // ---------------------------------------------------------------- 上り階段：側壁付きの石段が奥の暗いアーチへ
  function stairsUp() {
    const P = [], n = 8, rise = 0.22, run = 0.36, w = 2.3, z0 = 1.55;
    for (let i = 0; i < n; i++) {
      const g = new THREE.BoxGeometry(w, rise * (i + 1), run + 0.02, 6, 1, 1); g.computeVertexNormals(); chip(g, 0.018, 4, i);
      P.push([g.translate(0, rise * (i + 1) / 2, z0 - run * i - run / 2), M.dressed, { moss: 0.2, grime: 0.3 }]);
      // 踏み面の欠け
      if (i % 3 === 1) P.push([new THREE.BoxGeometry(0.3, 0.06, 0.2, 2, 1, 2).translate(-0.6 + i * 0.12, rise * (i + 1) + 0.02, z0 - run * i - 0.1), M.rubble, {}]);
    }
    const topZ = z0 - run * n, topY = rise * n;
    P.push([new THREE.BoxGeometry(w, topY, 4.0 / 2 + topZ, 4, 1, 2).translate(0, topY / 2, (topZ - 2.0) / 2), M.dressed, { moss: 0.1 }]);   // 踊り場
    // 側壁（手すり）と親柱
    for (const sx of [-1, 1]) {
      const sh = new THREE.Shape([new THREE.Vector2(z0 + 0.05, 0), new THREE.Vector2(z0 + 0.05, 1.0), new THREE.Vector2(topZ, topY + 1.0), new THREE.Vector2(-2.0, topY + 1.0), new THREE.Vector2(-2.0, 0)]);
      const wg = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }); wg.rotateY(-Math.PI / 2); wg.translate(sx * (w / 2 + (sx > 0 ? 0.3 : 0)), 0, 0);
      P.push([wg, M.wall, { grime: 0.9, soot: 0.4 }]);
      const cap = sweep([V(sx * (w / 2 + 0.15), 1.06, z0 + 0.05), V(sx * (w / 2 + 0.15), topY + 1.06, topZ), V(sx * (w / 2 + 0.15), topY + 1.06, -2.0)], [[-0.2, 0], [0.2, 0], [0.22, 0.08], [0, 0.14], [-0.22, 0.08]], {});
      P.push([cap, M.dressed, { soot: 0.5 }]);
      const post = lathe([[0, 0], [0.24, 0], [0.24, 0.2], [0.18, 0.28], [0.17, 1.1], [0.23, 1.2], [0.23, 1.3], [0, 1.32]], 8).translate(sx * (w / 2 + 0.15), 0, z0 + 0.1);
      P.push([post, M.dressed, { moss: 0.3 }]);
      P.push([lathe([[0, 0], [0.06, 0], [0.13, 0.1], [0.15, 0.18], [0, 0.16]], 10).translate(sx * (w / 2 + 0.15), 1.32, z0 + 0.1), M.iron, false]);
    }
    // 奥のアーチ（暗い通路が上へ続く）
    const ah = topY + 3.4, aw = w + 0.2;
    const frame = archOutline(aw + 0.1, ah - 1.4, ah, 18, 0.6).slice(2).map(v => V(v.x, v.y, -1.95));
    frame.unshift(V(aw / 2 + 0.05, topY, -1.95)); frame.push(V(-aw / 2 - 0.05, topY, -1.95));
    frame.forEach(v => { v.y = Math.max(v.y, topY); });
    P.push([sweep(frame, [[-0.05, 0], [-0.05, 0.14], [0.04, 0.24], [0.2, 0.24], [0.28, 0.12], [0.28, 0]], { up: V(0, 0, 1), closed: false, caps: false }), M.dressed, { soot: 0.6 }]);
    const voidG = new THREE.ShapeGeometry(new THREE.Shape(archOutline(aw, ah - 1.4 - topY, ah - topY, 18, 0.6))).translate(0, topY, -1.97);
    P.push([voidG, M.void, false]);
    return make('stairsUp', P, { flames: [[-(w / 2 + 0.15), 1.5, z0 + 0.1, 0.4, 0], [(w / 2 + 0.15), 1.5, z0 + 0.1, 0.4, 0]], lights: [[0, 1.8, z0 + 0.6, 0x8c62f0, 2.0, 5.5]] });
  }

  // ---------------------------------------------------------------- 下り階段：床の吹き抜けへ沈む石段（床は architecture 側で抜く）
  function stairsDown() {
    const P = [], n = 9, rise = 0.24, run = 0.36, w = 2.4, z0 = 1.6;
    for (let i = 0; i < n; i++) {
      const g = new THREE.BoxGeometry(w, 0.2, run + 0.02, 6, 1, 1); g.computeVertexNormals(); chip(g, 0.015, 4, i);
      P.push([g.translate(0, -rise * (i + 1) + 0.1, z0 - run * i - run / 2), M.dressed, { moss: 0.1, grime: 0.2, base: Math.max(0.35, 1 - i * 0.08) }]);
    }
    // 吹き抜けの壁（深く暗い）
    for (const [x, z, w2, d, ry] of [[-(w / 2 + 0.2), -0.2, 0.4, 4.0, 0], [(w / 2 + 0.2), -0.2, 0.4, 4.0, 0], [0, -1.95, w + 0.8, 0.3, 0]]) {
      const g = new THREE.BoxGeometry(w2, 4.0, d, 2, 4, 4).translate(x, -2.0, z); P.push([g, M.wall, { base: 0.45, grime: 0, soot: 0.8, floorY: -4 }]);
    }
    P.push([new THREE.PlaneGeometry(w + 0.8, 4.2).rotateX(-Math.PI / 2).translate(0, -3.6, -0.2), M.void, false]);
    // 縁の低い欄干（三方）と角の柱
    for (const [a, b] of [[V(-(w / 2 + 0.3), 0, z0 + 0.1), V(-(w / 2 + 0.3), 0, -2.0)], [V((w / 2 + 0.3), 0, z0 + 0.1), V((w / 2 + 0.3), 0, -2.0)], [V(-(w / 2 + 0.3), 0, -2.0), V((w / 2 + 0.3), 0, -2.0)]]) {
      const L = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(0.5), dir = b.clone().sub(a).normalize();
      const rail = new THREE.BoxGeometry(0.32, 0.12, L, 1, 1, 6).translate(0, 0.86, 0), base = new THREE.BoxGeometry(0.36, 0.18, L, 1, 1, 6).translate(0, 0.09, 0);
      const m = new THREE.Matrix4().makeRotationY(Math.atan2(dir.x, dir.z)).setPosition(mid);
      P.push([rail, M.dressed, { soot: 0.4 }, m], [base, M.dressed, { moss: 0.3 }, m]);
      const k = Math.max(3, Math.round(L / 0.32));
      for (let i = 0; i < k; i++) { const t = (i + 0.5) / k, p = a.clone().lerp(b, t); P.push([lathe([[0, 0], [0.07, 0], [0.09, 0.15], [0.06, 0.4], [0.09, 0.62], [0.07, 0.8], [0, 0.8]], 8).translate(p.x, 0, p.z), M.dressed, { soot: 0.3, moss: 0.2 }]); }
    }
    return make('stairsDown', P, { lights: [[0, -1.2, -0.4, 0x7a50e0, 2.4, 5.5]] });
  }

  // ---------------------------------------------------------------- 導きの灯（セーブ）：石の台座・刻印の円・白金の炎を収めた鉄籠
  function save() {
    const P = [];
    P.push([lathe([[0, 0], [0.62, 0], [0.62, 0.12], [0.5, 0.18], [0.4, 0.2], [0.34, 0.3], [0.3, 0.95], [0.38, 1.02], [0.44, 1.1], [0.44, 1.18], [0, 1.18]], 8), M.dressed, { moss: 0.1 }]);
    const ring = new THREE.RingGeometry(0.85, 1.05, 48).rotateX(-Math.PI / 2).translate(0, 0.012, 0);
    const ring2 = new THREE.RingGeometry(1.35, 1.42, 64).rotateX(-Math.PI / 2).translate(0, 0.012, 0);
    P.push([ring, M.sigil, false], [ring2, M.sigil, false]);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; P.push([new THREE.PlaneGeometry(0.12, 0.16).rotateX(-Math.PI / 2).rotateY(-a).translate(Math.cos(a) * 1.2, 0.013, Math.sin(a) * 1.2), M.sigil, false]); }
    // 鉄籠
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P.push([sweep([V(Math.cos(a) * 0.2, 1.18, Math.sin(a) * 0.2), V(Math.cos(a) * 0.27, 1.5, Math.sin(a) * 0.27), V(Math.cos(a) * 0.16, 1.85, Math.sin(a) * 0.16), V(0, 1.98, 0)], [[0.015, 0], [0, 0.015], [-0.015, 0], [0, -0.015]], {}), M.brass, false]); }
    P.push([lathe([[0, 0], [0.04, 0], [0.04, 0.12], [0.07, 0.16], [0, 0.22]], 8).translate(0, 1.97, 0), M.brass, false]);
    return make('save', P, { flames: [[0, 1.24, 0, 0.5, 2], [0, 1.22, 0, 0.32, 2]], lights: [[0, 1.6, 0, 0xcfdcff, 3.0, 7.0]] });
  }

  // ---------------------------------------------------------------- 碑（看板）：割れた石碑に紫の刻線
  function sign() {
    const P = [];
    const base = new THREE.BoxGeometry(1.1, 0.3, 0.6, 3, 1, 2).translate(0, 0.15, 0); chip(base, 0.03, 5, 1); P.push([base, M.dressed, { moss: 0.4 }]);
    const sh = new THREE.Shape([new THREE.Vector2(-0.42, 0), new THREE.Vector2(0.42, 0), new THREE.Vector2(0.42, 1.25), new THREE.Vector2(0.18, 1.5), new THREE.Vector2(0.06, 1.38), new THREE.Vector2(-0.12, 1.55), new THREE.Vector2(-0.42, 1.3)]);
    const slab = new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 }).translate(0, 0.3, -0.09);
    P.push([slab, M.dressed, { moss: 0.3, soot: 0.5 }]);
    for (let i = 0; i < 6; i++) P.push([new THREE.BoxGeometry(0.3 + (i % 3) * 0.12, 0.022, 0.01).translate(-0.05 + (i % 2) * 0.08, 0.6 + i * 0.13, 0.115), M.rune, false]);
    add(P, rubble(M, 5, { radius: 0.5, count: 5, drums: 0, voussoirs: 0, low: true }), T(0.3, 0, 0.3));
    return make('sign', P, { lights: [[0, 1.0, 0.6, 0x8c62f0, 0.8, 3.0]] });
  }

  // ---------------------------------------------------------------- 宝箱（鉄の帯の黒い木箱）。open=true は蓋が開いて中が金色に光る
  function chest(open = false, big = false) {
    const P = [], s = big ? 1.25 : 1;
    const box = new THREE.BoxGeometry(0.9 * s, 0.5 * s, 0.56 * s, 3, 2, 2).translate(0, 0.25 * s, 0); P.push([box, M.wood, { grime: 0.3, soot: 0.5, moss: 0.1 }]);
    const lid = new THREE.CylinderGeometry(0.28 * s, 0.28 * s, 0.9 * s, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2);
    const lidM = new THREE.Matrix4().makeTranslation(0, 0.5 * s, 0);
    if (open) lidM.multiply(new THREE.Matrix4().makeTranslation(0, 0, -0.28 * s).multiply(new THREE.Matrix4().makeRotationX(-1.9)).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.28 * s)));
    P.push([lid, M.wood, { grime: 0.2, soot: 0.5 }, lidM]);
    for (const x of [-0.32, 0, 0.32]) {
      P.push([new THREE.BoxGeometry(0.07 * s, 0.52 * s, 0.58 * s).translate(x * s, 0.25 * s, 0), M.iron, false]);
      const band = new THREE.TorusGeometry(0.285 * s, 0.018 * s, 4, 12, Math.PI).rotateY(Math.PI / 2).translate(x * s, 0, 0); P.push([band, M.iron, false, lidM]);
    }
    P.push([new THREE.BoxGeometry(0.12 * s, 0.14 * s, 0.04 * s).translate(0, 0.42 * s, 0.29 * s), M.brass, false]);
    if (open) for (let i = 0; i < 10; i++) P.push([new THREE.CylinderGeometry(0.04, 0.04, 0.012, 10).translate((Math.random() - 0.5) * 0.6 * s, 0.46 * s, (Math.random() - 0.5) * 0.3 * s), M.gold, false]);
    add(P, rubble(M, big ? 9 : 7, { radius: 0.6, count: 4, drums: 0, voussoirs: 0, low: true }), T(0, 0, 0));
    return make(open ? 'chestOpen' : 'chest', P, { lights: open ? [[0, 0.8, 0, 0xffd28a, 1.0, 3.0]] : [] });
  }

  // ---------------------------------------------------------------- 騎士団の扉（落とし格子と石の枠）
  function gate() {
    const P = [];
    for (let i = -4; i <= 4; i++) P.push([new THREE.BoxGeometry(0.06, 3.3, 0.06).translate(i * 0.42, 1.65, 0), M.iron, false]);
    for (let j = 0; j < 6; j++) P.push([new THREE.BoxGeometry(3.5, 0.06, 0.08).translate(0, 0.25 + j * 0.6, 0), M.iron, false]);
    for (let i = -4; i <= 4; i++) P.push([new THREE.ConeGeometry(0.05, 0.22, 4).rotateX(Math.PI).translate(i * 0.42, -0.05, 0), M.iron, false]);
    return make('gate', P);
  }

  // ---------------------------------------------------------------- 採取点：魔王の結晶（mine）・白い花（herb）・崩れた梁（chop）
  function gather(kind, empty = false) {
    const P = [], R = rng(kind.length * 7 + (empty ? 3 : 0));
    add(P, rubble(M, 11 + kind.length, { radius: 0.7, count: 7, drums: 0, voussoirs: 0, low: true }), T(0, 0, 0));
    const lights = [];
    if (kind === 'mine') {
      for (let i = 0; i < (empty ? 3 : 9); i++) {
        const h = 0.25 + R() * 0.6, g = new THREE.ConeGeometry(0.06 + R() * 0.07, h, 5).translate(0, h / 2, 0);
        g.rotateZ((R() - 0.5) * 0.9).rotateX((R() - 0.5) * 0.9).translate((R() - 0.5) * 0.5, 0, (R() - 0.5) * 0.5);
        P.push([g, empty ? M.rubble : M.crystal, false]);
      }
      if (!empty) lights.push([0, 0.6, 0, 0xa070ff, 1.2, 3.5]);
    } else if (kind === 'herb') {
      if (!empty) add(P, pale_flowers(M, 21, { count: 34, radius: 0.55 }), T(0, 0, 0));
    } else {
      for (let i = 0; i < 4; i++) P.push([new THREE.BoxGeometry(1.4 - i * 0.2, 0.16, 0.18).rotateY(R() * 3).rotateZ((R() - 0.5) * 0.4).translate((R() - 0.5) * 0.4, 0.1 + i * 0.13, (R() - 0.5) * 0.4), M.wood, { grime: 0.4, soot: 0.7 }]);
    }
    return make('gather-' + kind + (empty ? '-empty' : ''), P, { lights });
  }

  // ---------------------------------------------------------------- 調べる物：騎士団の紋章（盾）・団長の折れた剣
  function eventProp(sprite, hidden = false) {
    const P = [];
    if (hidden) { add(P, rubble(M, 31, { radius: 0.5, count: 6, drums: 0, voussoirs: 1, low: true }), T(0, 0, 0)); return make('event-hidden', P); }
    add(P, rubble(M, 33, { radius: 0.7, count: 8, drums: 1, voussoirs: 1, low: true }), T(0, 0, 0));
    if (sprite === 'ev-sword') {
      const s = sword(M, 41, { kind: 'great' });
      add(P, s, new THREE.Matrix4().compose(V(0, s.len * 1.3 - 0.35, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI + 0.12, 0.4, 0.05)), V(1.3, 1.3, 1.3)));
    } else {
      add(P, shield(M, 43, { kind: 'kite' }), new THREE.Matrix4().compose(V(0, 0.05, 0.15), new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.1, 0.3, 0)), V(1.3, 1.3, 1.3)));
    }
    return make('event-' + sprite, P, { flames: [], lights: [[0, 0.9, 0.3, 0xd8c8ff, 0.9, 3.0]] });
  }

  // ---------------------------------------------------------------- 亡霊の騎士（半透明の青白い騎士）
  function ghostKnight() {
    const P = [];
    add(P, knightStatue(M, 77, { damage: 'none', plinth: false }), T(0, 0.15, 0, 0, 0.82));
    const g = make('ghost', P.map(p => [p[0], M.ghost, false, p[3]]), { lights: [[0, 1.6, 0.6, 0x9cc8ff, 1.4, 4.5]] });
    return g;
  }

  // ---------------------------------------------------------------- 出口（ホームへ）：光の満ちたアーチ
  function exitArch() {
    const P = [], w = 2.6, h0 = 2.6, h1 = 4.2;
    for (const sx of [-1, 1]) { const p = new THREE.BoxGeometry(0.5, h0, 0.6, 1, 4, 1).translate(sx * (w / 2 + 0.25), h0 / 2, 0); chip(p, 0.02, 4, sx); P.push([p, M.dressed, { moss: 0.3 }]); }
    const arc = archOutline(w + 0.5, h0, h1 + 0.3, 18, 0.6).slice(2).map(v => V(v.x, v.y, 0));
    P.push([sweep(arc, [[-0.25, -0.3], [0.25, -0.3], [0.25, 0.3], [-0.25, 0.3]], { up: V(0, 0, 1) }), M.dressed, { soot: 0.4 }]);
    const glow = new THREE.ShapeGeometry(new THREE.Shape(archOutline(w, h0, h1, 18, 0.6))).translate(0, 0, -0.05);
    P.push([glow, portalMat, false]);
    return make('exit', P, { lights: [[0, 1.8, 0.8, 0xcfdcff, 2.4, 6.0]] });
  }

  // ---------------------------------------------------------------- ボスの結界：玉座の前の床に金の紋
  function bossSeal() {
    const P = [];
    for (const [r0, r1] of [[1.5, 1.6], [2.1, 2.16], [2.6, 2.8]]) P.push([new THREE.RingGeometry(r0, r1, 72).rotateX(-Math.PI / 2).translate(0, 0.015, 0), M.goldGlow, false]);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; P.push([new THREE.PlaneGeometry(0.06, 1.1).rotateX(-Math.PI / 2).rotateY(-a).translate(Math.cos(a) * 2.1, 0.016, Math.sin(a) * 2.1), M.goldGlow, false]); }
    return make('bossSeal', P, { lights: [[0, 0.5, 0, 0xffd89a, 1.6, 5.0]] });
  }

  const kit = {
    stairsUp: stairsUp(), stairsDown: stairsDown(), save: save(), sign: sign(), chest: chest(false), chestOpen: chest(true), cache: chest(false, true), cacheOpen: chest(true, true),
    gate: gate(), ghost: ghostKnight(), exit: exitArch(), bossSeal: bossSeal(),
    gather: { mine: gather('mine'), mineEmpty: gather('mine', true), herb: gather('herb'), herbEmpty: gather('herb', true), chop: gather('chop'), chopEmpty: gather('chop', true) },
    event: (sprite, hidden) => eventProp(sprite, hidden),
    update(t) { flameSystems.forEach(f => f.update(t)); portalTime.value = t; },
    dispose() { owned.forEach(g => g.dispose()); flameSystems.forEach(f => f.dispose()); }
  };
  return kit;
}
