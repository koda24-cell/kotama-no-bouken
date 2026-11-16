"use strict";
/* 第1層ストーリー進行：地点通過イベント／新人地図試験。
 * 既存の fieldState.flags を利用してセーブ・ロードに対応。
 * マップの地形・既存の報酬・旧セーブを壊さずに追加する。
 */
function fieldA1Once(flag, scene) {
  if (fieldState.flags[flag]) return Promise.resolve(false);
  // 起動直前に立てることで、多重入力・移動による二重発生を避ける。
  fieldState.flags[flag] = true;
  persistAutoSave();
  return fieldPlayScene(scene).then(() => { persistAutoSave(); return true; });
}
function fieldA1MarkKey(kind, tx, ty) { return `a1:mark:${kind}:${tx}:${ty}`; }
function fieldA1Marked(kind) {
  const a = fieldArea(1, 0);
  return a.objects.some(o => o.kind === kind && !!fieldState.flags[fieldA1MarkKey(kind, o.tx, o.ty)]);
}
function fieldA1ExamStatus() {
  const a = fieldArea(1, 0), rate = fieldExploredRate(a);
  return { rate, chest: fieldA1Marked("chest"), door: fieldA1Marked("door"), complete: rate >= 25 && fieldA1Marked("chest") && fieldA1Marked("door") };
}
function fieldA1MarkSetup() {
  const canvas = $("field-fullmap-canvas");
  if (!canvas || canvas.dataset.a1MarkReady === "1") return;
  canvas.dataset.a1MarkReady = "1";
  const full = $("field-fullmap"), head = full?.querySelector(".field-fullmap-head");
  if (!head) return;
  const toolbar = document.createElement("div");
  toolbar.className = "a1-map-mark-toolbar";
  toolbar.setAttribute("aria-label", "地図に目印をつける");
  toolbar.innerHTML = '<label for="a1-map-marker">地図に記録：</label><select id="a1-map-marker"><option value="chest">宝箱</option><option value="door">扉</option></select><span id="a1-map-mark-hint">発見した宝箱・扉のマスをクリック</span>';
  head.after(toolbar);
  canvas.addEventListener("click", e => {
    if (fieldState.area !== 1 || fieldState.floor !== 0 || !fieldState.mapOpen) return;
    const area = fieldArea(), rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const tx = Math.floor((e.clientX - rect.left) * area.w / rect.width);
    const ty = Math.floor((e.clientY - rect.top) * area.h / rect.height);
    const kind = $("a1-map-marker")?.value || "chest";
    const obj = area.objects.find(o => o.kind === kind && o.tx === tx && o.ty === ty);
    const hint = $("a1-map-mark-hint");
    if (!obj || !fieldExplored(area)[ty * area.w + tx]) {
      if (hint) hint.textContent = "発見済みの対象マスを選んでください";
      return;
    }
    const key = fieldA1MarkKey(kind, tx, ty);
    fieldState.flags[key] = true;
    fieldMiniDirty = true;
    persistAutoSave();
    fieldDrawFullMap();
    if (hint) hint.textContent = `${kind === "chest" ? "宝箱" : "扉"}の位置を記録しました`;
  });
}
function fieldA1DrawMarks(g, a, cell, originX, originY, inWindow) {
  if (a.n !== 1 || a.f !== 0) return;
  for (const o of a.objects) {
    if (!["chest", "door"].includes(o.kind) || !fieldState.flags[fieldA1MarkKey(o.kind, o.tx, o.ty)] || !inWindow(o.tx, o.ty)) continue;
    const x = (o.tx - originX + .5) * cell, y = (o.ty - originY + .5) * cell;
    g.save();
    g.strokeStyle = "#fff"; g.lineWidth = Math.max(1, cell * .12);
    g.strokeRect(x - cell * .43, y - cell * .43, cell * .86, cell * .86);
    g.restore();
  }
}
async function fieldA1BeforeStairs(dir) {
  if (fieldState.area !== 1) return true;
  if (fieldState.floor === 0 && dir === "down" && !fieldState.flags["a1:exam-passed"]) {
    const status = fieldA1ExamStatus();
    if (!status.complete) {
      await fieldPlayScene("a1-exam-reminder");
      await fieldSay(`地図の踏破率 ${status.rate}%／25%以上。宝箱：${status.chest ? "記録済み" : "未記録"}、扉：${status.door ? "記録済み" : "未記録"}。MAPから目印をつけよう。`);
      return false;
    }
    await fieldA1Once("a1:exam-passed", "a1-exam-pass");
    fieldLootGrant({ gold: 80, items: [["potion", 2]] }, "side");
    persistAutoSave();
    await fieldSay("新人調査の報酬として80Gとポーション×2を受け取った。");
  }
  if (fieldState.floor === 1 && dir === "down") await fieldA1Once("a1:alarm", "a1-alarm");
  return true;
}
async function fieldA1OnEnter() {
  if (fieldState.area !== 1) return;
  fieldA1MarkSetup();
  const toolbar = document.querySelector(".a1-map-mark-toolbar");
  if (toolbar) toolbar.hidden = fieldState.floor !== 0;
  if (fieldState.floor === 1) await fieldA1Once("a1:second-floor", "a1-f2-arrival");
  if (fieldState.floor === 2) await fieldA1Once("a1:third-floor", "a1-f3-arrival");
}
function fieldA1OnStep(a, tx, ty) {
  if (a.n !== 1 || fieldState.lock) return false;
  // 2Fの奥へ進むと、兵士が救援要請を伝えてくる。
  if (a.f === 1 && !fieldState.flags["a1:alarm"] && a.down && Math.abs(tx - a.down.tx) <= 3 && Math.abs(ty - a.down.ty) <= 3) {
    void fieldA1Once("a1:alarm", "a1-alarm");
    return true;
  }
  // 3Fのボスゲートに近づいたとき、調査隊の孤立を目撃する。
  if (a.f === 2 && !fieldState.flags["a1:besieged"] && a.objects.some(o => o.kind === "gate" && Math.abs(tx - o.tx) <= 3 && Math.abs(ty - o.ty) <= 3)) {
    void fieldA1Once("a1:besieged", "a1-f3-besieged");
    return true;
  }
  return false;
}
function fieldA1BeforeBoss() {
  if (fieldState.area !== 1) return;
  fieldState.flags["a1:senior-fought"] = true;
  persistAutoSave();
}
