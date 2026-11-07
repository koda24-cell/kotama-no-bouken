"use strict";
/* ============================================================
   tools/world-tree/loot_harness.js — [LOOT]/[SIDE]/セーブ検証用の DOM スタブ環境（Claude B）
   ・index.html の <script src> を記載順にすべて読み込み、script.js の loadGame / createSaveData /
     persistAutoSave を実際に動かす（ブラウザではない。描画結果は確認できない）。
   ・使い方：const { makeFull } = require("./loot_harness"); const c = makeFull(root, saveJson);
     c.run("JS 式") で実行。c.events に field:* の CustomEvent、c.store に localStorage、c.said に会話文。
   ・会話（fieldSay / fieldPlayScene / fieldAsk）は即時に完了させる。fieldAsk は c.answer（既定 0）を返す。
   ============================================================ */
const fs = require("fs"), path = require("path"), vm = require("vm");

function stubEl() {
  const h = {};
  const p = new Proxy(function () {}, {
    get(t, k) {
      if (k in h) return h[k];
      if (k === "classList") return { add() {}, remove() {}, toggle() {}, contains: () => false };
      if (k === "style" || k === "dataset") return (h[k] = { setProperty() {}, removeProperty() {} });
      if (k === "children" || k === "childNodes") return [];
      if (k === "querySelectorAll" || k === "getElementsByTagName") return () => [];
      if (k === "querySelector" || k === "closest") return () => null;
      if (k === "getBoundingClientRect") return () => ({ left: 0, top: 0, width: 0, height: 0 });
      if (k === "getContext") return () => new Proxy({}, { get: () => () => {} });
      if (k === Symbol.toPrimitive) return () => "";
      if (typeof k === "symbol") return undefined;
      if (["hidden", "checked", "disabled"].includes(k)) return false;
      if (["value", "textContent", "innerHTML", "id", "className", "src"].includes(k)) return "";
      if (["clientWidth", "clientHeight", "offsetWidth", "width", "height"].includes(k)) return 0;
      return function () { return p; };
    },
    set(t, k, v) { h[k] = v; return true; },
    apply() { return p; }
  });
  return p;
}

function makeFull(root, saveJson, opts = {}) {
  root = path.resolve(root) + path.sep;
  const store = {}; if (saveJson) store.fantasyRpgSave = JSON.stringify(saveJson);
  const events = [], warns = [];
  const ctx = {
    console: { log() {}, info() {}, warn: (...a) => warns.push(a.join(" ")), error: (...a) => console.error(...a) },
    Math, JSON, Object, Array, Set, Map, WeakMap, Number, String, Boolean, Date, RegExp, Error, TypeError, Uint8Array, Int32Array, Promise,
    parseInt, parseFloat, isNaN, isFinite, Symbol, Proxy, Reflect,
    setTimeout: (fn) => { if (opts.runTimers) fn(); return 0; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    performance: { now: () => 0 }, CSS: { escape: s => String(s) },
    CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
    Audio: function () { return stubEl(); }, Image: function () { return stubEl(); },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    navigator: { userAgent: "node" }, location: { search: "", hash: "" }, alert() {}, confirm: () => true,
    matchMedia: () => ({ matches: false, addEventListener() {} }), getComputedStyle: () => new Proxy({}, { get: () => "" })
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.addEventListener = () => {}; ctx.devicePixelRatio = 1;
  ctx.document = {
    readyState: "loading", addEventListener() {}, removeEventListener() {}, getElementById: () => stubEl(), querySelector: () => stubEl(), querySelectorAll: () => [],
    createElement: () => stubEl(), createTextNode: () => stubEl(), body: stubEl(), documentElement: stubEl(),
    dispatchEvent: e => { events.push([e.type, e.detail]); return true; }
  };
  vm.createContext(ctx);
  const html = fs.readFileSync(root + "index.html", "utf8");
  const files = [...html.matchAll(/<script src="\.\/([^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1]);
  for (const f of files) vm.runInContext(fs.readFileSync(root + f, "utf8"), ctx, { filename: f });
  const run = s => vm.runInContext(s, ctx);
  const api = { ctx, run, store, events, warns, files, said: [], answer: 0 };
  ctx.__api = api;
  if (opts.fastDialog !== false) run(`fieldSay = async t => { __api.said.push(t); }; fieldPlayScene = async id => { __api.said.push("[scene] " + id); if (id) fieldState.flags[id] = true; return !!id; }; fieldAsk = async () => __api.answer;`);
  api.lastSave = () => (store.fantasyRpgSave ? JSON.parse(store.fantasyRpgSave) : null);
  api.save = () => JSON.parse(JSON.stringify(run("createSaveData()")));
  return api;
}
module.exports = { makeFull };
if (require.main === module) {
  const c = makeFull(process.argv[2] || path.join(__dirname, "../.."), null);
  console.log("loaded", c.files.length, "scripts; saveVersion", c.run("createSaveData().saveVersion"));
}
