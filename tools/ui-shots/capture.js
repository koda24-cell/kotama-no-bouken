// UI全面改修の確認用：全画面のスクリーンショットと、横はみ出し・縦の長さの計測（Claude）
// 使い方: node tools/ui-shots/capture.js [repoDir] [outDir] [幅] [高さ]
//   例) node tools/ui-shots/capture.js . /tmp/after-390 390 844
// Playwright と Chrome（/usr/bin/google-chrome、または環境変数 CHROME_PATH）が必要。
// 環境変数：SCALE（既定2）、FORMAT=jpeg（記録用に軽くする）。
// 表示確認用に進行状況を書き換えるが、セーブはしない（persistAutoSave を無効化）。
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
(async () => {
  const [repo = path.resolve(__dirname, "../.."), outDir = "/tmp/ui-shots", w = 390, h = 844] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", args: ["--no-sandbox", "--allow-file-access-from-files"] });
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: Number(process.env.SCALE || 2), isMobile: +w < 600, hasTouch: +w < 600 });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", e => errs.push("pageerror: " + e.message));
  await page.goto("file://" + path.resolve(repo, "index.html"));
  await page.waitForTimeout(1200);
  // チュートリアルを終えた進行状況にする（表示確認用。セーブはしない）
  await page.evaluate(() => {
    try { localStorage.clear(); } catch (e) {}
    try { tutorialFinish(); } catch (e) {} try { tutorialClose(); } catch (e) {} tutorialState.phase = "complete"; tutorialState.completed = true; tutorialState.started = false; try { syncTutorialActive(); } catch (e) {}
    document.querySelectorAll("#tutorial-overlay").forEach(el => el.hidden = true);
    state.firstStageStarted = true; state.maxUnlockedStage = 5; state.gold = 1234;
    for (let i = 1; i <= 3; i++) { stageCleared[i] = true; stageEntered[i] = true; }
    if (typeof fieldState !== "undefined") { fieldState.flags.prologue = true; for (let n = 1; n <= 3; n++) for (let f = 0; f < 3; f++) fieldState.flags[`floor:${n}-${f}`] = true; }
    window.persistAutoSave = () => true;
    if (typeof renderAll === "function") renderAll();
  });
  const shots = [
    ["home", () => showScreen("home")],
    ["formation", () => showScreen("formation")],
    ["shop", () => showScreen("shop")],
    ["training", () => showScreen("training")],
    ["settings", () => showScreen("settings")],
    ["compendium", () => showScreen("compendium")],
    ["achievements", () => showScreen("achievements")],
    ["field", async () => { fieldEnterArea(1, { floor: 0, fromHome: true }); }],
    ["field-map", async () => { fieldToggleFullMap(true); }],
    ["battle", async () => { fieldToggleFullMap(false); fieldStartEncounterBattle("forest-goblin"); }],
  ];
  const report = {};
  for (const [name, fn] of shots) {
    try {
      await page.evaluate(`(${fn.toString()})()`);
      await page.waitForTimeout(name.startsWith("battle") ? 2500 : 900);
      // 会話・ダイアログが出ていたら閉じる
      await page.evaluate(() => { for (let i = 0; i < 20; i++) { if (typeof fieldDialogAdvance === "function" && fieldDialogAdvance) { const r = fieldDialogAdvance; fieldDialogAdvance = null; r(); } } document.querySelectorAll("#story-event").forEach(el => el.hidden = true); });
      await page.waitForTimeout(400);
      await page.evaluate(() => { const o = document.getElementById("tutorial-overlay"); if (o) o.hidden = true; document.body.classList.remove("tutorial-home-focus", "tutorial-active"); });
      await page.waitForTimeout(150);
      const m = await page.evaluate(() => {
        const W = innerWidth, over = [];
        for (const el of document.querySelectorAll("body *")) {
          const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || el.closest("[hidden]")) continue;
          const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
          if (r.right > W + 1 || r.left < -1) { let p = el.parentElement, clipped = false; while (p) { const pc = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(pc.overflowX)) { const pr = p.getBoundingClientRect(); if (pr.right <= W + 1) { clipped = true; break; } } p = p.parentElement; } over.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""} [${Math.round(r.left)}..${Math.round(r.right)}]${clipped ? " (切れて見えない)" : ""}`); }
        }
        const fixed = [...document.querySelectorAll("body *")].filter(el => { const cs = getComputedStyle(el); return (cs.position === "fixed" || cs.position === "sticky") && !el.closest("[hidden]") && cs.display !== "none" && el.getBoundingClientRect().height > 0; }).map(el => `${el.tagName.toLowerCase()}#${el.id}.${String(el.className).split(" ")[0]} bottom=${Math.round(innerHeight - el.getBoundingClientRect().bottom)}`);
        return { scrollW: document.documentElement.scrollWidth, innerW: W, scrollH: document.documentElement.scrollHeight, innerH: innerHeight, overflow: over.slice(0, 12), overflowCount: over.length, fixed };
      });
      report[name] = m;
      const jpg = process.env.FORMAT === "jpeg"; await page.screenshot(jpg ? { path: path.join(outDir, `${name}.jpg`), type: "jpeg", quality: 60 } : { path: path.join(outDir, `${name}.png`) });
    } catch (e) { report[name] = { error: e.message }; }
  }
  console.log(JSON.stringify({ report, errs: errs.slice(0, 10) }, null, 1));
  await browser.close();
})();
