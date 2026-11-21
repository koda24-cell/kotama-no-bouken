/* B4 黒き神殿：4層専用の配置物（森の部品の使い回しをやめる）— docs/3d/B4_TEMPLE_REDESIGN.md 7章
 * すべて「マスの中心が原点、+Z が通路（開いている側）」。寸法は m。place() で複製して使う（静的）。
 *   下り階段  ：床に 2.6×3.6 m の口、段差 0.22 m×10 段で奈落へ。段鼻に溶岩の光。手前の両角に火台。
 *   上り階段  ：幅 2.8 m、段差 0.3 m×9 段で上へ。袖壁にルーン帯、最上段は崩れて瓦礫。
 *   セーブ地点：直径 3.0 m の魔法陣＋六角の火の祭壇（高さ 0.9 m）と金色の炎。
 *   石碑      ：0.7×1.6×0.3 m の黒曜の碑、竜紋のルーン、溶岩の割れ目。台座 0.9×0.2×0.45。
 *   宝箱      ：0.9×0.6×0.6 m、黒い木＋煤けた鉄の帯、鱗形の留め金。開くと中が赤く光る。
 *   封印の扉  ：3.2×3.6×0.5 m の黒い石扉、光る紋章の輪とルーンの縁。
 *   出口      ：4.0×4.2 m の神殿の門（柱＋まぐさ＋ルーン帯）。 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glyphMaterial, createFlames } from './b4-vfx.js?v=20261122-g6';

const merge = parts => { const g = mergeGeometries(parts.map(p => (p.index ? p.toNonIndexed() : p)), false); parts.forEach(p => p.dispose()); return g; };
const box = (w, h, d, x, y, z, ry = 0, rz = 0) => { const b = new THREE.BoxGeometry(w, h, d); if (rz) b.rotateZ(rz); if (ry) b.rotateY(ry); b.translate(x, y, z); return b; };
const light = (obj, pos, color, intensity, range) => { (obj.userData.b1 ||= {}).lights = [...(obj.userData.b1.lights || []), { pos, color, intensity, range }]; };

// カメラから near m 以内の面を描かない（立ち位置の後ろ 1.1 m のカメラが物の中に入っても視界をふさがない）
function nearCull(material, near = 1.3) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (sh, r) => {
    prev?.call(material, sh, r);
    sh.uniforms.uKitNear = { value: near };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vKitW;').replace('#include <project_vertex>', '#include <project_vertex>\nvKitW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vKitW; uniform float uKitNear;').replace('void main() {', 'void main() {\n  if (distance(vKitW, cameraPosition) < uKitNear) discard;');
  };
  const key = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => (key ? key() : '') + 'kitnear' + near;
  material.needsUpdate = true;
  return material;
}

export function createB4Kit({ wall, trim }) {
  const owned = [];
  // 周りの神殿の石（地色＋emissiveMap の地熱色）と同じ明るさにそろえる（2026-11-22：階段が黒く浮いていた）
  const stone = trim.clone(); stone.color.setRGB(0.78, 0.55, 0.47);
  const darkStone = wall.clone();
  const obsidian = new THREE.MeshStandardMaterial({ color: 0x0d0909, roughness: 0.22, metalness: 0.35 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2b2421, roughness: 0.42, metalness: 0.85 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x1c130f, roughness: 0.78 });
  const hot = new THREE.MeshStandardMaterial({ color: 0x220803, emissive: 0xff5a14, emissiveIntensity: 3.2, roughness: 0.6 });
  const ember = new THREE.MeshStandardMaterial({ color: 0x1a0603, emissive: 0xff3a0a, emissiveIntensity: 2.2, roughness: 0.7 });
  const runeV = glyphMaterial({ style: 2, seed: 2.2, intensity: 1.5, speed: 0.4 });
  const ringM = glyphMaterial({ style: 1, seed: 6.1, intensity: 1.6, speed: 0.5 });
  const circleM = glyphMaterial({ style: 0, seed: 8.8, intensity: 1.25, speed: 0.6, color: 0xff8a2a });
  owned.push(stone, darkStone, obsidian, iron, wood, hot, ember, runeV, ringM, circleM);
  for (const m of [stone, darkStone, obsidian, iron, wood, hot, ember]) nearCull(m);
  const mesh = (geo, mat, name) => { owned.push(geo); const m = new THREE.Mesh(geo, mat); m.name = name; return m; };
  const flame = (sites) => { const f = createFlames(sites, 'fire'); owned.push(f); return f.mesh; };

  // 火台（台座 0.5×0.9×0.5、鉢 φ0.62）。x,z はローカル
  const brazierParts = (x, z) => [
    box(0.56, 0.14, 0.56, x, 0.07, z), box(0.42, 0.78, 0.42, x, 0.53, z), box(0.56, 0.1, 0.56, x, 0.97, z),
    (() => { const c = new THREE.CylinderGeometry(0.31, 0.18, 0.26, 8); c.translate(x, 1.15, z); return c; })(),
  ];

  // ---------------- 下り階段
  const stairsDown = new THREE.Group(); stairsDown.name = 'b4kit:stairs-down';
  {
    const fl = [], st = [], noses = [];
    fl.push(box(0.7, 0.34, 4.0, -1.65, -0.17, 0), box(0.7, 0.34, 4.0, 1.65, -0.17, 0), box(2.6, 0.34, 0.4, 0, -0.17, 1.8));
    for (let i = 0; i < 10; i++) {
      const top = -0.22 * (i + 1), z1 = 1.6 - 0.36 * i, z0 = z1 - 0.36;
      st.push(box(2.6, 3.6 + top, 0.36, 0, (top - 3.6) / 2, (z0 + z1) / 2));
      noses.push(box(2.5, 0.035, 0.05, 0, top + 0.012, z1 - 0.03));
    }
    // 口の内側の壁（奥と左右）と、枠の縁石・角柱
    const sh = [box(0.2, 3.6, 3.6, -1.4, -1.8, -0.2), box(0.2, 3.6, 3.6, 1.4, -1.8, -0.2), box(2.6, 3.6, 0.2, 0, -1.8, -2.0)];
    const rim = [box(0.18, 0.16, 3.6, -1.39, 0.08, -0.2), box(0.18, 0.16, 3.6, 1.39, 0.08, -0.2), box(2.96, 0.16, 0.18, 0, 0.08, 1.69)];
    for (const [x, z] of [[-1.48, -1.82], [1.48, -1.82]]) rim.push(box(0.36, 0.7, 0.36, x, 0.35, z), box(0.44, 0.08, 0.44, x, 0.74, z));
    const br = [...brazierParts(-1.65, 1.55 - 3.2), ...brazierParts(1.65, 1.55 - 3.2)];
    stairsDown.add(mesh(merge(fl), darkStone, 'floor'), mesh(merge(st), stone, 'steps'), mesh(merge(noses), hot, 'step-glow'), mesh(merge(sh), darkStone, 'shaft'), mesh(merge(rim), stone, 'rim'), mesh(merge(br), iron, 'braziers'));
    stairsDown.add(flame([{ x: -1.65, y: 1.22, z: -1.65, w: 0.7, h: 1.25, seed: 0.3 }, { x: 1.65, y: 1.22, z: -1.65, w: 0.7, h: 1.25, seed: 0.7 }]));
    const voidG = new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2); voidG.translate(0, -2.3, -1.0);
    stairsDown.add(mesh(voidG, ember, 'deep-glow'));
    light(stairsDown, [0, -1.2, -0.6], 0xff5a1a, 2.6, 6); light(stairsDown, [0, 1.6, -1.65], 0xff8a34, 1.8, 6);
  }

  // ---------------- 上り階段（2026-11-22：手前 1.8 m は空ける。段は奥寄せ、幅 2.8 m、0.32 m×8 段）
  const stairsUp = new THREE.Group(); stairsUp.name = 'b4kit:stairs-up';
  {
    const st = [], cheek = [], rub = [], noses = [];
    const Z0 = 0.2, D = 0.275;
    for (let i = 0; i < 8; i++) {
      const top = 0.32 * (i + 1), z1 = Z0 - D * i, z0 = z1 - D;
      if (i === 7) { st.push(box(1.5, top, D, -0.6, top / 2, (z0 + z1) / 2)); continue; }   // 最上段は半分崩落
      st.push(box(2.8, top, D, 0, top / 2, (z0 + z1) / 2));
      noses.push(box(2.7, 0.03, 0.04, 0, top + 0.01, z1 - 0.02));
    }
    for (const sx of [-1.55, 1.55]) {
      const len = Math.hypot(2.2, 2.56), ramp = new THREE.BoxGeometry(0.3, 0.45, len); ramp.rotateX(Math.atan2(2.56, 2.2)); ramp.translate(sx, 1.28 + 0.2, Z0 - 1.1); cheek.push(ramp);
      cheek.push(box(0.3, 0.5, 0.3, sx, 0.25, Z0 + 0.05));
      cheek.push(box(0.42, 3.4, 0.42, sx, 1.7, -1.85), box(0.52, 0.16, 0.52, sx, 3.45, -1.85));
    }
    for (let i = 0; i < 9; i++) { const r = new THREE.IcosahedronGeometry(0.16 + (i % 3) * 0.07, 0); r.translate(0.4 + (i % 3) * 0.3, 2.56 + (i % 2) * 0.1, -1.55 - (i % 3) * 0.1); rub.push(r); }
    stairsUp.add(mesh(merge(st), stone, 'steps'), mesh(merge(cheek), darkStone, 'cheeks'), mesh(merge(rub), stone, 'rubble'), mesh(merge(noses), ember, 'step-glow'));
    const bowls = [-1.55, 1.55].map(x => { const c = new THREE.CylinderGeometry(0.28, 0.16, 0.22, 8); c.translate(x, 3.64, -1.85); return c; });
    stairsUp.add(mesh(merge(bowls), iron, 'post-bowls'), flame([{ x: -1.55, y: 3.72, z: -1.85, w: 0.55, h: 1.0, seed: 0.2 }, { x: 1.55, y: 3.72, z: -1.85, w: 0.55, h: 1.0, seed: 0.9 }]));
    light(stairsUp, [0, 2.2, -0.6], 0xff8a34, 2.0, 7);
  }

  // ---------------- セーブ地点（魔法陣＋火の祭壇）
  const save = new THREE.Group(); save.name = 'b4kit:save';
  {
    const cg = new THREE.PlaneGeometry(3.0, 3.0).rotateX(-Math.PI / 2); cg.translate(0, 0.02, 0);
    const c = mesh(cg, circleM, 'circle'); c.renderOrder = 3; save.add(c);
    const parts = [];
    const hex = (r0, r1, h, y) => { const g = new THREE.CylinderGeometry(r1, r0, h, 6); g.translate(0, y, 0); return g; };
    parts.push(hex(0.62, 0.58, 0.14, 0.07), hex(0.46, 0.4, 0.62, 0.45), hex(0.58, 0.6, 0.12, 0.82));
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; parts.push(box(0.14, 0.5, 0.14, Math.cos(a) * 0.5, 1.08, Math.sin(a) * 0.5, -a, 0.35 * (i % 2 ? 1 : -1) * 0)); }
    save.add(mesh(merge(parts), obsidian, 'altar'));
    const bowl = new THREE.CylinderGeometry(0.44, 0.26, 0.22, 10); bowl.translate(0, 1.0, 0); save.add(mesh(bowl, iron, 'bowl'));
    const coal = new THREE.CylinderGeometry(0.38, 0.38, 0.04, 10); coal.translate(0, 1.1, 0); save.add(mesh(coal, hot, 'coals'));
    save.add(flame([{ x: 0, y: 1.08, z: 0, w: 0.95, h: 1.9, seed: 0.5, intensity: 1.3 }]));
    const band = new THREE.CylinderGeometry(0.47, 0.47, 0.18, 6, 1, true); band.translate(0, 0.5, 0); const bm = mesh(band, runeV, 'rune'); bm.renderOrder = 4; save.add(bm);
    light(save, [0, 1.8, 0], 0xffa040, 3.2, 8);
  }

  // ---------------- 石碑（看板）
  const sign = new THREE.Group(); sign.name = 'b4kit:stele';
  {
    const s = new THREE.Shape(); s.moveTo(-0.35, 0); s.lineTo(-0.35, 1.32); s.lineTo(0, 1.62); s.lineTo(0.35, 1.32); s.lineTo(0.35, 0); s.lineTo(-0.35, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 }); g.translate(0, 0.2, -0.15);
    sign.add(mesh(g, obsidian, 'stele'));
    sign.add(mesh(merge([box(0.92, 0.2, 0.46, 0, 0.1, 0), box(0.78, 0.06, 0.38, 0, 0.23, 0)]), stone, 'base'));
    const rg = new THREE.PlaneGeometry(1.0, 0.36); const r = mesh(rg, runeV, 'rune'); r.position.set(0, 0.95, 0.19); r.rotation.z = Math.PI / 2; r.renderOrder = 4; sign.add(r);
    const ring = new THREE.PlaneGeometry(0.42, 0.42); const rm = mesh(ring, ringM, 'sigil'); rm.position.set(0, 1.42, 0.19); rm.renderOrder = 4; sign.add(rm);
    const crack = []; let px = -0.2, py = 0.3;
    for (let i = 0; i < 6; i++) { const nx = (i % 2 ? 0.08 : -0.12) + (i - 3) * 0.02, ny = py + 0.17; const dx = nx - px, dy = ny - py, len = Math.hypot(dx, dy); const b = new THREE.BoxGeometry(0.025, len, 0.02); b.rotateZ(-Math.atan2(dx, dy)); b.translate((px + nx) / 2 + 0.22, (py + ny) / 2, 0.185); crack.push(b); px = nx; py = ny; }
    sign.add(mesh(merge(crack), hot, 'crack'));
    light(sign, [0, 1.2, 0.5], 0xff7a2a, 0.9, 3);
  }

  // ---------------- 宝箱（閉／開）
  const chestBody = () => {
    const g = new THREE.Group();
    g.add(mesh(box(0.9, 0.38, 0.6, 0, 0.19 + 0.04, 0), wood, 'body'));
    const bands = [box(0.94, 0.06, 0.64, 0, 0.08, 0), box(0.94, 0.05, 0.64, 0, 0.4, 0)];
    for (const x of [-0.33, 0.33]) bands.push(box(0.07, 0.4, 0.64, x, 0.24, 0));
    for (const [x, z] of [[-0.45, -0.3], [0.45, -0.3], [-0.45, 0.3], [0.45, 0.3]]) bands.push(box(0.09, 0.42, 0.09, x * 0.98, 0.23, z * 0.97));
    g.add(mesh(merge(bands), iron, 'bands'));
    return g;
  };
  const lidGeo = () => { const c = new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12, 1, false, 0, Math.PI); c.rotateZ(Math.PI / 2); c.rotateX(Math.PI / 2); return c; };
  const lid = () => {
    const g = new THREE.Group();
    g.add(mesh(lidGeo(), wood, 'lid'));
    const straps = [];
    for (const x of [-0.33, 0, 0.33]) { const s = new THREE.CylinderGeometry(0.315, 0.315, 0.07, 12, 1, true, 0, Math.PI); s.rotateZ(Math.PI / 2); s.rotateX(Math.PI / 2); s.translate(x, 0, 0); straps.push(s); }
    g.add(mesh(merge(straps), iron, 'lid-straps'));
    const clasp = new THREE.ConeGeometry(0.07, 0.16, 6); clasp.rotateX(Math.PI); clasp.translate(0, -0.05, 0.31); g.add(mesh(clasp, hot, 'clasp'));
    return g;
  };
  const chest = new THREE.Group(); chest.name = 'b4kit:chest';
  { const c = new THREE.Group(); c.scale.setScalar(1.3); c.add(chestBody()); const l = lid(); l.position.set(0, 0.42, 0); c.add(l); chest.add(c); light(chest, [0, 0.7, 0.7], 0xff6a24, 0.8, 3); }
  const chestOpen = new THREE.Group(); chestOpen.name = 'b4kit:chest-open';
  {
    const c = new THREE.Group(); c.scale.setScalar(1.3); chestOpen.add(c);
    c.add(chestBody());
    const pivot = new THREE.Group(); pivot.position.set(0, 0.42, -0.3); pivot.rotation.x = -1.9; const l = lid(); l.position.set(0, 0, 0.3); pivot.add(l); c.add(pivot);
    const inner = new THREE.PlaneGeometry(0.8, 0.5).rotateX(-Math.PI / 2); inner.translate(0, 0.36, 0); c.add(mesh(inner, hot, 'glow'));
    light(chestOpen, [0, 0.9, 0], 0xff4a14, 2.4, 4);
  }

  // ---------------- 封印の扉
  const door = new THREE.Group(); door.name = 'b4kit:sealed-door';
  {
    door.add(mesh(box(3.2, 3.6, 0.5, 0, 1.8, 0), obsidian, 'slab'));
    door.add(mesh(merge([box(0.5, 4.1, 0.7, -1.85, 2.05, 0), box(0.5, 4.1, 0.7, 1.85, 2.05, 0), box(4.2, 0.5, 0.75, 0, 4.0, 0)]), stone, 'frame'));
    const rg = new THREE.PlaneGeometry(2.4, 2.4); const r = mesh(rg, ringM, 'sigil'); r.position.set(0, 1.9, 0.26); r.renderOrder = 4; door.add(r);
    const bg = new THREE.PlaneGeometry(3.0, 0.24); for (const y of [0.25, 3.45]) { const b = mesh(bg.clone(), runeV, 'rune'); b.position.set(0, y, 0.26); b.renderOrder = 4; door.add(b); }
    bg.dispose();
    light(door, [0, 1.9, 0.9], 0xff7a2a, 1.6, 5);
  }

  // ---------------- 出口の門
  const exit = new THREE.Group(); exit.name = 'b4kit:exit-gate';
  {
    const p = [];
    for (const x of [-1.75, 1.75]) p.push(box(0.6, 0.4, 0.8, x, 0.2, 0), box(0.5, 3.4, 0.6, x, 2.0, 0), box(0.66, 0.24, 0.82, x, 3.8, 0));
    p.push(box(4.0, 0.42, 0.86, 0, 4.12, 0));
    exit.add(mesh(merge(p), stone, 'gate'));
    const bg = new THREE.PlaneGeometry(3.2, 0.26); const b = mesh(bg, runeV, 'rune'); b.position.set(0, 4.12, 0.44); b.renderOrder = 4; exit.add(b);
    const br = [...brazierParts(-1.75, 0.9), ...brazierParts(1.75, 0.9)].map(g => g.translate(0, 0, 0));
    exit.add(flame([{ x: -1.75, y: 4.0, z: 0, w: 0.5, h: 0.9, seed: 0.4 }, { x: 1.75, y: 4.0, z: 0, w: 0.5, h: 0.9, seed: 0.6 }]));
    br.forEach(g => g.dispose());
    light(exit, [0, 3.2, 0.8], 0xff8a34, 1.8, 6);
  }

  // ---------------- 採取ポイント（2026-11-22：1層の苔の採掘点・草を使わない）
  // 採掘：黒い岩塊（φ1.4×0.9 m）に赤く光る鉱石の結晶、溶岩の筋、刺さったつるはし。尽きると結晶が消え、筋が冷える
  const rockLump = (parts, seed, n, r0, spread, y0 = 0.3) => {
    for (let i = 0; i < n; i++) {
      const a = i * 2.399 + seed, rr = spread * Math.sqrt((i + 0.5) / n), sc = r0 * (1.15 - i / n * 0.5);
      const g = new THREE.IcosahedronGeometry(1, 1); const pa = g.attributes.position;
      for (let k = 0; k < pa.count; k++) { const f = 1 + (Math.sin(pa.getX(k) * 7.1 + seed) * Math.cos(pa.getY(k) * 5.3 + i) * 0.16); pa.setXYZ(k, pa.getX(k) * f, pa.getY(k) * f * 0.72, pa.getZ(k) * f); }
      g.computeVertexNormals(); g.scale(sc, sc, sc); g.rotateY(a); g.translate(Math.cos(a) * rr, y0 * sc + 0.05, Math.sin(a) * rr); parts.push(g);
    }
  };
  const shard = (x, y, z, h, tx, tz) => { const g = new THREE.OctahedronGeometry(0.1, 0); g.scale(0.9, h * 5, 0.9); g.rotateX(tx); g.rotateZ(tz); g.translate(x, y, z); return g; };
  const oreMat = new THREE.MeshStandardMaterial({ color: 0x5a0c06, roughness: 0.25, metalness: 0.15, emissive: 0xff2a0a, emissiveIntensity: 1.25 });
  const coldMat = new THREE.MeshStandardMaterial({ color: 0x2a1c18, roughness: 0.9 });
  const rockMat = darkStone.clone(); rockMat.color.setRGB(0.55, 0.4, 0.36);
  owned.push(oreMat, coldMat, rockMat); for (const m of [oreMat, coldMat, rockMat]) nearCull(m);
  const makeMine = (empty) => {
    const g = new THREE.Group(); g.name = empty ? 'b4kit:gather-mine-empty' : 'b4kit:gather-mine';
    const rp = []; rockLump(rp, 1.7, 7, 0.42, 0.55); g.add(mesh(merge(rp), rockMat, 'rock'));
    const seam = []; for (let i = 0; i < 5; i++) seam.push(box(0.035, 0.02, 0.5 + (i % 3) * 0.2, -0.3 + i * 0.15, 0.36 + (i % 2) * 0.08, 0.1 * (i - 2), (i - 2) * 0.5));
    g.add(mesh(merge(seam), empty ? coldMat : ember, 'seam'));
    if (!empty) {
      const sh = [shard(0.1, 0.55, 0.05, 0.11, 0.2, -0.3), shard(-0.18, 0.5, 0.15, 0.08, -0.35, 0.4), shard(0.3, 0.42, -0.1, 0.07, 0.1, -0.6), shard(-0.05, 0.62, -0.2, 0.09, 0.4, 0.15), shard(0.22, 0.38, 0.28, 0.05, -0.5, -0.4)];
      g.add(mesh(merge(sh), oreMat, 'ore'));
      light(g, [0, 0.8, 0.3], 0xff3a12, 1.2, 3.2);
    }
    const pick = [box(0.04, 0.8, 0.04, 0, 0.4, 0, 0, 0)];
    const head = new THREE.CylinderGeometry(0.03, 0.012, 0.5, 6); head.rotateZ(Math.PI / 2); head.translate(0, 0.8, 0); pick.push(head);
    const pg = merge(pick); pg.rotateZ(-0.9); pg.rotateY(0.6); pg.translate(-0.45, 0.35, 0.35);
    g.add(mesh(pg, iron, 'pickaxe'));
    return g;
  };
  // 採取：焦げた茎に橙に光る火の花（実 φ0.12）、灰の地面。尽きると花が消える
  const makeHerb = (empty) => {
    const g = new THREE.Group(); g.name = empty ? 'b4kit:gather-herb-empty' : 'b4kit:gather-herb';
    const ash = new THREE.CircleGeometry(0.75, 14).rotateX(-Math.PI / 2); ash.translate(0, 0.012, 0); g.add(mesh(ash, coldMat, 'ash'));
    const stems = [], buds = [];
    for (let i = 0; i < 9; i++) {
      const a = i * 2.399, r = 0.12 + (i % 4) * 0.12, h = 0.35 + (i % 3) * 0.16, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const st = new THREE.CylinderGeometry(0.008, 0.016, h, 4); st.translate(0, h / 2, 0); st.rotateZ((i % 2 ? 1 : -1) * 0.18); st.translate(x, 0, z); stems.push(st);
      if (!empty) { const b = new THREE.SphereGeometry(0.055 + (i % 3) * 0.015, 8, 6); b.scale(1, 1.3, 1); b.translate(x + (i % 2 ? -1 : 1) * h * 0.18, h + 0.03, z); buds.push(b); }
    }
    g.add(mesh(merge(stems), wood, 'stems'));
    if (buds.length) { g.add(mesh(merge(buds), hot, 'fire-buds')); light(g, [0, 0.6, 0], 0xff6a1a, 1.1, 3); }
    const pebbles = []; rockLump(pebbles, 4.2, 5, 0.12, 0.7, 0.2); g.add(mesh(merge(pebbles), rockMat, 'pebbles'));
    return g;
  };
  // 伐採：炭になった倒木の切り株（φ0.7×0.9 m）、割れ目に残り火
  const makeChop = (empty) => {
    const g = new THREE.Group(); g.name = 'b4kit:gather-stump';
    const t = new THREE.CylinderGeometry(0.3, 0.42, 0.9, 9); t.translate(0, 0.45, 0); g.add(mesh(t, wood, 'stump'));
    const roots = []; for (let i = 0; i < 5; i++) { const a = i * 1.257, r = new THREE.CylinderGeometry(0.04, 0.09, 0.7, 5); r.rotateZ(Math.PI / 2 - 0.35); r.translate(0.32, 0.1, 0); r.rotateY(a); roots.push(r); } g.add(mesh(merge(roots), wood, 'roots'));
    const cr = []; for (let i = 0; i < 4; i++) cr.push(box(0.03, 0.5, 0.02, Math.cos(i * 1.6) * 0.33, 0.45, Math.sin(i * 1.6) * 0.33, i * 1.6));
    g.add(mesh(merge(cr), empty ? coldMat : ember, 'embers'));
    return g;
  };
  const gather = { mine: makeMine(false), mineEmpty: makeMine(true), herb: makeHerb(false), herbEmpty: makeHerb(true), chop: makeChop(false), chopEmpty: makeChop(true) };

  return { stairsDown, stairsUp, seal: null, gather, torch: save, sign, runeDoor: door, gate: door, rootArch: exit, chest, chestOpen, dispose() { owned.forEach(o => o.dispose()); } };
}
