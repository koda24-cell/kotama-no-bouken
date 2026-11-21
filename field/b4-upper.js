/* B4：壁より上の空間（2026-11-22 ユーザー指摘：壁の上に何もなく虚無が広がる。上にも橋・溶岩の流れ・上の道を）
 * 部品（寸法 m）：
 *   ・石橋 bridge：幅 2.4・厚 0.6、下面は尖頭アーチ（中央の厚み 1.4）、欄干 0.9、両端と中央に灯（炎）。
 *   ・上の回廊 gallery：壁の上（y 8.2）に張り出した幅 1.6 の通路＋欄干、4 m ごとの柱、上の壁（〜y 18）に灯った細窓。
 *   ・天井 vault：y 18 の暗い岩天井＋十字のリブ、吊り鎖と火鉢、逆さの岩（スキャン岩）。
 *   ・溶岩の水路 aqueduct：高さ 13〜14 の U 字の石の樋、中を流れる溶岩、端から下へ落ちる溶岩の滝。
 *   ・上の戸口 doorway：縦穴の壁の高い位置（y 6.5）に開いた灯のともる戸口（上の道があることを示す）。 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createFlames, createEmbers, deepLavaMaterial } from './b4-vfx.js?v=20261122-m2';
import { lavafallMaterial, parapetGeometry } from './b4-chasm.js?v=20261122-m2';

const M = (parts) => { const g = mergeGeometries(parts.map(p => (p.index ? p.toNonIndexed() : p)), false); parts.forEach(p => p.dispose()); return g; };

export function createUpperKit({ mats, hash, lights, gLights }) {
  const owned = [], flames = [], embers = [], groupOut = new THREE.Group(); groupOut.name = 'b4:upper';
  const stone = mats.trim, wall = mats.wall, dark = new THREE.MeshStandardMaterial({ color: 0x0e0908, roughness: 0.95, emissive: 0x0a0302 });
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x200803, emissive: 0xff6a20, emissiveIntensity: 1.3 });
  owned.push(dark, windowMat);
  const parts = { stone: [], wall: [], dark: [], win: [] };
  const light = (p, c = 0xff7a2a, i = 2.4, r = 10) => { if (lights.length < 90) { const L = { world: p.clone(), color: c, intensity: i, range: r, off: false }; lights.push(L); gLights.push(L); } };

  // a→b の石橋（y は橋面の高さ）
  function bridge(a, b, y, seed = 0) {
    const d = new THREE.Vector3().subVectors(b, a); d.y = 0; const L = d.length(), yaw = Math.atan2(d.x, d.z);
    const c = a.clone().add(b).multiplyScalar(0.5);
    const T = new THREE.Matrix4().compose(new THREE.Vector3(c.x, y, c.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1));
    const deck = new THREE.BoxGeometry(2.4, 0.6, L); deck.translate(0, -0.3, 0); parts.stone.push(deck.applyMatrix4(T));
    // 下面の尖頭アーチ（側面から見た形を押し出し）
    const s = new THREE.Shape(); const h = Math.min(2.4, L * 0.18);
    s.moveTo(-L / 2, 0); s.lineTo(L / 2, 0); s.lineTo(L / 2, -0.4); s.quadraticCurveTo(L * 0.18, -0.5, 0, -0.6 - h * 0.3); s.quadraticCurveTo(-L * 0.18, -0.5, -L / 2, -0.4); s.lineTo(-L / 2, 0);
    const arch = new THREE.ExtrudeGeometry(s, { depth: 2.0, bevelEnabled: false, curveSegments: 10 }); arch.translate(0, -0.6, -1.0); arch.rotateY(Math.PI / 2);
    parts.stone.push(arch.applyMatrix4(T));
    const n = Math.max(1, Math.round(L / 3.6));
    for (const side of [-1, 1]) for (let k = 0; k < n; k++) {
      const pg = parapetGeometry(hash, seed * 31 + k + side * 7); pg.scale(L / n / 4.0, 0.85, 0.8); pg.rotateY(Math.PI / 2);
      pg.translate(side * 1.05, 0, -L / 2 + (k + 0.5) * L / n); parts.stone.push(pg.applyMatrix4(T));
    }
    for (const t of [-0.5, 0, 0.5]) for (const side of [-1, 1]) {
      const p = new THREE.Vector3(side * 1.1, 1.3, t * (L - 1)).applyMatrix4(T);
      parts.stone.push(new THREE.BoxGeometry(0.3, 0.5, 0.3).translate(p.x, p.y - 0.35, p.z));
      flames.push({ x: p.x, y: p.y - 0.1, z: p.z, w: 0.45, h: 0.8, seed: hash(seed, t * 10 + side, 1601), intensity: 0.9 });
      embers.push({ x: p.x, z: p.z, y0: p.y + 0.2, spread: 0.1, rise: 2, count: 6, hot: 1 });
    }
    light(new THREE.Vector3(c.x, y + 1.6, c.z), 0xff8a34, 2.6, 11);
  }
  // 矩形（ワールド x0..x1, z0..z1）の周りの上の壁・回廊・天井
  function enclose(x0, z0, x1, z1, { top = 18, gallery = true, base = 8.2 } = {}) {
    const H = top - base, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = x1 - x0, D = z1 - z0;
    const wallM = wall.clone(); if (wallM.map) { wallM.map = wallM.map.clone(); wallM.map.repeat.set(1.6 * 2, H / 4.2 * 1.6); wallM.map.needsUpdate = true; owned.push(wallM.map); }
    owned.push(wallM);
    const wparts = [];
    for (const [ax, az, len, yaw] of [[cx, z0, W, 0], [cx, z1, W, Math.PI], [x0, cz, D, Math.PI / 2], [x1, cz, D, -Math.PI / 2]]) {
      const T = new THREE.Matrix4().compose(new THREE.Vector3(ax, 0, az), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1));
      const g = new THREE.BoxGeometry(len + 1.6, H, 0.8); g.translate(0, base + H / 2, -0.4);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (len + 1.6) / 8);
      wparts.push(g.applyMatrix4(T));
      // 回廊：張り出し床＋欄干、柱、細窓
      if (gallery) {
        parts.stone.push(new THREE.BoxGeometry(len, 0.4, 1.6).translate(0, base + 0.2, 0.8).applyMatrix4(T));
        const nP = Math.max(1, Math.round(len / 4));
        for (let k = 0; k < nP; k++) { const pg = parapetGeometry(hash, ax * 3 + az + k); pg.scale(len / nP / 4, 0.8, 0.7); pg.translate(-len / 2 + (k + 0.5) * len / nP, base + 0.4, 1.55); parts.stone.push(pg.applyMatrix4(T)); }
        for (let k = 0; k <= nP; k++) {
          const xk = -len / 2 + k * len / nP;
          parts.stone.push(new THREE.BoxGeometry(0.8, H - 1.2, 0.6).translate(xk, base + 0.4 + (H - 1.2) / 2, 0.3).applyMatrix4(T));
          if (k < nP) {
            const xm = xk + len / nP / 2;
            parts.win.push(new THREE.BoxGeometry(0.5, 2.2, 0.08).translate(xm, base + 3.0, 0.05).applyMatrix4(T));
            parts.dark.push(new THREE.BoxGeometry(1.6, 2.8, 0.1).translate(xm, base + 2.9, 0.02).applyMatrix4(T));
            if ((k + Math.round(ax + az)) % 2 === 0) { const p = new THREE.Vector3(xm, base + 1.2, 1.3).applyMatrix4(T); flames.push({ x: p.x, y: p.y, z: p.z, w: 0.4, h: 0.7, seed: hash(k, ax + az, 1602), intensity: 0.85 }); light(p, 0xff7a2a, 1.8, 7); }
          }
        }
      }
    }
    const wg = M(wparts); owned.push(wg); const wm = new THREE.Mesh(wg, wallM); wm.name = 'b4:upper-walls'; groupOut.add(wm);
    // 天井（リブ付き）
    const cg = new THREE.PlaneGeometry(W + 1.6, D + 1.6).rotateX(Math.PI / 2); cg.translate(cx, top, cz); owned.push(cg);
    const cm = new THREE.Mesh(cg, dark); cm.name = 'b4:upper-vault'; groupOut.add(cm);
    parts.stone.push(new THREE.BoxGeometry(W, 0.6, 0.7).translate(cx, top - 0.3, cz), new THREE.BoxGeometry(0.7, 0.6, D).translate(cx, top - 0.3, cz));
    for (let k = 1; k < Math.round(D / 4); k++) parts.stone.push(new THREE.BoxGeometry(W, 0.45, 0.45).translate(cx, top - 0.25, z0 + k * 4));
    // 吊り鎖と火鉢（天井から 5 m）
    for (const [fx, fz] of [[0.25, 0.3], [0.75, 0.7], [0.5, 0.5]]) {
      const x = x0 + W * fx, z = z0 + D * fz, yb = top - 5.0;
      parts.dark.push(new THREE.CylinderGeometry(0.04, 0.04, 5.0, 4).translate(x, top - 2.5, z));
      parts.stone.push(new THREE.CylinderGeometry(0.55, 0.3, 0.45, 8).translate(x, yb, z));
      flames.push({ x, y: yb + 0.2, z, w: 1.0, h: 1.6, seed: hash(x, z, 1603), intensity: 1.0 });
      embers.push({ x, z, y0: yb + 0.6, spread: 0.4, rise: 4, count: 20, hot: 1 });
      light(new THREE.Vector3(x, yb + 0.8, z), 0xff8a34, 3.0, 13);
    }
  }
  // 溶岩の水路（a→b、y = 樋の底）。端 b から下へ滝
  const lavaM = deepLavaMaterial({ flow: new THREE.Vector2(0.0, 0.25), scale: 0.4 }), fallM = lavafallMaterial(); owned.push(lavaM, fallM);
  function aqueduct(a, b, y, fallTo = null) {
    const d = new THREE.Vector3().subVectors(b, a); d.y = 0; const L = d.length(), yaw = Math.atan2(d.x, d.z), c = a.clone().add(b).multiplyScalar(0.5);
    const T = new THREE.Matrix4().compose(new THREE.Vector3(c.x, y, c.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1));
    parts.stone.push(new THREE.BoxGeometry(2.2, 0.5, L).translate(0, -0.25, 0).applyMatrix4(T), new THREE.BoxGeometry(0.35, 0.8, L).translate(-0.95, 0.4, 0).applyMatrix4(T), new THREE.BoxGeometry(0.35, 0.8, L).translate(0.95, 0.4, 0).applyMatrix4(T));
    const lg = new THREE.PlaneGeometry(1.6, L).rotateX(-Math.PI / 2); lg.translate(0, 0.45, 0); lg.applyMatrix4(T); owned.push(lg);
    const lm = new THREE.Mesh(lg, lavaM); lm.name = 'b4:upper-lava-channel'; groupOut.add(lm);
    // 支えのアーチ脚
    for (const t of [-0.35, 0.35]) parts.stone.push(new THREE.BoxGeometry(1.4, 2.0, 1.0).translate(0, -1.4, t * L).applyMatrix4(T));
    if (fallTo !== null) {
      const H = y - fallTo, fg = new THREE.PlaneGeometry(1.5, H, 1, 16); fg.translate(0, -H / 2 + 0.4, 0);
      const fm = new THREE.Mesh(fg, fallM); owned.push(fg);
      const end = new THREE.Vector3(0, 0, L / 2 + 0.05).applyMatrix4(T); fm.position.copy(end); fm.position.y = y; fm.rotation.y = yaw; fm.name = 'b4:upper-lavafall'; groupOut.add(fm);
      light(new THREE.Vector3(end.x, (y + fallTo) / 2, end.z), 0xff5a18, 3.2, 14);
      embers.push({ x: end.x, z: end.z, y0: fallTo + 0.3, spread: 0.8, rise: 5, count: 30, hot: 1 });
    }
    light(new THREE.Vector3(c.x, y + 0.8, c.z), 0xff5a18, 2.4, 10);
  }
  // 高い位置の灯った戸口（壁の面 p、外向き法線 n）
  function doorway(p, n, y = 6.5) {
    const yaw = Math.atan2(n.x, n.z), T = new THREE.Matrix4().compose(new THREE.Vector3(p.x, y, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1));
    parts.dark.push(new THREE.BoxGeometry(1.6, 2.6, 0.12).translate(0, 1.3, 0.02).applyMatrix4(T));
    parts.stone.push(new THREE.BoxGeometry(0.3, 2.9, 0.4).translate(-0.95, 1.45, 0.15).applyMatrix4(T), new THREE.BoxGeometry(0.3, 2.9, 0.4).translate(0.95, 1.45, 0.15).applyMatrix4(T), new THREE.BoxGeometry(2.2, 0.35, 0.45).translate(0, 3.0, 0.15).applyMatrix4(T), new THREE.BoxGeometry(2.4, 0.25, 1.0).translate(0, -0.1, 0.4).applyMatrix4(T));
    parts.win.push(new THREE.BoxGeometry(1.4, 2.2, 0.04).translate(0, 1.15, -0.02).applyMatrix4(T));
    const fp = new THREE.Vector3(0.8, 2.1, 0.45).applyMatrix4(T); flames.push({ x: fp.x, y: fp.y, z: fp.z, w: 0.35, h: 0.6, seed: hash(p.x, p.z, 1604), intensity: 0.9 });
    light(new THREE.Vector3(0, 1.6, 1.2).applyMatrix4(T), 0xff8a34, 1.8, 7);
  }
  function finish(root) {
    for (const [k, m] of [['stone', stone], ['dark', dark], ['win', windowMat]]) {
      if (!parts[k].length) continue; const g = M(parts[k]); owned.push(g); const mesh = new THREE.Mesh(g, m); mesh.name = 'b4:upper-' + k; groupOut.add(mesh);
    }
    if (flames.length) { const f = createFlames(flames, 'fire'); f.mesh.name = 'b4:upper-flames'; groupOut.add(f.mesh); owned.push(f); }
    if (embers.length) { const e = createEmbers(embers); e.mesh.name = 'b4:upper-embers'; groupOut.add(e.mesh); owned.push(e); }
    root.add(groupOut);
    return { group: groupOut, dispose() { owned.forEach(o => o.dispose()); groupOut.removeFromParent(); } };
  }
  return { bridge, enclose, aqueduct, doorway, finish };
}
