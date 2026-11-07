// 全15フロアの到達性・FOEによる封鎖・回避可能性の検証
const { load } = require("./harness");
const g = load(process.argv[2] || require("path").resolve(__dirname, "../.."));
const out = []; let errors = 0, warns = 0;
const E = m => { errors++; out.push("  ✖ " + m); }, W = m => { warns++; out.push("  △ " + m); }, I = m => out.push("  ・" + m);
const N4 = [[1,0],[-1,0],[0,1],[0,-1]];
function bfs(a, from, passable) {
  const seen = new Map([[`${from.tx},${from.ty}`, 0]]), q = [from];
  for (let i = 0; i < q.length; i++) { const c = q[i]; for (const [dx, dy] of N4) { const x = c.tx + dx, y = c.ty + dy, k = `${x},${y}`; if (seen.has(k) || !passable(x, y)) continue; seen.set(k, seen.get(`${c.tx},${c.ty}`) + 1); q.push({ tx: x, ty: y }); } }
  return seen;
}
const reachObj = (seen, o, walk) => walk ? seen.has(`${o.tx},${o.ty}`) : N4.some(([dx, dy]) => seen.has(`${o.tx + dx},${o.ty + dy}`));
function withDoors(open, fn) {
  const saved = { ...g.fieldState.flags };
  for (const [id] of Object.entries(g.FIELD_PUZZLES || {})) if (open) g.fieldState.flags[`puzzle:${id}`] = true; else delete g.fieldState.flags[`puzzle:${id}`];
  for (const k of Object.keys(g.fieldState.flags)) if (k.startsWith("door:") && !open) delete g.fieldState.flags[k];
  try { return fn(); } finally { g.fieldState.flags = saved; }
}
// FOE を「追跡しない巡回」として P ターン動かし、各ターンの位置と向きを記録
function foeTimeline(a, n, f, turns) {
  g.fieldState.area = n; g.fieldState.floor = f; g.fieldState.foeDefeated = {}; g.fieldState.foeGraceSteps = 0;
  g.fieldSpawnFoes();
  const foes = g.fieldState.foes; foes.forEach(x => { x.type = "patrol"; x.mode = "patrol"; });
  const far = { tx: -99, ty: -99 }, tl = [foes.map(x => ({ tx: x.tx, ty: x.ty, dir: x.dir }))];
  for (let t = 0; t < turns; t++) {
    for (const x of foes) { const s = g.fieldFoeNextStep(a, x, far, true); if (s) { x.dir = g.fieldFoeDirTo(x, s) || x.dir; g.fieldFoePlace(x, s.tx, s.ty); } }
    tl.push(foes.map(x => ({ tx: x.tx, ty: x.ty, dir: x.dir })));
  }
  return { foes, tl };
}
function sees(a, foeDef, st, p) { const fake = { def: foeDef, tx: st.tx, ty: st.ty, dir: st.dir }; return g.fieldFoeSees(a, fake, p); }
// 回避経路の探索：状態 (位置, ターン)。stealth=true なら FOE に見られないこと
function avoidSearch(a, start, goals, foes, tl, stealth) {
  const T = tl.length - 1, key = (x, y, t) => `${x},${y},${t}`;
  const q = [{ tx: start.tx, ty: start.ty, t: 0 }], seen = new Set([key(start.tx, start.ty, 0)]);
  for (let i = 0; i < q.length; i++) {
    const c = q[i]; if (goals.has(`${c.tx},${c.ty}`)) return c.t;
    if (c.t >= T) continue;
    for (const [dx, dy] of N4) {
      const x = c.tx + dx, y = c.ty + dy, t = c.t + 1;
      if (!g.fieldCanEnter(a, x, y, "player")) continue;
      const before = tl[c.t], after = tl[t];
      let bad = false;
      for (let k = 0; k < foes.length && !bad; k++) {
        if (before[k].tx === x && before[k].ty === y) bad = true;          // 自分からFOEのマスへ
        else if (after[k].tx === x && after[k].ty === y) bad = true;       // FOE が来る
        else if (stealth && !goals.has(`${x},${y}`) && sees(a, foes[k].def, after[k], { tx: x, ty: y })) bad = true;
      }
      if (bad || seen.has(key(x, y, t))) continue;
      seen.add(key(x, y, t)); q.push({ tx: x, ty: y, t });
    }
  }
  return -1;
}
for (const [nStr, def] of Object.entries(g.FIELD_AREAS)) {
  const n = Number(nStr);
  def.floors.forEach((fl, f) => {
    out.push(`■ 第${n}階層 ${f + 1}フロア目（${g.fieldFloorLabel(n, f)}）`);
    g.fieldState.area = n; g.fieldState.floor = f;
    const a = g.fieldArea(n, f), start = a.start;
    const must = a.objects.filter(o => ["stairs", "exit", "gate", "save"].includes(o.kind));
    const want = a.objects.filter(o => !["door", "cache"].includes(o.kind) && !(o.kind === "event" && o.hidden));
    // 1. 到達性（扉を閉じた状態／開いた状態）
    for (const open of [false, true]) withDoors(open, () => {
      const seen = bfs(a, start, (x, y) => g.fieldCanEnter(a, x, y, "player"));
      const miss = want.filter(o => !reachObj(seen, o, o.walk));
      if (miss.length) (open ? E : W)(`扉${open ? "開" : "閉"}で到達不能：${miss.map(o => `${o.kind}(${o.tx},${o.ty})`).join(" ")}`);
      if (open) { const caches = a.objects.filter(o => o.kind === "cache"); const cm = caches.filter(o => !reachObj(seen, o, false)); if (cm.length) E(`扉を開けても仕掛けの宝箱に届かない：${cm.map(o => `(${o.tx},${o.ty})`).join(" ")}`); }
    });
    const foesDef = fl.foes || [];
    if (!foesDef.length) { I("FOEなし"); return; }
    withDoors(false, () => {
      const { foes, tl } = foeTimeline(a, n, f, 400);
      foes.forEach((x, k) => {
        const route = new Set(tl.map(s => `${s[k].tx},${s[k].ty}`));
        // 巡回点が通れるか・巡回できているか
        for (const p of x.path) if (!g.fieldFoeWalkable(a, p[0], p[1])) E(`FOE${k}（${x.enemy?.name}）の巡回点 (${p}) に入れない`);
        if (x.path.length > 1 && route.size < 2) E(`FOE${k}（${x.enemy?.name}）が巡回できていない（経路なし）`);
        // 巡回路を壁とみなしても、必須地点へ行けるか（＝巡回路が唯一の通り道か）
        const seen = bfs(a, start, (xx, yy) => g.fieldCanEnter(a, xx, yy, "player") && !route.has(`${xx},${yy}`));
        const cut = must.filter(o => !reachObj(seen, o, o.walk));
        if (cut.length) W(`FOE${k}（${x.enemy?.name}）の巡回路(${route.size}マス)が ${cut.map(o => o.kind).join("・")} への唯一の通り道 → タイミングを見て抜ける必要あり`);
        // 階段・出口の隣に居続けないか
        const nearSafe = tl.filter(s => N4.some(([dx, dy]) => "<>EB".includes(g.fieldTileAt(a, s[k].tx + dx, s[k].ty + dy)))).length;
        if (nearSafe > tl.length * .5) E(`FOE${k} が階段・出口の隣にいる時間が長すぎる（${Math.round(nearSafe / tl.length * 100)}%）`);
        else if (nearSafe) W(`FOE${k} が階段・出口の隣を通る（${Math.round(nearSafe / tl.length * 100)}%）`);
        I(`FOE${k}（${x.enemy?.name}）type=${x.type === "patrol" ? (foesDef[k].type || "chaser") : x.type} 巡回路 ${route.size}マス`);
      });
      // 挟み撃ち：2体の巡回路が近い
      for (let i = 0; i < foes.length; i++) for (let j = i + 1; j < foes.length; j++) {
        const close = tl.some(s => Math.abs(s[i].tx - s[j].tx) + Math.abs(s[i].ty - s[j].ty) <= 3);
        if (close) W(`FOE${i} と FOE${j} が3マス以内に近づく → 挟み撃ちの確認が必要`);
      }
      // 回避可能性：開始位置 → 下り階段（またはボス門）
      const goalObjs = a.objects.filter(o => (o.kind === "stairs" && o.dir === "down") || o.kind === "gate");
      const goals = new Set(goalObjs.map(o => `${o.tx},${o.ty}`));
      const t1 = avoidSearch(a, start, goals, foes, tl, false), t2 = avoidSearch(a, start, goals, foes, tl, true);
      if (t1 < 0) E("FOEに接触せずに次のフロアへ行く経路がない"); else I(`接触せずに下り階段へ：最短 ${t1} 歩`);
      if (t2 < 0) W("FOEに一度も見つからずに下り階段へ行く経路はない（見つかった後に振り切る必要あり）"); else I(`見つからずに下り階段へ：最短 ${t2} 歩`);
    });
  });
}
console.log(out.join("\n"));
console.log(`\n結果：エラー ${errors} 件／注意 ${warns} 件`);
process.exit(errors ? 1 : 0);
