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
const foeSrc = fs.readFileSync(path.join(ROOT, "field/field-movement-foe.js"), "utf8");
const pick = (name) => { const m = fieldSrc.match(new RegExp(`function ${name}\\([^]*?\\n}\\n`)); if (!m) throw new Error("field.js に " + name + " が見つからない"); return m[0]; };
vm.runInContext(`
  const FIELD_TILE = 32;
  const FIELD_SOLID = new Set(["#", "~", "S", "T", "?", "G", "D"]);
  const FIELD_SAFE = new Set(["_", "P", "E", "B", "<", ">"]);
  let fieldState = { area: 2, floor: 1, expedition: 0, flags: {}, explored: {}, discovered: {} };
  const fieldAreaCache = {};
  function fieldFloorCount(n) { return FIELD_AREAS[n]?.floors?.length || 1; }
  ${pick("fieldArea")}
  function fieldTileAt(a, tx, ty) { return (a.grid[ty] && a.grid[ty][tx]) || "#"; }
  function fieldIsSolidChar(c) { return FIELD_SOLID.has(c) || /[a-z]/.test(c); }
  function fieldLetterDef(a, c) { return /[a-z]/.test(c) && a.def.objects ? a.def.objects[c] || null : null; }
  function fieldDoorOpen(o) { return !!fieldState.flags["puzzle:" + o.puzzle]; }
  function fieldCharSolid(a, c) { const o = fieldLetterDef(a, c); if (o && o.kind === "door") return !fieldDoorOpen(o); return fieldIsSolidChar(c); }
  ${pick("fieldCanEnter")}
  ${foeSrc.match(/^function fieldFoeWalkable.*$/m)[0]}
`, ctx);
const R = (code) => vm.runInContext(code, ctx);
if (!fieldSrc.includes('const FIELD_SOLID = new Set(["#", "~", "S", "T", "?", "G", "D"]);')) throw new Error("field.js の FIELD_SOLID が変わった（テストの写しを直すこと）");

let fails = 0;
const ok = (name, cond, extra = "") => { if (cond) console.log("  OK  " + name); else { fails++; console.log("  NG  " + name + (extra ? " … " + extra : "")); } };
const tagChar = (tags, c) => tags.includes("watergate-gate") ? "g" : tags.includes("watergate-view") ? "v" : tags.includes("backdrop-slot") ? "B" : tags.includes("bridge") ? "=" : tags.includes("water-hazard") ? "~"
  : tags.includes("setpiece-watergate") ? "W" : tags.includes("meadow") ? "M" : tags.includes("vista") ? "V" : tags.includes("backdrop-view") ? "b" : c === "#" ? "#" : ".";
