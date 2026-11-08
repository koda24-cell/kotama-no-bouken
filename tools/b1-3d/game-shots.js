// ゲーム本体の一人称3D表示：高画質の確認用スクリーンショット（短いシナリオ）。game-test.js の短縮版。
// 使い方: THREE_DIR=/tmp/three node tools/b1-3d/game-test.js <出力フォルダ> [幅] [高さ] [シナリオ]
// ・リポジトリを http で配信し、CDN の three.js をローカルの r180 に差し替えて index.html を開く。
// ・チュートリアルを終えた状態にして第1階層へ入り、移動・旋回・調べる・宝箱・採集・階段・戦闘への切り替え・2D/3D切り替えを試す。
// ・persistAutoSave は無効にする（ローカルのセーブを汚さない）。乱数は固定。
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright-core');
const ROOT = path.resolve(__dirname, '../..'), THREE_DIR = process.env.THREE_DIR || '/tmp/three';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const srv = http.createServer((q, s) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); s.end(d); }); }).listen(8773);
(async () => {
  const [out = '/tmp/fp3d', w = 1280, h = 800] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: +w, height: +h } });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/(.*)/, (r, req) => { const m = req.url().match(/three@0\.180\.0\/(.*)$/); r.fulfill({ path: path.join(THREE_DIR, m[1]), contentType: 'text/javascript' }); });
  const p = await ctx.newPage();
  await p.addInitScript((q) => { try { localStorage.clear(); localStorage.setItem('kotama.field3d.quality', q); localStorage.setItem('kotama.field3d.maxFps', '1'); } catch (e) {} }, process.env.Q || 'low');
  const errs = []; p.on('pageerror', (e) => errs.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); if (/\[field-3d\]/.test(m.text())) errs.push('log: ' + m.text()); });
  console.error('[step] goto'); await p.goto('http://localhost:8773/index.html', { waitUntil: 'domcontentloaded' }); console.error('[step] loaded'); await p.waitForTimeout(5000); console.error('[step] waited', await p.evaluate(() => typeof fieldEnterArea + ' ' + typeof window.KotamaField3D));
  for (let i = 0; i < 120; i++) { const ok = await p.evaluate(() => typeof fieldEnterArea === 'function' && !!window.KotamaField3D).catch((e) => String(e)); if (ok === true) break; if (i % 10 === 9) console.error('[wait]', ok, errs.slice(-3)); await p.waitForTimeout(500); }
  await p.evaluate(() => {
    try { tutorialFinish(); } catch (e) {} try { tutorialClose(); } catch (e) {}
    if (typeof tutorialState !== 'undefined') { tutorialState.phase = 'complete'; tutorialState.completed = true; tutorialState.started = false; }
    document.querySelectorAll('#tutorial-overlay').forEach((el) => (el.hidden = true)); document.body.classList.remove('tutorial-home-focus', 'tutorial-active');
    state.firstStageStarted = true; state.maxUnlockedStage = 5;
    fieldState.flags.prologue = true; fieldState.flags['labyrinth-tutorial'] = true;
    for (let f = 0; f < 3; f++) fieldState.flags[`floor:1-${f}`] = true;
    if (typeof eventRead !== 'undefined') for (const e of stageEvents || []) eventRead[e.id] = true;
    window.persistAutoSave = () => true;
  });
  const skip = async () => { await p.evaluate(() => { for (let i = 0; i < 40; i++) { if (fieldChoiceState) { fieldChoiceKey('z'); continue; } if (fieldDialogTyping) { fieldDialogTyping(); continue; } if (fieldDialogAdvance) { const r = fieldDialogAdvance; fieldDialogAdvance = null; r(); continue; } } document.querySelectorAll('#story-event').forEach((e) => { if (!e.hidden) e.querySelector('button')?.click(); }); }); await p.waitForTimeout(250); };
  const settle = async () => { for (let i = 0; i < 25; i++) { const busy = await p.evaluate(() => fieldState.lock || !!fieldDialogAdvance || !!fieldChoiceState || !!fieldDialogTyping); if (!busy) return; await skip(); await p.waitForTimeout(400); } };
  const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 82, timeout: 120000 }); };
  const st = () => p.evaluate(() => ({ tile: fieldPlayerTile(), dir: fieldState.dir, active: window.KotamaField3D.active(), near: fieldState.nearKey, lock: fieldState.lock, screen: state.screen, floor: fieldState.floor }));
  const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.down(k); await p.waitForTimeout(60); await p.keyboard.up(k); await p.waitForTimeout(320); await skip(); } };
  const waitActive = async (label) => { for (let i = 0; i < 240; i++) { if (await p.evaluate(() => window.KotamaField3D.active())) return; await p.waitForTimeout(500); } errs.push(label + ' で 3D が有効にならない'); };
  const log = []; const note = async (label) => { const s = await st(); log.push({ label, ...s }); console.error('[step]', label, JSON.stringify(s)); };

  await p.evaluate(() => { fieldEnterArea(1, { floor: 0, fromHome: true }); });
  for (let i = 0; i < 8; i++) await skip();
  await waitActive('1F'); await settle();
  const goto = async (tx, ty, faceDir) => { await p.evaluate(([tx, ty, faceDir]) => { const c = fieldTileCenter(tx, ty); fieldState.x = c.x; fieldState.y = c.y; fieldState.dir = faceDir; fieldState.view = null; fieldUpdateVision(true); }, [tx, ty, faceDir]); await p.waitForTimeout(800); };
  await note('enter'); await shot('h01_start');
  await goto(10, 19, 'up'); await key('Enter', 1); await settle(); await note('lever');
  await goto(19, 19, 'up'); await note('gate-open'); await shot('h02_gate_open');
  await goto(25, 11, 'down'); await p.evaluate(() => { const f = fieldState.foes[0]; if (f) { fieldFoePlace(f, 25, 13); f.view = null; } }); await note('foe'); await shot('h03_foe');
  await goto(13, 12, 'down'); await shot('h04_chest');
  await goto(7, 1, 'right'); await shot('h05_corridor');
  console.log(JSON.stringify({ log, errs: errs.slice(0, 20) }, null, 1));
  await b.close(); srv.close();
})();
