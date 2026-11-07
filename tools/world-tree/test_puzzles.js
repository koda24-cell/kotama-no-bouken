// 仕掛け・扉・隠し通路と、Claude B の処理が無い状態での振り分けの検証（DOMなしのスタブ環境）
const { load } = require("./harness");
const g = load(process.argv[2] || require("path").resolve(__dirname, "../.."));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("NG:", m); } else console.log("ok:", m); };
const said = []; g.fieldSay = async t => { said.push(String(t)); }; g.fieldPlayScene = async id => { said.push("scene:" + id); };
let answer = 0; g.fieldAsk = async () => answer; g.playSe = () => {}; g.sound = () => {};
g.fieldTriggerFoeBattle = () => {}; g.fieldTriggerEncounter = () => {};
(async () => {
  // 第1階層1F：レバーで鉄格子の扉
  g.fieldState.area = 1; g.fieldState.floor = 0; g.fieldState.flags = {};
  let a = g.fieldArea(1, 0);
  const lever = a.objects.find(o => o.kind === "switch" && o.puzzle === "a1-lever-gate");
  const door = a.objects.find(o => o.kind === "door" && o.puzzle === "a1-lever-gate");
  const cache = a.objects.find(o => o.kind === "cache" && o.puzzle === "a1-lever-gate");
  ok(lever && door && cache, "移植したデータに仕掛けのスイッチ・扉・宝箱がある");
  ok(!g.fieldCanEnter(a, door.tx, door.ty), "解く前の扉は通れない");
  ok(g.fieldWallLike(a, g.fieldTileAt(a, lever.tx, lever.ty)), "壁に付いたレバーは壁として扱う");
  await g.fieldInteract(door); ok(said.includes("scene:pz-a1-door"), "扉を調べるとヒントの会話");
  await g.fieldInteract(lever);
  ok(g.fieldState.flags["puzzle:a1-lever-gate"] === true, "レバーで仕掛けが解ける");
  ok(g.fieldCanEnter(a, door.tx, door.ty), "解いた後の扉は通れる");
  ok(g.fieldObjectStateClass(door).includes("is-open"), "扉に is-open が付く");
  said.length = 0; await g.fieldInteract(cache);
  ok(!g.fieldState.flags["puzzle:a1-lever-gate:reward"] && said.some(t => t.includes("今はまだ")), "Claude B の報酬処理が無くてもエラーにならない");
  let called = null; g.fieldPuzzleOpenCache = async (o, pz) => { called = [o.key, !!pz]; };
  await g.fieldInteract(cache); ok(called && called[0] === cache.key && called[1], "扉の奥の宝箱は fieldPuzzleOpenCache(o, pz) に渡す");
  delete g.fieldPuzzleOpenCache;
  // 第4階層2F：隠し通路（ひびの入った岩壁）
  g.fieldState.area = 4; g.fieldState.floor = 1; a = g.fieldArea(4, 1);
  const crack = a.objects.find(o => o.kind === "door" && o.hidden);
  const c = g.fieldTileAt(a, crack.tx, crack.ty);
  ok(g.fieldWallLike(a, c) && g.fieldOpaque(a, crack.tx, crack.ty), "未発見の隠し通路は壁・視界をさえぎる");
  const rateBefore = (() => { let open = 0; for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (!g.fieldOpaque(a, x, y)) open++; return open; })();
  answer = 0; await g.fieldInteract(crack);
  ok(g.fieldState.flags["puzzle:a4-cracked-wall"] && !g.fieldWallLike(a, c) && g.fieldCanEnter(a, crack.tx, crack.ty), "調べて体当たりすると通れる");
  const rateAfter = (() => { let open = 0; for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (!g.fieldOpaque(a, x, y)) open++; return open; })();
  ok(rateAfter === rateBefore + 1, "踏破率の分母に、発見後だけ加わる");
  // 汎用の隠し通路（仕掛けなし）：発見前は表示用の状態も「隠し」
  g.FIELD_AREAS[1].objects.z = { kind: "door", id: "t-hidden", name: "", hidden: true };
  const hid = { key: "door:1:t-hidden", kind: "door", id: "t-hidden", hidden: true, tx: 3, ty: 3 };
  ok(!g.fieldDoorOpen(hid) && g.fieldObjectStateClass(hid).includes("is-hidden-door") && !g.fieldObjectStateClass(hid).includes("is-open"), "汎用の隠し通路は発見前に開いた扱いにならない");
  // サブイベント：Claude B の処理が無くても例外にならない
  g.fieldState.area = 1; g.fieldState.floor = 0; a = g.fieldArea(1, 0);
  const ev = a.objects.find(o => o.kind === "event");
  let threw = false; try { await g.fieldInteract(ev); } catch (e) { threw = true; } ok(!threw, "サブイベントの物を調べても、B の処理が無い状態でエラーにならない");
  let evCalled = null; g.fieldRunSideEvent = async (id, o) => { evCalled = id; }; await g.fieldInteract(ev); ok(evCalled === ev.event, "サブイベントは fieldRunSideEvent(o.event, o) に渡す");
  ok(g.fieldObjectStateClass({ kind: "event", hidden: true, event: "x" }).includes("is-hidden-event"), "隠しサブイベントに is-hidden-event が付く");
  console.log(fails ? `\n${fails} 件失敗` : "\nすべて成功"); process.exit(fails ? 1 : 0);
})();
