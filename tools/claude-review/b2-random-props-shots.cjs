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
    // [B2V4-S] 見せ場（階段・背景モニュメント・水門・橋・柱群）。themeInfo().setpieces の位置から撮る
    const SPI = inf.setpieces || {};
    report.floors[report.floors.length - 1].setpieces = SPI;
    const D4 = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const stand = async (tx, ty, d) => { await p.evaluate(([tx, ty, d]) => { const cc = fieldTileCenter(tx, ty); fieldState.x = cc.x; fieldState.y = cc.y; fieldState.dir = d; fieldState.view = null; fieldUpdateVision(true); }, [tx, ty, d]); await p.waitForTimeout(900); };
    const walkable = (tx, ty) => p.evaluate(([x, y]) => { const a = fieldArea(), c = fieldTileAt(a, x, y); return !!c && c !== '#' && !fieldCharSolid(a, c); }, [tx, ty]);
    for (const st of (SPI.stairs || [])) {
      const tag = `${pre}_obj_stairs_${st.dir}_${st.tx}_${st.ty}`;
      await stand(st.tx, st.ty, st.face); await shotS(`${tag}_arrive_front`);     // 着いた直後の正面（出口の向き）
      await stand(st.tx, st.ty, st.back); await shotS(`${tag}_turn_back`);        // 振り返った向き（階段の奥）
      const nx = st.tx + D4[st.face][0], ny = st.ty + D4[st.face][1];
      if (await walkable(nx, ny)) { await stand(nx, ny, st.back); await shotS(`${tag}_approach`); }   // 隣のマスから階段を見る
    }
    for (const [i, bd] of (SPI.backdrops || []).entries()) {
      const [vx, vy] = bd.view; await stand(vx, vy, bd.d); await shotS(`${pre}_monument_backdrop_${bd.name}_view`);
      await stand(bd.tx, bd.ty, bd.d); await shotS(`${pre}_monument_backdrop_${bd.name}_window`);
      const lat = bd.d === 'up' || bd.d === 'down' ? 'right' : 'down';
      const sx = bd.tx + D4[lat][0] * 2 - D4[bd.d][0], sy = bd.ty + D4[lat][1] * 2 - D4[bd.d][1];
      if (await walkable(sx, sy)) { await stand(sx, sy, bd.d); await shotS(`${pre}_monument_backdrop_${bd.name}_oblique`); }
    }
    // 水門：迷宮班 M の展示区画なら、見る床 V（水際）・1マス手前・2マス手前から正面を撮る。壁の塊の水門なら、正面の列から下を向いて撮る
    if (SPI.watergate) {
      const wg = SPI.watergate;
      if (wg.maze) {
        const [vx, vy] = wg.view, f = wg.facing, [fx, fy] = D4[f];
        await stand(vx, vy, f); await shotS(`${pre}_monument_watergate_edge`);
        if (await walkable(vx - fx, vy - fy)) { await stand(vx - fx, vy - fy, f); await shotS(`${pre}_monument_watergate_front`);
          if (await walkable(vx - fx * 2, vy - fy * 2)) { await stand(vx - fx * 2, vy - fy * 2, f); await shotS(`${pre}_monument_watergate_far`); } }
      } else {
        const cx = wg.x + 1, cy = wg.y - 1;
        await stand(cx, cy, 'down'); await shotS(`${pre}_monument_watergate_edge`);
        if (await walkable(cx, cy - 1)) { await stand(cx, cy - 1, 'down'); await shotS(`${pre}_monument_watergate_front`);
          if (await walkable(cx, cy - 2)) { await stand(cx, cy - 2, 'down'); await shotS(`${pre}_monument_watergate_far`); } }
        if (await walkable(wg.x + 2, cy - 1)) { await stand(wg.x + 2, cy - 1, 'down'); await shotS(`${pre}_monument_watergate_right`); }
      }
    }
    // 橋：渡る手前（岸の1〜2マス手前）から正面、橋の上から先、水辺から横
    for (const [i, br] of (SPI.bridges || (SPI.bridge ? [SPI.bridge] : [])).entries()) {
      const along = br.ry === 0, fwd = along ? 'right' : 'down', bwd = OPP[fwd], [fx, fy] = D4[fwd];
      const cells = br.cells || [[br.tx - (along ? 1 : 0), br.ty - (along ? 0 : 1)], [br.tx, br.ty], [br.tx + (along ? 1 : 0), br.ty + (along ? 0 : 1)]];
      const first = cells[0], last = cells[cells.length - 1], tag = `${pre}_bridge${i ? i + 1 : ''}`;
      // 手前から正面（first の手前の岸。2マス手前が通れればそこから）
      for (const [x0, y0, d, nm] of [[first[0] - fx, first[1] - fy, fwd, 'approach'], [last[0] + fx, last[1] + fy, bwd, 'approach_back']]) {
        const [dx, dy] = D4[d];
        if (await walkable(x0 - dx, y0 - dy)) { await stand(x0 - dx, y0 - dy, d); await shotS(`${tag}_${nm}`); }
        else if (await walkable(x0, y0)) { await stand(x0, y0, d); await shotS(`${tag}_${nm}`); }
      }
      await stand(first[0], first[1], fwd); await shotS(`${tag}_on_deck`);
      // 横：橋と直角の向きに、水路の向こうの通れるマスから橋を見る（最大4マス先まで探す）
      const lats = along ? ['up', 'down'] : ['left', 'right'], mid = cells[Math.floor((cells.length - 1) / 2)];
      let sideDone = false;
      for (const off of [0, -1, 1]) for (const ld of lats) for (let k = 2; k <= 5 && !sideDone; k++) {
        const bx = mid[0] + (along ? off : 0), by = mid[1] + (along ? 0 : off), sx = bx + D4[ld][0] * k, sy = by + D4[ld][1] * k;
        if (await walkable(sx, sy)) { await stand(sx, sy, OPP[ld]); await shotS(`${tag}_side`); sideDone = true; }
      }
      // 岸から斜め（橋のたもとの横の岸から、橋の方へ）
      for (const ld of lats) { const sx = first[0] - fx + D4[ld][0], sy = first[1] - fy + D4[ld][1]; if (await walkable(sx, sy) && await walkable(sx - fx, sy - fy)) { await stand(sx - fx, sy - fy, fwd); await shotS(`${tag}_bank_oblique`); break; } }
    }
    // 柱のまとまり：群れの中心がまっすぐ前（横のずれ 0.6マス以内）、1.5〜3.2マス先に来るマスから撮る
    for (const [i, cl] of (SPI.clusters || []).slice(0, 3).entries()) {
      const pick = await p.evaluate(([cx, cz]) => {
        const a = fieldArea(), D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, open = (x, y) => { const c = fieldTileAt(a, x, y); return !!c && c !== '#' && !fieldCharSolid(a, c); };
        let best = null;
        for (let ty = Math.floor(cz) - 4; ty <= Math.ceil(cz) + 4; ty++) for (let tx = Math.floor(cx) - 4; tx <= Math.ceil(cx) + 4; tx++) for (const d of Object.keys(D)) {
          if (!open(tx, ty)) continue;
          const [dx, dy] = D[d], ahead = (cx - tx) * dx + (cz - ty) * dy + 0.275, lat = Math.abs((cx - tx) * dy - (cz - ty) * dx);
          if (ahead < 1.4 || ahead > 3.6 || lat > 0.7) continue;
          // 見通し：カメラ（マスの中心から 0.275マス後ろ）→ 群れの中心と、その左右 0.35マスの3本の線が、壁のマスを通らないこと
          const ex = tx - dx * 0.275, ez = ty - dy * 0.275; let blocked = 0;
          for (const o of [-0.35, 0, 0.35]) { const gx = cx + dy * o, gz = cz - dx * o; for (let t = 0.1; t < 0.92; t += 0.06) { const x = ex + (gx - ex) * t, z = ez + (gz - ez) * t; if (!open(Math.round(x), Math.round(z))) { blocked++; break; } } }
          if (blocked > 1) continue;
          const sc = blocked * 2 + Math.abs(ahead - 2.2) + lat * 1.2;
          if (!best || sc < best.sc) best = { tx, ty, d, sc };
        }
        return best;
      }, [cl.x, cl.z]);
      if (pick) { await stand(pick.tx, pick.ty, pick.d); await shotS(`${pre}_pillar_cluster_${i + 1}_${cl.mode}`); }
      else {
        const tx = Math.round(cl.x), ty = Math.round(cl.z);
        let done = false;
        for (const d of ['down', 'up', 'right', 'left']) { const nx = tx - D4[d][0] * 1, ny = ty - D4[d][1] * 1; if (!done && await walkable(nx, ny) && await walkable(nx - D4[d][0], ny - D4[d][1])) { await stand(nx - D4[d][0], ny - D4[d][1], d); await shotS(`${pre}_pillar_cluster_${i + 1}_${cl.mode}`); done = true; } }
      }
    }
    if (process.env.SP_ONLY) continue;
    // 花（4F も：光るキノコ・荊の位置の差し替え）
    // [B2V4-F] 花の群れ：群れのマスの手前（壁・水と反対側）から、そこが通れなければ壁に沿った隣のマスから見る
    const walkC = (x, y) => p.evaluate(([x, y]) => { const a = fieldArea(), c = fieldTileAt(a, x, y); return !!c && c !== '#' && !fieldCharSolid(a, c); }, [x, y]);
    const DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, PERP = { up: ['left', 'right'], down: ['left', 'right'], left: ['up', 'down'], right: ['up', 'down'] };
    for (const [i, s] of (L.flowerClusters || []).slice(0, 4).entries()) {
      const [cell, kind, d] = s.split(':'), [tx, ty] = cell.split(',').map(Number);
      let dir = d; for (const c of [d, OPP[PERP[d][0]], OPP[PERP[d][1]]]) if (await walkC(tx - DV[c][0], ty - DV[c][1])) { dir = c; break; }
      await look(tx, ty, dir); await shotS(`${pre}_flower_${i + 1}_${kind}`);
    }
    // [B2V4-F] 花の群生地：2マス手前から正面に見る（far）、1マス手前（near）
    const md = L.flora && L.flora.meadow;
    if (md) {
      const [mx, my] = md.center.split(',').map(Number), D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      let dir = null; for (const d of ['up', 'down', 'left', 'right']) if (await walkC(mx - D[d][0] * 2, my - D[d][1] * 2)) { dir = d; break; }
      if (dir) { await look(mx - D[dir][0], my - D[dir][1], dir); await shotS(`${pre}_flower_meadow_far`); }
      for (const d of dir ? [dir, OPP[dir]] : ['up']) { await look(mx, my, d); await shotS(`${pre}_flower_meadow_near_${d}`); }
    }
    // [B2V4-L] 光班の確認：導きの灯を通路の3マス先から、天井の水流、両側が壁の通路の奥（石筍・鍾乳石の根元）
    {
      const extra = await p.evaluate(() => {
        const a = fieldArea(), D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
        const open = (x, y) => { const c = fieldTileAt(a, x, y); return !!c && c !== '#' && !fieldCharSolid(a, c); };
        const wall = (x, y) => !open(x, y);
        const out = { save: [], corr: [] };
        for (const o of a.objects.filter((q) => q.kind === 'save')) {
          let best = null;
          for (const d of Object.keys(D)) { let n = 0; while (n < 4 && open(o.tx + D[d][0] * (n + 1), o.ty + D[d][1] * (n + 1))) n++; if (n >= 2 && (!best || n > best.n)) best = { n, d }; }
          if (best) out.save.push([o.tx + D[best.d][0] * best.n, o.ty + D[best.d][1] * best.n, OPP[best.d]]);
        }
        // 通路：自分と前の3マスが、左右とも壁（向かい合う壁の通路）
        for (let ty = 1; ty < a.h - 1 && out.corr.length < 6; ty++) for (let tx = 1; tx < a.w - 1 && out.corr.length < 6; tx++) for (const d of ['right', 'down']) {
          const [vx, vy] = D[d], sx = vy ? 1 : 0, sy = vx ? 1 : 0; let ok = true;
          for (let k = 0; k <= 3 && ok; k++) { const x = tx + vx * k, y = ty + vy * k; if (!open(x, y) || !wall(x + sx, y + sy) || !wall(x - sx, y - sy)) ok = false; }
          if (ok && !out.corr.some((q) => Math.abs(q[0] - tx) + Math.abs(q[1] - ty) < 8)) out.corr.push([tx, ty, d]);
        }
        return out;
      });
      const at = async (tx, ty, d) => { await p.evaluate(([tx, ty, d]) => { const cc = fieldTileCenter(tx, ty); fieldState.x = cc.x; fieldState.y = cc.y; fieldState.dir = d; fieldState.view = null; fieldUpdateVision(true); }, [tx, ty, d]); await p.waitForTimeout(900); };
      for (const [i, s] of extra.save.slice(0, 1).entries()) { await at(...s); await shotS(`${pre}_L_save_far_${i + 1}`); }
      for (const [i, s] of extra.corr.slice(0, 3).entries()) { await at(...s); await shotS(`${pre}_L_corridor_${i + 1}`); }
      for (const [i, s] of (inf.streams || []).slice(0, 2).entries()) { const [tx, ty] = s.split(',').map(Number), d = await openDir(tx, ty); await look(tx, ty, OPP[d]); await shotS(`${pre}_L_stream_${i + 1}`); }
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
  if (process.env.SP_ONLY) { report.errors = errs; report.missing = [...new Set(missing)]; fs.writeFileSync(path.join(out, 'props-report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify({ errors: errs, missing: report.missing, setpieces: report.floors.map((f) => f.setpieces) }, null, 1)); await b.close(); srv.close(); return; }
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
  // [B2V4-W] 危険な水面（water-hazard）の試し撮り。迷宮班 M の役割が入るまでの確認用に、撮影の中だけで
  // 内側の壁の塊（外周から2マス以上）を '~'＋役割 water-hazard に置き換える（もともと通れないマスなので通行は変わらない）。
  // 水面タイル（ビットマスク）・岸・飛び石の廃止・床の模様を、5F・6F で撮る。ゲーム本体のマップ生成は変えない。
  report.hazard = [];
  for (const f of [1, 2]) {
    await p.evaluate((f) => { fieldState.floor = f; fieldState.positioned = false; fieldState.built = ''; fieldShow(); }, f);
    for (let i = 0; i < 4; i++) await skip();
    await waitBuilt('hazard base ' + f);
    const plan = await p.evaluate(() => {
      const a = fieldArea(), W = a.w, H = a.h, at = (x, y) => fieldTileAt(a, x, y), open = (x, y) => { const c = at(x, y); return c !== '#' && c !== '~' && !fieldCharSolid(a, c); };
      const used = new Set(), blocks = [];
      for (const [w, h] of [[3, 3], [4, 2], [2, 4], [3, 2], [2, 3], [2, 2]]) {
        for (let y = 2; y + h <= H - 2; y++) for (let x = 2; x + w <= W - 2; x++) {
          let ok = true; for (let j = 0; j < h && ok; j++) for (let i = 0; i < w; i++) if (at(x + i, y + j) !== '#' || used.has(`${x + i},${y + j}`) || a.objects.some((o) => o.tx === x + i && o.ty === y + j)) { ok = false; break; }
          if (!ok) continue;
          let ring = 0; const stand = [];
          for (let i = 0; i < w; i++) for (const [yy, d] of [[y - 1, 'down'], [y + h, 'up']]) if (open(x + i, yy)) { ring++; stand.push([x + i, yy, d]); }
          for (let j = 0; j < h; j++) for (const [xx, d] of [[x - 1, 'right'], [x + w, 'left']]) if (open(xx, y + j)) { ring++; stand.push([xx, y + j, d]); }
          if (ring < 3) continue;
          blocks.push({ x, y, w, h, ring, stand }); for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) used.add(`${x + i},${y + j}`);
          if (blocks.length >= 2) break;
        }
        if (blocks.length >= 2) break;
      }
      for (const bl of blocks) for (let j = 0; j < bl.h; j++) for (let i = 0; i < bl.w; i++) { a.grid[bl.y + j][bl.x + i] = '~'; if (a.tileRoles) a.tileRoles[bl.y + j][bl.x + i] = 'water-hazard'; }
      a.buildKey = (a.buildKey || a.key) + '|hz';
      return blocks;
    });
    await waitBuilt('hazard ' + f); await p.waitForTimeout(1500);
    const wti = await p.evaluate(() => window.KotamaB2WaterTiles && window.KotamaB2WaterTiles.info());
    report.hazard.push({ floor: f + 1, blocks: plan.map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h })), tiles: wti, stats: await p.evaluate(() => window.KotamaField3D.stats()) });
    for (const [i, bl] of plan.entries()) {
      // 塊の長い辺の中央の前に立って見る＋斜めから
      const s = bl.stand[Math.floor(bl.stand.length / 2)];
      await p.evaluate(([tx, ty, d]) => { const c = fieldTileCenter(tx, ty); fieldState.x = c.x; fieldState.y = c.y; fieldState.dir = d; fieldState.view = null; fieldUpdateVision(true); }, s);
      await p.waitForTimeout(900); await shotS(`b2f${f + 1}_hazard_open_water_${i + 1}`);
      const s2 = bl.stand[0];
      await p.evaluate(([tx, ty, d]) => { const c = fieldTileCenter(tx, ty); fieldState.x = c.x; fieldState.y = c.y; fieldState.dir = d; fieldState.view = null; fieldUpdateVision(true); }, s2);
      await p.waitForTimeout(900); await shotS(`b2f${f + 1}_hazard_open_water_${i + 1}b`);
    }
  }
  report.errors = errs; report.missing = [...new Set(missing)];
  fs.writeFileSync(path.join(out, 'props-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ errors: errs, missing: report.missing, rebuild: report.rebuild, hazard: report.hazard, stats, floors: report.floors.map((f) => ({ floor: f.floor, centerHits: f.centerHits, placedCount: f.placedCount, layout: f.layout, extras: f.extras, monuments: f.monuments })) }, null, 1));
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
