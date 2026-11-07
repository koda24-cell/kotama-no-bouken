// UI全面改修 Phase 4 の確認用：一般画面（ホーム・編成・ショップ・育成・設定・図鑑・実績）の
// 「操作後の状態」を全ページで撮影し、横はみ出しと主要な操作（購入・装備・習得・入れ替え・セーブ/ロード）を確かめる（Claude B）
// 使い方: node tools/ui-shots/screens-states.js [repoDir] [outDir] [幅] [高さ] [only=name1,name2]
// 環境変数：SCALE（既定1）、FORMAT=jpeg。セーブは localStorage のみ（撮影ごとに消す）。
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
(async () => {
  const [repo = path.resolve(__dirname, "../.."), outDir = "/tmp/ui-states", w = 390, h = 844, onlyArg = ""] = process.argv.slice(2);
  const only = onlyArg ? onlyArg.replace(/^only=/, "").split(",") : null;
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", args: ["--no-sandbox", "--allow-file-access-from-files"] });
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: Number(process.env.SCALE || 1), isMobile: +w < 600, hasTouch: +w < 600 });
  const page = await ctx.newPage();
  page.on("dialog", d => d.accept());
  const errs = []; page.on("pageerror", e => errs.push("pageerror: " + e.message));
  await page.goto("file://" + path.resolve(repo, "index.html"));
  await page.waitForTimeout(1200);
  const setup = () => {
    try { localStorage.clear(); } catch (e) {}
    try { tutorialFinish(); } catch (e) {} try { tutorialClose(); } catch (e) {}
    tutorialState.phase = "complete"; tutorialState.completed = true; tutorialState.started = false; try { syncTutorialActive(); } catch (e) {}
    try { tutorialClose(); } catch (e) {} document.body.classList.remove("tutorial-home-focus", "tutorial-active");
    state.firstStageStarted = true; state.maxUnlockedStage = 5; state.gold = 1234;
    for (let i = 1; i <= 3; i++) { stageCleared[i] = true; stageEntered[i] = true; }
    trainingPoints.kotama = 3; inventory["iron-sword"] = 1;
    if (typeof compendium !== "undefined" && compendium["スライム"]) { compendium["スライム"].encountered = true; compendium["スライム"].defeated = true; compendium["ゴブリン"].encountered = true; }
    window.persistAutoSave = () => true;
    renderAll();
  };
  await page.evaluate(`(${setup.toString()})()`);
  const measure = () => {
    const W = innerWidth, over = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || el.closest("[hidden]")) continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      if (r.right > W + 1 || r.left < -1) { let p = el.parentElement, clipped = false; while (p) { const pc = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(pc.overflowX)) { clipped = true; break; } p = p.parentElement; } if (!clipped) over.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${String(el.className).split(" ")[0]} [${Math.round(r.left)}..${Math.round(r.right)}]`); }
    }
    return { scrollW: document.documentElement.scrollWidth, innerW: W, scrollH: document.documentElement.scrollHeight, overflow: over.slice(0, 8), overflowCount: over.length };
  };
  const shots = [
    ["home", () => showScreen("home")],
    ["home-gallery", () => { showScreen("home"); document.getElementById("event-gallery-button").click(); }],
    ["formation", () => showScreen("formation")],
    ["formation-select", () => { showScreen("formation"); document.querySelector('#selected-party [data-focus-character="mage"]')?.click(); }],
    ["shop", () => showScreen("shop")],
    ["shop-select", () => { showScreen("shop"); currentCategory = "armor"; renderShop(); document.querySelectorAll("#shop-items [data-shop-select]")[1]?.click(); }],
    ["training", () => showScreen("training")],
    ["training-select", () => { showScreen("training"); document.querySelector('#progression-panel [data-select-skill]:nth-of-type(1)'); const b = document.querySelectorAll("#progression-panel [data-select-skill]"); b[1]?.click(); }],
    ["settings", () => showScreen("settings")],
    ["compendium", () => showScreen("compendium")],
    ["compendium-detail", () => { showScreen("compendium"); document.querySelectorAll("#compendium-list [data-monster-select]")[0]?.click(); }],
    ["achievements", () => showScreen("achievements")],
    ["save-dialog", () => { showScreen("home"); openSaveDialog(); }],
    ["load-dialog", () => { document.getElementById("save-dialog").hidden = true; openLoadDialog(); }],
  ];
  const report = {};
  for (const [name, fn] of shots) {
    if (only && !only.includes(name)) continue;
    try {
      await page.evaluate(() => { document.querySelectorAll(".game-dialog").forEach(d => d.hidden = true); });
      await page.evaluate(`(${fn.toString()})()`);
      await page.waitForTimeout(500);
      report[name] = await page.evaluate(measure);
      const jpg = process.env.FORMAT === "jpeg";
      await page.screenshot({ path: path.join(outDir, `${name}.${jpg ? "jpg" : "png"}`), fullPage: !name.endsWith("dialog"), ...(jpg ? { type: "jpeg", quality: 60 } : {}) });
    } catch (e) { report[name] = { error: e.message }; }
  }
  // 回帰：購入・装備・習得・入れ替え・セーブ/ロード（ページ上の関数とクリックで実行し、状態の変化を確かめる）
  if (!only || only.includes("regress")) {
    report.regress = await page.evaluate(async () => {
      const out = {}; const q = s => document.querySelector(s);
      document.querySelectorAll(".game-dialog").forEach(d => d.hidden = true);
      // 購入（ショップの詳細の購入ボタンをクリック）
      showScreen("shop"); shopBuyerId = "kotama"; currentCategory = "armor"; renderShop();
      q('#shop-items [data-shop-select="leather-armor"]')?.click();
      const g0 = state.gold; q('#shop-items [data-buy-item="leather-armor"][data-buy-mode="equip"]')?.click();
      out.buyEquip = { goldSpent: g0 - state.gold, equipped: equipment.kotama.armor };
      currentCategory = "other"; renderShop(); q('#shop-items [data-shop-select="potion"]')?.click();
      const p0 = inventory.potion || 0; q('#shop-items [data-buy-item="potion"]')?.click(); out.buyPotion = (inventory.potion || 0) - p0;
      // 装備変更（編成の select）
      showScreen("formation"); q('#selected-party [data-focus-character="kotama"]')?.click();
      const sel = q('#selected-party select[data-character="kotama"][data-equip="weapon"]');
      if (sel) { sel.value = "iron-sword"; sel.dispatchEvent(new Event("change", { bubbles: true })); }
      out.equipChange = equipment.kotama.weapon;
      // パーティ入れ替え（外す→加える）
      q('#selected-party [data-remove-character="healer"]')?.click(); out.removed = !state.party.includes("healer");
      q('#character-roster [data-toggle-character="healer"]')?.click(); out.readded = state.party.includes("healer");
      // スキル習得（育成：ノード選択→取得ボタン）
      showScreen("training"); shopBuyerId = "kotama"; selectedTrainingSkill = null; renderProgressionPanel();
      const pt0 = trainingPoints.kotama, lv0 = getTreeLevel("kotama", skillTreeDefinitions.kotama.passive.id);
      q("#progression-panel [data-upgrade-skill]")?.click();
      out.skill = { pointsUsed: pt0 - trainingPoints.kotama, levelUp: getTreeLevel("kotama", skillTreeDefinitions.kotama.passive.id) - lv0 };
      // セーブ→状態を変える→ロード
      openSaveDialog(); q('#save-slot-list [data-slot="1"]')?.click();
      const goldSaved = state.gold; state.gold = 1; renderGold();
      openLoadDialog(); q('#load-slot-list [data-slot="1"]')?.click();
      out.saveLoad = { restored: state.gold === goldSaved, gold: state.gold };
      return out;
    });
  }
  console.log(JSON.stringify({ report, errs: errs.slice(0, 10) }, null, 1));
  await browser.close();
})();
