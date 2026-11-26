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

const q = new URLSearchParams(location.search);
const vec = (s, d) => (s ? s.split(',').map(Number) : d);
const hud = document.getElementById('hud');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight); document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07060c); scene.fog = new THREE.FogExp2(0x14111f, Number(q.get('fog') || 0.035));
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.05, 60);
camera.position.set(...vec(q.get('cam'), [4, 1.6, 12]));
const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(...vec(q.get('look'), [4, 2.5, 0])); controls.update();
scene.add(new THREE.AmbientLight(0x8c88a8, Number(q.get('amb') || 1.4)));
scene.add(new THREE.HemisphereLight(0x9c9ab8, 0x2a2532, Number(q.get('hemi') || 2.0)));
const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.5, 0.84)); composer.addPass(new OutputPass());
const lights = [];
function point(x, y, z, color, intensity = 6, range = 9) { const k = Number(q.get('lk') || 1); const l = new THREE.PointLight(color, intensity * 2.4 * k, range * 2, 2); l.position.set(x, y, z); scene.add(l); lights.push(l); return l; }

const M = createB5V6Materials({ high: true });
const hash = (x, z, s = 0) => { let h = (x * 374761393 + z * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function testMap(rows) {
  const a = { w: rows[0].length, h: rows.length, objects: [], f: 0 };
  const ch = (x, y) => (rows[y] && rows[y][x]) || '#';
  return { a, ch, wallCell: (x, y) => ch(x, y) === '#' };
}
const updaters = [];
const SCENES = {
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
