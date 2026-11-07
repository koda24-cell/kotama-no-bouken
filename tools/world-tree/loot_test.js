"use strict";
/* ============================================================
   tools/world-tree/loot_test.js — 宝箱・採集・サブイベント・仕掛けの報酬・セーブ形式11 の検証（Claude B）
   実行：node tools/world-tree/loot_test.js [比較用の旧コードのフォルダ]
     旧コードのフォルダを省略すると、git archive 14d9fc0（saveVersion 10 の基準）を一時フォルダに展開して使う。
   DOM はスタブ（loot_harness.js）。ブラウザでの見た目・操作は確認できない。
   ============================================================ */
const path = require("path"), fs = require("fs"), os = require("os"), { execSync } = require("child_process");
const { makeFull } = require("./loot_harness");
const ROOT = path.join(__dirname, "../..");
let BASE = process.argv[2];
if (!BASE) {
  BASE = fs.mkdtempSync(path.join(os.tmpdir(), "loot-base-"));
  execSync(`git -C "${ROOT}" archive 14d9fc0 | tar -x -C "${BASE}"`);
}
const R = []; let fails = 0;
const ok = (name, cond, extra = "") => { R.push(`${cond ? "PASS" : "FAIL"} ${name}${extra ? " … " + extra : ""}`); if (!cond) fails++; };
const info = s => R.push("INFO " + s);
const J = x => JSON.stringify(x);

