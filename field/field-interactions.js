"use strict";
/* ============================================================
   field/field-interactions.js — 調べる・宝箱・採集・階段・戦闘遷移
   共通状態・定数は field.js を参照。index.html の読み込み順を維持すること。
   ============================================================ */
/* ------------------------------------------------------------
   調べる・踏む
   ------------------------------------------------------------ */
async function fieldInteract(o) {
  if (fieldState.lock) return;
  if (o.kind === "npc" || o.kind === "sign") { await fieldPlayScene(o.scene); return; }
  if (o.kind === "save") { await fieldUseSavePoint(o); return; }
  if (o.kind === "chest") { await fieldOpenChest(o); return; }
  if (o.kind === "gather") { await fieldGather(o); return; }
}
function fieldFullHeal() { for (const c of getParty()) { c.hp = effectiveStats(c).maxHp; c.sp = c.maxSp; } }
async function fieldUseSavePoint() {
  fieldFullHeal();
  fieldState.checkpoint = { area: fieldState.area, floor: fieldState.floor, x: fieldState.x, y: fieldState.y };
  if (typeof playSe === "function") playSe("assets/se/syouri/アイテムを入手2", .6);
  fieldEmit("save", { area: fieldState.area, floor: fieldState.floor, x: fieldState.x, y: fieldState.y });
  fieldState.flags["save-point"] = false;
  await fieldPlayScene("save-point");
  persistAutoSave();
  const choice = await fieldAsk("冒険の記録を残しますか？", ["セーブする", "やめる"], "lamp");
  if (choice === 0 && typeof openSaveDialog === "function") openSaveDialog();
}
// [LOOT] 宝箱を開ける。状態を先に保存 → 報酬 → オートセーブ（処理の本体はファイル末尾の [LOOT] 節）
async function fieldOpenChest(o) {
  if (fieldState.flags[o.key]) { await fieldSay("宝箱は空っぽだ。"); return; }
  fieldState.flags[o.key] = true;   // 先に開封済みにしてから報酬を渡す（二重取得の防止）
  fieldLootMarkDiscovered(o.key);
  document.querySelector(`#field-map .field-object[data-key="${CSS.escape(o.key)}"]`)?.classList.add("is-opened");
  const r = o.reward || {}, got = fieldLootGrant(r, "chest");
  const text = got.parts.length ? `宝箱を開けた！ ${got.parts.join("、")}を手に入れた。` : "宝箱を開けた！ ……中は空っぽだった。";
  if (typeof playSe === "function") playSe("assets/se/syouri/アイテムを入手2", .7);
  fieldEmit("chest", { area: fieldState.area, floor: fieldState.floor, objectId: o.key, objectKey: o.key, kind: "chest", state: "opened", reward: { ...r }, granted: got.granted, remaining: 0, respawn: "never" });
  fieldMiniDirty = true;
  persistAutoSave();
  await fieldSay(text);
}
// [LOOT] 採集（採取／伐採／採掘）。回数を先に記録 → 素材 → オートセーブ
async function fieldGather(o) {
  const a = fieldArea(), def = fieldGatherPointDef(a, o), kd = fieldGatherKindDef(def.kind);
  const used = fieldState.gatherUsed[o.key] || 0;
  if (used >= def.uses) { await fieldSay(`${kd.emptyText}（ホームから出発し直すと、また採れるようになる）`); return; }
  fieldState.gatherUsed[o.key] = used + 1;   // 先に回数を記録してから素材を渡す（二重取得の防止）
  fieldLootMarkDiscovered(o.key);
  const remaining = def.uses - used - 1;
  const mat = fieldGatherPick(def.table);
  const bonus = typeof FIELD_GATHER_RULES !== "undefined" && Number.isFinite(FIELD_GATHER_RULES.bonusChance) ? FIELD_GATHER_RULES.bonusChance : .25;
  const count = Math.random() < bonus ? 2 : 1;
  const ok = fieldLootAddMaterial(mat, count, "gather");
  if (remaining <= 0) document.querySelector(`#field-map .field-object[data-key="${CSS.escape(o.key)}"]`)?.classList.add("is-opened");
  if (typeof playSe === "function") playSe("assets/se/syouri/アイテムを入手2", .6);
  fieldEmit("gather", { area: fieldState.area, floor: fieldState.floor, objectId: o.key, objectKey: o.key, kind: def.kind, material: ok ? mat : null, count: ok ? count : 0, uses: def.uses, remaining, state: remaining > 0 ? "ready" : "depleted", respawn: fieldGatherRespawnRule() });
  fieldMiniDirty = true;
  persistAutoSave();
  await fieldSay(ok ? `${kd.pointName}だ！ ${kd.verb}。${fieldMaterialName(mat)}×${count}を手に入れた。（残り${remaining}回）` : `${kd.pointName}だ！ ……何も見つからなかった。（残り${remaining}回）`);
}
/* ============================================================
   [SIDE] サブイベント（探索コンテンツ）　担当：Claude B（旧 PR #38 の処理を移植）
   データ：data/field-maps.js の FIELD_SIDE_EVENTS ／ 会話：data/story.js の side-*
   ・完了フラグ fieldState.flags["side:<ID>"] は既存のフィールドフラグとしてセーブされ、報酬は1回だけ。
   ・報酬は既存のゴールド・アイテム（inventory）・素材（materials）のみ。付与は [LOOT] の fieldLootGrant を通す。
   ・呼び出し元：fieldInteract（Claude A）が kind:"event" → fieldRunSideEvent(o.event, o)、
     NPC の会話後 → fieldRunNpcSideEvents(o) を、typeof 確認のうえで呼ぶ。
   ============================================================ */