const show = (r, title) => {
  const F = r.floor.features;
  console.log(`\n=== ${title}  (seed ${r.seed}, attempt ${r.attempt}) ===  橋 ${F.bridges.map(b => JSON.stringify(b.cells)).join(" ")}／広間 ${F.vistas.length}／水門 ${F.watergates.map(g => `gate${JSON.stringify(g.gate)} view${JSON.stringify(g.view)} ${g.facing}`).join(" ") || "なし"}`);
  console.log(`      背景スロット ${F.backdropSlots.map(b => `wall${JSON.stringify(b.wall)} ${b.dir} view${JSON.stringify(b.view)} far${JSON.stringify(b.far)}`).join(" ／ ")}／階段 ${JSON.stringify(F.stairs)}`);
  const foe = new Set(r.floor.foes.flatMap(f => f.path.map(p => p.join(","))));
  r.floor.map.forEach((row, y) => console.log("  " + [...row].map((c, x) => foe.has(`${x},${y}`) ? "F" : c).join("") + "   " + [...row].map((c, x) => tagChar(r.tags[y][x], c)).join("") + "   " + r.roles[y].map(s => ({ wall: "#", "shrine-candidate": "A", fixed: "x", template: "t", room: "r", corridor: "c", road: "=", deadend: "d", water: "*", shore: "s", "water-hazard": "~", bridge: "=" })[s] || "?").join("")));
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

  console.log(`\n[5] v4：水面・橋・道幅・水門・到達性（ゲームの通行判定 fieldCanEnter／fieldFoeWalkable で確認、${N} 探索回数 × 5F・6F）`);
  for (const [fk, f] of [["2-1", 1], ["2-2", 2]]) {
    const hist = {}; let tSum = 0, tMax = 0, nBr = 0, nVista = 0, nSide = 0, nPud = 0;
    for (let e = 0; e < N; e++) {
      const t0 = process.hrtime.bigint();
      R(`fieldState.expedition = ${e}; fieldState.flags = {};`);
      const res = R(`(() => {
        const a = fieldArea(2, ${f}), F = a.b2Features, errs = [], W = a.w, H = a.h, idx = (x, y) => y * W + x;
        const bfs = (block) => { const d = new Int32Array(W * H).fill(-1), q = [idx(a.start.tx, a.start.ty)]; d[q[0]] = 0;
          for (let qi = 0; qi < q.length; qi++) { const c = q[qi], x = c % W, y = (c - x) / W; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy, ni = idx(nx, ny); if (nx < 0 || ny < 0 || nx >= W || ny >= H || d[ni] >= 0 || !fieldCanEnter(a, nx, ny) || (block && block.has(ni))) continue; d[ni] = d[c] + 1; q.push(ni); } }
          return d; };
        const closed = bfs(null); fieldState.flags["puzzle:a2-twin-stones"] = true; const open = bfs(null); delete fieldState.flags["puzzle:a2-twin-stones"];
        const adj = (d, x, y) => [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < W && ny < H && d[idx(nx, ny)] >= 0; });
        // 水面：ゲームの通行判定でプレイヤーも FOE も入れない・外周（とその隣）に無い・役割が water-hazard
        let water = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (a.grid[y][x] === "~") { water++;
          if (fieldCanEnter(a, x, y) || fieldFoeWalkable(a, x, y)) errs.push("water-enterable");
          if (x < 2 || y < 2 || x > W - 3 || y > H - 3) errs.push("water-touches-border");
          if (a.tileRoles[y][x] !== "water-hazard" || !a.tileTags[y][x].includes("water-hazard")) errs.push("water-role");
        } else if (a.grid[y][x] === "*") { if (!fieldCanEnter(a, x, y)) errs.push("puddle-blocked"); if (!a.tileTags[y][x].includes("puddle")) errs.push("puddle-tag"); }
        if (!water) errs.push("no-water");
        // 橋：1つ以上・通れる・橋を通らずにゴールへ行けない
        const goal = a.objects.find(o => o.kind === (${f} === 1 ? "stairs" : "gate") && (${f} !== 1 || o.dir === "down"));
        const bset = new Set(); for (const b of F.bridges) for (const [x, y] of b.cells) { bset.add(idx(x, y)); if (!fieldCanEnter(a, x, y) || a.tileRoles[y][x] !== "bridge") errs.push("bridge-cell"); }
        if (!F.bridges.length) errs.push("no-bridge");
        if (closed[idx(goal.tx, goal.ty)] < 0) errs.push("goal-unreachable");
        if (bfs(bset)[idx(goal.tx, goal.ty)] >= 0) errs.push("bridge-bypassable");
        // 道幅：通れる3×3は広間・群生地・固定エリア（周り1マス）だけ
        const ok = new Uint8Array(W * H);
        for (const v of F.vistas) for (let y = v.y0; y <= v.y1; y++) for (let x = v.x0; x <= v.x1; x++) ok[idx(x, y)] = 1;
        for (const r of a.random.meta.fixed) for (let y = r.y0 - 1; y <= r.y1 + 1; y++) for (let x = r.x0 - 1; x <= r.x1 + 1; x++) if (x >= 0 && y >= 0 && x < W && y < H) ok[idx(x, y)] = 1;
        fieldState.flags["puzzle:a2-twin-stones"] = true;
        for (let y = 0; y + 2 < H; y++) for (let x = 0; x + 2 < W; x++) { let all = true, inside = true; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { if (fieldCharSolid(a, fieldTileAt(a, x + i, y + j))) all = false; if (!ok[idx(x + i, y + j)]) inside = false; } if (all && !inside) errs.push("wide-open"); }
        delete fieldState.flags["puzzle:a2-twin-stones"];
        if (F.vistas.length < 1 || F.vistas.length > 2) errs.push("vista-count");
        if (!F.meadow || F.meadow.cells.length < 4 || F.meadow.cells.some(([x, y]) => open[idx(x, y)] < 0)) errs.push("meadow");
        // 水門：水際（見る床）以外に立てない・水門の周り8マスに立てない
        if (F.watergates.length !== (${f} === 2 ? 1 : 0)) errs.push("watergate-count");
        for (const g of F.watergates) {
          if (open[idx(...g.view)] < 0) errs.push("watergate-view-unreachable");
          for (const [bx, by] of g.basin) for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = bx + dx, ny = by + dy; if (open[idx(nx, ny)] >= 0 && !(nx === g.view[0] && ny === g.view[1])) errs.push("watergate-shore"); }
          for (let y = g.gate[1] - 1; y <= g.gate[1] + 1; y++) for (let x = g.gate[0] - 1; x <= g.gate[0] + 1; x++) if (open[idx(x, y)] >= 0) errs.push("watergate-side");
        }
        // 物すべてに到達できる（歩いて乗る物は乗れる、調べる物は隣に立てる。門の奥の宝箱だけは門を開けて）
        for (const o of a.objects) {
          const d = o.kind === "cache" ? open : closed;
          if (o.walk ? d[idx(o.tx, o.ty)] < 0 : !adj(d, o.tx, o.ty)) errs.push("unreachable-" + o.kind);
        }
        // FOE：巡回点はすべて歩いて行けて、橋の上には来ない
        for (const fd of a.floor.foes) for (const [x, y] of fd.path) { if (closed[idx(x, y)] < 0 || !fieldFoeWalkable(a, x, y)) errs.push("foe-point"); if (bset.has(idx(x, y))) errs.push("foe-on-bridge"); }
        // 背景スロット・階段の向き
        if (F.backdropSlots.length < 1 || F.backdropSlots.length > 2) errs.push("backdrop-count");
        for (const b of F.backdropSlots) { const [wx, wy] = b.wall; if (!(wx === 0 || wy === 0 || wx === W - 1 || wy === H - 1) || open[idx(...b.view)] < 0) errs.push("backdrop"); }
        if (!F.stairs.up || (${f} === 1 && !F.stairs.down)) errs.push("stairs");
        return { errs, br: F.bridges.length, vista: F.vistas.length, side: F.sideWater.length, pud: F.puddles.length };
      })()`);
      const ms = Number(process.hrtime.bigint() - t0) / 1e6; tSum += ms; tMax = Math.max(tMax, ms);
      for (const x of res.errs) hist[x] = (hist[x] || 0) + 1;
      nBr += res.br; nVista += res.vista; nSide += res.side; nPud += res.pud;
    }
    ok(`${fk}: ${N}件すべて v4 条件を満たす`, !Object.keys(hist).length, JSON.stringify(hist));
    console.log(`        平均 橋 ${(nBr / N).toFixed(2)}・広間 ${(nVista / N).toFixed(2)}・脇の水路 ${(nSide / N).toFixed(2)}マス・水たまり ${(nPud / N).toFixed(2)}マス／fieldArea 込み 平均 ${(tSum / N).toFixed(2)}ms・最大 ${tMax.toFixed(2)}ms`);
  }
  {
    const a = R(`(() => { fieldState.expedition = 3; const a = fieldArea(2, 2); return { roles: [...new Set(a.tileRoles.flat())].sort(), tags: [...new Set(a.tileTags.flat(2))].sort(), feat: Object.keys(a.b2Features).sort(), same: a.b2Features === a.random.meta.features, stairs: a.random.meta.stairs }; })()`);
    ok("6F の tileRoles に water-hazard・bridge、tileTags に新しい役割が入る", a.roles.includes("water-hazard") && a.roles.includes("bridge") && ["water-hazard", "bridge", "vista", "meadow", "backdrop-slot", "setpiece-watergate", "watergate-gate", "watergate-view"].every(t => a.tags.includes(t)), JSON.stringify(a));
    ok("a.b2Features と a.random.meta.features が同じ・階段の向きを渡す", a.same && a.stairs.up && a.stairs.up.flight && a.stairs.up.face, JSON.stringify(a.stairs));
    const s4 = R(`fieldRandomMazeStairInfo(fieldArea(2, 0))`);
    const has4Up = R(`FIELD_AREAS[2].floors[0].map.some(r => r.includes("<"))`);
    ok("4F（固定）でも階段の向きを計算できる（fieldRandomMazeStairInfo。4F は上り階段なし）", (!has4Up || (s4.up && s4.up.flight)) && s4.down && s4.down.flight, JSON.stringify(s4));
  }
}

if (ASCII) {
  for (const e of [0, 1, 2]) for (const fk of ["2-1", "2-2"]) show(R(`fieldRandomMazeGenerate("${fk}", ${e})`), `${fk === "2-1" ? "5F" : "6F"} expedition ${e}`);
  console.log("\n  凡例（右＝tileRoles）: #=wall A=shrine-candidate x=fixed t=template r=room c=corridor d=deadend *=water(水たまり) s=shore ~=water-hazard ==bridge");
  console.log("  凡例（左＝マップ）: ~=危険な水面（通行不可） *=水たまり（通行可） F=FOE巡回点 ／（中＝tileTags）: ~=水面 ==橋 M=群生地 V=広間 W=水門区画 g=水門 v=水門を見る床 B=背景スロットの壁 b=背景を見る床");
}
console.log(fails ? `\n失敗 ${fails}件` : "\nすべて成功");
process.exit(fails ? 1 : 0);
