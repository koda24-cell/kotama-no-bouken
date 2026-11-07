// capture.js の出力（JSON）を表にする。使い方: node tools/ui-shots/summary.js before.json after.json
const fs = require("fs");
const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, "utf8")).report);
console.log("| 画面 | 縦の長さ（前→後） | 横はみ出し（前→後） | うち枠で切れていない（前→後） |\n|---|---|---|---|");
for (const k of Object.keys(b)) console.log(`| ${k} | ${a[k]?.scrollH ?? "-"} → ${b[k].scrollH} / ${b[k].innerH} | ${a[k]?.overflowCount ?? "-"} → ${b[k].overflowCount} | ${a[k]?.overflowVisible ?? "-"} → ${b[k].overflowVisible ?? "-"} |`);