function fieldSideDef(id) { return (typeof FIELD_SIDE_EVENTS !== "undefined" && FIELD_SIDE_EVENTS[id]) || null; }
function fieldSideDone(id) { return !!(id && fieldState.flags[`side:${id}`]); }
function fieldSideReady(ev) { return (ev.requires || []).every(fieldSideDone); }
function fieldMaterialName(id) { return (typeof materialNames !== "undefined" && materialNames[id]) || FIELD_MATERIAL_FALLBACK[id] || id; }
function fieldSideHasNeeds(ev) { return Object.entries(ev.needs || {}).every(([id, n]) => (materials[id] || 0) >= n); }
function fieldSideNeedsText(ev) { return Object.entries(ev.needs || {}).map(([id, n]) => `${fieldMaterialName(id)}×${n}（所持 ${materials[id] || 0}）`).join("、"); }
// マップ上の物（o）の元データ（data/field-maps.js の objects）。fieldArea が項目を写していなくても読めるようにする
function fieldObjectDef(o) {
  if (!o || !o.id) return null;
  const areas = [fieldState.area, ...Object.keys(FIELD_AREAS).map(Number)];
  for (const n of areas) { const objs = FIELD_AREAS[n]?.objects; if (!objs) continue; for (const d of Object.values(objs)) if (d.id === o.id && (d.kind || "npc") === o.kind) return d; }
  return null;
}
// 報酬を渡し、表示用の文を返す
function fieldSideGrant(ev) {
  const got = fieldLootGrant(ev.reward || {}, "side");
  const parts = [];
  if (ev.keyItem) parts.push(`だいじなもの「${ev.keyItem}」を手に入れた。`);
  if (got.parts.length) parts.push(`${got.parts.join("、")}を手に入れた！`);
  return parts.join("\n");
}
function fieldSideMarkDone(id) {
  fieldState.flags[`side:${id}`] = true;
  const a = fieldArea();
  document.querySelectorAll(`#field-map .field-object[data-kind="event"]`).forEach(el => {
    const o = a.objects.find(x => x.key === el.dataset.key);
    if (o && (o.event || fieldObjectDef(o)?.event) === id) el.classList.add("is-opened");
  });
  fieldMiniDirty = true;
}
// サブイベントを1つ進める。戻り値：達成したら true
async function fieldRunSideEvent(id, o = null, opts = {}) {
  const ev = fieldSideDef(id); if (!ev || fieldState.lock) return false;
  if (fieldSideDone(id)) {
    if (opts.fromNpc) return false;
    if (ev.doneScene && await fieldPlayScene(ev.doneScene)) return false;
    await fieldSay("もう何も見つからない。"); return false;
  }
  if (!fieldSideReady(ev)) { if (ev.hintScene) await fieldPlayScene(ev.hintScene); return false; }
  if (ev.needs) {
    if (!fieldSideHasNeeds(ev)) { await fieldSay(`${ev.needText || "必要な素材が足りない。"}（必要：${fieldSideNeedsText(ev)}）`); return false; }
    const choice = await fieldAsk(`${ev.askText || "素材を渡しますか？"}（${fieldSideNeedsText(ev)}）`, ["渡す", "やめる"]);
    if (choice !== 0) return false;
    if (!fieldSideHasNeeds(ev) || fieldSideDone(id)) return false;
    for (const [mid, n] of Object.entries(ev.needs)) materials[mid] = Math.max(0, (materials[mid] || 0) - n);
  }
  // 先にフラグを立ててから報酬を渡す（会話中の二重実行・再取得を防ぐ）
  fieldSideMarkDone(id);
  const text = fieldSideGrant(ev);
  persistAutoSave();
  fieldEmit("side:complete", { area: fieldState.area, floor: fieldState.floor, eventId: id, objectId: o?.key || null, reward: { ...(ev.reward || {}) }, keyItem: ev.keyItem || null });
  if (ev.scene) await fieldPlayScene(ev.scene);
  if (text) { if (typeof playSe === "function") playSe("assets/se/syouri/アイテムを入手2", .7); await fieldSay(text); }
  return true;
}
// NPC との会話のあとに、そのNPCのサブイベントを1つだけ進める
async function fieldRunNpcSideEvents(o) {
  const list = (o && (o.sideEvents || fieldObjectDef(o)?.sideEvents)) || [];
  for (const id of list) {
    if (fieldSideDone(id)) continue;
    await fieldRunSideEvent(id, o, { fromNpc: true });
    return;
  }
}

