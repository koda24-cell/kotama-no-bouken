// 迷宮画面の状態別の撮影と配置の計測（UI Phase 2・Claude A）。使い方: node tools/ui-shots/field-states.js [repoDir] [outDir] [幅] [高さ]
// 撮影：field（通常）・field-legend（？の凡例）・field-map（全体地図・全マス踏破にした表示）・field-foe（FOEが視界内で追跡中）・field-chest（正面に宝箱）
// 計測：要素の位置、枠で切れていない横はみ出しの数、DEVと操作の重なり、十字キー・Aが画面内か。表示確認用に状態を書き換えるがセーブはしない。
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
(async () => {
  const [repo, outDir, w = 390, h = 844] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--allow-file-access-from-files"] });
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: +w < 600, hasTouch: +w < 600 });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error" && !/ERR_TUNNEL/.test(m.text())) errs.push(m.text()); if (/^lock=/.test(m.text())) errs.push(m.text()); });
  await page.goto("file://" + path.resolve(repo, "index.html"));
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    try { localStorage.clear(); } catch (e) {}
    try { tutorialFinish(); } catch (e) {} try { tutorialClose(); } catch (e) {} tutorialState.phase = "complete"; tutorialState.completed = true; tutorialState.started = false; try { syncTutorialActive(); } catch (e) {}
    document.querySelectorAll("#tutorial-overlay").forEach(el => el.hidden = true);
    state.firstStageStarted = true; state.maxUnlockedStage = 5; state.gold = 1234;
    for (let i = 1; i <= 3; i++) { stageCleared[i] = true; stageEntered[i] = true; }
    fieldState.flags.prologue = true; for (let n = 1; n <= 3; n++) for (let f = 0; f < 3; f++) fieldState.flags[`floor:${n}-${f}`] = true;
    window.persistAutoSave = () => true; renderAll();
    fieldEnterArea(1, { floor: 0, fromHome: true });
    window.__tp = (tx, ty, dir) => { const c = fieldTileCenter(tx, ty); fieldState.x = c.x; fieldState.y = c.y; fieldState.view = null; fieldState.dir = dir; fieldUpdateVision(true); fieldMiniDirty = true; fieldState.nearKey = "?"; };
  });
  const closeDlg = () => page.evaluate(() => { for (let i = 0; i < 20; i++) { if (fieldDialogAdvance) { const r = fieldDialogAdvance; fieldDialogAdvance = null; r(); } } document.querySelectorAll("#story-event").forEach(el => el.hidden = true); });
  await page.waitForTimeout(900); await closeDlg(); await page.waitForTimeout(2500); await closeDlg(); await page.evaluate(() => { const o = document.getElementById("tutorial-overlay"); if (o) o.hidden = true; document.body.classList.remove("tutorial-home-focus", "tutorial-active"); fieldState.lock = false; });
  const shots = [
    ["field", () => {}],
    ["field-legend", () => document.getElementById("field-legend-button")?.click()],
    ["field-map", () => { document.getElementById("field-legend-button")?.click(); const a = fieldArea(); fieldExplored(a).fill(1); document.querySelectorAll("#field-map .is-unexplored").forEach(e => e.classList.remove("is-unexplored")); fieldToggleFullMap(true); }],
    ["field-foe", () => { fieldToggleFullMap(false); const a = fieldArea(); const f = fieldState.foes[0];
      for (const [dx, dy] of [[0,3],[0,-3],[3,0],[-3,0],[0,2],[2,0],[-2,0],[0,-2],[1,2],[2,1]]) { const tx = f.tx + dx, ty = f.ty + dy; if (fieldCanEnter(a, tx, ty) && fieldLos(a, tx, ty, f.tx, f.ty)) { __tp(tx, ty, dy > 0 ? "up" : dy < 0 ? "down" : dx > 0 ? "left" : "right"); break; } }
      f.mode = "chase"; }],
    ["field-chest", () => { const a = fieldArea(); const o = a.objects.find(o => o.kind === "chest") || a.objects.find(o => !o.walk);
      for (const [d, v] of Object.entries(FIELD_DIRS)) { const tx = o.tx - v.dx, ty = o.ty - v.dy; if (fieldCanEnter(a, tx, ty)) { __tp(tx, ty, d); break; } } }],
  ];
  const report = {};
  for (const [name, fn] of shots) {
    await page.evaluate(`(${fn.toString()})()`); await page.waitForTimeout(700); await closeDlg(); await page.waitForTimeout(300);
    report[name] = await page.evaluate(() => {
      const R = s => { const el = typeof s === "string" ? document.querySelector(s) : s; if (!el || el.closest("[hidden]") || getComputedStyle(el).display === "none") return null; const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
      const ov = (a, b) => a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
      const W = innerWidth; let vis = 0; const visList = [];
      for (const el of document.querySelectorAll("body *")) { const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || el.closest("[hidden]")) continue; const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue; if (r.right > W + 1 || r.left < -1) { let p = el.parentElement, clipped = false; while (p) { if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX) && p.getBoundingClientRect().right <= W + 1) { clipped = true; break; } p = p.parentElement; } if (!clipped) { vis++; visList.push(el.tagName + "#" + el.id + "." + el.className); } } }
      const m = { topbar: R(".topbar"), hud: R("#field .field-hud"), viewport: R("#field-viewport"), rail: R("#field-map-rail"), minibox: R(".field-minimap-box"), minimap: R("#field-minimap"), status: R("#field-minimap-status"), legend: R("#field-minimap-legend"), near: R("#field-near"), pad: R("#field-pad"), dpad: R(".field-dpad"), action: R("#field-action"), dev: R("#kotama-admin-launcher"), fullmap: R("#field-fullmap"), fullcanvas: R("#field-fullmap-canvas") };
      return { scrollH: document.documentElement.scrollHeight, innerH: innerHeight, scrollW: document.documentElement.scrollWidth, visibleOverflow: vis, visList: visList.slice(0, 5), rects: m,
        nearText: document.getElementById("field-near")?.textContent, foeAlert: document.getElementById("field-foe-alert")?.hidden ? "" : document.getElementById("field-foe-alert")?.textContent, statusText: document.getElementById("field-minimap-status")?.textContent,
        checks: { devVsPad: ov(m.dev, m.dpad) || ov(m.dev, m.action), dpadInView: m.dpad && m.dpad[3] <= innerHeight && m.dpad[0] >= 0, actionInView: m.action && m.action[3] <= innerHeight && m.action[2] <= W, minimapInsideViewport: !m.minimap || !m.viewport || (W >= 900 ? true : (m.minimap[0] >= m.viewport[0] && m.minimap[2] <= m.viewport[2] && m.minimap[1] >= m.viewport[1] && m.minimap[3] <= m.viewport[3])) } };
    });
    await page.screenshot({ path: path.join(outDir, `${name}.jpg`), type: "jpeg", quality: 70 });
  }
  console.log(JSON.stringify({ report, errs }, null, 1));
  await browser.close();
})();
