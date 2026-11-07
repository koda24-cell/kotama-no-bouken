"use strict";
// [Claude C] 乱数固定・DOMスタブ環境で kotama-no-bouken の戦闘処理を node 上で動かす。
const vm = require("vm"), fs = require("fs"), path = require("path");
function makeEl() {
  const store = {};
  const fn = function () { return el; };
  const el = new Proxy(fn, {
    get(t, k) {
      if (k in store) return store[k];
      if (k === Symbol.toPrimitive) return () => "";
      if (k === "then") return undefined;
      if (["textContent", "innerHTML", "value", "className", "id", "src", "alt"].includes(k)) return "";
      if (["hidden", "checked", "inert", "disabled", "isConnected"].includes(k)) return false;
      if (["offsetWidth", "scrollTop", "scrollHeight", "length"].includes(k)) return 0;
      if (k === "querySelectorAll" || k === "getElementsByClassName") return () => [];
      if (k === "querySelector" || k === "closest") return () => null;
      if (k === "getBoundingClientRect") return () => ({ left: 0, top: 0, width: 0, height: 0 });
      if (k === "dataset" || k === "style") { store[k] = {}; return store[k]; }
      if (k === "classList") { store[k] = { add() {}, remove() {}, toggle() {}, contains() { return false; } }; return store[k]; }
      return makeEl();
    },
    set(t, k, v) { store[k] = v; return true; },
    apply() { return makeEl(); }
  });
  return el;
}
function createGame(root, opts = {}) {
  let seed = opts.seed >>> 0 || 1;
  const rand = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const M = Object.create(Math); M.random = rand;
  const events = [];
  const document = {
    getElementById: () => makeEl(), querySelector: () => null, querySelectorAll: () => [],
    createElement: () => makeEl(), addEventListener() {}, removeEventListener() {},
    dispatchEvent(ev) { events.push({ type: ev.type, detail: ev.detail }); return true; },
    body: makeEl(), documentElement: makeEl(), head: makeEl()
  };
  class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } }
  const ls = {}; const localStorage = { getItem: k => ls[k] ?? null, setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; } };
  const ctx = { console, document, CustomEvent, localStorage, Math: M, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, performance: { now: () => 0 }, navigator: { userAgent: "node" }, Audio: function () { return makeEl(); },
    location: { search: "", hash: "" }, matchMedia: () => ({ matches: false, addEventListener() {} }), getComputedStyle: () => ({}), innerWidth: 1024, innerHeight: 768 };
  ctx.addEventListener = () => {}; ctx.removeEventListener = () => {}; ctx.scrollTo = () => {};
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const files = [...html.matchAll(/<script src="\.\/([^"?]+)/g)].map(m => m[1]).filter(f => !opts.skip || !opts.skip.includes(f));
  for (const f of files) {
    const p = path.join(root, f); if (!fs.existsSync(p)) continue;
    try { vm.runInContext(fs.readFileSync(p, "utf8"), ctx, { filename: f }); } catch (e) { if (!opts.quiet) console.error("load error", f, e.message); }
  }
  // 待ち時間・画面遷移を消す（計算・乱数の順序は変えない）
  vm.runInContext(`
    wait = async () => {}; renderActionMenu = () => {}; renderBattle = () => {}; refreshBattleLog = () => {}; tutorialSave = () => {};
    var __sim = { result: null, log: [] };
    finishStage = async () => { __sim.result = "win"; };
    finishDefeat = () => { __sim.result = "lose"; };
    pushLog = (m) => { __sim.log.push(m); }; pushEvent = (m) => { __sim.log.push(m); };
    showScreen = () => {}; renderAll = () => {}; persistAutoSave = () => {};
  `, ctx);
  return { ctx, run: code => vm.runInContext(code, ctx), events };
}
module.exports = { createGame };