/* ============================================================
   [PUZZLE] 仕掛けの報酬（扉の奥の宝箱）　担当：Claude B（旧 PR #45 の cache 処理を移植）
   ・仕掛けそのもの（スイッチ・扉・fieldPuzzleSolve・fieldPuzzleRefresh）は Claude A の field/field-puzzles.js。
   ・A の fieldPuzzleInteract(o) が、仕掛けが解けている cache で fieldPuzzleOpenCache(o, pz) を呼ぶ。
   ・順番：フラグ "puzzle:<ID>:reward" を先に立てる → 報酬 → オートセーブ → field:puzzle:reward。
   ・A の関数が無い状態（このファイルだけ先に入った場合）でも、typeof 確認でエラーにならない。
   ============================================================ */
function fieldLootCachePuzzle(o) { return (o && (o.puzzle || fieldObjectDef(o)?.puzzle)) || null; }
async function fieldPuzzleOpenCache(o, pz) {
  const puzzles = typeof FIELD_PUZZLES !== "undefined" ? FIELD_PUZZLES : {};
  const id = fieldLootCachePuzzle(o) || (pz ? Object.keys(puzzles).find(k => puzzles[k] === pz) : null);
  pz = pz || (id ? puzzles[id] : null);
  if (!o || !id || !pz) return false;
  if (typeof fieldPuzzleSolved === "function" && !fieldPuzzleSolved(id)) return false;
  const key = `puzzle:${id}:reward`;
  if (fieldState.flags[key]) { await fieldSay("宝箱は空っぽだ。"); return false; }
  fieldState.flags[key] = true;   // 先にフラグを立ててから報酬を渡す（二重取得の防止）
  fieldLootMarkDiscovered(o.key);
  if (typeof fieldPuzzleRefresh === "function") fieldPuzzleRefresh(id);
  else document.querySelector(`#field-map .field-object[data-key="${CSS.escape(o.key)}"]`)?.classList.add("is-opened");
  const got = fieldLootGrant(pz.reward, "chest");   // 通常の宝箱と同じ付与処理（素材は fieldLootAddMaterial を通る）
  const text = got.parts.length ? `${got.parts.join("、")}を手に入れた！` : "";
  fieldMiniDirty = true;
  persistAutoSave();
  fieldEmit("puzzle:reward", { area: fieldState.area, floor: fieldState.floor, puzzleId: id, reward: { ...(pz.reward || {}) }, objectId: o.key, objectKey: o.key, kind: "cache", state: "opened", granted: got.granted, respawn: "never" });
  if (typeof playSe === "function") playSe("assets/se/syouri/アイテムを入手2", .7);
  await fieldSay(`古い宝箱を開けた！ ${text}`);
  return true;
}

/* ============================================================
   [LOOT] 宝箱・採集・探索記録　担当：Claude B（旧 PR #94 の処理を移植）
   データ：data/field-maps.js の chests（宝箱の中身）／ data/field-gathering.js（採集の種別・テーブル・回数）
   ・探索オブジェクトの状態
       宝箱（chest）・扉の奥の宝箱（cache）："undiscovered" → "discovered" → "opened"
       採集ポイント（gather）              ："undiscovered" → "ready" ⇄ "depleted"
     発見＝そのマスが踏破ビット（オートマッピング）で既知になったとき。開封・採集したものも発見済み。
   ・開封は既存のフラグ（chest:<階層-フロア>:<x>:<y>、puzzle:<ID>:reward）をそのまま使う（キー名は変えない）。
   ・採集回数 fieldState.gatherUsed・発見済み fieldState.discovered・出発回数 fieldState.expedition は
     セーブする（saveVersion 11。field/field-persistence.js の fieldLootSerialize）。
   ・再出現：採集点はホームから出発し直したときだけ復活する（fieldLootOnDeparture）。ロードでは復活しない。
   ・表示用（GPT）：fieldLootState / fieldGatherKind / fieldGatherRemaining / fieldGatherDepleted /
     fieldFloorSummary / fieldStratumSummary / fieldLootList / fieldMaterialSources。未発見は返さない・数えない。
   ============================================================ */
