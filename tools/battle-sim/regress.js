// 使い方：node tools/battle-sim/regress.js <変更前のフォルダ> <変更後のフォルダ> [試行数]
// 乱数固定で development と作業ブランチの戦闘ログが一致するかを比較する。node regress.js <rootA> <rootB> [試行数]
const { createGame } = require("./env.js"); const fs = require("fs"); const crypto = require("crypto");
const DRIVER = fs.readFileSync(__dirname + "/sim.js", "utf8").match(/const DRIVER = `([\s\S]*?)`;/)[1];
const [A, B] = [process.argv[2], process.argv[3]]; const N = Number(process.argv[4]) || 10;
const P4 = ["kotama", "knight", "mage", "healer"], P5 = [...P4, "warrior"], PX = ["kotama", "samurai", "warrior", "healer"];
const cfgs = [];
for (const [st, lv] of [[1, 4], [2, 8], [3, 13], [4, 20], [5, 25]]) for (const party of [P4, P5, PX]) {
  cfgs.push({ stratum: st, level: lv, party, maxTurns: 30 }, { stratum: st, level: lv, party, maxTurns: 30, prepared: true });
}
for (const id of ["stray-slime", "mushroom", "goblin-scout", "mist-bat", "fire-lizard", "dark-knight", "wraith", "foe-mist-stag", "foe-salamander", "foe-black-general"]) cfgs.push({ stratum: 3, level: 15, party: P4, maxTurns: 30, field: id, scale: 1.3 });
async function runAll(root) { const out = [];
  for (const c of cfgs) for (let i = 0; i < N; i++) { const g = createGame(root, { seed: 7 + i, quiet: true }); g.run(DRIVER);
    let r; try { r = await g.run(`__battle(${JSON.stringify(c)})`); } catch (e) { r = { err: e.message }; }
    const log = g.run("__sim.log.join('\\n')");
    out.push(JSON.stringify(r) + crypto.createHash("sha1").update(log).digest("hex")); }
  return out; }
(async () => { const a = await runAll(A), b = await runAll(B); let diff = 0;
  a.forEach((x, i) => { if (x !== b[i]) { diff++; if (diff < 5) console.log("DIFF", i, x, b[i]); } });
  console.log(`battles=${a.length} diff=${diff} errors=${b.filter(x => x.includes('"err"')).length}`); })();
