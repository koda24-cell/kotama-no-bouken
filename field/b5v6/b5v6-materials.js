/* 5層 V6：素材ライブラリ（A1）
 * CC0 実写 PBR（field/assets/b5v6/tex、出典は field/assets/b5v6/CREDITS.md）を同じ色補正で統一。
 * すべての材質は頂点カラー（経年の汚れ・すす・苔）を掛け合わせる。UV は世界座標（m）で振る（b5v6-geom.js の boxUV）。
 * 見た目だけ。マップ・通行判定・セーブには触れない。 */
import * as THREE from 'three';

const BASE = new URL('../assets/b5v6/tex/', import.meta.url).href;

export function createB5V6Materials({ high = true } = {}) {
  const loader = new THREE.TextureLoader();
  const textures = [], materials = [], pending = [];
  function tex(file, { srgb = false, meters = 2 } = {}) {
    let done; pending.push(new Promise(res => { done = res; }));
    const t = loader.load(BASE + file, () => done(), undefined, () => done());
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / meters, 1 / meters);
    t.anisotropy = high ? 8 : 2;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    textures.push(t);
    return t;
  }
  function pbr(name, { meters = 2, color = 0xffffff, roughness = 1, metalness = 0, normalScale = 1, envMapIntensity = 1, emissive, side } = {}) {
    const arm = tex(name + '_arm.jpg', { meters });
    const m = new THREE.MeshStandardMaterial({
      color, map: tex(name + '_diff.jpg', { srgb: true, meters }), normalMap: tex(name + '_nor.jpg', { meters }),
      aoMap: arm, roughnessMap: arm, metalnessMap: metalness > 0 ? arm : null,
      roughness, metalness, vertexColors: true, envMapIntensity
    });
    m.normalScale.set(normalScale, normalScale);
    if (emissive) m.emissive.setHex(emissive);
    if (side) m.side = side;
    m.name = 'b5v6:' + name;
    materials.push(m);
    return m;
  }
  const M = {
    // 壁の切石（大判ブロック 2.6 m 周期）
    wall: pbr('wall', { meters: 2.6, color: 0xf2f2fa, normalScale: 1.25 }),
    // 崩れた壁の内側（割石）
    rubble: pbr('wallrubble', { meters: 1.6, color: 0xe6e6f0, normalScale: 1.4 }),
    // 加工石（柱・リブ・繰形・像）
    dressed: pbr('dressed', { meters: 1.4, color: 0xeeeef6, normalScale: 0.8 }),
    floor: pbr('floor', { meters: 2.2, color: 0xf0eef4, normalScale: 1.2 }),
    floor2: pbr('floor2', { meters: 2.8, color: 0xeceaf2, normalScale: 1.1 }),
    // 剣・鎧（錆びた鋼）
    steel: pbr('steel', { meters: 0.6, color: 0xffffff, roughness: 1, metalness: 1, normalScale: 0.6 }),
    // 鍛鉄（シャンデリア・燭台・旗竿の金具）
    iron: pbr('iron', { meters: 0.5, color: 0xd8d0cc, roughness: 1, metalness: 0.85, normalScale: 0.8 }),
    // 布（色は個別。布目は実写の織り）
    clothRed: pbr('fabric', { meters: 0.35, color: 0xb83442, normalScale: 0.7, side: THREE.DoubleSide }),
    clothBlue: pbr('fabric', { meters: 0.35, color: 0x3c4a8c, normalScale: 0.7, side: THREE.DoubleSide }),
    clothBlack: pbr('fabric', { meters: 0.35, color: 0x4a4252, normalScale: 0.7, side: THREE.DoubleSide }),
  };
  // 単色の補助材質
  const plain = (opts, name) => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts }); m.name = 'b5v6:' + name; materials.push(m); return m; };
  M.brass = plain({ color: 0x6b5232, roughness: 0.45, metalness: 0.9 }, 'brass');
  M.wax = plain({ color: 0x8f846f, roughness: 0.6, metalness: 0, emissive: 0x2a1406, emissiveIntensity: 0.35 }, 'wax');
  M.paintRed = plain({ color: 0x6e2226, roughness: 0.8, metalness: 0 }, 'paintRed');
  M.paintBlue = plain({ color: 0x2c3a68, roughness: 0.8, metalness: 0 }, 'paintBlue');
  M.leaf = plain({ color: 0x46503a, roughness: 0.9, side: THREE.DoubleSide }, 'leaf');
  M.flower = plain({ color: 0xeee8f6, roughness: 0.7, emissive: 0x3a3050, emissiveIntensity: 0.6, side: THREE.DoubleSide }, 'flower');
  M.wood = plain({ color: 0x2f2620, roughness: 0.9 }, 'wood');
  M.leather = plain({ color: 0x2b211d, roughness: 0.8 }, 'leather');
  M.void = new THREE.MeshBasicMaterial({ color: 0x050411 }); M.void.name = 'b5v6:void'; materials.push(M.void);
  // 紫の魔力を帯びた刻印（自発光）
  M.rune = plain({ color: 0x2a1840, emissive: 0x8a4dff, emissiveIntensity: 1.6, roughness: 0.4 }, 'rune');
  // 金属の映り込み用の環境マップ（暗い神殿：紫の炎と琥珀のろうそくが点在する部屋）。PMREM はページ全体で 1 回
  let envRT = null;
  M.setEnv = (renderer) => {
    if (envRT || !renderer) return;
    const pm = new THREE.PMREMGenerator(renderer), room = new THREE.Scene();
    room.background = new THREE.Color(0x0b0910);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const glow = (c, x, y, z, s) => { const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); m.scale.setScalar(s); room.add(m); };
    glow(0x6a3cc8, 4, 1, 0, 1.6); glow(0x6a3cc8, -3, 0.5, 3, 1.2); glow(0xb0682a, -2, 1.5, -4, 1.0); glow(0x2a2440, 0, 6, 0, 8); glow(0x16121e, 0, -5, 0, 10);
    envRT = pm.fromScene(room, 0.04);
    for (const m of [M.steel, M.iron, M.brass]) { m.envMap = envRT.texture; m.envMapIntensity = m === M.steel ? 0.9 : 0.6; m.needsUpdate = true; }
    room.traverse(o => o.material?.dispose()); box.dispose(); pm.dispose();
  };
  // ステンドグラス（鉛の枠と色ガラス。物語の図像は入れず、幾何学の色面だけ）。自発光で暗い身廊を照らす
  {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d');
    x.fillStyle = '#05040a'; x.fillRect(0, 0, 256, 512);
    const pal = ['#6a3cc8', '#3b4fb8', '#8a2a5a', '#4a2a90', '#2e6aa8', '#7a52d8', '#5a1e48', '#c89a4a'];
    let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let y = 0; y < 512; y += 32) for (let xx = 0; xx < 256; xx += 32) {
      const jx = (r() - 0.5) * 10, jy = (r() - 0.5) * 10; x.fillStyle = pal[Math.floor(r() * (r() < 0.08 ? 8 : 7))];
      x.globalAlpha = 0.55 + r() * 0.45; x.beginPath(); x.moveTo(xx + 3 + jx, y + 3); x.lineTo(xx + 29, y + 3 + jy); x.lineTo(xx + 29 - jx, y + 29); x.lineTo(xx + 3, y + 29 - jy); x.closePath(); x.fill();
    }
    x.globalAlpha = 1; x.strokeStyle = '#000'; x.lineWidth = 5;
    for (let y = 0; y <= 512; y += 128) { x.beginPath(); x.moveTo(0, y); x.lineTo(256, y); x.stroke(); }
    for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(128, 64 + i * 128, 44, 0, Math.PI * 2); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; textures.push(t);
    M.glass = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.3, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.5 }); M.glass.name = 'b5v6:glass'; materials.push(M.glass);
  }
  M.ready = Promise.all(pending);
  M.dispose = () => { textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); envRT?.dispose(); };
  M.all = materials;
  return M;
}
