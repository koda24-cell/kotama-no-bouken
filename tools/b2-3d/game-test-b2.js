// 第2階層「凍てつく水源」の一人称3D表示（試験表示）の確認。
// 使い方: THREE_DIR=/tmp/three node tools/b2-3d/game-test-b2.js <出力フォルダ> [幅] [高さ]
// ・tools/b1-3d/game-test.js と同じく、リポジトリを http で配信し、CDN の three.js をローカルの r180 に差し替える。
// ・URL に ?f3d=b2 を付けて第2階層の試験表示を有効にし、3フロアの見どころを撮る。
// ・persistAutoSave は無効（ローカルのセーブを汚さない）。localStorage の試験表示の設定は書かない。
// ・最後に、試験表示を付けずに第2階層へ入ると2D表示のままであること（通常の進行に影響しない）を確かめる。
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright-core');
const ROOT = path.resolve(__dirname, '../..'), THREE_DIR = process.env.THREE_DIR || '/tmp/three', PORT = Number(process.env.PORT || 8774);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const missing = [];
const srv = http.createServer((q, s) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { if (!/favicon/.test(q.url)) missing.push(q.url); s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); s.end(d); }); }).listen(PORT);
(async () => {
  const [out = '/tmp/b2shots', w = 1280, h = 800] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: +w, height: +h } });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/(.*)/, (r, req) => { const m = req.url().match(/three@0\.180\.0\/(.*)$/); r.fulfill({ path: path.join(THREE_DIR, m[1]), contentType: 'text/javascript' }); });
  const errs = [];
  const open = async (query) => {
    const p = await ctx.newPage();
    await p.addInitScript((q) => { try { localStorage.clear(); localStorage.setItem('kotama.field3d.quality', q); localStorage.setItem('kotama.field3d.maxFps', '2'); } catch (e) {} }, process.env.Q || 'high');
    p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); if (/\[field-3d\]/.test(m.text())) errs.push('log: ' + m.text()); });
    await p.goto(`http://localhost:${PORT}/index.html${query}`, { waitUntil: 'domcontentloaded' });
    for (let i = 0; i < 120; i++) { if (await p.evaluate(() => typeof fieldEnterArea === 'function' && !!window.KotamaField3D).catch(() => false)) break; await p.waitForTimeout(500); }
    await p.evaluate(() => {
      try { tutorialFinish(); } catch (e) {} try { tutorialClose(); } catch (e) {}
      if (typeof tutorialState !== 'undefined') { tutorialState.phase = 'complete'; tutorialState.completed = true; tutorialState.started = false; }
      document.querySelectorAll('#tutorial-overlay').forEach((el) => (el.hidden = true)); document.body.classList.remove('tutorial-home-focus', 'tutorial-active');
      state.firstStageStarted = true; state.maxUnlockedStage = 5;
      fieldState.flags.prologue = true; fieldState.flags['labyrinth-tutorial'] = true;
      if (typeof eventRead !== 'undefined') for (const e of stageEvents || []) eventRead[e.id] = true;
      window.persistAutoSave = () => true;
      if (window.kotamaAdminEncounterSettings) window.kotamaAdminEncounterSettings.disableRandom = true;   // 撮影中の遭遇を止める
    });
    return p;
  };
  const p = await open('?f3d=b2');
  const skip = async () => { await p.evaluate(() => { for (let i = 0; i < 40; i++) { if (fieldChoiceState) { fieldChoiceKey('z'); continue; } if (fieldDialogTyping) { fieldDialogTyping(); continue; } if (fieldDialogAdvance) { const r = fieldDialogAdvance; fieldDialogAdvance = null; r(); continue; } } document.querySelectorAll('#story-event').forEach((e) => { if (!e.hidden) e.querySelector('button')?.click(); }); }); await p.waitForTimeout(250); };
  const settle = async () => { for (let i = 0; i < 25; i++) { const busy = await p.evaluate(() => fieldState.lock || !!fieldDialogAdvance || !!fieldChoiceState || !!fieldDialogTyping); if (!busy) return; await skip(); await p.waitForTimeout(400); } };
  const shot = async (name) => { await p.waitForTimeout(1600); await p.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 84, timeout: 120000 }); };
  const st = () => p.evaluate(() => ({ tile: fieldPlayerTile(), dir: fieldState.dir, active: window.KotamaField3D.active(), near: fieldState.nearKey, floor: fieldState.floor, area: fieldState.area }));
  const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.down(k); await p.waitForTimeout(60); await p.keyboard.up(k); await p.waitForTimeout(700); await skip(); } };
  const waitActive = async (label) => { for (let i = 0; i < 240; i++) { if (await p.evaluate(() => window.KotamaField3D.active())) return true; await p.waitForTimeout(500); } errs.push(label + ' で 3D が有効にならない'); return false; };
  const log = []; const note = async (label) => { const s = await st(); log.push({ label, ...s }); console.error('[step]', label, JSON.stringify(s)); };
  const goto = async (tx, ty, dir) => { await p.evaluate(([tx, ty, dir]) => { const c = fieldTileCenter(tx, ty); fieldState.x = c.x; fieldState.y = c.y; fieldState.dir = dir; fieldState.view = null; fieldUpdateVision(true); }, [tx, ty, dir]); await p.waitForTimeout(900); };
  // 物の隣の通れるマスに立って、その物を向く
  const face = async (tx, ty) => {
    const r = await p.evaluate(([tx, ty]) => {
      const a = fieldArea(), D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, opp = { up: 'down', down: 'up', left: 'right', right: 'left' };
      for (const d of ['down', 'up', 'right', 'left']) { const nx = tx + D[d][0], ny = ty + D[d][1]; const c = fieldTileAt(a, nx, ny); if (c && c !== '#' && !fieldCharSolid(a, c)) return [nx, ny, opp[d]]; }
      return null;
    }, [tx, ty]);
    if (r) await goto(...r);
    return r;
  };
  const toFloor = async (f) => { await p.evaluate((f) => { fieldState.floor = f; fieldState.positioned = false; fieldState.built = ''; fieldShow(); }, f); for (let i = 0; i < 4; i++) await skip(); await waitActive(`2-${f + 1}F`); await p.waitForTimeout(1200); };
  const info = () => p.evaluate(() => window.KotamaField3D.themeInfo());
  const objs = () => p.evaluate(() => fieldArea().objects.map((o) => ({ kind: o.kind, id: o.id, tx: o.tx, ty: o.ty, onWall: !!o.onWall, dir: o.dir })));
  const visitFalls = async (prefix) => {
    const inf = await info();
    for (const [i, f] of (inf.falls || []).slice(0, 2).entries()) { const [tx, ty] = f.cell.split(',').map(Number); await goto(tx, ty, f.wall); await shot(`${prefix}_waterfall_${i + 1}`); }
    if (inf.bridge) { const bd = inf.bridge.ry === 0 ? 'right' : 'down'; const [dx, dy] = bd === 'right' ? [-1, 0] : [0, -1]; await goto(inf.bridge.tx + dx, inf.bridge.ty + dy, bd); await shot(`${prefix}_bridge`); }
    return inf;
  };
  const report = { floors: [] };

  // ---- 1F
  await p.evaluate(() => { fieldEnterArea(2, { floor: 0, adminSkip: true }); });
  for (let i = 0; i < 8; i++) await skip();
  await waitActive('2-1F'); await p.waitForTimeout(1500);
  await note('enter'); await shot('b2f1_01_enter');
  await key('ArrowUp', 2); await note('fwd2'); await shot('b2f1_02_forward');
  await key('ArrowRight', 1); await note('turnR'); await key('ArrowLeft', 1);
  await key('ArrowLeft', 1); await key('ArrowUp', 1); await note('bump-or-step');
  let O = await objs();
  for (const o of O.filter((o) => ['chest', 'gather', 'stairs', 'event'].includes(o.kind)).slice(0, 4)) { if (await face(o.tx, o.ty)) { await note(`at-${o.kind}-${o.id || ''}`); await shot(`b2f1_obj_${o.kind}_${o.tx}_${o.ty}`); } }
  await goto(12, 9, 'right'); await shot('b2f1_shallows');
  await p.evaluate(() => { const f = (fieldState.foes || [])[0]; if (f) { const tx = Math.floor(f.x / FIELD_TILE), ty = Math.floor(f.y / FIELD_TILE); window.__foe = [tx, ty]; } });
  const foe = await p.evaluate(() => window.__foe); if (foe) { await face(foe[0], foe[1] + 2).catch(() => {}); await shot('b2f1_foe_area'); }
  report.floors.push({ floor: 1, ...(await visitFalls('b2f1')) });

  // ---- 2F（仕掛け：合図石・壁の立て札・門・宝箱、導きの灯）
  await toFloor(1); await note('floor2'); await shot('b2f2_01_enter');
  O = await objs();
  for (const o of O.filter((o) => ['switch', 'sign', 'door', 'cache', 'save'].includes(o.kind))) { if (await face(o.tx, o.ty)) { await note(`at-${o.kind}-${o.id || ''}`); await shot(`b2f2_obj_${o.kind}_${o.id || o.tx + '_' + o.ty}`); } }
  // 合図石を両方鳴らして門が開くか
  for (const o of O.filter((o) => o.kind === 'switch')) { await face(o.tx, o.ty); await key('Enter', 1); await settle(); }
  const door = O.find((o) => o.kind === 'door'); if (door) { await face(door.tx, door.ty); await note('door-after-switches'); await shot('b2f2_door_after_switches'); }
  report.floors.push({ floor: 2, ...(await visitFalls('b2f2')) });

  // ---- 3F（開けた水辺・NPC・看板・ボス門）
  await toFloor(2); await note('floor3'); await shot('b2f3_01_enter');
  O = await objs();
  for (const o of O.filter((o) => ['npc', 'sign', 'gate', 'save'].includes(o.kind))) { if (await face(o.tx, o.ty)) { await note(`at-${o.kind}-${o.id || ''}`); await shot(`b2f3_obj_${o.kind}_${o.id || o.tx + '_' + o.ty}`); } }
  await goto(9, 11, 'up'); await shot('b2f3_open_water');
  report.floors.push({ floor: 3, ...(await visitFalls('b2f3')) });
  // 描画の数
  report.render = await p.evaluate(() => { const r = document.querySelector('.field-3d-canvas'); return { canvas: !!r }; });

  // ---- 第1階層へ戻ると第1階層の空気に戻る（同じページで）
  await p.evaluate(() => { fieldState.flags['floor:1-0'] = true; fieldEnterArea(1, { floor: 0, adminSkip: true }); }); for (let i = 0; i < 6; i++) await skip();
  await waitActive('1F（第2階層のあと）'); await p.waitForTimeout(1500); await note('back-to-b1'); await shot('b1_after_b2');

  // ---- 試験表示なしでは第2階層は2D表示のまま
  const p2 = await open('');
  await p2.evaluate(() => { fieldEnterArea(2, { floor: 0, adminSkip: true }); });
  await p2.waitForTimeout(5000);
  report.noPreview = await p2.evaluate(() => ({ area: fieldState.area, active3d: window.KotamaField3D.active(), is3dClass: document.getElementById('field').classList.contains('is-3d'), preview: window.KotamaField3D.previewOn(2), ls: localStorage.getItem('kotama.field3d.preview') }));
  await p2.screenshot({ path: path.join(out, 'b2_no_preview_2d.jpg'), type: 'jpeg', quality: 80 });

  report.errors = errs; report.missing = [...new Set(missing)]; report.log = log;
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ errors: errs, missing: report.missing, noPreview: report.noPreview, floors: report.floors.map((f) => ({ floor: f.floor, meshCount: f.meshCount, omitted: f.omitted, drawGroups: f.drawGroups, ripples: f.ripples, mists: f.mists, falls: f.falls, bridge: f.bridge })) }, null, 1));
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
