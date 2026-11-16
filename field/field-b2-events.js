"use strict";
/* 第2層 4F〜6Fのメインイベント。
 * 座標近接・階段／ボス前の補完トリガー。既存のfieldState.flagsに記録する。
 * 移動イベントの会話中は既存fieldPlaySceneが入力をロックする。
 */
async function fieldB2PlayOnce(flag,sceneId) {
  if (fieldState.flags[flag]) return false;
  fieldState.flags[flag] = true; // 同時に複数回発生しないよう、再生前に保護
  persistAutoSave();
  await fieldPlayScene(sceneId);
  persistAutoSave();
  return true;
}
async function fieldB2OnEnter() {
  if (fieldState.area !== 2) return;
  if (fieldState.floor === 1) await fieldB2PlayOnce("b2:f5-arrived","a2-f5-arrival");
  if (fieldState.floor === 2) await fieldB2PlayOnce("b2:f6-arrived","a2-f6-arrival");
}
function fieldB2Near(tx,ty,px,py,r=3) {
  return Number.isFinite(px) && Number.isFinite(py) && Math.abs(tx-px)+Math.abs(ty-py)<=r;
}
function fieldB2OnStep(a,tx,ty) {
  if (a.n !== 2 || fieldState.lock) return false;
  let event=null;
  if (a.f === 0) {
    const foreman=a.objects.find(o=>o.id==="a2-foreman");
    if (foreman && fieldB2Near(tx,ty,foreman.tx,foreman.ty,4) && !fieldState.flags["b2:rivalry"])
      event=["b2:rivalry","a2-f4-rivalry"];
    const down=a.down;
    if (!event && down && fieldB2Near(tx,ty,down.tx,down.ty,5) && !fieldState.flags["b2:missing"])
      event=["b2:missing","a2-f4-missing"];
  } else if (a.f === 1) {
    const relic=a.objects.find(o=>o.id==="a2-crate-2");
    if (relic && fieldB2Near(tx,ty,relic.tx,relic.ty,4) && !fieldState.flags["b2:corpses"])
      event=["b2:corpses","a2-f5-corpses"];
    const down=a.down;
    if (!event && down && fieldB2Near(tx,ty,down.tx,down.ty,4) && !fieldState.flags["b2:commission"])
      event=["b2:commission","a2-f5-commission"];
  } else if (a.f === 2) {
    const flower=a.objects.find(o=>o.id==="a2-healing-flower");
    if (flower && fieldB2Near(tx,ty,flower.tx,flower.ty,4) && !fieldState.flags["b2:deep"])
      event=["b2:deep","a2-f6-deep"];
  }
  if (!event) return false;
  void fieldB2PlayOnce(event[0],event[1]);
  return true;
}
async function fieldB2BeforeStairs(dir) {
  if (fieldState.area !== 2 || dir!=="down") return;
  if (fieldState.floor===0) await fieldB2PlayOnce("b2:missing","a2-f4-missing");
  if (fieldState.floor===1) await fieldB2PlayOnce("b2:commission","a2-f5-commission");
}
async function fieldB2BeforeBoss() {
  if (fieldState.area !== 2 || fieldState.floor !== 2) return;
  await fieldB2PlayOnce("b2:deep","a2-f6-deep");
}
