/* 5層 V6：騎士像（A8）— 大剣を足元に突き立て、柄頭に両手を重ねて立つ石像
 * 台座（繰形・欠け・紫に光る銘板）＋鎧の騎士（兜・肩当て・胸甲・草摺・脛当て・マント）。
 * 破損：頭部欠損／片腕欠損／倒壊（横倒しで破片が散る）。原点＝台座の底の中心、正面 +z。 */
import * as THREE from 'three';
import { sweep, lathe, chip, rng } from './b5v6-geom.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ROUND = n => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; });

function limb(a, b, r0, r1, n = 10) {
  const pts = []; for (let i = 0; i <= 6; i++) pts.push(new THREE.Vector3().lerpVectors(a, b, i / 6));
  return sweep(pts, ROUND(n).map(([c, s]) => [c, s]), { closed: true, scale: t => r0 + (r1 - r0) * t });
}
function ell(g, sx, sz) { g.scale(sx, 1, sz); return g; }

export function knightStatue(M, seed = 1, { damage = 'auto', plinth = true, scale = 1 } = {}) {
  const R = rng(seed), parts = [], S = M.dressed;
  if (damage === 'auto') damage = ['none', 'head', 'arm', 'none', 'arm'][Math.floor(R() * 5)];
  const wx = (o = {}) => ({ grime: 0.6, soot: 0.5, moss: 0.35, mottle: 0.35, seed: 81, ...o });
  const add = (g, m = S, o) => { g.computeVertexNormals(); parts.push([g, m, wx(o)]); return g; };
  const P0 = plinth ? 1.02 : 0;   // 台座の高さ

  // ---------------------------------------------------------------- 台座
  if (plinth) {
    const base = new THREE.BoxGeometry(1.34, 0.32, 1.34, 4, 2, 4).translate(0, 0.16, 0); chip(base, 0.025, 4, R() * 9); add(base, M.dressed, { moss: 0.5 });
    const mid = new THREE.BoxGeometry(1.08, 0.56, 1.08, 4, 3, 4).translate(0, 0.32 + 0.28, 0); chip(mid, 0.018, 5, R() * 9); add(mid);
    const top = new THREE.BoxGeometry(1.22, 0.14, 1.22, 4, 1, 4).translate(0, 0.88 + 0.07, 0); chip(top, 0.02, 5, R() * 9); add(top, M.dressed, { soot: 0.3 });
    // 繰形（上下の段）
    for (const [y, w] of [[0.32, 1.2], [0.88, 1.14]]) {
      const pts = [V(-w / 2, y, w / 2), V(w / 2, y, w / 2), V(w / 2, y, -w / 2), V(-w / 2, y, -w / 2), V(-w / 2, y, w / 2)];
      add(sweep(pts, [[0, 0.06], [0.05, 0.04], [0.05, -0.02], [0, -0.04]], { closed: false, caps: false, up: V(0, 1, 0) }), M.dressed);
    }
    // 欠けた角（台座の角に割れた塊が落ちている）
    if (R() < 0.6) { const c = new THREE.BoxGeometry(0.24, 0.2, 0.2, 2, 2, 2); chip(c, 0.04, 6, R() * 9); c.rotateY(0.6).rotateX(0.4).translate(0.75, 0.1, 0.7); add(c); }
    // 正面の銘板（暗い窪み＋紫に光る刻線）
    add(new THREE.BoxGeometry(0.62, 0.3, 0.02).translate(0, 0.6, 0.545), M.void, false);
    for (let i = 0; i < 5; i++) {
      const w = 0.06 + R() * 0.1, h = 0.012;
      parts.push([new THREE.BoxGeometry(w, h, 0.01).translate(-0.22 + i * 0.11, 0.6 + (R() - 0.5) * 0.16, 0.556), M.rune, false]);
    }
  }

  // ---------------------------------------------------------------- 騎士（足元 y=0 からの座標で作り、最後に台座の上へ）
  const fig = [];
  const F = (g, m = S, o) => { fig.push([g, m, o]); return g; };
  // 脚：鉄靴・脛当て・膝当て・腿当て
  for (const sx of [-1, 1]) {
    const x = 0.16 * sx;
    F(ell(lathe([[0, 0], [0.07, 0], [0.085, 0.04], [0.08, 0.1], [0, 0.11]], 10), 1, 1.6).translate(x, 0, 0.06));       // 鉄靴
    F(limb(V(x, 0.08, 0), V(x * 1.02, 0.6, 0.02), 0.075, 0.1));                                                          // 脛当て
    F(new THREE.SphereGeometry(0.1, 12, 8).scale(1, 0.9, 1.05).translate(x * 1.02, 0.63, 0.05));                       // 膝当て
    F(limb(V(x * 1.02, 0.66, 0.02), V(x * 0.92, 1.08, 0), 0.105, 0.135));                                                // 腿当て
  }
  // 草摺（段になった裾）
  F(ell(lathe([[0, 1.32], [0.24, 1.32], [0.26, 1.24], [0.29, 1.23], [0.3, 1.15], [0.33, 1.14], [0.34, 1.05], [0.36, 1.04], [0.36, 0.98], [0, 0.98]], 16), 1, 0.78));
  // 胸甲（稜線の付いた鳩胸）
  F(ell(lathe([[0, 1.3], [0.22, 1.3], [0.25, 1.42], [0.27, 1.56], [0.285, 1.68], [0.275, 1.78], [0.22, 1.86], [0.12, 1.9], [0, 1.9]], 16), 1, 0.7));
  F(limb(V(0, 1.34, 0.19), V(0, 1.8, 0.17), 0.018, 0.012, 5));                                                            // 胸の稜線
  F(new THREE.TorusGeometry(0.235, 0.025, 6, 20).rotateX(Math.PI / 2).scale(1, 1, 0.72).translate(0, 1.31, 0), M.dressed); // 帯
  // 喉当てと兜（グレートヘルム。頭部欠損なら首の折れ口だけ）
  F(lathe([[0, 1.86], [0.12, 1.86], [0.11, 1.96], [0, 1.98]], 12));
  if (damage !== 'head') {
    F(ell(lathe([[0, 1.95], [0.13, 1.95], [0.14, 2.06], [0.14, 2.18], [0.125, 2.25], [0.08, 2.29], [0, 2.3]], 14), 1, 1.08));
    F(new THREE.BoxGeometry(0.2, 0.022, 0.05).translate(0, 2.14, 0.13), M.void, false);                                  // 目の細隙
    F(new THREE.BoxGeometry(0.03, 0.26, 0.03).translate(0, 2.1, 0.145));                                                  // 顔の補強
    F(limb(V(0, 2.26, -0.12), V(0, 2.32, 0.1), 0.02, 0.014, 5));                                                          // 頭頂の稜
  } else {
    const stump = new THREE.CylinderGeometry(0.09, 0.11, 0.1, 9, 2).translate(0, 2.0, 0); chip(stump, 0.03, 9, R() * 9); F(stump);
  }
  // 肩当て（3 枚の重ね）と腕
  const hands = V(0, 1.36, 0.36);
  for (const sx of [-1, 1]) {
    const side = sx < 0 ? 'left' : 'right';
    for (let k = 0; k < 3; k++) {
      const p = new THREE.SphereGeometry(0.17 - k * 0.012, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1.05, 0.75, 1.1).rotateZ(-sx * (0.35 + k * 0.12));
      F(p.translate(sx * (0.3 + k * 0.025), 1.84 - k * 0.075, 0));
    }
    if (damage === 'arm' && side === 'left') {
      const st = new THREE.CylinderGeometry(0.075, 0.075, 0.16, 9, 2).rotateZ(sx * 0.3).translate(sx * 0.33, 1.66, 0.02); chip(st, 0.03, 10, R() * 9); F(st);
      continue;
    }
    const sh = V(sx * 0.31, 1.76, 0.0), el = V(sx * 0.29, 1.44, 0.15), wr = V(sx * 0.075, 1.36, 0.33);
    F(limb(sh, el, 0.075, 0.07));
    F(new THREE.SphereGeometry(0.08, 10, 8).translate(el.x, el.y, el.z));                                                   // 肘当て
    F(limb(el, wr, 0.068, 0.058));
    F(new THREE.BoxGeometry(0.1, 0.12, 0.11, 2, 2, 2).translate(wr.x * 0.8, 1.36, 0.36));                                  // 籠手
  }
  // 大剣（柄頭を両手で押さえ、切っ先は台座へ）
  F(new THREE.SphereGeometry(0.055, 10, 8).translate(hands.x, hands.y + 0.1, hands.z));
  F(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 8).translate(hands.x, hands.y - 0.06, hands.z), M.dressed);
  F(new THREE.BoxGeometry(0.56, 0.05, 0.07).translate(0, 1.15, hands.z));
  const bladeShape = new THREE.Shape([new THREE.Vector2(-0.065, 0), new THREE.Vector2(0.065, 0), new THREE.Vector2(0.055, -0.95), new THREE.Vector2(0, -1.12), new THREE.Vector2(-0.055, -0.95)]);
  F(new THREE.ExtrudeGeometry(bladeShape, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1 }).translate(0, 1.12, hands.z - 0.008));
  // マント：両肩から背中へ。襞と裂けた裾
  {
    const cols = 18, rows = 16, pos = [], top = 1.86, bot = 0.12;
    const P = (i, j) => {
      const u = i / cols * 2 - 1, v = j / rows, y = top - (top - bot) * v;
      const wdt = 0.34 + 0.2 * v, fold = Math.sin(u * 7.5 + v * 1.5) * 0.045 * (0.3 + v);
      let yy = y; if (j === rows) yy += (R() - 0.3) * 0.18;                                    // 裂けた裾
      return [u * wdt, yy, -0.18 - Math.pow(v, 1.4) * 0.22 - (1 - u * u) * 0.06 + fold];
    };
    const grid = []; for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) grid.push(P(i, j));
    const at = (i, j) => grid[j * (cols + 1) + i];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      if (j === rows - 1 && R() < 0.18) continue;                                               // 裾の穴
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      pos.push(...a, ...d, ...c, ...a, ...c, ...b);   // 外側（背中側）を表に
      pos.push(...a, ...b, ...c, ...a, ...c, ...d);   // 内側
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    F(g);
  }

  // 台座の上へ載せる（倒壊なら横倒し）
  const fm = new THREE.Matrix4();
  if (damage === 'toppled') {
    fm.compose(V(0.1, 0.25, 0.75), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.08, 0.35, 0.1)), V(1.28, 1.28, 1.28));
  } else fm.compose(V(0, P0, 0.02), new THREE.Quaternion(), V(1.28, 1.28, 1.28));
  for (const [g, m, o] of fig) { g.applyMatrix4(fm); g.computeVertexNormals(); parts.push([g, m, o === false ? false : wx(o)]); }
  if (scale !== 1) { const sm = new THREE.Matrix4().makeScale(scale, scale, scale); parts.forEach(p => p[0].applyMatrix4(sm)); }
  return { parts, flames: [], embers: [], lights: [], height: (P0 + 2.32 * 1.28) * scale, damage };
}
