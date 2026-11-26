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
    clothRed: pbr('fabric', { meters: 0.35, color: 0x5a1820, normalScale: 0.7, side: THREE.DoubleSide }),
    clothBlue: pbr('fabric', { meters: 0.35, color: 0x1f2546, normalScale: 0.7, side: THREE.DoubleSide }),
    clothBlack: pbr('fabric', { meters: 0.35, color: 0x26222b, normalScale: 0.7, side: THREE.DoubleSide }),
  };
  // 単色の補助材質
  const plain = (opts, name) => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts }); m.name = 'b5v6:' + name; materials.push(m); return m; };
  M.brass = plain({ color: 0x6b5232, roughness: 0.45, metalness: 0.9 }, 'brass');
  M.wax = plain({ color: 0xcfc4ad, roughness: 0.55, metalness: 0, emissive: 0x2a1a08, emissiveIntensity: 0.6 }, 'wax');
  M.wood = plain({ color: 0x2f2620, roughness: 0.9 }, 'wood');
  M.leather = plain({ color: 0x2b211d, roughness: 0.8 }, 'leather');
  M.void = new THREE.MeshBasicMaterial({ color: 0x050411 }); M.void.name = 'b5v6:void'; materials.push(M.void);
  // 紫の魔力を帯びた刻印（自発光）
  M.rune = plain({ color: 0x2a1840, emissive: 0x8a4dff, emissiveIntensity: 1.6, roughness: 0.4 }, 'rune');
  M.ready = Promise.all(pending);
  M.dispose = () => { textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); };
  M.all = materials;
  return M;
}
