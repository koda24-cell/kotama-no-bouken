// UI全面改修 Phase 3 の確認用：戦闘画面のいろいろな状態を撮影し、はみ出し・コマンドの見切れを計測する（Claude）
// 使い方: node tools/ui-shots/battle-states.js [repoDir] [outDir] [幅] [高さ]
//   例) SCALE=1 FORMAT=jpeg node tools/ui-shots/battle-states.js . /tmp/battle-390 390 844
// capture.js と同じく Playwright と Chrome が必要。表示確認のために戦闘の状態を書き換えるが、セーブはしない。
// 計測：scrollH（ページの縦の長さ）・overflowCount（横はみ出し）・cmdBottom（最後のコマンドの下端と画面下端の差。負なら画面外）
//       spot（チュートリアルの強調枠と対象要素のずれ px）
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
(async () => {
  const [repo = path.resolve(__dirname, "../.."), outDir = "/tmp/battle-shots", w = 390, h = 844] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", args: ["--no-sandbox", "--allow-file-access-from-files"] });
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: Number(process.env.SCALE || 2), isMobile: +w < 600, hasTouch: +w < 600 });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", e => errs.push("pageerror: " + e.message));
  page.on("dialog", d => d.dismiss().catch(() => {}));
  await page.goto("file://" + path.resolve(repo, "index.html"));
  await page.waitForTimeout(1200);
  const setup = () => {
    try { localStorage.clear(); } catch (e) {}
    try { tutorialFinish(); } catch (e) {} try { tutorialClose(); } catch (e) {} tutorialState.phase = "complete"; tutorialState.completed = true; tutorialState.started = false; try { syncTutorialActive(); } catch (e) {}
    document.querySelectorAll("#tutorial-overlay").forEach(el => el.hidden = true);
    document.body.classList.remove("tutorial-home-focus", "tutorial-active");
    state.firstStageStarted = true; state.maxUnlockedStage = 5; state.gold = 1234;
    for (let i = 1; i <= 5; i++) { stageCleared[i] = true; stageEntered[i] = true; }
    for (const k of Object.keys(eventRead || {})) eventRead[k] = true; if (typeof stageEvents !== "undefined") stageEvents.forEach(e => eventRead[e.id] = true);
    if (typeof fieldState !== "undefined") { fieldState.flags.prologue = true; for (let n = 1; n <= 3; n++) for (let f = 0; f < 3; f++) fieldState.flags[`floor:${n}-${f}`] = true; }
    inventory.potion = 3; inventory.ether = 2; inventory["high-potion"] = 1;
    window.persistAutoSave = () => true;
    if (typeof renderAll === "function") renderAll();
  };
  await page.evaluate(setup);
  const closeStory = async () => page.evaluate(() => {
    for (let i = 0; i < 20; i++) { if (typeof fieldDialogAdvance === "function" && fieldDialogAdvance) { const r = fieldDialogAdvance; fieldDialogAdvance = null; r(); } }
    const st = document.getElementById("story-event"); if (st && (!st.hidden || st.classList.contains("story-visible"))) { try { closeStoryEvent(true); } catch (e) {} st.hidden = true; st.classList.remove("story-visible"); }
  });
  const waitReady = async (ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await closeStory(); const ok = await page.evaluate(() => !battleState.busy && document.querySelector("#battle-commands [data-action]")); if (ok) return true; await page.waitForTimeout(300); } return false; };
  const click = sel => page.evaluate(s => { const b = document.querySelector(s); if (b) b.click(); return !!b; }, sel);
  const hideTutorial = () => page.evaluate(() => { const o = document.getElementById("tutorial-overlay"); if (o) o.hidden = true; const s = document.getElementById("tutorial-spotlight"); if (s) s.hidden = true; });
  const states = [
    ["normal", async () => { await page.evaluate(() => { fieldEnterArea(1, { floor: 0, fromHome: true }); }); await page.waitForTimeout(600); await closeStory(); await page.evaluate(() => fieldStartEncounterBattle("forest-goblin")); await waitReady(); }],
    ["target", async () => { await click('#battle-commands [data-action="attack"]'); }],
    ["skill", async () => { await click('#battle-commands [data-action="back"]'); await waitReady(); await click('#battle-commands [data-action="skill"]'); }],
    ["item", async () => { await click('#battle-commands [data-action="back"]'); await waitReady(); await click('#battle-commands [data-action="item"]'); }],
    ["ally-target", async () => { await page.evaluate(() => { getParty()[1].hp -= 40; getParty()[2].hp -= 20; renderBattle(); }); await click('#battle-commands [data-item]'); await page.evaluate(() => { const b = document.querySelector("#battle-commands [data-target]"); b?.dispatchEvent(new PointerEvent("pointerenter")); b?.classList.add("keyboard-focus"); }); }],
    ["union", async () => { await click('#battle-commands [data-action="back"]'); await click('#battle-commands [data-action="back"]'); await page.evaluate(() => { for (const c of getParty()) battleState.unionGauges[c.id] = 99; battleState.party?.forEach?.(() => {}); renderBattle(); renderActionMenu(true); }); }],
    ["second-actor", async () => { await page.evaluate(() => { for (const c of getParty()) battleState.unionGauges[c.id] = 1; renderBattle(); renderActionMenu(true); }); await click('#battle-commands [data-action="guard"]'); await page.waitForTimeout(300); }],
    ["log", async () => { await click("#battle-log-open"); }],
    ["analyze-party", async () => { await click("#battle-log-close"); await click("#analyze-party-button"); }],
    ["retreat-dialog", async () => { await click("#analyze-close"); await click("#retreat-button"); }],
    ["victory", async () => { await click("#retreat-no"); await page.evaluate(() => { const d = document.getElementById("retreat-dialog"); if (d) d.hidden = true; battleState.enemy.hp = 0; finishStage(); }); await page.waitForTimeout(4500); }],
    ["boss-goblins", async () => { await page.evaluate(() => { document.querySelectorAll(".item-drop-layer,.item-drop-overlay").forEach(e => e.remove()); startBattle(2); }); await page.waitForTimeout(1500); await waitReady(12000); await page.waitForTimeout(800); }],
    ["boss-maou", async () => { await page.evaluate(() => startBattle(5)); await page.waitForTimeout(1500); await waitReady(15000); await page.waitForTimeout(1200); }],
    ["party5-mock", async () => { await page.evaluate(() => { const p = document.getElementById("battle-party"); const c = p.lastElementChild?.cloneNode(true); if (c) { c.dataset.partyId = "mock"; p.appendChild(c); } }); }],
    ["enemy5-mock", async () => { await page.evaluate(() => { startBattle(1); }); await page.waitForTimeout(1500); await waitReady(12000); await page.evaluate(() => { const d = document.getElementById("battle-enemy"); const img = d.querySelector(".enemy-image"); const src = img?.src || ""; img?.remove(); let g = d.querySelector(".enemy-group"); if (!g) { g = document.createElement("div"); g.className = "enemy-group"; d.prepend(g); } d.classList.add("enemy-individual-hp"); g.innerHTML = [1,2,3,4,5].map(i => `<div class="enemy-group-unit" data-enemy-id="mock-${i}"><img src="${src}" alt=""><span>スライム${"ABCDE"[i-1]}</span><div class="enemy-unit-hp"><i style="width:${100 - i * 12}%"></i></div><div class="enemy-unit-status"></div><small>${100 - i * 12} / 100</small></div>`).join(""); }); }],
    ["tutorial-enemy", async () => { await page.evaluate(() => { tutorialState.completed = false; tutorialState.started = false; tutorialState.phase = "intro"; beginTutorial(false); }); await page.waitForTimeout(1500); await closeStory(); await page.waitForTimeout(600); }],
    ["tutorial-party", async () => { for (let i = 0; i < 4; i++) { const ph = await page.evaluate(() => tutorialState.phase); if (ph === "battle-party") break; await click("#tutorial-next"); await page.waitForTimeout(400); } }],
    ["tutorial-command", async () => { for (let i = 0; i < 6; i++) { const ph = await page.evaluate(() => tutorialState.phase); if (ph === "battle-command") break; await click("#tutorial-next"); await page.waitForTimeout(400); } }],
    ["tutorial-target", async () => { await click('#battle-commands [data-action="attack"]'); await page.waitForTimeout(400); }],
  ];
  const report = {};
  const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
  for (const [name, fn] of states) {
    try {
      await fn();
      await page.waitForTimeout(500);
      if (only && !only.includes(name)) continue;
      await closeStory();
      if (!name.startsWith("tutorial")) await hideTutorial();
      await page.waitForTimeout(Number(process.env.SETTLE || 300));
      const m = await page.evaluate(() => {
        const W = innerWidth, H = innerHeight, over = [];
        for (const el of document.querySelectorAll("body *")) {
          const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || el.closest("[hidden]")) continue;
          const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
          if (r.right > W + 1 || r.left < -1) { let p = el.parentElement, clipped = false; while (p) { const pc = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(pc.overflowX)) { const pr = p.getBoundingClientRect(); if (pr.right <= W + 1) { clipped = true; break; } } p = p.parentElement; } if (!clipped && !el.closest(".union-cutin-layer,.stage-transition")) over.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${String(el.className).trim().split(/\s+/)[0]} [${Math.round(r.left)}..${Math.round(r.right)}]`); }
        }
        const btns = [...document.querySelectorAll("#battle-commands .command-option")].filter(b => b.getBoundingClientRect().height > 0);
        const box = document.getElementById("battle-commands"), br = box?.getBoundingClientRect();
        const last = btns[btns.length - 1]?.getBoundingClientRect();
        const spotEl = document.getElementById("tutorial-spotlight"); let spot = null;
        if (spotEl && !spotEl.hidden && typeof tutorialSpotlightTarget !== "undefined" && tutorialSpotlightTarget) { const a = spotEl.getBoundingClientRect(), t = tutorialSpotlightTarget.getBoundingClientRect(); spot = { target: (tutorialSpotlightTarget.id || tutorialSpotlightTarget.className), dx: Math.round(a.left + 7 - t.left), dy: Math.round(a.top + 7 - t.top), inView: t.top >= 0 && t.bottom <= H }; }
        const rect = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return r.height ? [Math.round(r.top), Math.round(r.bottom)] : null; };
        const cover = [...document.querySelectorAll("body *")].filter(el => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return (cs.position === "fixed" || cs.position === "absolute") && cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0 && r.width * r.height > W * H * .5; }).map(el => `${el.tagName.toLowerCase()}#${el.id}.${String(el.className).split(" ")[0]}`);
        return { cover, scrollW: document.documentElement.scrollWidth, innerW: W, scrollH: document.documentElement.scrollHeight, innerH: H, overflowCount: over.length, overflow: over.slice(0, 6),
          cmdCount: btns.length, cmdBottom: last ? Math.round(H - last.bottom) : null, cmdScroll: box ? box.scrollHeight > box.clientHeight + 1 : null,
          rows: { arena: rect(".battle-arena"), event: rect(".event-window"), party: rect("#battle-party"), commands: rect(".command-window"), info: rect(".command-info-window"), result: rect("#battle-result") }, spot };
      });
      report[name] = m;
      const jpg = process.env.FORMAT === "jpeg"; await page.screenshot(jpg ? { path: path.join(outDir, `${name}.jpg`), type: "jpeg", quality: 60 } : { path: path.join(outDir, `${name}.png`) });
    } catch (e) { report[name] = { error: e.message.split("\n")[0] }; }
  }
  console.log(JSON.stringify({ report, errs: errs.slice(0, 10) }, null, 1));
  await browser.close();
})();
