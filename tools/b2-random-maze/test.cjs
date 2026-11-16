#!/usr/bin/env node
/* tools/b2-random-maze/test.cjs — 第2階層 5F・6F ランダム迷宮の単体テスト（node だけで動く）
   使い方: node tools/b2-random-maze/test.cjs [シード数=1000] [--ascii] [--ascii-only]
   ・ブラウザ用の data/field-maps.js・data/field-gathering.js・field/field-random-maze.js を vm で読み込む
   ・各探索回数（expedition 0..N-1）で 5F・6F を生成し、検証条件（fieldRandomMazeValidate）を全件満たすか
   ・同じ探索回数で同じ結果になるか／1回の生成時間／固定マップへのフォールバックが無いか
   ・fieldArea への差し込み（宝箱キー・採集点キー・tileRoles・セーブ位置の確認）を最小の偽 field.js で確認 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.resolve(__dirname, "../..");
const args = process.argv.slice(2);
const N = Number(args.find(a => /^\d+$/.test(a))) || 1000;
const ASCII = args.includes("--ascii") || args.includes("--ascii-only"), ASCII_ONLY = args.includes("--ascii-only");

const ctx = vm.createContext({ console, Math, Date, Object, Array, Set, Map, JSON, Number, String, Uint8Array, Int32Array, Float64Array, Infinity });
for (const f of ["data/field-maps.js", "data/field-gathering.js", "field/field-random-maze.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
// 最小限の field.js（fieldArea の差し込み部分は本物をそのまま読み込む）
const fieldSrc = fs.readFileSync(path.join(ROOT, "field.js"), "utf8");
const pick = (name) => { const m = fieldSrc.match(new RegExp(`function ${name}\\([^]*?\\n}\\n`)); if (!m) throw new Error("field.js に " + name + " が見つからない"); return m[0]; };
vm.runInContext(`
  const FIELD_TILE = 32;
  const FIELD_SOLID = new Set(["#", "~", "S", "T", "?", "G"]);
  let fieldState = { area: 2, floor: 1, expedition: 0, flags: {}, explored: {}, discovered: {} };
  const fieldAreaCache = {};
  function fieldFloorCount(n) { return FIELD_AREAS[n]?.floors?.length || 1; }
  ${pick("fieldArea")}
  function fieldTileAt(a, tx, ty) { return (a.grid[ty] && a.grid[ty][tx]) || "#"; }
  function fieldIsSolidChar(c) { return FIELD_SOLID.has(c) || /[a-z]/.test(c); }
  function fieldLetterDef(a, c) { return /[a-z]/.test(c) && a.def.objects ? a.def.objects[c] || null : null; }
  function fieldDoorOpen(o) { return !!fieldState.flags["puzzle:" + o.puzzle]; }
  function fieldCharSolid(a, c) { const o = fieldLetterDef(a, c); if (o && o.kind === "door") return !fieldDoorOpen(o); return fieldIsSolidChar(c); }
`, ctx);
const R = (code) => vm.runInContext(code, ctx);

let fails = 0;
const ok = (name, cond, extra = "") => { if (cond) console.log("  OK  " + name); else { fails++; console.log("  NG  " + name + (extra ? " … " + extra : "")); } };
const show = (r, title) => {
  console.log(`\n=== ${title}  (seed ${r.seed}, attempt ${r.attempt}) ===`);
  const foe = new Set(r.floor.foes.flatMap(f => f.path.map(p => p.join(","))));
  r.floor.map.forEach((row, y) => console.log("  " + [...row].map((c, x) => foe.has(`${x},${y}`) && c === "." ? "F" : foe.has(`${x},${y}`) ? "F" : c).join("") + "   " + r.roles[y].map(s => ({ wall: "#", "shrine-candidate": "A", fixed: "x", template: "t", room: "r", corridor: "c", road: "=", deadend: "d", water: "~", shore: "s" })[s] || "?").join("")));
};

if (!ASCII_ONLY) {
  console.log(`[1] ${N} 探索回数 × 5F・6F の生成と検証`);
  for (const fk of ["2-1", "2-2"]) {
    let bad = 0, fallback = 0, retries = 0, maxAttempt = 0, tMax = 0, tSum = 0; const errHist = {};
    for (let e = 0; e < N; e++) {
      const t0 = process.hrtime.bigint();
      const r = R(`fieldRandomMazeGenerate(${JSON.stringify(fk)}, ${e})`);
      const ms = Number(process.hrtime.bigint() - t0) / 1e6; tMax = Math.max(tMax, ms); tSum += ms;
      if (!r) { fallback++; continue; }
      retries += r.attempt; maxAttempt = Math.max(maxAttempt, r.attempt);
      const errs = R(`fieldRandomMazeValidate(${JSON.stringify(fk)}, ${JSON.stringify(r.floor)})`);
      if (errs.length) { bad++; for (const x of errs) errHist[x.replace(/@.*/, "")] = (errHist[x.replace(/@.*/, "")] || 0) + 1; }
      if (r.roles.length !== r.floor.map.length || r.roles.some((row, y) => row.length !== r.floor.map[y].length)) bad++;
    }
    ok(`${fk}: ${N}件すべて検証を満たす（失敗 ${bad}）`, bad === 0, JSON.stringify(errHist));
    ok(`${fk}: 固定マップへのフォールバック 0件（${fallback}）`, fallback === 0);
    console.log(`        平均 ${(tSum / N).toFixed(2)}ms／最大 ${tMax.toFixed(2)}ms（検証込み）／やり直し 合計 ${retries}回・1件の最大 ${maxAttempt}回`);
    ok(`${fk}: 平均生成時間 < 20ms`, tSum / N < 20);
  }

  console.log("\n[2] 決定性：同じ探索回数なら同じ形、違えば違う形");
  for (const fk of ["2-1", "2-2"]) {
    const same = [0, 7, 123, 999].every(e => R(`JSON.stringify(fieldRandomMazeGenerate("${fk}", ${e}))`) === R(`JSON.stringify(fieldRandomMazeGenerate("${fk}", ${e}))`));
    ok(`${fk}: 同じ expedition → 同じ結果`, same);
    const maps = new Set(); for (let e = 0; e < 50; e++) maps.add(R(`fieldRandomMazeGenerate("${fk}", ${e}).floor.map.join("")`));
    ok(`${fk}: 50回の探索で形がすべて違う（${maps.size}種類）`, maps.size === 50);
  }
  ok("Math.random を使っていない", !/Math\.random/.test(fs.readFileSync(path.join(ROOT, "field/field-random-maze.js"), "utf8").replace(/\/\*[^]*?\*\/|\/\/.*$/gm, "")));

  console.log("\n[3] fieldArea への差し込み");
  R(`fieldState.expedition = 5;`);
  const a1 = R(`(() => { const a = fieldArea(2, 1); return { key: a.key, buildKey: a.buildKey, random: !!a.random, w: a.w, h: a.h, start: a.start, chests: a.objects.filter(o => o.kind === "chest").map(o => o.key), gathers: a.objects.filter(o => o.kind === "gather").map(o => [o.key, o.gatherKind, JSON.stringify(o.gatherDef)]), cache: a.objects.filter(o => o.kind === "cache").map(o => o.key), roles: a.tileRoles.length, foes: a.floor.foes.length }; })()`);
  ok("5F は random・buildKey 付き・大きさは既存と同じ（27×21）", a1.random && /^2-1@e5s/.test(a1.buildKey) && a1.w === 27 && a1.h === 21, JSON.stringify(a1));
  ok("5F の宝箱キーに探索回数（chest:2-1:e5:x:y）", a1.chests.length === 2 && a1.chests.every(k => /^chest:2-1:e5:\d+:\d+$/.test(k)), a1.chests.join(" "));
  ok("5F の採集点は番号のキー・既存の種別（take→chop）を引き継ぐ", a1.gathers.map(g => g[0]).join() === "gather:2-1:g0,gather:2-1:g1" && a1.gathers[0][1] === "take" && a1.gathers[1][1] === "chop", JSON.stringify(a1.gathers));
  ok("5F の宝箱i（仕掛け）は1回きりのキーのまま（cache:2:a2-cache）", a1.cache.join() === "cache:2:a2-cache");
  ok("5F の開始位置は上り階段（1,19）", a1.start.tx === 1 && a1.start.ty === 19);
  const a2 = R(`(() => { const a = fieldArea(2, 2); return { buildKey: a.buildKey, start: a.start, w: a.w, h: a.h, npcs: a.objects.filter(o => o.kind === "npc").map(o => o.id).sort().join() }; })()`);
  ok("6F は 28×18・開始位置 P（3,1）・行商人と見張り番がいる", a2.w === 28 && a2.h === 18 && a2.start.tx === 3 && a2.start.ty === 1 && a2.npcs === "merchant,watchman", JSON.stringify(a2));
  const a0 = R(`(() => { const a = fieldArea(2, 0); return { random: !!a.random, chest: a.objects.find(o => o.kind === "chest").key, map: a.floor.map === FIELD_AREAS[2].floors[0].map }; })()`);
  ok("4F（2-0）は固定のまま（キーも従来どおり）", !a0.random && a0.map && /^chest:2-0:\d+:\d+$/.test(a0.chest));
  const k5 = a1.buildKey; R(`fieldState.expedition = 6;`);
  ok("探索回数が変わると別の迷宮（buildKey が変わる）", R(`fieldArea(2, 1).buildKey`) !== k5);
  R(`fieldState.expedition = 5;`);
  ok("探索回数を戻すと同じ迷宮（セーブ→ロードの再現）", R(`fieldArea(2, 1).buildKey`) === k5);

  console.log("\n[4] 出発・ロード時の片付け");
  R(`fieldState.expedition = 5; fieldState.flags = { "chest:2-1:e4:3:3": true, "chest:2-1:e5:9:9": true, "chest:2-0:5:5": true, "puzzle:a2-twin-stones:reward": true, "rmaze:e4": true };
     fieldState.explored = { "2-0": new Uint8Array(4), "2-1": new Uint8Array(4), "2-2": new Uint8Array(4) }; fieldState.discovered = { "gather:2-1:g0": true, "chest:2-0:5:5": true };
     fieldRandomMazeOnDeparture();`);
  const st = R(`({ flags: Object.keys(fieldState.flags).sort().join(), explored: Object.keys(fieldState.explored).join(), disc: Object.keys(fieldState.discovered).join() })`);
  ok("出発：前回までのランダム階の宝箱フラグを消す・今回分と固定階・仕掛け報酬は残す", st.flags === "chest:2-0:5:5,chest:2-1:e5:9:9,puzzle:a2-twin-stones:reward,rmaze:e5", st.flags);
  ok("出発：5F・6F の踏破マップを消す（4F は残す）", st.explored === "2-0", st.explored);
  ok("出発：5F・6F の発見済みを消す", st.disc === "chest:2-0:5:5", st.disc);
  R(`fieldState.explored = { "2-1": new Uint8Array(4) }; fieldRandomMazeOnLoad();`);
  ok("ロード：今回の目印があれば踏破マップを残す", R(`Object.keys(fieldState.explored).join()`) === "2-1");
  R(`delete fieldState.flags["rmaze:e5"]; fieldRandomMazeOnLoad();`);
  ok("ロード：目印が無い（旧セーブ）なら踏破マップを消して目印を付ける", R(`Object.keys(fieldState.explored).join()`) === "" && R(`!!fieldState.flags["rmaze:e5"]`));
  const pos = R(`(() => { const a = fieldArea(2, 1), m = a.random.meta.cacheRoom, wall = (() => { for (let y = 1; y < a.h; y++) for (let x = 1; x < a.w; x++) if (a.grid[y][x] === "#") return [x, y]; })();
     const c = (tx, ty) => [tx * 32 + 16, ty * 32 + 20];
     fieldState.flags = {}; const inCache = fieldRandomMazePosOk(a, ...c(m.ax, m.ay)); fieldState.flags["puzzle:a2-twin-stones"] = true; const inCacheOpen = fieldRandomMazePosOk(a, ...c(m.ax, m.ay));
     return { start: fieldRandomMazePosOk(a, ...c(a.start.tx, a.start.ty)), wall: fieldRandomMazePosOk(a, ...c(...wall)), inCache, inCacheOpen }; })()`);
  ok("保存位置の確認：開始位置は可・壁は不可・門の奥は閉じていれば不可／開いていれば可", pos.start && !pos.wall && !pos.inCache && pos.inCacheOpen, JSON.stringify(pos));
}

if (ASCII) {
  for (const e of [0, 1, 2]) for (const fk of ["2-1", "2-2"]) show(R(`fieldRandomMazeGenerate("${fk}", ${e})`), `${fk === "2-1" ? "5F" : "6F"} expedition ${e}`);
  console.log("\n  凡例（右）: #=wall A=shrine-candidate x=fixed t=template r=room c=corridor ==road d=deadend ~=water s=shore ／（左）F=FOE巡回点");
}
console.log(fails ? `\n失敗 ${fails}件` : "\nすべて成功");
process.exit(fails ? 1 : 0);