const FIELD_LOOT_KINDS = new Set(["chest", "cache", "gather"]);
let fieldLootIndexCache = null;
function fieldGatherKindDef(kind) {
  const defs = typeof FIELD_GATHER_KINDS !== "undefined" ? FIELD_GATHER_KINDS : null;
  return (defs && (defs[kind] || defs.take)) || { label: "採取", pointName: "採取ポイント", verb: "採取した", emptyText: "もう何も採れそうにない。" };
}
function fieldGatherPointRaw(floorKey, tx, ty) { return (typeof FIELD_GATHER_POINTS !== "undefined" && FIELD_GATHER_POINTS[floorKey] && FIELD_GATHER_POINTS[floorKey][`${tx},${ty}`]) || null; }
function fieldGatherKindAt(floorKey, tx, ty) { const p = fieldGatherPointRaw(floorKey, tx, ty); return p && ["take", "chop", "mine"].includes(p.kind) ? p.kind : "take"; }
function fieldGatherKindOf(a, o) { return o.gatherKind || fieldGatherKindAt(a.key, o.tx, o.ty); }
// 採集点の定義（種別・テーブル・回数）。data/field-gathering.js に無い点はフロアの gathers を使う「採取」
function fieldGatherPointDef(a, o) {
  const p = fieldGatherPointRaw(a.key, o.tx, o.ty) || {};
  const table = Array.isArray(p.table) && p.table.length ? p.table : (Array.isArray(a.floor.gathers) && a.floor.gathers.length ? a.floor.gathers : [["slime_jelly", 1]]);
  const uses = Math.max(1, Math.floor(Number(p.uses) || FIELD_GATHER_USES));
  return { kind: fieldGatherKindOf(a, o), table, uses };
}
function fieldGatherRespawnRule() { return (typeof FIELD_GATHER_RULES !== "undefined" && FIELD_GATHER_RULES.respawn) || "home"; }
function fieldGatherUses(o) { const e = fieldLootIndex().get(o.key); return e ? fieldGatherPointDef(e.a, e.o).uses : FIELD_GATHER_USES; }
function fieldGatherRemaining(o) { return Math.max(0, fieldGatherUses(o) - (fieldState.gatherUsed[o.key] || 0)); }
function fieldGatherDepleted(o) { return fieldGatherRemaining(o) <= 0; }
function fieldGatherPick(table) {
  const total = table.reduce((n, t) => n + (Number(t[1]) || 0), 0); let r = Math.random() * total, mat = table[0][0];
  for (const [id, w] of table) { r -= (Number(w) || 0); if (r <= 0) { mat = id; break; } }
  return mat;
}
// 全フロアの宝箱・採集点・扉の奥の宝箱の一覧（キー → { a, o }）。
// 採集点には種別（gatherKind）と、種別に応じた名前（採取／伐採／採掘ポイント）をここで付ける（fieldArea は変えない）
function fieldLootIndex() {
  if (fieldLootIndexCache) return fieldLootIndexCache;
  const idx = new Map();
  for (const n of Object.keys(FIELD_AREAS).map(Number)) for (let f = 0; f < fieldFloorCount(n); f++) {
    const a = fieldArea(n, f); if (!a) continue;
    for (const o of a.objects) {
      if (!FIELD_LOOT_KINDS.has(o.kind)) continue;
      if (o.kind === "gather") { const gk = fieldGatherKindOf(a, o); o.gatherKind = gk; if (!o.name || o.name === "採取ポイント") o.name = fieldGatherKindDef(gk).pointName; }
      idx.set(o.key, { a, o });
    }
  }
  return (fieldLootIndexCache = idx);
}
function fieldLootStore() { if (!fieldState.discovered || typeof fieldState.discovered !== "object") fieldState.discovered = {}; return fieldState.discovered; }
function fieldLootMarkDiscovered(key) { if (key && fieldLootIndex().has(key)) fieldLootStore()[key] = true; }
function fieldLootOpened(o) {
  if (o.kind === "chest") return !!fieldState.flags[o.key];
  if (o.kind === "cache") { const id = fieldLootCachePuzzle(o); return !!(id && fieldState.flags[`puzzle:${id}:reward`]); }
  return false;
}
function fieldLootDiscovered(a, o) {
  if (fieldLootStore()[o.key] || fieldLootOpened(o) || (o.kind === "gather" && (fieldState.gatherUsed[o.key] || 0) > 0)) return true;
  const exp = fieldState.explored[a.key];
  return !!(exp && exp.length === a.w * a.h && exp[o.ty * a.w + o.tx]);
}
// 踏破ビットから発見済み一覧を作り直す（セーブ時・ロード後）
function fieldLootSyncDiscovered() {
  const store = fieldLootStore();
  for (const [key, { a, o }] of fieldLootIndex()) if (!store[key] && fieldLootDiscovered(a, o)) store[key] = true;
  return store;
}
// 探索オブジェクトの状態。存在しないキーは null
function fieldLootState(objectKey) {
  const e = fieldLootIndex().get(objectKey); if (!e) return null;
  const { a, o } = e;
  if (o.kind === "gather") return !fieldLootDiscovered(a, o) ? "undiscovered" : fieldGatherDepleted(o) ? "depleted" : "ready";
  if (fieldLootOpened(o)) return "opened";
  return fieldLootDiscovered(a, o) ? "discovered" : "undiscovered";
}
// 採集点の種別（"take"｜"chop"｜"mine"）。未発見・採集点以外は null
function fieldGatherKind(objectKey) {
  const e = fieldLootIndex().get(objectKey);
  return e && e.o.kind === "gather" && fieldLootDiscovered(e.a, e.o) ? fieldGatherKindOf(e.a, e.o) : null;
}
// 発見済みの探索オブジェクトの一覧（地図・図鑑用）。未発見のものは含めない
function fieldLootList(area = fieldState.area, floor = fieldState.floor) {
  const a = fieldArea(area, floor); if (!a) return [];
  fieldLootIndex();
  const out = [];
  for (const o of a.objects) {
    if (!FIELD_LOOT_KINDS.has(o.kind)) continue;
    const st = fieldLootState(o.key); if (!st || st === "undiscovered") continue;
    const row = { key: o.key, kind: o.kind, tx: o.tx, ty: o.ty, state: st };
    if (o.kind === "gather") { row.gatherKind = fieldGatherKindOf(a, o); row.remaining = fieldGatherRemaining(o); row.uses = fieldGatherUses(o); row.respawn = fieldGatherRespawnRule(); }
    if (o.kind === "cache") row.puzzleId = fieldLootCachePuzzle(o);
    out.push(row);
  }
  return out;
}
// フロアの集計。未発見のものは数えない（総数は出さない）
function fieldFloorSummary(area = fieldState.area, floor = fieldState.floor) {
  const s = { chestsKnown: 0, chestsOpened: 0, gathersKnown: 0, gathersReady: 0, gathersByKind: {} };
  for (const r of fieldLootList(area, floor)) {
    if (r.kind === "gather") {
      s.gathersKnown++; if (r.state === "ready") s.gathersReady++;
      const k = s.gathersByKind[r.gatherKind] || (s.gathersByKind[r.gatherKind] = { known: 0, ready: 0 });
      k.known++; if (r.state === "ready") k.ready++;
    } else { s.chestsKnown++; if (r.state === "opened") s.chestsOpened++; }
  }
  return s;
}
// 階層の集計（3フロア分の合計）
function fieldStratumSummary(area = fieldState.area) {
  const s = { chestsKnown: 0, chestsOpened: 0, gathersKnown: 0, gathersReady: 0 };
  for (let f = 0; f < fieldFloorCount(area); f++) { const x = fieldFloorSummary(area, f); for (const k of Object.keys(s)) s[k] += x[k]; }
  return s;
}
// 素材が採れる「発見済みの」採集点（アイテム図鑑の入手場所表示用）
function fieldMaterialSources(materialId) {
  const out = [];
  for (const [key, { a, o }] of fieldLootIndex()) {
    if (o.kind !== "gather" || !fieldLootDiscovered(a, o)) continue;
    if (!fieldGatherPointDef(a, o).table.some(t => t[0] === materialId)) continue;
    out.push({ key, area: a.n, floor: a.f, floorLabel: fieldFloorLabel(a.n, a.f), gatherKind: fieldGatherKindOf(a, o) });
  }
  return out;
}
// ホームから出発したとき（＝一晩休んだ扱い）：採集点がすべて復活する（field/field-navigation.js の fieldEnterArea から）
function fieldLootOnDeparture() {
  fieldLootIndex();
  fieldState.gatherUsed = {};
  fieldState.expedition = Math.max(0, Math.floor(Number(fieldState.expedition) || 0)) + 1;
  fieldEmit("loot:respawn", { reason: "home", expedition: fieldState.expedition });
}
function fieldItemName(id) { const item = typeof itemById === "function" ? itemById(id) : null; return item ? item.name : null; }
// 素材の入手はすべてここを通す（ショップ・製作・売却・アイテム図鑑の接続点。materials は既存のグローバル）
function fieldLootAddMaterial(id, n, source) {
  n = Math.max(0, Math.floor(Number(n) || 0)); if (!id || !n) return false;
  const names = typeof materialNames !== "undefined" ? materialNames : FIELD_MATERIAL_FALLBACK;
  if (!names[id]) { console.warn("[field] 未定義の素材IDのため付与しません:", id); return false; }
  materials[id] = (materials[id] || 0) + n;
  if (typeof itemCompendiumRecord === "function") itemCompendiumRecord(id, source);
  fieldEmit("material", { area: fieldState.area, floor: fieldState.floor, materialId: id, count: n, source });
  return true;
}
function fieldLootAddItem(id, n, source) {
  n = Math.max(0, Math.floor(Number(n) || 0)); if (!id || !n) return false;
  if (!fieldItemName(id)) { console.warn("[field] 未定義のアイテムIDのため付与しません:", id); return false; }
  inventory[id] = (inventory[id] || 0) + n;
  if (typeof itemCompendiumRecord === "function") itemCompendiumRecord(id, source);
  return true;
}
// 宝箱・サブイベント・扉の奥の宝箱の中身を渡す。対応する形：
//   { gold }、{ item, count }（既存）、{ material, count }（count は item が無いときだけ素材の数）、
//   { items: [[id, n], ...] }、{ materials: [[id, n], ...] }（組み合わせ可）
// item は shopItems の ID（消耗品・装備・製作武器）。戻り値：表示用 parts と、実際に渡した granted
function fieldLootGrant(r, source = "chest") {
  r = r || {}; const parts = [], granted = { gold: 0, items: [], materials: [] };
  const gold = Math.max(0, Math.floor(Number(r.gold) || 0));
  if (gold) { state.gold += gold; if (typeof renderGold === "function") renderGold(); granted.gold = gold; parts.push(`${gold}G`); }
  const items = [...(Array.isArray(r.items) ? r.items : [])], mats = [...(Array.isArray(r.materials) ? r.materials : [])];
  if (r.item) items.unshift([r.item, r.count || 1]);
  if (r.material) mats.unshift([r.material, r.item ? (r.materialCount || 1) : (r.count || 1)]);
  for (const [id, n] of items) if (fieldLootAddItem(id, n, source)) { granted.items.push([id, Math.floor(n)]); parts.push(`${fieldItemName(id)}×${Math.floor(n)}`); }
  for (const [id, n] of mats) if (fieldLootAddMaterial(id, n, source)) { granted.materials.push([id, Math.floor(n)]); parts.push(`${fieldMaterialName(id)}×${Math.floor(n)}`); }
  return { parts, granted };
}
async function fieldAskReturnHome() {
  if (fieldState.lock) return;
  const choice = await fieldAsk("迷宮を出て、ふもとの村（ホーム）へ戻りますか？", ["戻る", "やめる"]);
  if (choice !== 0) return;
  fieldLeaveToHome("ホームに戻りました。STARTから、行ったことのあるフロアへ出発できます。");
}
function fieldLeaveToHome(message) {
  fieldEmit("leave", { area: fieldState.area, floor: fieldState.floor, reason: "home" });
  fieldToggleFullMap(false);
  persistAutoSave();
  showScreen("home");
  if (message) setSystemMessage(message);
}
async function fieldOnStairs(dir) {
  if (fieldState.lock) return;
  const target = dir === "down" ? fieldState.floor + 1 : fieldState.floor - 1;
  if (target < 0 || target >= fieldFloorCount(fieldState.area)) return;
  const choice = await fieldAsk(`${fieldFloorLabel(fieldState.area, target)}へ${dir === "down" ? "降り" : "上り"}ますか？`, [dir === "down" ? "降りる" : "上る", "やめる"]);
  if (choice !== 0) return;
  if (typeof sound === "function") sound("select");
  fieldGoFloor(target, dir === "down" ? "up" : "down");
}
// 別のフロアへ。arriveAt：到着する階段（"up"=上り階段の上、"down"=下り階段の上、"start"=開始位置）
async function fieldGoFloor(f, arriveAt = "start") {
  fieldEmit("leave", { area: fieldState.area, floor: fieldState.floor, reason: "stairs" });
  fieldState.floor = f;
  const a = fieldArea();
  const spot = arriveAt === "up" ? a.up : arriveAt === "down" ? a.down : null;
  const p = spot ? fieldTileCenter(spot.tx, spot.ty) : fieldTileCenter(a.start.tx, a.start.ty);
  fieldState.x = p.x; fieldState.y = p.y; fieldState.positioned = true;
  fieldState.flags[`floor:${a.key}`] = true;
  fieldRollNextEncounter();
  fieldBuildDom();
  fieldShow();
  persistAutoSave();
}
async function fieldOnGate() {
  if (fieldState.lock) return;
  const a = fieldArea(), req = a.def.gateRequires;
  if (req && !fieldState.flags[req.flag]) { if (req.scene) await fieldPlayScene(req.scene); else await fieldSay("この先へは、まだ進めないようだ。"); return; }
  await fieldPlayScene(a.def.bossScene);
  const choice = await fieldAsk("この先には強大な魔物の気配がする。進みますか？", ["進む", "やめる"]);
  if (choice !== 0) return;
  fieldState.lock = true;
  fieldEmit("boss:gate", { area: fieldState.area, floor: fieldState.floor, stage: a.def.stage });
  fieldEmit("leave", { area: fieldState.area, floor: fieldState.floor, reason: "boss" });
  startBattle(a.def.stage);
  fieldState.lock = false;
}

