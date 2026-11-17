// 第2階層 5F・6F（ランダム迷宮）に足した見せ場の素材（v8の結晶の塊・祭壇・柱・遺跡・氷岸・花）を撮る確認用。
// 使い方: THREE_DIR=... PLAYWRIGHT=... node tools/claude-review/b2-random-props-shots.cjs <出力フォルダ>
// ・tools/b2-3d/game-test-b2.js と同じ配信・three 差し替え・セーブ無効化。ゲーム本体は変えない。
// ・themeInfo().layout の位置へ立って撮る。さらに、同じ迷宮の作り直しで配置が同じか、
//   探索回数を変えて作り直してもメモリ（形・テクスチャ数）が増え続けないかを記録する。
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright-core');
const ROOT = path.resolve(__dirname, '../..'), THREE_DIR = process.env.THREE_DIR || '/tmp/three', PORT = Number(process.env.PORT || 8775);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const missing = [];
const srv = http.createServer((q, s) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { if (!/favicon/.test(q.url)) missing.push(q.url); s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); s.end(d); }); }).listen(PORT);
(async () => {
  const [out = '/tmp/b2props'] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/(.*)/, (r, req) => { const m = req.url().match(/three@0\.180\.0\/(.*)$/); r.fulfill({ path: path.join(THREE_DIR, m[1]), contentType: 'text/javascript' }); });
  const errs = [];
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('kotama.field3d.quality', 'high'); localStorage.setItem('kotama.field3d.maxFps', '2'); } catch (e) {} });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); if (/\[field-3d\]|\[B2\]/.test(m.text())) errs.push('log: ' + m.text()); });
  await p.goto(`http://localhost:${PORT}/index.html?f3d=b2`, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 120; i++) { if (await p.evaluate(() => typeof fieldEnterArea === 'function' && !!window.KotamaField3D).catch(() => false)) break; await p.waitForTimeout(500); }
  await p.evaluate(() => {
    try { tutorialFinish(); } catch (e) {} try { tutorialClose(); } catch (e) {}
    if (typeof tutorialState !== 'undefined') { tutorialState.phase = 'complete'; tutorialState.completed = true; tutorialState.started = false; }
    document.querySelectorAll('#tutorial-overlay').forEach((el) => (el.hidden = true)); document.body.classList.remove('tutorial-home-focus', 'tutorial-active');
    state.firstStageStarted = true; state.maxUnlockedStage = 5;
    fieldState.flags.prologue = true; fieldState.flags['labyrinth-tutorial'] = true;
    if (typeof eventRead !== 'undefined') for (const e of stageEvents || []) eventRead[e.id] = true;
    window.persistAutoSave = () => true;
    if (window.kotamaAdminEncounterSettings) window.kotamaAdminEncounterSettings.disableRandom = true;
  });
  const skip = async () => { await p.evaluate(() => { for (let i = 0; i < 40; i++) { if (fieldChoiceState) { fieldChoiceKey('z'); continue; } if (fieldDialogTyping) { fieldDialogTyping(); continue; } if (fieldDialogAdvance) { const r = fieldDialogAdvance; fieldDialogAdvance = null; r(); continue; } } document.querySelectorAll('#story-event').forEach((e) => { if (!e.hidden) e.querySelector('button')?.click(); }); }); await p.waitForTimeout(250); };
  const shot = async (name) => { await p.waitForTimeout(1600); await p.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 84, timeout: 120000 }); };
  const waitBuilt = async (label) => { for (let i = 0; i < 240; i++) { const ok = await p.evaluate(() => window.KotamaField3D.active() && window.KotamaField3D.themeInfo()?.buildKey === (fieldArea().buildKey || fieldArea().key)); if (ok) return true; await p.waitForTimeout(500); } errs.push(label + ' で 3D が組み上がらない'); return false; };
  const info = () => p.evaluate(() => window.KotamaField3D.themeInfo());
  const mem = () => p.evaluate(() => window.KotamaField3D.renderInfo().memory);
  // マス (tx,ty) の物を、壁の向き d の反対側の隣マスから d を向いて見る（隣が通れなければ、そのマスに立つ）
  const look = async (tx, ty, d) => {
    await p.evaluate(([tx, ty, d]) => {
      const a = fieldArea(), D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      const nx = tx - D[d][0], ny = ty - D[d][1], c = fieldTileAt(a, nx, ny);
      const ok = c && c !== '#' && !fieldCharSolid(a, c);
      const at = ok ? [nx, ny] : [tx, ty];
      const cc = fieldTileCenter(at[0], at[1]); fieldState.x = cc.x; fieldState.y = cc.y; fieldState.dir = d; fieldState.view = null; fieldUpdateVision(true);
    }, [tx, ty, d]);
    await p.waitForTimeout(900);
  };
  const openDir = (tx, ty) => p.evaluate(([tx, ty]) => { const a = fieldArea(), D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }; for (const d of Object.keys(D)) { const c = fieldTileAt(a, tx + D[d][0], ty + D[d][1]); if (c && c !== '#' && !fieldCharSolid(a, c)) return d; } return 'down'; }, [tx, ty]);
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const report = { floors: [], rebuild: {} };

  const stats = {};
  const shotS = async (name) => { await shot(name); stats[name] = await p.evaluate(() => window.KotamaField3D.stats && window.KotamaField3D.stats()); };
  await p.evaluate(() => { fieldEnterArea(2, { floor: 0, adminSkip: true }); });
  for (let i = 0; i < 8; i++) await skip();
  for (const f of [0, 1, 2]) {
    await p.evaluate((f) => { fieldState.floor = f; fieldState.positioned = false; fieldState.built = ''; fieldShow(); }, f);
    for (let i = 0; i < 4; i++) await skip();
    await waitBuilt(`floor ${f}`); await p.waitForTimeout(1200);
    const inf = await info(), L = inf.layout || {}, pre = `b2f${f + 1}_props`;
    // 足した物・柱の中心が、通れるマスの中央から 1.0m（0.25マス）以内に無いか
    const centerHits = await p.evaluate((placed) => { const a = fieldArea(), out = []; for (const q of placed || []) { const tx = Math.round(q.x), ty = Math.round(q.z), c = fieldTileAt(a, tx, ty); if (!c || c === '#' || fieldCharSolid(a, c)) continue; const d = Math.hypot(q.x - tx, q.z - ty) * 4; if (d < 1.0) out.push({ ...q, d: +d.toFixed(2) }); } return out; }, inf.placed);
    report.floors.push({ floor: f + 1, centerHits, placedCount: (inf.placed || []).length, buildKey: inf.buildKey, random: inf.random, layout: L, extras: inf.extras, falls: inf.falls, monuments: inf.monuments, crystalZones: inf.crystalZones, drawGroups: inf.drawGroups });
    // 花（4F も：光るキノコ・荊の位置の差し替え）
    for (const [i, s] of (L.flowerClusters || []).slice(0, 4).entries()) { const [cell, kind, d] = s.split(':'), [tx, ty] = cell.split(',').map(Number); await look(tx, ty, d); await shotS(`${pre}_flower_${i + 1}_${kind}`); }
    // [B2V4-F] 花の群生地：2マス手前から正面に見る（far）、1マス手前（near）
    const md = L.flora && L.flora.meadow;
    if (md) {
      const [mx, my] = md.center.split(',').map(Number), D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      const walk = (x, y) => p.evaluate(([x, y]) => { const a = fieldArea(), c = fieldTileAt(a, x, y); return !!c && c !== '#' && !fieldCharSolid(a, c); }, [x, y]);
      let dir = null; for (const d of ['up', 'down', 'left', 'right']) if (await walk(mx - D[d][0] * 2, my - D[d][1] * 2)) { dir = d; break; }
      if (dir) { await look(mx - D[dir][0], my - D[dir][1], dir); await shotS(`${pre}_flower_meadow_far`); }
      for (const d of dir ? [dir, OPP[dir]] : ['up']) { await look(mx, my, d); await shotS(`${pre}_flower_meadow_near_${d}`); }
    }
    if (f === 0) continue;
    for (const [i, z] of (inf.crystalZones || []).slice(0, 2).entries()) {
      const dir = z.bx > 0 ? 'right' : z.bx < 0 ? 'left' : z.bz > 0 ? 'down' : 'up';
      await look(z.tx, z.ty, dir); await shotS(`${pre}_crystals_${i + 1}_${z.pal}`);
    }
    for (const [i, fl] of (inf.falls || []).slice(0, 1).entries()) { const [tx, ty] = fl.cell.split(',').map(Number); await look(tx, ty, fl.wall); await shotS(`${pre}_waterfall_${i + 1}`); }
    if (L.altar) { const [tx, ty] = (L.altar.niche || L.altar.cell).split(',').map(Number); await look(tx, ty, L.altar.open); await shotS(`${pre}_altar`); }
    for (const [i, s] of (L.cells?.pillar || []).slice(0, 2).entries()) { const [cell, ws] = s.split(':'), [tx, ty] = cell.split(',').map(Number); await look(tx, ty, ws.split('+')[0]); await shotS(`${pre}_pillar_${i + 1}`); }
    for (const [i, s] of (L.cells?.ruin || []).slice(0, 2).entries()) { const [cell, d] = s.split(':'), [tx, ty] = cell.split(',').map(Number); await look(tx, ty, d); await shotS(`${pre}_ruin_${i + 1}`); }
    for (const [i, s] of (L.cells?.bank || []).slice(0, 2).entries()) { const [cell, d] = s.split(':'), [tx, ty] = cell.split(',').map(Number); await look(tx, ty, d); await shotS(`${pre}_bank_${i + 1}`); }
    for (const m of (inf.monuments || []).slice(0, 2)) {
      const cx = m.x + Math.floor(m.w / 2);
      for (const [ty, dir, tag] of [[m.y + m.h + 1, 'up', 's'], [m.y - 2, 'down', 'n']]) {
        const ok = await p.evaluate(([x, y]) => { const a = fieldArea(), c = fieldTileAt(a, x, y); return !!c && c !== '#' && !fieldCharSolid(a, c); }, [cx, ty]);
        if (ok) { await look(cx, ty, dir); await shotS(`${pre}_monument_${m.name}_${tag}`); break; }
      }
    }
  }
  report.stats = stats;
  // 同じ迷宮の作り直し → 同じ配置。探索回数を変えて作り直し → メモリが増え続けない
  {
    const L0 = JSON.stringify((await info()).layout), m0 = await mem();
    // 6F → 5F → 6F と移って、6F を同じ迷宮（同じ buildKey）で作り直す
    for (const f of [1, 2]) { await p.evaluate((f) => { fieldState.floor = f; fieldState.positioned = false; fieldState.built = ''; fieldShow(); }, f); for (let i = 0; i < 4; i++) await skip(); await waitBuilt('rebuild ' + f); await p.waitForTimeout(800); }
    const L1 = JSON.stringify((await info()).layout);
    report.rebuild.sameKeySameLayout = L0 === L1;
    const series = [m0];
    for (let k = 1; k <= 4; k++) {
      await p.evaluate((k) => { fieldState.expedition = (Number(fieldState.expedition) || 0) + 1; fieldState.positioned = false; fieldState.built = ''; fieldShow(); }, k);
      for (let i = 0; i < 4; i++) await skip();
      await waitBuilt('expedition +' + k); await p.waitForTimeout(1500);
      const inf = await info(); series.push({ ...(await mem()), buildKey: inf.buildKey, ownedDisposed: inf.ownedDisposed });
    }
    report.rebuild.memory = series;
  }
  report.errors = errs; report.missing = [...new Set(missing)];
  fs.writeFileSync(path.join(out, 'props-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ errors: errs, missing: report.missing, rebuild: report.rebuild, stats, floors: report.floors.map((f) => ({ floor: f.floor, centerHits: f.centerHits, placedCount: f.placedCount, layout: f.layout, extras: f.extras, monuments: f.monuments })) }, null, 1));
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
