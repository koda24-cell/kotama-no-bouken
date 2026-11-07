const { load } = require("./harness");
const g = load(process.argv[2] || require("path").resolve(__dirname, "../.."));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("NG:", m); } else console.log("ok:", m); };
// FOE戦開始を記録
let foeBattle = null; g.fieldTriggerFoeBattle = f => { foeBattle = f.key; };
g.fieldTriggerEncounter = () => {}; g.fieldOnStairs = () => {}; g.fieldAskReturnHome = () => {}; g.fieldOnGate = () => {};
g.fieldState.nextEncounter = 1e9;
function setup(n, f, tx, ty) {
  g.fieldState.area = n; g.fieldState.floor = f; g.fieldState.foeDefeated = {}; g.fieldState.foeGraceSteps = 0;
  const a = g.fieldArea(); const c = g.fieldTileCenter(tx, ty); g.fieldState.x = c.x; g.fieldState.y = c.y; g.fieldSpawnFoes(); foeBattle = null; return a;
}
// 1. 壁は通れない・向きだけ変わる
let a = setup(1, 0, 1, 19);   // 1F 出口(E)は (1,19)
let t = 1000; const step = d => { t += 1000; return g.fieldTryStep(a, d, t); };
ok(!step("left"), "壁へは進めない"); ok(g.fieldState.dir === "left", "壁に向き直る");
ok(step("up"), "床へ1マス進める"); ok(g.fieldPlayerTile().ty === 18, "1マスだけ進む");
// 2. 閉じた扉（a1-gate, 文字 f）は通れず、開けると通れる
const door = a.objects.find(o => o.kind === "door" && o.puzzle === "a1-lever-gate");
ok(!g.fieldCanEnter(a, door.tx, door.ty, "player"), "閉じた仕掛け扉は通れない");
ok(!g.fieldCanEnter(a, door.tx, door.ty, "foe"), "FOEも閉じた扉を通れない");
g.fieldState.flags["puzzle:a1-lever-gate"] = true;
ok(g.fieldCanEnter(a, door.tx, door.ty, "player"), "開いた扉は通れる");
delete g.fieldState.flags["puzzle:a1-lever-gate"];
// 3. 汎用扉（一方通行）のテスト：定義を一時追加
g.FIELD_AREAS[1].objects.z = { kind: "door", id: "test-door", name: "", oneWay: "left" };
const fake = { key: "door:1:test-door", kind: "door", id: "test-door", tx: 5, ty: 5, oneWay: "left" };
ok(!g.fieldDoorOpen(fake), "汎用扉は最初は閉"); g.fieldState.flags["door:test-door:open"] = true; ok(g.fieldDoorOpen(fake), "door:<id>:open で開");
let c = g.fieldTileCenter(4, 5); g.fieldState.x = c.x; g.fieldState.y = c.y; ok(g.fieldDoorSideOk(fake), "西側からは開けられる");
c = g.fieldTileCenter(6, 5); g.fieldState.x = c.x; g.fieldState.y = c.y; ok(!g.fieldDoorSideOk(fake), "東側からは開けられない");
// 4. FOE：前方で見つけると追跡、背後は見えない
a = setup(1, 0, 25, 9);   // foe-bear path (25,14)->(25,9)、初期向き up
const foe = g.fieldState.foes[0];
ok(foe.dir === "up", "FOE初期向きは次の巡回点方向");
g.fieldFoePlace(foe, 25, 9); foe.dir = "up";
ok(!g.fieldFoeSees(a, foe, { tx: 25, ty: 12 }), "背後（3マス後ろ）は見えない");
foe.dir = "down"; ok(g.fieldFoeSees(a, foe, { tx: 25, ty: 12 }), "前方3マスは見える");
// 5. 追跡→見失い→巡回復帰（ターン基準）
a = setup(1, 0, 25, 16); const f2 = g.fieldState.foes[0]; f2.dir = "down";
g.fieldFoeAwareness(a, f2, { tx: 25, ty: 16 }, true); ok(f2.mode === "chase", "見つけると追跡");
// 見えない位置で数ターン
for (let i = 0; i < 6; i++) g.fieldFoeAwareness(a, f2, { tx: 1, ty: 19 }, true);
ok(f2.mode === "return", "見失って数ターンで巡回へ戻る（実時間ではなくターン）");
// 6. 立ち止まっている間はFOEが動かない（fieldUpdate はターンを進めない）
a = setup(1, 0, 25, 17); const before = g.fieldState.foes.map(f => `${f.tx},${f.ty}`).join(); const turn0 = g.fieldState.turn;
g.__now = 5000; for (let i = 0; i < 50; i++) { g.__now += 100; g.fieldUpdate(.1); }
ok(g.fieldState.foes.map(f => `${f.tx},${f.ty}`).join() === before && g.fieldState.turn === turn0, "止まっていればFOEも時間も進まない");
// 7. 接触：FOEの目の前に進むと接触してFOE戦
a = setup(1, 0, 25, 16); const f3 = g.fieldState.foes[0]; g.fieldFoePlace(f3, 25, 14); f3.dir = "down"; f3.mode = "patrol";
t += 1000; g.fieldTryStep(a, "up", t);   // (25,15) へ。FOE が (25,14)->(25,15) で接触
ok(foeBattle === f3.key, "向かってくるFOEとぶつかるとFOE戦");
// 8. 逃走後は数歩止まる
g.fieldResetFoesAfterBattle(null); ok(Math.abs(f3.ty - g.fieldPlayerTile().ty) > 2, "逃走後、近くのFOEは遠い巡回点へ戻る");
const fpos = `${f3.tx},${f3.ty}`; t += 1000; g.fieldTryStep(a, "up", t);
ok(`${f3.tx},${f3.ty}` === fpos && g.fieldState.foeGraceSteps === 2, "逃走後はFOEが数歩止まる");
// 9. FOEは安全地帯（階段）に入らない
a = setup(1, 0, 19, 3);   // 下り階段
ok(!g.fieldCanEnter(a, 19, 3, "foe"), "FOEは階段に入らない");
console.log(fails ? `\n${fails} 件失敗` : "\nすべて成功"); process.exit(fails ? 1 : 0);
