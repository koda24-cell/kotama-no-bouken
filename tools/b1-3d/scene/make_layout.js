// B1F 検証用シーンの配置（JSON）を作る。node tools/b1-3d/scene/make_layout.js
// ※ゲームの移動方式・カメラ仕様は未確定のため、これは見た目の検証用の配置。ゲーム本体のマップデータとは無関係。
const fs = require('fs'), path = require('path');
const OUT = path.resolve(__dirname, '../../../assets/3d/dungeons/b1_ancient_forest/scene/b1_test_scene.json');
const C = 4; // 1マス 4m

// 歩ける区画（x, z はマス座標）。種類：H=広間、R=通路、L=高台、S=下り階段、O=樹海側（壁なしの外周）
const MAP = [
  //       x: -3   -2   -1    0    1    2
  /* z=-3 */ [' ', ' ', ' ', 'S', ' ', ' '],
  /* z=-2 */ ['O', 'H', 'H', 'H', 'H', 'H'],
  /* z=-1 */ ['O', 'H', 'H', 'H', 'H', 'H'],
  /* z= 0 */ ['O', 'H', 'H', 'H', 'L', 'L'],
  /* z= 1 */ [' ', ' ', ' ', 'R', ' ', ' '],
  /* z= 2 */ [' ', ' ', 'R', 'R', ' ', ' '],
  /* z= 3 */ [' ', ' ', ' ', 'R', ' ', ' '],
];
const X0 = -3, Z0 = -3;
const cell = (x, z) => { const row = MAP[z - Z0]; return row ? (row[x - X0] || ' ') : ' '; };
const walk = (t) => t !== ' ';

let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const items = [];
const put = (asset, x, y, z, ry = 0, s = 1, note) => items.push({ asset, pos: [+x.toFixed(3), +y.toFixed(3), +z.toFixed(3)], rotY: +ry.toFixed(4), scale: s, ...(note ? { note } : {}) });
const D = (id) => (id.startsWith('mod_') || id.startsWith('gimmick_') || id.startsWith('gather_') || id === 'crystal_wall_vein') ? `modules/${id}.glb` : `props/${id}.glb`;

// 床・天井
for (let z = Z0; z < Z0 + MAP.length; z++) for (let x = X0; x < X0 + 6; x++) {
  const t = cell(x, z); if (!walk(t)) continue;
  const cx = x * C, cz = z * C;
  if (t === 'S') { put('mod_stairs_down', cx, 0, cz); continue; }
  if (t === 'L') { put('mod_floor_ledge_step', cx, 0, cz, Math.PI); continue; }
  if (t === 'O') { put('mod_floor_root_soil_4m', cx, 0, cz, Math.floor(rnd() * 4) * Math.PI / 2); continue; }
  const r = rnd();
  put(r < 0.22 ? 'mod_floor_stone_broken_4m' : 'mod_floor_stone_4m', cx, 0, cz, Math.floor(rnd() * 4) * Math.PI / 2);
  if (t === 'R') put('mod_ceiling_vault_4m', cx, 4, cz, (x + z) % 2 ? 0 : Math.PI / 2);
}