(async () => {
  /* ---------- 1. データ整合 ---------- */
  let c = makeFull(ROOT, null), r = c.run;
  const issues = r(`(()=>{const out=[];const names=materialNames;
    for(const [fk,pts] of Object.entries(FIELD_GATHER_POINTS)){const [n,f]=fk.split('-').map(Number);const a=fieldArea(n,f);
      for(const [xy,p] of Object.entries(pts)){const [x,y]=xy.split(',').map(Number);if(fieldTileAt(a,x,y)!=='G')out.push('Gでない '+fk+' '+xy);
        if(!FIELD_GATHER_KINDS[p.kind])out.push('種別不明 '+fk+xy);
        for(const [m,w] of p.table){if(!names[m])out.push('素材不明 '+m);if(!(w>0))out.push('重み '+fk+xy);
          if(!(a.floor.gathers||[]).some(g=>g[0]===m))out.push('フロアの従来素材以外 '+fk+' '+xy+' '+m);}}}
    for(const [key,{o}] of fieldLootIndex()){if(o.kind==='chest'){const rw=o.reward;for(const [id] of [...(rw.items||[]),...(rw.item?[[rw.item]]:[])])if(!itemById(id))out.push('アイテム不明 '+id);
        for(const [id] of [...(rw.materials||[]),...(rw.material?[[rw.material]]:[])])if(!names[id])out.push('素材不明 '+id);}}
    for(const pz of Object.values(FIELD_PUZZLES)){for(const [id] of pz.reward?.materials||[])if(!names[id])out.push('cache素材不明 '+id);for(const [id] of pz.reward?.items||[])if(!itemById(id))out.push('cacheアイテム不明 '+id);}
    for(const ev of Object.values(FIELD_SIDE_EVENTS)){for(const [id] of ev.reward?.materials||[])if(!names[id])out.push('side素材不明 '+id);for(const [id] of ev.reward?.items||[])if(!itemById(id))out.push('sideアイテム不明 '+id);for(const id of Object.keys(ev.needs||{}))if(!names[id])out.push('needs素材不明 '+id);
      for(const s of [ev.scene,ev.doneScene,ev.hintScene])if(s&&!STORY_SCENES[s])out.push('会話なし '+s);for(const q of ev.requires||[])if(!FIELD_SIDE_EVENTS[q])out.push('requires不明 '+q);}
    return out;})()`);
  ok("データ整合（採集点はすべて G・素材/アイテムIDは既存・フロアの従来素材のみ・サブイベントの会話と前提が存在）", issues.length === 0, issues.join(" / ") || "問題0件");
  const counts = r(`(()=>{const k={take:0,chop:0,mine:0},m={chest:0,cache:0,gather:0};for(const {a,o} of fieldLootIndex().values()){m[o.kind]++;if(o.kind==='gather')k[fieldGatherKindOf(a,o)]++;}return {k,m};})()`);
  info(`探索オブジェクト：宝箱 ${counts.m.chest}／扉の奥の宝箱 ${counts.m.cache}／採集点 ${counts.m.gather}（${J(counts.k)}）`);
  ok("扉の奥の宝箱5つがすべて仕掛けIDに対応（fieldArea が puzzle を写していなくても元データから引ける）", counts.m.cache === 5 && r(`[...fieldLootIndex().values()].filter(e=>e.o.kind==='cache').every(e=>FIELD_PUZZLES[fieldLootCachePuzzle(e.o)])`));
  ok("採集点の名前が種別に応じる（伐採ポイント・採掘ポイント）", r(`fieldLootIndex().get('gather:1-1:23:11').o.name`) === "伐採ポイント" && r(`fieldLootIndex().get('gather:4-0:11:9').o.name`) === "採掘ポイント");

  /* ---------- 2. 宝箱・採集の状態遷移 ---------- */
  r(`fieldState.area=1;fieldState.floor=1;fieldState.explored={};fieldState.flags={};fieldState.gatherUsed={};fieldState.discovered={};state.gold=0;for(const k of Object.keys(materials))delete materials[k];for(const k of Object.keys(inventory))delete inventory[k];`);
  const ck = "chest:1-1:17:1", gk = "gather:1-1:23:11";
  ok("未踏の宝箱は undiscovered・未踏の採集点の種別は返さない", r(`fieldLootState('${ck}')`) === "undiscovered" && r(`fieldGatherKind('${gk}')`) === null);
  ok("未踏だけのフロア集計は0（総数を出さない）", J(r(`fieldFloorSummary(1,1)`)) === J({ chestsKnown: 0, chestsOpened: 0, gathersKnown: 0, gathersReady: 0, gathersByKind: {} }));
  r(`{const a=fieldArea(1,1),e=fieldExplored(a);e[1*a.w+17]=1;e[11*a.w+23]=1;}`);
  ok("踏破で discovered／ready・種別 chop", r(`fieldLootState('${ck}')`) === "discovered" && r(`fieldLootState('${gk}')`) === "ready" && r(`fieldGatherKind('${gk}')`) === "chop");
  c.events.length = 0; delete c.store.fantasyRpgSave;
  await r(`fieldOpenChest(fieldLootIndex().get('${ck}').o)`);
  ok("宝箱（2Fの素材追加）：60G＋魔物の皮×2", r("state.gold") === 60 && r("materials.monster_hide") === 2);
  ok("オートセーブ（localStorage）に saveVersion 11・開封フラグ・discovered", (s => s && s.saveVersion === 11 && s.field.flags[ck] === true && s.field.discovered.includes(ck))(c.lastSave()));
  ok("field:material（source=chest）と field:chest の detail（kind/state/remaining/respawn/granted）", c.events.some(e => e[0] === "field:material" && e[1].source === "chest" && e[1].materialId === "monster_hide" && e[1].count === 2)
    && (e => e && e[1].kind === "chest" && e[1].state === "opened" && e[1].remaining === 0 && e[1].respawn === "never" && e[1].objectId === ck && e[1].granted.gold === 60)(c.events.find(e => e[0] === "field:chest")));
  await r(`fieldOpenChest(fieldLootIndex().get('${ck}').o)`);
  ok("宝箱2回目は空（増えない）・opened", r("state.gold") === 60 && r("materials.monster_hide") === 2 && r(`fieldLootState('${ck}')`) === "opened" && c.said.at(-1) === "宝箱は空っぽだ。");
  await r(`fieldOpenChest(fieldLootIndex().get('chest:1-1:9:13').o)`);
  ok("既存形式 {item:'ether',count:1} は従来どおり", r("inventory.ether") === 1);
  c.events.length = 0;
  const T0 = 1_800_000_000_000; r(`fieldNowMs = () => ${T0}`);   // 実時間を固定（30分ルールの検証用）
  await r(`fieldGather(fieldLootIndex().get('${gk}').o)`);
  const ge = c.events.find(e => e[0] === "field:gather");
  ok("採集1回目：remaining 1・kind chop・uses 2・respawn time・respawnAt=30分後・オートセーブに gatherUsed=1 と時刻", ge && ge[1].remaining === 1 && ge[1].kind === "chop" && ge[1].uses === 2 && ge[1].respawn === "time" && ge[1].respawnAt === T0 + 30 * 60000 && c.lastSave().field.gatherUsed[gk] === 1 && c.lastSave().field.gatherTimes[gk] === T0);
  ok("採集メッセージが種別に応じる", /伐採ポイントだ！ 木を切り出した。/.test(c.said.at(-1)), c.said.at(-1));
  await r(`fieldGather(fieldLootIndex().get('${gk}').o)`);
  const matsBefore = J(r("materials"));
  await r(`fieldGather(fieldLootIndex().get('${gk}').o)`);
  ok("採集2回で depleted・3回目は素材が増えない", r(`fieldLootState('${gk}')`) === "depleted" && J(r("materials")) === matsBefore);
  ok("採り尽くしたときは、戻るまでの残り時間を表示", /あと約30分で、また採れるようになる/.test(c.said.at(-1)), c.said.at(-1));
  ok("フロア集計（既知の分だけ）", J(r(`fieldFloorSummary(1,1)`)) === J({ chestsKnown: 2, chestsOpened: 2, gathersKnown: 1, gathersReady: 0, gathersByKind: { chop: { known: 1, ready: 0 } } }));
  ok("fieldLootList は発見済みだけ・採集点に remaining/uses/respawn", (l => l.length === 3 && l.find(x => x.key === gk).remaining === 0 && l.find(x => x.key === gk).uses === 2)(r(`fieldLootList(1,1)`)));
  const fsave = JSON.parse(J(r(`fieldSerialize()`)));
  r(`fieldDeserialize(${J(fsave)})`);
  ok("fieldSerialize→fieldDeserialize 後も depleted／opened（ロードで無限採集できない）", r(`fieldLootState('${gk}')`) === "depleted" && r(`fieldLootState('${ck}')`) === "opened");
  let enterErr = null;
  r(`fieldState.flags['floor:1-1']=true;fieldState.flags.prologue=true;`);   // 1F の導入イベント（openEvent）を避けるため 2F へ出発する
  try { await r(`fieldEnterArea(1,{floor:1,fromHome:true})`); } catch (e) { enterErr = e; }
  ok("ホームから出発（fieldEnterArea fromHome）しても採集点は戻らない（時間で戻る）・expedition+1・宝箱は opened のまま", !enterErr && r(`fieldLootState('${gk}')`) === "depleted" && r("fieldState.expedition") === fsave.expedition + 1 && r(`fieldLootState('${ck}')`) === "opened");
  r(`fieldNowMs = () => ${T0 + 29 * 60000}`);
  ok("29分後はまだ戻らない", r(`fieldLootState('${gk}')`) === "depleted");
  c.events.length = 0; r(`fieldNowMs = () => ${T0 + 30 * 60000}`);
  ok("最初の採集から30分で ready に戻り、field:loot:respawn（reason=time）が出る", r(`fieldLootState('${gk}')`) === "ready" && c.events.some(e => e[0] === "field:loot:respawn" && e[1].reason === "time" && e[1].keys.includes(gk)));
  // ゲームを閉じている間も時間は進む：採集→保存→35分後の時刻で読み込む
  r(`fieldNowMs = () => ${T0}`); await r(`fieldGather(fieldLootIndex().get('${gk}').o)`); await r(`fieldGather(fieldLootIndex().get('${gk}').o)`);
  const fs2 = JSON.parse(J(r(`fieldSerialize()`)));
  r(`fieldNowMs = () => ${T0 + 35 * 60000}`); r(`fieldDeserialize(${J(fs2)})`);
  ok("閉じている間に30分たっていれば、読み込んだときに戻る", r(`fieldLootState('${gk}')`) === "ready" && !r(`fieldState.gatherUsed['${gk}']`));
  // 時刻の無い旧形式（saveVersion 11 の提案版）は、読み込んだ時刻から数える
  const fs3 = { ...fs2 }; delete fs3.gatherTimes; r(`fieldNowMs = () => ${T0 + 100 * 60000}`); r(`fieldDeserialize(${J(fs3)})`);
  ok("時刻の無いセーブは、読み込んだ時刻から30分で戻る", r(`fieldLootState('${gk}')`) === "depleted" && r(`fieldState.gatherTimes['${gk}']`) === T0 + 100 * 60000);
  r(`fieldNowMs = () => Date.now()`);
  const dist = r(`(()=>{const e=fieldLootIndex().get('gather:4-0:11:9');const t=fieldGatherPointDef(e.a,e.o).table;const d={};for(let i=0;i<20000;i++){const m=fieldGatherPick(t);d[m]=(d[m]||0)+1;}return d;})()`);
  info("採掘ポイント gather:4-0:11:9（第4階層の1フロア目）20000回抽選：" + J(dist));
  ok("抽選はテーブルの素材だけ", Object.keys(dist).every(k => ["monster_fang", "dragon_scale", "monster_hide"].includes(k)));
  ok("fieldMaterialSources は発見済みの採集点だけ", r(`fieldMaterialSources('dragon_scale').length`) === 0 && r(`fieldMaterialSources('monster_hide').some(s=>s.key==='${gk}')`));
  ok("未定義の素材IDは付与しない（警告のみ）", r(`fieldLootAddMaterial('no_such_mat',1,'test')`) === false && r(`materials.no_such_mat`) === undefined);

  /* ---------- 3. 扉の奥の宝箱（fieldPuzzleOpenCache） ---------- */
  const cacheExpr = `[...fieldLootIndex().values()].find(e=>e.o.kind==='cache'&&e.o.id==='a1-cache').o`;
  // A（field/field-puzzles.js）が入っていない状態と入った状態の両方で動くように確認する
  const hasA = r(`typeof fieldPuzzleSolved`) === "function";
  info(hasA ? "Claude A の field/field-puzzles.js あり（マージ後の状態として検証）" : "Claude A の fieldPuzzleSolved／fieldPuzzleRefresh なし（このブランチ単体として検証）");
  if (hasA) r(`fieldState.flags['puzzle:a1-lever-gate']=true;`);
  r(`state.gold=0;`); c.events.length = 0;
  let cacheErr = null;
  try { await r(`fieldPuzzleOpenCache(${cacheExpr}, FIELD_PUZZLES['a1-lever-gate'])`); } catch (e) { cacheErr = e; }
  ok((hasA ? "A あり" : "A の関数が無くても") + "：エラーにならず報酬（80G・エーテル）と field:puzzle:reward（kind=cache）", !cacheErr && r("state.gold") === 80 && r(`fieldState.flags['puzzle:a1-lever-gate:reward']`) === true
    && (e => e && e[1].kind === "cache" && e[1].puzzleId === "a1-lever-gate" && e[1].state === "opened")(c.events.find(e => e[0] === "field:puzzle:reward")), cacheErr ? String(cacheErr) : "");
  ok("オートセーブ時点で報酬フラグが保存済み・cache は opened", c.lastSave().field.flags["puzzle:a1-lever-gate:reward"] === true && r(`fieldLootState(${cacheExpr}.key)`) === "opened");
  await r(`fieldPuzzleOpenCache(${cacheExpr}, FIELD_PUZZLES['a1-lever-gate'])`);
  ok("2回目は空（増えない）", r("state.gold") === 80);
  // A の関数がある状態を模擬
  r(`globalThis.__refreshed=[]; fieldPuzzleSolved = id => !!fieldState.flags['puzzle:'+id]; fieldPuzzleRefresh = id => __refreshed.push(id);`);
  const c2Expr = `[...fieldLootIndex().values()].find(e=>e.o.kind==='cache'&&e.o.id==='a2-cache').o`;
  const got0 = await r(`fieldPuzzleOpenCache(${c2Expr}, FIELD_PUZZLES['a2-twin-stones'])`);
  ok("A あり：未解決なら何も渡さない（false）", got0 === false && !r(`fieldState.flags['puzzle:a2-twin-stones:reward']`));
  r(`fieldState.flags['puzzle:a2-twin-stones']=true;`);
  const got1 = await r(`fieldPuzzleOpenCache(${c2Expr}, FIELD_PUZZLES['a2-twin-stones'])`);
  ok("A あり：解決後は報酬（ゴブリンの布×2 を含む）・fieldPuzzleRefresh('a2-twin-stones') を呼ぶ", got1 === true && J(r("__refreshed")) === J(["a2-twin-stones"]) && r("materials.goblin_cloth") >= 2);
  ok("pz を省略しても o から仕掛けを引ける", await r(`(async()=>{fieldState.flags['puzzle:a4-cracked-wall']=true;const g=state.gold;await fieldPuzzleOpenCache([...fieldLootIndex().values()].find(e=>e.o.kind==='cache'&&e.o.id==='a4-cache').o);return state.gold-g;})()`) === 300);

  /* ---------- 4. サブイベント ---------- */
  r(`fieldState.area=1;fieldState.floor=0;state.gold=0;for(const k of Object.keys(materials))delete materials[k];for(const k of Object.keys(inventory))delete inventory[k];for(const k of Object.keys(fieldState.flags))if(k.startsWith('side:'))delete fieldState.flags[k];`);
  const npcExpr = id => `(()=>{for(let f=0;f<fieldFloorCount(1);f++){const o=fieldArea(1,f).objects.find(x=>x.id==='${id}');if(o)return o;}})()`;
  c.said.length = 0;
  await r(`fieldRunNpcSideEvents(${npcExpr("woodcutter")})`);
  ok("NPC（sideEvents を写していない現行 fieldArea の物でも元データから引ける）：前提未達ならヒント会話のみ", c.said.includes("[scene] side-a1-axe-hint") && !r(`fieldSideDone('a1-axe-return')`) && r("state.gold") === 0);
  c.events.length = 0;
  const stumpOk = await r(`fieldRunSideEvent('a1-old-stump', {key:'event:1:a1-old-stump',kind:'event',id:'a1-old-stump'})`);
  ok("調べる物のサブイベント：完了フラグ・だいじなもの表示・side:complete・オートセーブ", stumpOk === true && r(`fieldState.flags['side:a1-old-stump']`) === true && c.said.some(t => /だいじなもの「木こりの手斧」/.test(t)) && c.events.some(e => e[0] === "field:side:complete" && e[1].eventId === "a1-old-stump") && c.lastSave().field.flags["side:a1-old-stump"] === true);
  const again = await r(`fieldRunSideEvent('a1-old-stump', null)`);
  ok("完了後にもう一度：doneScene のみ・false", again === false && c.said.at(-1) === "[scene] side-a1-old-stump-done");
  await r(`fieldRunNpcSideEvents(${npcExpr("woodcutter")})`);
  ok("前提達成後の NPC：報酬 60G＋エーテル×1", r(`fieldSideDone('a1-axe-return')`) && r("state.gold") === 60 && r("inventory.ether") === 1);
  await r(`fieldRunNpcSideEvents(${npcExpr("woodcutter")})`);
  ok("NPC の完了済みイベントは再実行しない", r("state.gold") === 60);
  r(`materials.slime_jelly=2;`);
  await r(`fieldRunNpcSideEvents(${npcExpr("herb-girl")})`);
  ok("素材を渡すイベント：不足なら必要数を表示して何もしない", !r(`fieldSideDone('a1-herb-medicine')`) && /必要：スライムゼリー×3（所持 2）/.test(c.said.at(-1)));
  r(`materials.slime_jelly=4;`); c.answer = 1;
  await r(`fieldRunNpcSideEvents(${npcExpr("herb-girl")})`);
  ok("「やめる」なら消費しない", r("materials.slime_jelly") === 4 && !r(`fieldSideDone('a1-herb-medicine')`));
  c.answer = 0;
  await r(`fieldRunNpcSideEvents(${npcExpr("herb-girl")})`);
  ok("「渡す」でスライムゼリー3つ消費・ポーション×3", r("materials.slime_jelly") === 1 && r("inventory.potion") === 3 && r(`fieldSideDone('a1-herb-medicine')`));
  await r(`(async()=>{fieldState.area=4;await fieldRunSideEvent('a4-ore-vein',null);})()`);
  ok("素材報酬のサブイベント（炎竜の鱗×1）は fieldLootAddMaterial を通る（source=side）", r("materials.dragon_scale") === 1 && c.events.some(e => e[0] === "field:material" && e[1].source === "side" && e[1].materialId === "dragon_scale"));
  ok("fieldSideDone は render から typeof 確認で呼べる関数", r(`typeof fieldSideDone`) === "function");

  /* ---------- 4b. Claude A の fieldInteract 経由（A のコードがあるときだけ。マージ後の確認用） ---------- */
  if (hasA) {
    r(`fieldState.area=1;fieldState.floor=0;state.gold=0;for(const k of Object.keys(fieldState.flags))if(k.startsWith('side:')||k.startsWith('puzzle:a1'))delete fieldState.flags[k];for(const k of Object.keys(inventory))delete inventory[k];`);
    const objs = `fieldArea(1,0).objects`;
    c.answer = 0;
    await r(`fieldInteract(${objs}.find(o=>o.kind==='switch'&&o.puzzle==='a1-lever-gate'))`);
    await r(`fieldInteract(${objs}.find(o=>o.kind==='cache'&&o.puzzle==='a1-lever-gate'))`);
    ok("A 経由：レバー→扉の奥の宝箱で 80G・エーテル（fieldPuzzleInteract → fieldPuzzleOpenCache）", r("state.gold") === 80 && r("inventory.ether") === 1 && r(`fieldState.flags['puzzle:a1-lever-gate:reward']`) === true);
    const evObj = r(`(()=>{for(let f=0;f<3;f++){const o=fieldArea(1,f).objects.find(o=>o.kind==='event'&&o.event==='a1-old-stump');if(o)return {f,key:o.key};}})()`);
    await r(`fieldInteract(fieldArea(1,${evObj ? evObj.f : 0}).objects.find(o=>o.key==='${evObj ? evObj.key : ""}'))`);
    ok("A 経由：調べる物（kind:event）→ fieldRunSideEvent で完了", !!evObj && r(`fieldSideDone('a1-old-stump')`));
    const npc = r(`(()=>{for(let f=0;f<3;f++){const o=fieldArea(1,f).objects.find(o=>o.id==='woodcutter');if(o)return {f,key:o.key,se:o.sideEvents};}})()`);
    await r(`fieldInteract(fieldArea(1,${npc.f}).objects.find(o=>o.key==='${npc.key}'))`);
    ok("A 経由：NPC（o.sideEvents あり）の会話後に fieldRunNpcSideEvents で報酬 60G", Array.isArray(npc.se) && r(`fieldSideDone('a1-axe-return')`) && r("state.gold") === 140);
  }

  /* ---------- 5. ショップ・製作との連携 ---------- */
  r(`state.gold=0;for(const k of Object.keys(materials))delete materials[k];for(const k of Object.keys(inventory))delete inventory[k];`);
  const recipe = r(`recipes[0]`);
  r(`fieldLootGrant({gold:${recipe.cost + 500}, materials:Object.entries(recipes[0].needs)},'chest')`);
  // 初回製作の実績（weapon_smith）の報酬ゴールドが入るので、その分を差し引いて比べる
  const smithReward = r(`achievementUnlocked.weapon_smith ? 0 : (achievementDefinitions.find(a=>a.id==='weapon_smith')?.reward || 0)`);
  let craftErr = null; try { r(`craftRecipe(recipes[0].id)`); } catch (e) { craftErr = e; }
  ok(`宝箱で得た素材・ゴールドで製作（${recipe.name}）：素材とゴールドを消費し武器を得る`, !craftErr && r(`inventory[recipes[0].id]`) === 1 && Object.keys(recipe.needs).every(m => (r(`materials['${m}']`) || 0) === 0) && r("state.gold") === 500 + smithReward, craftErr ? String(craftErr) : `実績報酬 ${smithReward}G を含む`);
  const potionPrice = r(`shopItems.find(i=>i.id==='potion').price`), goldBeforeBuy = r("state.gold");
  let buyErr = null; try { r(`buyItem('potion','store')`); } catch (e) { buyErr = e; }
  ok("宝箱のゴールドでショップ購入（ポーション）", !buyErr && r("inventory.potion") === 1 && r("state.gold") === goldBeforeBuy - potionPrice, buyErr ? String(buyErr) : "");
  ok("素材売却：現行 development に売却処理が無い（対象なし）", r(`typeof sellMaterial`) === "undefined" && !/function\s+sell/i.test(fs.readFileSync(path.join(ROOT, "script.js"), "utf8")));

  /* ---------- 6. 描画（DOM スタブ上で例外が出ないことだけ） ---------- */
  let drawErr = null;
  try { for (let n = 1; n <= 5; n++) for (let f = 0; f < 3; f++) r(`fieldState.area=${n};fieldState.floor=${f};fieldBuildDom();fieldDrawMap($("field-minimap"),4,true);`); } catch (e) { drawErr = e; }
  ok("全15フロアで fieldBuildDom・fieldDrawMap が例外なし（DOMスタブ。見た目は未確認）", !drawErr, drawErr ? String(drawErr) : "");

  /* ---------- 7. セーブ互換 ---------- */
  // 7-1 旧コード（14d9fc0・saveVersion 10）で途中まで進めたセーブを作る
  const old = makeFull(BASE, null); const ro = old.run;
  ro(`state.gold=500;state.party=['kotama','knight','healer','warrior'];state.maxUnlockedStage=2;state.firstStageStarted=true;stageCleared[1]=true;
    fieldState.area=1;fieldState.floor=1;fieldState.flags={'floor:1-1':true,'chest:1-1:17:1':true,'prologue':true,'puzzle:a1-lever-gate':true,'puzzle:a1-lever-gate:reward':true,'side:a1-old-stump':true};
    {const a=fieldArea(1,1),e=fieldExplored(a);for(let i=0;i<a.w*6;i++)e[i]=1;}
    {const a=fieldArea(1,0),e=fieldExplored(a);e[17*a.w+9]=1;}
    fieldState.gatherUsed={'gather:1-0:9:17':2};
    materials.monster_hide=3;`);
  const v10 = old.save();
  ok("旧コードのセーブは saveVersion 10・field.gatherUsed なし", v10.saveVersion === 10 && v10.field && v10.field.gatherUsed === undefined);
  c = makeFull(ROOT, v10); r = c.run; r("loadGame()");
  ok("v10 読込：ゴールド・素材・開封／サブイベント／仕掛けのフラグがそのまま", r("state.gold") === 500 && r("materials.monster_hide") === 3 && r(`fieldState.flags['chest:1-1:17:1']`) === true && r(`fieldSideDone('a1-old-stump')`) === true);
  ok("v10 読込：宝箱(17,1)・扉の奥の宝箱は opened", r(`fieldLootState('chest:1-1:17:1')`) === "opened" && r(`fieldLootState(${cacheExpr}.key)`) === "opened");
  ok("v10 読込：採集回数は0扱い（旧版は保存していない）・未踏の採集点は undiscovered", r(`fieldLootState('gather:1-0:9:17')`) === "ready" && r(`fieldLootState('gather:1-1:13:7')`) === "undiscovered");
  const v11 = c.save();
  ok("v10 を再セーブ：saveVersion 11・discovered に踏破済みのものだけ・gatherUsed {}・expedition 0", v11.saveVersion === 11 && v11.field.discovered.includes("chest:1-1:17:1") && v11.field.discovered.includes("gather:1-0:9:17") && !v11.field.discovered.includes("gather:1-1:13:7") && J(v11.field.gatherUsed) === "{}" && v11.field.expedition === 0);
  // 7-2 既存項目を1つも消していない
  const oldKeys = Object.keys(v10).sort(), newKeys = Object.keys(v11).sort();
  ok("トップレベルの既存セーブ項目（monsterRecords 等）がすべて残る", oldKeys.every(k => newKeys.includes(k)) && newKeys.includes("monsterRecords"), "旧 " + oldKeys.length + " 項目 → 新 " + newKeys.length + " 項目");
  ok("field の既存項目がすべて残り、追加は gatherUsed・gatherTimes・discovered・expedition だけ", (() => { const o = Object.keys(v10.field), n = Object.keys(v11.field); return o.every(k => n.includes(k)) && J(n.filter(k => !o.includes(k)).sort()) === J(["discovered", "expedition", "gatherTimes", "gatherUsed"]); })());
  // 7-3 旧コード／新コードで同じ v10 を読込→再セーブして比較
  const strip = s => { const x = JSON.parse(J(s)); delete x.saveVersion; for (const k of ["gatherUsed", "gatherTimes", "discovered", "expedition"]) delete (x.field || {})[k]; return J(x); };
  const ob = makeFull(BASE, v10); ob.run("loadGame()");
  ok("v10 を旧コード／新コードで読込→再セーブ：saveVersion と追加4項目以外は完全一致", strip(ob.save()) === strip(v11));
  // 7-4 v11 で採り尽くし → セーブ → ロード
  r(`fieldState.gatherUsed['gather:1-0:9:17']=2;fieldState.expedition=3;`);
  const v11b = c.save();
  c = makeFull(ROOT, v11b); r = c.run; r("loadGame()");
  ok("v11 往復：採り尽くした採集点は depleted のまま・expedition 3", r(`fieldLootState('gather:1-0:9:17')`) === "depleted" && r("fieldState.gatherUsed['gather:1-0:9:17']") === 2 && r("fieldState.expedition") === 3);
  // 7-5 フィールド導入前
  const pre = JSON.parse(J(v10)); pre.saveVersion = 8; delete pre.field; delete pre.levelExp;
  c = makeFull(ROOT, pre); r = c.run; r("loadGame()");
  ok("フィールド導入前のセーブ：読める・採集0・発見0・expedition 0・再セーブで saveVersion 11", r("state.gold") === 500 && J(r("fieldState.gatherUsed")) === "{}" && Object.keys(r("fieldState.discovered")).length === 0 && r("fieldState.expedition") === 0
    && (s => s.saveVersion === 11 && J(s.field.gatherUsed) === "{}" && Array.isArray(s.field.discovered))(c.save()));
  // 7-6 フロア導入前
  const pf = JSON.parse(J(v10)); pf.saveVersion = 9; pf.field = { area: 2, x: 100, y: 100, positioned: true, flags: { prologue: true }, enemyEncounters: {} }; pf.state.maxUnlockedStage = 3; pf.stageCleared = { 1: true, 2: true };
  c = makeFull(ROOT, pf); r = c.run; r("loadGame()");
  ok("フロア導入前のセーブ：第2階層1F・クリア済み階層のフロア解放・宝箱は undiscovered", r("fieldState.area") === 2 && r("fieldState.floor") === 0 && r(`fieldState.flags['floor:1-2']`) === true && r(`fieldLootState('chest:2-0:19:1')`) === "undiscovered");
  // 7-7 不正値
  const bad = JSON.parse(J(v11)); bad.field.gatherUsed = { "gather:1-0:9:17": 99, "gather:9-9:0:0": 1, "chest:1-1:17:1": 1, "gather:1-0:1:1": "abc" }; bad.field.discovered = "x"; bad.field.expedition = -5;
  c = makeFull(ROOT, bad); r = c.run; r("loadGame()");
  ok("不正値：回数は上限2に丸め・存在しないキー/採集点以外/文字列は捨てる・expedition 0", J(r("fieldState.gatherUsed")) === '{"gather:1-0:9:17":2}' && r("fieldState.expedition") === 0);
  ok("不正値：discovered が配列でなくても踏破ビットから再構成", r(`fieldLootState('chest:1-1:17:1')`) === "opened" && r(`fieldLootState('gather:1-0:9:17')`) === "depleted");
  // 7-8 A のフラグ（door:/hidden: 等）は既存の flags 保存で往復
  r(`fieldState.flags['door:a2-test:open']=true;fieldState.flags['puzzle:a3-lanterns:sw:x']=true;`);
  const c3 = makeFull(ROOT, c.save()); c3.run("loadGame()");
  ok("A の door:／puzzle:…:sw: フラグは既存 flags のまま往復", c3.run(`fieldState.flags['door:a2-test:open']===true&&fieldState.flags['puzzle:a3-lanterns:sw:x']===true`));
  // 7-9 戦闘開始スナップショット（リトライ用）にも field の追加項目が入る
  ok("createBattleStartSnapshot().game にも saveVersion 11 と field.gatherUsed", (s => s.game.saveVersion === 11 && typeof s.game.field.gatherUsed === "object")(JSON.parse(J(c3.run("createBattleStartSnapshot()")))));

  console.log(R.join("\n"));
  console.log(`\n${R.filter(x => x.startsWith("PASS")).length} PASS / ${fails} FAIL`);
  if (fails) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
