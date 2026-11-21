/* B4 黒き神殿：壁・床・天井の建築（docs/3d/B4_TEMPLE_REDESIGN.md 3章）
 * テクスチャは Poly Haven の CC0 スキャン（assets/textures/floor4/cc0/<id>/manifest.json に出典と sha256）。
 *  - 神殿の壁：rock_wall_16（黒い切石）を赤黒く染め、法線・粗さ付き
 *  - 神殿の床：volcanic_rock_tiles（黒い溶岩石の敷石）
 *  - 化粧材：台座（巾木）・コーニス・付け柱・彫り込まれたルーンの溝（発光）・天井の梁
 * 壁 1 面ごとに「神殿の壁」か「洞窟の岩肌（従来）」かを決める。通行判定には触れない。 */
import * as THREE from 'three';
import { glyphMaterial } from './b4-vfx.js?v=20261121-v3';

const TEX = './assets/textures/floor4/cc0/';
const loader = new THREE.TextureLoader();
function cc0(id, kind, res, { srgb = false, repeat = [1, 1] } = {}) {
  const t = loader.load(`${TEX}${id}/${id}_${kind}_${res}.jpg`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 4;
  return t;
}

export function createTempleMaterials() {
  const wall = new THREE.MeshStandardMaterial({
    map: cc0('rock_wall_16', 'diff', '1k', { srgb: true, repeat: [1.6, 1.6] }),
    normalMap: cc0('rock_wall_16', 'nor_gl', '1k', { repeat: [1.6, 1.6] }), normalScale: new THREE.Vector2(1.3, 1.3),
    roughnessMap: cc0('rock_wall_16', 'rough', '1k', { repeat: [1.6, 1.6] }),
    color: 0xb88272, roughness: 1, metalness: 0,
  });
  const trim = new THREE.MeshStandardMaterial({
    map: cc0('stone_block_wall', 'diff', '1k', { srgb: true, repeat: [2, 0.5] }),
    normalMap: cc0('stone_block_wall', 'nor_gl', '1k', { repeat: [2, 0.5] }),
    roughnessMap: cc0('stone_block_wall', 'rough', '1k', { repeat: [2, 0.5] }),
    color: 0x5a3e36, roughness: 1, metalness: 0,
  });
  const floor = new THREE.MeshStandardMaterial({
    map: cc0('volcanic_rock_tiles', 'diff', '2k', { srgb: true, repeat: [1, 1] }),
    normalMap: cc0('volcanic_rock_tiles', 'nor_gl', '2k', { repeat: [1, 1] }), normalScale: new THREE.Vector2(1.1, 1.1),
    roughnessMap: cc0('volcanic_rock_tiles', 'rough', '2k', { repeat: [1, 1] }),
    color: 0xb08070, roughness: 1, metalness: 0,
  });
  const slot = new THREE.MeshStandardMaterial({ color: 0x1a0804, emissive: 0xff5a12, emissiveIntensity: 2.4, roughness: 0.6 });
  const beam = trim;
  return { wall, trim, floor, slot, beam, dispose() { for (const m of [wall, trim, floor, slot]) { for (const k of ['map', 'normalMap', 'roughnessMap']) m[k]?.dispose(); m.dispose(); } } };
}

// 神殿の壁にする面か（壁 6.5 割、ゾーンや面ごとのばらつきは hash で決める）
export function makeTempleFacePicker(hash) {
  return (tx, ty, dx, dz) => hash(tx * 5 + dx + 11, ty * 5 + dz + 11, 777) < 0.65;
}

// faces: [{ x, z, ry, dx, dz, rune, seed }]（壁の中心座標と向き）。化粧材をインスタンスで置く
export function buildTempleTrims(root, faces, mats, hash) {
  const group = new THREE.Group(); group.name = 'b4:temple-trims';
  const owned = [];
  if (!faces.length) { root.add(group); return { group, dispose() {} }; }
  const SK = 0.325;
  if (!mats.runeCarve) mats.runeCarve = glyphMaterial({ style: 2, seed: 7.7, intensity: 0.95, speed: 0.45 });   // 壁の箱の半分の厚み：箱の中心から通路側の表面まで
  const parts = {
    plinth: { geo: new THREE.BoxGeometry(4.1, 0.42, 0.2), mat: mats.trim, y: 0.21, d: 0.1 },
    plinthCap: { geo: new THREE.BoxGeometry(4.1, 0.08, 0.28), mat: mats.trim, y: 0.46, d: 0.14 },
    cornice: { geo: new THREE.BoxGeometry(4.1, 0.34, 0.36), mat: mats.trim, y: 3.98, d: 0.18 },
    corniceLow: { geo: new THREE.BoxGeometry(4.1, 0.12, 0.24), mat: mats.trim, y: 3.74, d: 0.12 },
    pilaster: { geo: new THREE.BoxGeometry(0.46, 4.2, 0.26), mat: mats.trim, y: 2.1, d: 0.13, lateral: [-1.82, 1.82] },
    pilasterCap: { geo: new THREE.BoxGeometry(0.62, 0.22, 0.36), mat: mats.trim, y: 3.45, d: 0.18, lateral: [-1.82, 1.82] },
    // 彫り込まれたルーンの帯（光るルーン文字が流れる。前版の光る棒は単調だったので置き換え）
    slot: { geo: new THREE.PlaneGeometry(3.0, 0.34), mat: mats.runeCarve, y: 1.8, d: 0.032, runeOnly: true },
    slotFrame: { geo: new THREE.BoxGeometry(3.2, 0.5, 0.05), mat: mats.trim, y: 1.8, d: 0.0, runeOnly: true },
  };
  // 欠け：化粧材の一部をランダムに抜く（壊れた神殿）
  for (const [name, P] of Object.entries(parts)) {
    const ms = [];
    for (const f of faces) {
      if (P.runeOnly && !f.rune) continue;
      for (const lat of P.lateral || [0]) {
        if (name !== 'slot' && name !== 'slotFrame' && hash(f.seed * 97 + lat * 3, name.length, 778) < 0.12) continue;
        const nx = -f.dx, nz = -f.dz;   // 通路側の法線
        const off = SK + P.d;
        const px = f.x + nx * off + (-nz) * lat, pz = f.z + nz * off + nx * lat;
        const tilt = name.startsWith('pilaster') ? 0 : (hash(f.seed * 13, name.length, 779) - 0.5) * 0.02;
        ms.push(new THREE.Matrix4().compose(new THREE.Vector3(px, P.y, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, f.ry, 0)), new THREE.Vector3(1, 1, 1)));
      }
    }
    if (!ms.length) continue;
    const im = new THREE.InstancedMesh(P.geo, P.mat, ms.length);
    ms.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
    im.name = `b4:temple-${name}`; group.add(im); owned.push(im, P.geo);
  }
  root.add(group);
  return { group, dispose() { owned.forEach(o => o.dispose()); group.removeFromParent(); } };
}

// 天井の梁（神殿の床タイルの上に 4 m おき）
export function buildCeilingBeams(root, tiles, mats, CELL, height = 4.05) {
  const geo = new THREE.BoxGeometry(4.1, 0.42, 0.55);
  const im = new THREE.InstancedMesh(geo, mats.beam, Math.max(1, tiles.length));
  tiles.forEach(({ tx, ty, rot }, i) => im.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(tx * CELL, height - 0.21, ty * CELL), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot ? Math.PI / 2 : 0, 0)), new THREE.Vector3(1, 1, 1))));
  im.count = tiles.length; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.name = 'b4:temple-beams';
  root.add(im);
  return { mesh: im, dispose() { geo.dispose(); im.dispose(); im.removeFromParent(); } };
}
