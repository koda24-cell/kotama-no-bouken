"use strict";
/* ============================================================
   field/field-persistence.js — 探索BGM・セーブ/ロード・入力初期化
   共通状態・定数は field.js を参照。index.html の読み込み順を維持すること。
   ============================================================ */
/* ------------------------------------------------------------
   BGM（// [FIELD]）
   ------------------------------------------------------------ */
function fieldBgmKey() { return "field" + fieldState.area; }
function fieldBgmPlaylists() { const out = {}; for (const [n, a] of Object.entries(FIELD_AREAS)) if (a.bgm) out["field" + n] = [a.bgm]; return out; }

/* ------------------------------------------------------------
   セーブ（// [FIELD]）
   ------------------------------------------------------------ */
function fieldEncodeBits(arr) { let s = ""; for (let i = 0; i < arr.length; i += 4) s += ((arr[i] ? 8 : 0) | (arr[i + 1] ? 4 : 0) | (arr[i + 2] ? 2 : 0) | (arr[i + 3] ? 1 : 0)).toString(16); return s; }
function fieldDecodeBits(str, len) { const out = new Uint8Array(len); for (let i = 0; i < str.length; i++) { const v = parseInt(str[i], 16) || 0; for (let b = 0; b < 4; b++) if (i * 4 + b < len) out[i * 4 + b] = (v >> (3 - b)) & 1; } return out; }
function fieldSerialize() {
  const fieldNames = new Set(Object.values(FIELD_ENEMIES).map(e => e.name));
  const enemyEncounters = {};
  for (const [name, count] of Object.entries(enemyEncounterCounts)) if (fieldNames.has(name)) enemyEncounters[name] = count;
  const maps = {};
  for (const [key, arr] of Object.entries(fieldState.explored)) if (arr && arr.some(v => v)) maps[key] = fieldEncodeBits(arr);
  return { area: fieldState.area, floor: fieldState.floor, x: Math.round(fieldState.x), y: Math.round(fieldState.y), positioned: !!fieldState.positioned,
    checkpoint: fieldState.checkpoint ? { ...fieldState.checkpoint, x: Math.round(fieldState.checkpoint.x), y: Math.round(fieldState.checkpoint.y) } : null,
    flags: Object.fromEntries(Object.entries(fieldState.flags).filter(([k, v]) => v === true && !k.startsWith("__"))), enemyEncounters, maps };
}
function fieldDeserialize(d) {
  fieldState.flags = {}; fieldState.checkpoint = null; fieldState.area = 1; fieldState.floor = 0; fieldState.positioned = false; fieldState.built = "";
  fieldState.explored = {}; fieldState.gatherUsed = {}; fieldState.foeDefeated = {};
  if (!d || typeof d !== "object") {
    if (state.firstStageStarted) fieldState.flags["prologue"] = true;
    fieldState.area = Math.max(1, Math.min(5, state.maxUnlockedStage || 1));
    return;
  }
  const areaCount = Object.keys(FIELD_AREAS).length;
  fieldState.area = Math.max(1, Math.min(areaCount, Math.floor(Number(d.area) || 1)));
  fieldState.floor = Math.max(0, Math.min(fieldFloorCount(fieldState.area) - 1, Math.floor(Number(d.floor) || 0)));
  if (d.flags && typeof d.flags === "object") for (const [k, v] of Object.entries(d.flags)) if (v === true) fieldState.flags[k] = true;
  // 旧版（フロア導入前）のセーブ：最終フロアにいたものとして扱い、そのフロアまで行ける
  if (d.floor === undefined) { for (let n = 1; n <= areaCount; n++) if (n <= (state.maxUnlockedStage || 1)) for (let f = 0; f < fieldFloorCount(n); f++) if (stageCleared[FIELD_AREAS[n].stage]) fieldState.flags[`floor:${n}-${f}`] = true; fieldState.floor = 0; }
  if (d.maps && typeof d.maps === "object") for (const [key, str] of Object.entries(d.maps)) {
    const [n, f] = key.split("-").map(Number); const a = FIELD_AREAS[n] && fieldArea(n, f);
    if (a && typeof str === "string") fieldState.explored[key] = fieldDecodeBits(str, a.w * a.h);
  }
  const a = fieldArea();
  if (d.positioned && d.floor !== undefined && Number.isFinite(Number(d.x)) && !fieldBoxBlocked(a, Number(d.x), Number(d.y))) { fieldState.x = Number(d.x); fieldState.y = Number(d.y); fieldState.positioned = true; }
  if (d.enemyEncounters && typeof d.enemyEncounters === "object") for (const [name, count] of Object.entries(d.enemyEncounters)) enemyEncounterCounts[name] = Math.max(0, Math.floor(Number(count) || 0));
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fieldSetupInput); else fieldSetupInput();
