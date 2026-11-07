// UI全面改修 Phase 4 の確認用：新規ゲームのチュートリアル（戦闘後の 編成→装備→ショップ→編成→ショップ→完了）を
// 実際のクリック（Playwright の page.click：見えていて他の要素に覆われていないことも確かめる）で進め、
// 各段階で「強調の枠（#tutorial-spotlight）が対象に重なっているか」を計測して撮影する（Claude B）
// 使い方: node tools/ui-shots/tutorial-flow.js [repoDir] [outDir] [幅] [高さ]
// 戦闘チュートリアル部分は対象外（tutorialAfterRetreat() で戦闘終了直後の状態から始める）。
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
(async () => {
  const [repo = path.resolve(__dirname, "../.."), outDir = "/tmp/ui-tutorial", w = 390, h = 844] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", args: ["--no-sandbox", "--allow-file-access-from-files"] });
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: +w < 600, hasTouch: +w < 600 });
  const page = await ctx.newPage();
  page.on("dialog", d => d.accept());
  const errs = []; page.on("pageerror", e => errs.push("pageerror: " + e.message));
  const url = "file://" + path.resolve(repo, "index.html");
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.goto(url); await page.waitForTimeout(1500);
  const steps = [];
  const check = async (name, selector) => {
    await page.waitForTimeout(450);
    const m = await page.evaluate(sel => {
      const t = sel ? document.querySelector(sel) : null, s = document.getElementById("tutorial-spotlight");
      const r = t?.getBoundingClientRect(), sr = s && !s.hidden ? s.getBoundingClientRect() : null;
      const covers = !!(r && sr && sr.left <= r.left + 1 && sr.top <= r.top + 1 && sr.right >= r.right - 1 && sr.bottom >= r.bottom - 1);
      const visible = !!(r && r.width && r.height && r.bottom > 0 && r.top < innerHeight && r.left >= 0 && r.right <= innerWidth);
      return { phase: tutorialState.phase, target: !!t, visible, spotlightCovers: covers, scrollW: document.documentElement.scrollWidth, innerW: innerWidth, title: document.getElementById("tutorial-title")?.textContent };
    }, selector);
    steps.push({ name, selector, ...m });
    await page.screenshot({ path: path.join(outDir, `${String(steps.length).padStart(2, "0")}-${name}.jpg`), type: "jpeg", quality: 60 });
  };
  const click = async sel => { try { await page.click(sel, { timeout: 3000 }); return true; } catch (e) { steps.push({ clickFailed: sel, error: e.message.split("\n")[0] }); await page.evaluate(s => document.querySelector(s)?.click(), sel); return false; } };
  // 戦闘チュートリアル終了直後（撤退後）の状態へ
  await page.evaluate(() => { tutorialClose(); beginTutorial(false); tutorialClose(); tutorialAfterRetreat(); });
  await check("home-formation-tab", '.main-nav [data-screen="formation"]');
  await click('.main-nav [data-screen="formation"]');
  await check("formation-remove-healer", '#selected-party [data-remove-character="healer"]');
  await click('#selected-party [data-remove-character="healer"]');
  await check("formation-add-healer", '#character-roster [data-toggle-character="healer"]');
  await click('#character-roster [data-toggle-character="healer"]');
  await check("equipment-intro", "#selected-party");
  await click("#tutorial-next");
  await check("equip-hero-sword", '#selected-party select[data-character="kotama"][data-equip="weapon"]');
  try { await page.selectOption('#selected-party select[data-character="kotama"][data-equip="weapon"]', "hero-sword", { timeout: 3000 }); } catch (e) { steps.push({ selectFailed: e.message.split("\n")[0] }); }
  await check("shop-tab", '.main-nav [data-screen="shop"]');
  await click('.main-nav [data-screen="shop"]');
  await check("shop-buy-armor", '#shop-items [data-buy-item="leather-armor"][data-buy-mode="equip"]');
  await click('#shop-items [data-buy-item="leather-armor"][data-buy-mode="equip"]');
  await check("formation-accessory", '#selected-party select[data-equip^="accessory"]');
  await click("#tutorial-next");
  await check("shop-buy-potion", '#shop-items [data-buy-item="potion"]');
  await click('#shop-items [data-buy-item="potion"]');
  await check("complete-start", "#start-button");
  const result = await page.evaluate(() => ({ completed: tutorialState.completed, kotamaWeapon: equipment.kotama.weapon, kotamaArmor: equipment.kotama.armor, potion: inventory.potion || 0, party: state.party.filter(Boolean) }));
  console.log(JSON.stringify({ steps, result, errs: errs.slice(0, 10) }, null, 1));
  await browser.close();
})();
