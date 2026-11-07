// field.js を DOM なしで読み込むための最小スタブ
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
  run("data/field-maps.js"); if (fs.existsSync(path.join(repo, "data/field-gathering.js"))) run("data/field-gathering.js"); run("field.js");
  ctx.__events = events;
  return ctx;
}
module.exports = { load };