/* ------------------------------------------------------------
   エンカウント・戦闘との接続
   ------------------------------------------------------------ */
function fieldRollNextEncounter() {
  const enc = fieldArea()?.floor.encounter || { min: 16, max: 28 };
  fieldState.steps = 0; fieldState.walked = 0;
  fieldState.nextEncounter = enc.min + Math.floor(Math.random() * (enc.max - enc.min + 1));
}
function fieldPickEnemyId() {
  const table = fieldArea()?.floor.encounter?.table || [];
  const total = table.reduce((n, t) => n + (t.weight || 1), 0);
  let r = Math.random() * total;
  for (const t of table) { r -= (t.weight || 1); if (r <= 0) return t.enemy; }
  return table.length ? table[table.length - 1].enemy : null;
}
// script.js の beginStageCore() から呼ばれる（// [FIELD]）。scale はフロアの強さ倍率
function fieldCreateEnemy(id, scale) {
  const base = FIELD_ENEMIES[id] || FIELD_ENEMIES[Object.keys(FIELD_ENEMIES)[0]];
  const e = JSON.parse(JSON.stringify(base));
  const k = Number.isFinite(scale) ? scale : (Number(battleState.fieldEnemyScale) || 1);
  if (k !== 1 && !e.foe) for (const key of ["hp", "attack", "spAttack", "defense", "spDefense", "exp", "gold"]) if (Number.isFinite(e[key])) e[key] = Math.round(e[key] * k);
  return { ...e, fieldEnemyId: id, maxHp: e.hp, spDefense: Number.isFinite(e.spDefense) ? e.spDefense : Math.floor((e.defense || 0) / 2) };
}
async function fieldEncounterEffect(id, extra = {}) {
  fieldState.lock = true; fieldState.moving = false; fieldInput.keys.clear(); fieldInput.pad.clear();
  fieldToggleFullMap(false);
  const name = FIELD_ENEMIES[id]?.name || "";
  fieldEmit("encounter", { area: fieldState.area, floor: fieldState.floor, enemyId: id, enemyName: name, delay: FIELD_ENCOUNTER_DELAY, foe: !!extra.foe });
  const screen = $("field"), alert = $("field-player-alert"), flash = $("field-encounter-flash");
  screen?.classList.add("is-encounter"); screen?.classList.toggle("is-foe-encounter", !!extra.foe);
  if (alert) { const vp = $("field-viewport"), p = $("field-player"); if (vp && p) { const pr = p.getBoundingClientRect(), vr = vp.getBoundingClientRect(); alert.style.left = (pr.left - vr.left + pr.width / 2) + "px"; alert.style.top = (pr.top - vr.top - 6) + "px"; } alert.textContent = extra.foe ? "！！" : "！"; alert.hidden = false; }
  if (typeof sound === "function") sound("error", true);
  await new Promise(r => setTimeout(r, FIELD_ENCOUNTER_DELAY * .45));
  if (flash) flash.hidden = false;
  await new Promise(r => setTimeout(r, FIELD_ENCOUNTER_DELAY * .55));
  if (alert) alert.hidden = true; if (flash) flash.hidden = true;
  screen?.classList.remove("is-encounter", "is-foe-encounter");
  fieldEmit("leave", { area: fieldState.area, floor: fieldState.floor, reason: "encounter" });
}
async function fieldTriggerEncounter() {
  const id = fieldPickEnemyId(); if (!id) { fieldRollNextEncounter(); return; }
  await fieldEncounterEffect(id);
  fieldStartEncounterBattle(id);
}
async function fieldTriggerFoeBattle(f) {
  await fieldEncounterEffect(f.def.enemy, { foe: true });
  fieldStartEncounterBattle(f.def.enemy, { foeKey: f.key });
}
function fieldStartEncounterBattle(id, opts = {}) {
  const a = fieldArea();
  battleBgmSelections = {}; stageIntroStoryPending = false; maouIntroBgmPersistent = false;
  retryContext = null;
  battleState.tutorialMode = false; battleState.hiddenBossMode = false; battleState.maxStage = 5;
  resetTransientBattleState();
  battleState.encounterMode = true; battleState.fieldEnemyId = id;
  battleState.fieldEnemyScale = opts.foeKey ? 1 : (a?.floor.encounter?.scale || 1);
  battleState.fieldFoeKey = opts.foeKey || null;
  battleState.koCount = 0; battleState.rankResult = null;
  battleState.stage = a ? a.def.stage : 1;
  battleState.unionGauges = { kotama: 0, knight: 0, healer: 0, warrior: 0, mage: 0, samurai: 0 };
  for (const c of getParty()) { c.hp = Math.max(0, Math.min(effectiveStats(c).maxHp, Number(c.hp) || 0)); c.sp = Math.max(0, Math.min(c.maxSp, Number(c.sp) || 0)); }
  if (getParty().every(c => c.hp <= 0)) fieldFullHeal();
  beginStage();
}
// 雑魚戦・FOE戦の勝利（script.js の finishStage() から：// [FIELD]）
async function fieldFinishEncounter(e) {
  await playEnemyDefeatAnimation();
  battleState.lastRewardGold = e.gold || 0;
  registerDefeat(e.compendiumAs || e.name);
  totalEnemyDefeats += 1;
  state.gold += e.gold || 0;
  const turns = Math.max(1, battleState.turnCount + 1);
  awardVictoryAchievements(e, turns, battleState.koCount || 0);
  const drops = awardMaterials(e);
  const levelResult = typeof levelAwardBattleExp === "function" ? levelAwardBattleExp(e) : null;
  if (battleState.fieldFoeKey) fieldState.foeDefeated[battleState.fieldFoeKey] = true;
  await showItemDropAnimation(drops);
  persistAutoSave();
  renderGold();
  if ($("bgm-toggle")?.checked) startBgm();
  $("battle-commands").hidden = true; $("battle-commands").replaceChildren();
  $("battle-bottom")?.classList.add("result-shown");
  $("battle-support").hidden = true;
  $("battle-result").hidden = false;
  $("retry-stage-button").hidden = true; $("formation-retry-button").hidden = true;
  $("result-title").textContent = battleState.fieldFoeKey ? "FOE撃破！" : "VICTORY!";
  $("result-message").textContent = `${e.name}を倒した！ ${e.gold || 0}Gを獲得！\n${turns}ターン ／ 戦闘不能 ${battleState.koCount || 0}人` + (levelResult ? `\n${levelResult.text}` : "");
  $("next-stage-button").hidden = false; $("next-stage-button").textContent = "迷宮へ戻る";
  $("return-home-button").hidden = false;
  pushLog(`${e.name}を倒した！ ${e.gold || 0}G獲得。`);
}
// 雑魚戦・FOE戦の敗北（script.js の finishDefeat() から：// [FIELD]）
function fieldOnDefeat() {
  retryContext = null;
  fieldState.positioned = false;
  $("result-message").innerHTML = "仲間が全員倒れてしまった……。ホームで態勢を立て直そう。<br><strong class=\"defeat-preparation-warning\">STARTから、行ったことのあるフロアへ出発し直せます。</strong>";
  persistAutoSave();
}
// 勝利・「逃げる」の後に迷宮へ戻る
function fieldReturnFromBattle(opts = {}) {
  const foeKey = battleState.fieldFoeKey;
  const won = !opts.retreat && foeKey && fieldState.foeDefeated[foeKey];
  battleState.encounterMode = false; battleState.fieldEnemyId = null; battleState.fieldFoeKey = null;
  battleStartSnapshot = null;
  if (opts.retreat) setSystemMessage("戦闘から逃げ出した。");
  fieldResetFoesAfterBattle(won ? foeKey : null);
  fieldRollNextEncounter();
  fieldShow({ returning: true });
}
// 雑魚戦の撤退ダイアログに「ホームへ帰還」を加える（ステージ戦では従来どおり）
function fieldSetupRetreatChoice() {
  const btn = $("retreat-button"), dlg = $("retreat-dialog"); if (!btn || !dlg) return;
  const title = $("retreat-dialog-title"), text = dlg.querySelector("p"), yes = $("retreat-yes"), no = $("retreat-no");
  const original = { title: title?.innerHTML, text: text?.innerHTML, yes: yes?.textContent, no: no?.textContent };
  let home = $("retreat-home");
  if (!home && yes) { home = document.createElement("button"); home.id = "retreat-home"; home.type = "button"; home.className = "secondary-button"; home.textContent = "ホームへ帰還"; home.hidden = true; yes.after(home); }
  // script.js 側のクリック処理（ダイアログを開く）より後に整えるため、1拍おいてから書き換える
  btn.addEventListener("click", () => setTimeout(() => {
    const enc = !!battleState.encounterMode && !dlg.hidden;
    if (title) title.innerHTML = enc ? "どうしますか？" : original.title;
    if (text) text.innerHTML = enc ? "<strong>逃げる</strong>：迷宮に戻って探索を続けます。<br><strong>ホームへ帰還</strong>：迷宮を出てホームに戻ります。<br>どちらも今回の戦闘報酬は獲得できません。" : original.text;
    if (yes) yes.textContent = enc ? "逃げる" : original.yes;
    if (no) no.textContent = enc ? "戦う" : original.no;
    if (home) home.hidden = !enc;
  }, 0));
  home?.addEventListener("click", () => {
    if (!battleState.encounterMode) return;
    battleEmit("end", { result: "retreat" });
    dlg.hidden = true; battleStartSnapshot = null; battleState.busy = true;
    battleState.encounterMode = false; battleState.fieldEnemyId = null; battleState.fieldFoeKey = null;
    fieldState.positioned = false;
    fieldLeaveToHome("迷宮から撤退し、ホームに戻りました。");
  });
}