// 壁：歩ける区画の辺で、隣が歩けない（または外周）なら壁を置く
const special = new Map([
  ['2,-2,+x', 'doorway_seal'],   // 広間の東：封印の石扉
  ['-1,2,-x', 'doorway_curtain'], // 通路の西：根のカーテン（近道）
  ['-2,-2,-x', 'skip'], ['-2,-1,-x', 'skip'], ['-2,0,-x', 'skip'], // 樹海側へ開く（O との境は壁なし）
]);
const dirs = [['+x', 1, 0, -Math.PI / 2], ['-x', -1, 0, Math.PI / 2], ['+z', 0, 1, Math.PI], ['-z', 0, -1, 0]];
for (let z = Z0; z < Z0 + MAP.length; z++) for (let x = X0; x < X0 + 6; x++) {
  const t = cell(x, z); if (!walk(t) || t === 'O') continue;
  for (const [key, dx, dz, ry] of dirs) {
    const n = cell(x + dx, z + dz);
    if (walk(n)) continue;
    const sp = special.get(`${x},${z},${key}`);
    if (sp === 'skip') continue;
    const ex = x * C + dx * C / 2, ez = z * C + dz * C / 2;
    const y = t === 'L' ? 0.6 : 0;
    if (sp === 'doorway_seal') { put('mod_wall_doorway_4m', ex, 0, ez, ry); put('gimmick_sealed_rune_door', ex + dx * 0.02, 0, ez + dz * 0.02, ry); continue; }
    if (sp === 'doorway_curtain') { put('mod_wall_doorway_4m', ex, 0, ez, ry); put('gimmick_root_curtain_shortcut', ex - dx * 0.3, 0, ez - dz * 0.3, ry); continue; }
    const r = rnd();
    const w = (t === 'H' && r < 0.18) ? 'mod_wall_collapsed_4m' : r < 0.5 ? 'mod_wall_mossy_roots_4m' : 'mod_wall_4m';
    put(w, ex, t === 'S' ? 0 : 0, ez, ry);
  }
}
// 広間の角柱
for (const [x, z] of [[-6, -10], [10, -10], [-6, 2], [10, 2], [-2, 2], [2, 2], [-2, -10], [2, -10]]) put('mod_pillar_corner', x, 0, z);

// 樹海側：巨木と根
put('ancient_giant_tree', -17, 0, -5, 0.6, 1, '左奥のランドマーク。広間の西は壁を外して樹海へ開く');
put('spreading_root_cluster', -11.5, 0, -1, 1.2);
put('spreading_root_cluster', -12, 0, -8.5, 2.6, 0.9);
put('moss_boulder_cluster', -13.5, 0, 1.0, 0.4);
put('hollow_tree_stump', -11, 0, -11.5, 0.9, 0.9);
put('fallen_ancient_trunk', -12.5, 0, 4.5, 0.25, 0.9);
put('gather_logging_point', -11, 0, 2.2, -0.4);
put('glow_mushroom_cluster', -9.6, 0, -4.2, 0); put('glow_mushroom_cluster', -13, 0, -3, 1.4, 0.8);
put('fern_cluster', -9.5, 0, 0.5, 0.3); put('fern_cluster', -10.5, 0, -6.5, 1.8);
put('living_root_arch', -8, 0, -5, Math.PI / 2, 1, '広間と樹海の境界');

// 通路（入口側）
put('ancient_lantern_post', -1.4, 0, 13.4, 0); put('ancient_lantern_post', 1.4, 0, 13.4, Math.PI);
put('ruin_stone_lantern', 1.4, 0, 6.6, 0);
put('hanging_glow_vines', 0.9, 4.0, 10.5, 0.3, 0.6); put('hanging_glow_vines', -1.0, 4.0, 5.2, 1.6, 0.55);
put('glow_moss_floor_patch', 0, 0, 9.5, 0.4);
put('gather_herb_point', -5.3, 0, 7.4, 0, 0.9, '通路の脇の小部屋（採集）');
put('fern_cluster', -5.2, 0, 9.3, 0.7); put('ruin_rubble_pile', -2.9, 0, 9.0, 0.5, 0.5);
put('ruin_archway', 0, 0, 2.05, 0, 0.92, '通路から広間への入口');
put('ancient_ceremonial_banner', -1.85, 0, 2.6, 0); put('ancient_ceremonial_banner', 1.85, 0, 2.6, 0);

