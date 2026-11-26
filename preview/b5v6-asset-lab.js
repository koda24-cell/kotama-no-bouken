/* 5層 V6 アセット検証ラボ。?asset=<名前>&cam=x,y,z&look=x,y,z
 * ゲームと同じトーンマッピング・露出・ブルームで、アセットを単体で確認する。 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createB5V6Materials } from '../field/b5v6/b5v6-materials.js';
import { Bucket } from '../field/b5v6/b5v6-geom.js';
import { buildB5V6Architecture } from '../field/b5v6/b5v6-architecture.js';
import { createB5V6DistantCity } from '../field/b5v6/b5v6-distant-city.js';
import { FlameSystem, EmberSystem, GroundMist, LightShafts } from '../field/b5v6/b5v6-vfx.js';
import { placeAsset, trs } from '../field/b5v6/b5v6-place.js';
import * as FIX from '../field/b5v6/b5v6-fixtures.js';
import { BannerSystem } from '../field/b5v6/b5v6-banners.js';
import * as CHAN from '../field/b5v6/b5v6-chandelier.js';

const q = new URLSearchParams(location.search);
const PROPS = { ...FIX, ...CHAN };
const extra = (q.get('mods') || '').split(',').filter(Boolean);
for (const m of extra) Object.assign(PROPS, await import('../field/b5v6/' + m + '.js'));
const vec = (s, d) => (s ? s.split(',').map(Number) : d);
const hud = document.getElementById('hud');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight); document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07060c); scene.fog = new THREE.FogExp2(0x14111f, Number(q.get('fog') || 0.035));
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.05, 180);
camera.position.set(...vec(q.get('cam'), [4, 1.6, 12]));
const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(...vec(q.get('look'), [4, 2.5, 0])); controls.update();
scene.add(new THREE.AmbientLight(0x8c88a8, Number(q.get('amb') || 1.4)));
scene.add(new THREE.HemisphereLight(0x9c9ab8, 0x2a2532, Number(q.get('hemi') || 2.0)));
const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.5, 0.84)); composer.addPass(new OutputPass());
const lights = [];
function point(x, y, z, color, intensity = 6, range = 9) { const k = Number(q.get('lk') || 1); const l = new THREE.PointLight(color, intensity * 2.4 * k, range * 2, 2); l.position.set(x, y, z); scene.add(l); lights.push(l); return l; }

const M = createB5V6Materials({ high: true }); M.setEnv(renderer);
const hash = (x, z, s = 0) => { let h = (x * 374761393 + z * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function testMap(rows) {
  const a = { w: rows[0].length, h: rows.length, objects: [], f: 0 };
  const ch = (x, y) => (rows[y] && rows[y][x]) || '#';
  return { a, ch, wallCell: (x, y) => ch(x, y) === '#' };
}
const updaters = [];
const SCENES = {
  async gallery() {
    // 幅 4 マスの部屋に、指定したアセットを並べる。?props=brazier,wallTorch&wall=1
    const { a, ch, wallCell } = testMap(['########', '#......#', '#......#', '########']);
    const bucket = new Bucket(12);
    const info = buildB5V6Architecture({ a, ch, wallCell, hash, CELL: 4, M, bucket, heights: () => ({ spring: 5.8, apex: 9.0 }), collapse: 0 });
    const flames = new FlameSystem(), embers = new EmberSystem(), mist = new GroundMist();
    const ctx = { bucket, flames, embers, mist, addLight: (x, y, z, c, i, r) => point(x, y, z, c, i, r) };
    const list = (q.get('props') || 'brazier').split(',');
    const spacing = Number(q.get('sp') || 2.4);
    list.forEach((nm, i) => {
      const ci = nm.indexOf(':'), fn = ci < 0 ? nm : nm.slice(0, ci), arg = ci < 0 ? '' : nm.slice(ci + 1);
      const asset = PROPS[fn](M, 7 + i * 13, arg ? JSON.parse(decodeURIComponent(arg)) : undefined);
      const x = 4 + i * spacing, onWall = asset.wallMounted || fn === 'wallTorch' || fn === 'wallBanner';
      const y = fn === 'chandelier' ? 4.4 : 0;
      placeAsset(ctx, asset, onWall ? trs(x, 0, 2.0, 0) : trs(x, y, 6, Number(q.get('ry') || 0)));
    });
    if (q.get('banners')) {
      const B = new BannerSystem(M);
      B.wallBanner(trs(6, 0, 2.0, 0), 3, { color: 'red' }); B.wallBanner(trs(14, 0, 2.0, 0), 5, { color: 'blue' });
      B.warStandard(trs(9, 0, 6.5, 0.3), 7, { color: 'red' }); B.fallenCloth(trs(11.5, 0, 5.5, 0.8), 9);
      B.hangingBanner(trs(18, 8.4, 6, 0), 11, { h: 6.5, color: 'black' });
      B.build(scene, bucket); updaters.push(t => B.update(t));
    }
    if (q.get('mist')) for (let x = 1; x < 7; x++) for (let y = 1; y < 3; y++) mist.add(x * 4, y * 4, 1);
    const g = new THREE.Group(); bucket.build(g, 'gal'); scene.add(g);
    flames.build(scene); embers.build(scene); mist.build(scene);
    updaters.push(t => { flames.update(t); embers.update(t); mist.update(t); });
    if (!lights.length || q.get('fill')) point(12, 4, 9, 0x8f5cff, 3, 9);
    return info;
  },
  async arch() {
    const { a, ch, wallCell } = testMap([
      '#########',
      '#...#...#',
      '#.#.#.#.#',
      '#.......#',
      '#.#####.#',
      '#.......#',
      '#########']);
    const bucket = new Bucket(12);
    const info = buildB5V6Architecture({ a, ch, wallCell, hash, CELL: 4, M, bucket, heights: () => ({ spring: 5.8, apex: 9.0 }), collapse: Number(q.get('collapse') || 0.15),
      breachFaces: new Set(['3,1,0,-1']) });
    const g = new THREE.Group(); bucket.build(g, 'arch'); scene.add(g);
    point(4, 2.2, 12, 0x8f5cff, 6, 7); point(12, 2.2, 4, 0x8f5cff, 6, 7); point(24, 2.2, 12, 0xff9a4a, 4, 6); point(16, 2.5, 20, 0x8f5cff, 6, 7); point(4, 2.4, 2, 0xff9a4a, 4, 6);
    if (q.get('city')) { const c = createB5V6DistantCity({ center: new THREE.Vector3(16, 0, 12), radius: [52, 115] }); scene.add(c.group); updaters.push(t => c.update(t)); }
    return info;
  },
};
const name = q.get('asset') || 'arch';
const info = await SCENES[name]();
await M.ready;
let tris = 0; scene.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
hud.textContent = `${name}  tris=${Math.round(tris)}  ${info?.faces ? 'faces=' + info.faces.length + ' piers=' + info.piers.length + ' collapsed=' + info.collapsed.length : ''}`;
let t0 = performance.now(), frames = 0;
function loop(t) { updaters.forEach(u => u(t * 0.001)); controls.update(); composer.render(); frames++; if (frames === 3) window.labReady = true; requestAnimationFrame(loop); }
requestAnimationFrame(loop);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
window.labInfo = { tris, info: info ? { faces: info.faces?.length, piers: info.piers?.length } : null };
