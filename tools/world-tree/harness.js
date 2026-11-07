// 迷宮の処理（field.js と field/*.js）を DOM なしで読み込むための最小スタブ
const fs = require("fs"), vm = require("vm"), path = require("path");
function load(repo) {
  const el = () => ({ classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } }, style: { setProperty(){} }, dataset: {}, children: [], querySelector: () => null, querySelectorAll: () => [], addEventListener(){}, appendChild(){}, insertBefore(){}, setAttribute(){}, getContext: () => new Proxy({}, { get: () => () => {} }), hidden: true });
  const events = [];
  const ctx = {
    console, Math, JSON, Number, String, Object, Array, Set, Map, Uint8Array, Int32Array, Promise, setTimeout, clearTimeout,
    performance: { now: () => ctx.__now },
    __now: 0,
    window: { addEventListener(){}, devicePixelRatio: 1 },
    document: { readyState: "complete", addEventListener(){}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: el, dispatchEvent: e => events.push(e) },
    CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
    CSS: { escape: s => s },
    requestAnimationFrame: () => 0,
    state: { screen: "field" }, inventory: {}, materials: {}, enemyEncounterCounts: {}, stageCleared: {},
    $: () => null, esc: s => String(s), persistAutoSave(){}, showScreen(){}, setSystemMessage(){},
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const run = f => vm.runInContext(fs.readFileSync(path.join(repo, f), "utf8").replace(/^"use strict";/, "").replace(/^const (\w+)/gm, "var $1").replace(/^let (\w+)/gm, "var $1"), ctx, { filename: f });
  // index.html の読み込み順どおりに、迷宮関連のデータと field/ 配下のモジュールを読む
  const html = fs.readFileSync(path.join(repo, "index.html"), "utf8");
  const files = [...html.matchAll(/<script src="\.\/([^"?]+)/g)].map(m => m[1])
    .filter(f => /^data\/field-/.test(f) || f === "field.js" || /^field\//.test(f));
  for (const f of files) run(f);
  ctx.__files = files;
  ctx.__events = events;
  return ctx;
}
module.exports = { load };