// 広間
put('ancient_rune_floor_seal', 0, 0, -4, 0);
put('weathered_guardian_statue', -2.6, 0, -9.0, 0.25); put('weathered_guardian_statue', 2.6, 0, -9.0, -0.25);
put('blue_wisp_torch', -1.6, 0, -9.6, 0); put('blue_wisp_torch', 1.6, 0, -9.6, 0);
put('fallen_statue_head', -4.2, 0, -0.6, 0.8, 0.8);
put('ruin_rubble_pile', -3.5, 0, -7.5, 1.1, 0.7);
put('ruined_stone_pillar', 3.6, 0, -5.2, 2.2);
put('mossy_wishing_well', 6.5, 0, -1.2, -0.6, 1, '休憩地点の候補');
put('sealed_treasure_chest', 8.6, 0, -9.0, -0.3);
put('crystal_wall_vein', 10, 0, -4.2, -Math.PI / 2, 1, '東の壁に重ねる');
put('gather_mining_point', 8.4, 0, -4.6, -1.4, 0.9);
put('bioluminescent_crystal_cluster', 8.8, 0, -6.8, 0.5, 0.9);
// 高台（y=0.6）
put('forest_shrine_altar', 6.8, 0.6, 1.0, Math.PI, 0.85);
put('hanging_altar_chains', 6.8, 0.6, 2.6, Math.PI, 0.9);
put('ancient_lantern_post', 3.2, 0.6, 2.4, -Math.PI / 2);
put('gimmick_root_lever', 4.6, 0.6, 0.0, Math.PI);
// FOE の気配（広間の東西を横切る巡回路）
put('foe_trampled_path', 3.0, 0.005, -7.0, 0.1);
put('foe_trampled_path', -1.0, 0.005, -6.6, -0.15);
put('foe_footprint', 2.0, 0.005, -7.2, 0.4, 0.9);
put('foe_claw_marks', 5.0, 0, -9.98, 0, 1, '北の壁面に重ねる');
put('forest_beast_bone_pile', 4.6, 0, -8.2, 2.0, 0.8);
put('foe_cursed_crystal_cluster', -4.8, 0, -8.6, 0.8, 0.7);
put('hanging_forest_cocoon', -4.6, 5.2, -3.0, 0.4);
put('gimmick_pressure_plate', 0, 0.0, -0.6, 0);

const doc = {
  scene: 'B1F 深淵に眠る樹海：検証用シーン',
  version: 'claude_test_v1',
  status: '見た目の検証用。ゲームの移動方式・カメラ・マップデータとは未接続。',
  units: 'meter（1マス=4m、壁の高さ4m）', up: '+Y', front: '+Z',
  map: MAP.map((r) => r.join('')), mapOrigin: { x: X0, z: Z0, cell: C },
  legend: { H: '広間', R: '通路', L: '高台（+0.6m）', S: '下り階段', O: '樹海側（壁なし）' },
  lighting: { shafts: [{ pos: [-6, 26, 4], target: [-17, 5, -5], color: 0xbfe6ff, intensity: 2600, angle: 0.36 }, { pos: [2, 30, -6], target: [0, 0, -5], color: 0x9fd0ff, intensity: 260, angle: 0.28 }], ambient: '暗い青（半球光）', fog: 'FogExp2 #0a141a', key: '上方からの冷たい光（樹冠の隙間を想定）', local: '各 GLB の extras.b1.lights を点光源として使用' },
  cameras: {
    corridor_eye: { pos: [0, 1.6, 13], target: [0, 1.8, -4], fov: 60, note: '通路から広間を見る（目線の高さ1.6m）' },
    hall_to_tree: { pos: [3.5, 1.8, -2.5], target: [-15, 5.5, -5.5], fov: 62, fog: 0.016, note: '広間から樹海の巨木を見る' },
    hall_to_stairs: { pos: [0.6, 1.7, 0.6], target: [0, 0.4, -12], fov: 60, fog: 0.022, note: '広間の奥（守護像と下り階段）' },
    overview: { pos: [22, 24, 26], target: [-3, 0, -3], fov: 42, fog: 0.008, exp: 1.5, lk: 3, note: '全体の俯瞰' },
    plan: { pos: [-4, 70, -1.5], target: [-4, 0, -1.6], fov: 34, fog: 0.002, exp: 1.6, lk: 3, note: '真上から（配置の確認）' },
  },
  items,
  assetPath: Object.fromEntries([...new Set(items.map((i) => i.asset))].map((a) => [a, D(a)])),
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(doc, null, 1));
console.log('items', items.length, 'unique', Object.keys(doc.assetPath).length);
