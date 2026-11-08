"use strict";
/* ============================================================
   admin-tools.js — 開発者用管理パネル
   ゲーム状態・セーブ処理は script.js が提供する。通常プレイの処理から分離。
   ============================================================ */
// ===== 開発者用管理パネル（確認・バックアップ中心） =====
let adminActiveTab="player";
window.kotamaAdminEncounterSettings ||= { disableRandom:false, forceNext:false, selected:{} };
function adminEncounterSettings(){return window.kotamaAdminEncounterSettings;}
function adminEncounterEnemyRows(){return Object.entries(FIELD_ENEMIES||{}).filter(([,e])=>!e.foe).map(([id,e])=>{const count=Number(adminEncounterSettings().selected[id])||0;return `<label class="admin-encounter-enemy"><span><input type="checkbox" data-admin-enemy="${esc(id)}" ${count>0?"checked":""}> ${esc(e.name)}</span><input type="number" min="0" max="8" step="1" value="${count}" data-admin-enemy-count="${esc(id)}" aria-label="${esc(e.name)}の出現数"></label>`;}).join("");}
function adminRenderEncounter(){
 const cfg=adminEncounterSettings(),selected=Object.entries(cfg.selected).filter(([,n])=>Number(n)>0),total=selected.reduce((n,[,count])=>n+Number(count),0),summary=selected.map(([id,count])=>`${FIELD_ENEMIES[id]?.name||id} × ${count}`).join(" ／ ")||"未選択";
 return `<section class="admin-section"><h3>フィールド遭遇制御</h3>
 <label class="admin-encounter-toggle"><input type="checkbox" id="admin-disable-random" ${cfg.disableRandom?"checked":""}> 通常エンカウントを停止する</label>
 <label class="admin-encounter-toggle"><input type="checkbox" id="admin-force-next" ${cfg.forceNext?"checked":""}> 次の1歩で即時エンカウント（1回限り）</label>
 <p class="admin-note">停止はランダム遭遇だけに適用されます。FOE・ボス・イベント接触は停止しません。即時エンカウントは次の移動入力で発動します。</p>
 <h3>出現する敵の編成</h3><p class="admin-note">異なる種類の敵を同時に選択できます。個体数を0にすると編成から外れます（各種類最大8体）。</p>
 <div class="admin-encounter-list">${adminEncounterEnemyRows()}</div>
 <div class="admin-encounter-summary"><strong>現在の編成（合計 ${total}体）</strong><span>${esc(summary)}</span></div>
 <div class="admin-actions"><button type="button" id="admin-encounter-launch">今すぐこの編成で戦闘開始</button></div>
 <p class="admin-note">※今すぐ開始はフィールド探索中のみ使用できます。通常の敵テーブルやFOE配置は変更しません。</p></section>`;
}
function adminBindEncounterControls(){
 const content=$("kotama-admin-content");if(!content)return;
 $("admin-disable-random")?.addEventListener("change",e=>{adminEncounterSettings().disableRandom=e.target.checked;});
 $("admin-force-next")?.addEventListener("change",e=>{adminEncounterSettings().forceNext=e.target.checked;});
 content.querySelectorAll("[data-admin-enemy]").forEach(el=>el.addEventListener("change",()=>{const id=el.dataset.adminEnemy,cfg=adminEncounterSettings();if(el.checked)cfg.selected[id]=Math.max(1,Number(cfg.selected[id])||1);else delete cfg.selected[id];renderAdminPanel();}));
 content.querySelectorAll("[data-admin-enemy-count]").forEach(el=>el.addEventListener("change",()=>{const id=el.dataset.adminEnemyCount,n=Math.max(0,Math.min(8,Math.floor(Number(el.value)||0))),cfg=adminEncounterSettings();if(n)cfg.selected[id]=n;else delete cfg.selected[id];renderAdminPanel();}));
 $("admin-encounter-launch")?.addEventListener("click",()=>{if(state.screen!=="field"||typeof fieldTriggerAdminEncounter!=="function"){window.alert("フィールド探索中に実行してください。");return;}fieldTriggerAdminEncounter();});
}
function adminValue(value){return value===undefined||value===null||value===""?"—":String(value);}
function adminRow(label,value){return `<div class="admin-data-row"><span>${esc(label)}</span><strong>${esc(adminValue(value))}</strong></div>`;}
function adminPanelMarkup(){
  if($("kotama-admin-panel"))return;
  const launcher=document.createElement("button");launcher.id="kotama-admin-launcher";launcher.type="button";launcher.textContent="DEV";launcher.title="開発者用管理パネル";launcher.setAttribute("aria-label","開発者用管理パネルを開く");
  const panel=document.createElement("section");panel.id="kotama-admin-panel";panel.hidden=true;panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-labelledby","kotama-admin-title");
  panel.innerHTML=`<div class="kotama-admin-window"><header class="kotama-admin-header"><div><small>DEVELOPER TOOLS</small><h2 id="kotama-admin-title">管理者パネル</h2></div><button type="button" id="kotama-admin-close" aria-label="閉じる">×</button></header><nav class="kotama-admin-tabs" aria-label="管理者パネルのタブ"><button type="button" data-admin-tab="player">プレイヤー</button><button type="button" data-admin-tab="progress">ステージ進行</button><button type="button" data-admin-tab="battle">戦闘テスト</button><button type="button" data-admin-tab="encounter">エンカウント管理</button><button type="button" data-admin-tab="save">セーブ管理</button></nav><div id="kotama-admin-content" class="kotama-admin-content"></div><footer class="kotama-admin-footer"><span>開発者専用・通常プレイのデータ変更は行いません</span><button type="button" id="kotama-admin-close-bottom">閉じる</button></footer></div>`;
  document.body.append(launcher,panel);
  launcher.addEventListener("click",()=>{renderAdminPanel();panel.hidden=false;document.body.classList.add("admin-panel-open");$("kotama-admin-close")?.focus();});
  const close=()=>{panel.hidden=true;document.body.classList.remove("admin-panel-open");launcher.focus();};
  $("kotama-admin-close").addEventListener("click",close);$("kotama-admin-close-bottom").addEventListener("click",close);
  panel.addEventListener("click",e=>{if(e.target===panel)close();});
  panel.querySelectorAll("[data-admin-tab]").forEach(b=>b.addEventListener("click",()=>{adminActiveTab=b.dataset.adminTab;renderAdminPanel();}));
  document.addEventListener("keydown",e=>{if(!panel.hidden&&e.key==="Escape"){e.preventDefault();close();}});
}
function adminRenderPlayer(){
  const members=characters.map(c=>{const st=effectiveStats(c),slots=equipment[c.id]||{};return `<article class="admin-card"><h3>${esc(c.name)} <small>Lv.${characterLevels[c.id]||1}</small></h3>${adminRow("HP",`${c.hp} / ${st.maxHp}`)}${adminRow("SP",`${c.sp} / ${c.maxSp}`)}${adminRow("攻撃 / 防御",`${st.attack} / ${st.defense}`)}${adminRow("SP攻撃 / SP防御",`${st.spAttack} / ${st.spDefense}`)}${adminRow("武器",getEquippedName(c,"weapon"))}${adminRow("防具",getEquippedName(c,"armor"))}${adminRow("アクセサリ",[slots.accessory1,slots.accessory2].filter(Boolean).map(id=>itemById(id)?.name||id).join(" / ")||"なし")}${adminRow("習得スキル",treeNodes(c.id).filter(n=>getTreeLevel(c.id,n.id)>0).map(n=>`${n.name} Lv.${getTreeLevel(c.id,n.id)}`).join("、")||"なし")}</article>`;}).join("");
  const items=Object.entries(inventory).filter(([,n])=>Number(n)>0).map(([id,n])=>`${itemById(id)?.name||id} ×${n}`);const mats=Object.entries(materials).filter(([,n])=>Number(n)>0).map(([id,n])=>`${materialNames[id]||id} ×${n}`);
  return `<div class="admin-section"><h3>プレイヤー情報</h3>${adminRow("所持ゴールド",`${state.gold} G`)}${adminRow("編成",getParty().map(c=>c.name).join(" / "))}<h3>所持品</h3>${adminRow("アイテム・装備",items.join("、")||"なし")}${adminRow("素材",mats.join("、")||"なし")}</div><div class="admin-grid">${members}</div>`;
}
function adminRenderProgress(){
  const names=["樹海の入り口","ゴブリンの森","霧の森","炎竜の巣","魔王の城"];
  const stages=names.map((name,i)=>{const n=i+1,boss=["スライム","ゴブリン","オオカミ","ドラゴン","魔王"][i];return `<article class="admin-card"><h3>STAGE ${n}：${name}</h3>${adminRow("解放状態",n<=(state.maxUnlockedStage||1)?"解放済み":"未解放")}${adminRow("到達記録",stageEntered[n]?"到達済み":"未到達")}${adminRow("クリア記録",stageCleared[n]?"クリア済み":"未クリア")}${adminRow(`${boss} 討伐記録`,compendium[boss]?.defeated?"討伐済み":"未討伐")}</article>`;}).join("");
  return `<div class="admin-section"><h3>進行状況</h3>${adminRow("現在の解放上限",`STAGE ${state.maxUnlockedStage||1}`)}${adminRow("最初のステージ開始",state.firstStageStarted?"開始済み":"未開始")}${adminRow("討伐数",totalEnemyDefeats)}<p class="admin-note">討伐記録（図鑑）とステージクリア・解放フラグを別々に表示しています。</p></div><div class="admin-grid">${stages}</div>`;
}
function adminRenderBattle(){
  const enemy=battleState.enemy;const party=characters.map(c=>`<article class="admin-card"><h3>${esc(c.name)}</h3>${adminRow("HP / SP",`${c.hp} / ${c.sp}`)}${adminRow("状態",[c._stunTurns>0?`スタン ${c._stunTurns}`:"",c._actionDisabledTurns>0?`行動不能 ${c._actionDisabledTurns}`:"",burnedTurns[c.id]>0?`やけど ${burnedTurns[c.id]}`:"",c._defenseDownTurns>0?`防御低下 ${c._defenseDownTurns}`:""].filter(Boolean).join("・")||"なし")}</article>`).join("");
  const enemyText=enemy?`${enemy.name} ／ HP ${enemy.hp}${enemy.maxHp?` / ${enemy.maxHp}`:""}`:"戦闘中ではありません";
  return `<div class="admin-section"><h3>現在の戦闘</h3>${adminRow("画面",state.screen)}${adminRow("ステージ",battleState.hiddenBossMode?"HIDDEN BOSS":`STAGE ${battleState.stage} / ${battleState.maxStage}`)}${adminRow("ターン",battleState.turnCount)}${adminRow("敵",enemyText)}${adminRow("敵の攻撃 / 防御",enemy?`${enemy.attack??"—"} / ${enemy.defense??"—"}`:"—")}${adminRow("敵の出現数",enemy?.members?.length|| (enemy?1:0))}${adminRow("戦闘処理",battleState.busy?"処理中":"入力待ち")}</div><div class="admin-grid">${party}</div><p class="admin-note">この初期版では戦闘データは確認専用です。HP・SP変更、敵の差し替え、状態異常付与などの操作機能は、通常戦闘への影響を分離してから追加します。</p>`;
}
function adminRenderSave(){
  let data=null,error="";try{data=JSON.parse(localStorage.getItem("fantasyRpgSave")||"null");}catch(e){error="オートセーブのJSONを解析できません。";}
  const pretty=data?JSON.stringify(data,null,2):"オートセーブはありません。";
  return `<div class="admin-section"><h3>セーブデータ</h3>${adminRow("保存形式",data?`saveVersion ${data.saveVersion??"旧形式"}`:"未保存")}${adminRow("オートセーブ",localStorage.getItem("fantasyRpgSave")?"あり":"なし")}${adminRow("セーブスロット1",localStorage.getItem("kotamaSaveSlot1")?"あり":"なし")}${adminRow("セーブスロット2",localStorage.getItem("kotamaSaveSlot2")?"あり":"なし")}<div class="admin-actions"><button type="button" id="admin-backup">バックアップを書き出す</button><button type="button" id="admin-restore-trigger">バックアップを復元</button><input type="file" id="admin-restore-file" accept="application/json,.json" hidden></div>${error?`<p class="admin-warning">${esc(error)}</p>`:""}<h3>オートセーブJSON（確認専用）</h3><pre class="admin-json">${esc(pretty)}</pre></div>`;
}
function renderAdminPanel(){
  const content=$("kotama-admin-content");if(!content)return;
  const renderers={player:adminRenderPlayer,progress:adminRenderProgress,battle:adminRenderBattle,encounter:adminRenderEncounter,save:adminRenderSave};
  content.innerHTML=(renderers[adminActiveTab]||adminRenderPlayer)();
  $("kotama-admin-panel")?.querySelectorAll("[data-admin-tab]").forEach(b=>b.classList.toggle("active",b.dataset.adminTab===adminActiveTab));
  if(adminActiveTab==="encounter")adminBindEncounterControls();
  if(adminActiveTab==="save"){
    $("admin-backup")?.addEventListener("click",adminExportBackup);
    $("admin-restore-trigger")?.addEventListener("click",()=>$("admin-restore-file")?.click());
    $("admin-restore-file")?.addEventListener("change",adminImportBackup);
  }
}
function adminExportBackup(){
  const backup={format:"kotama-admin-backup-v1",createdAt:new Date().toISOString(),storage:{fantasyRpgSave:localStorage.getItem("fantasyRpgSave"),kotamaSaveSlot1:localStorage.getItem("kotamaSaveSlot1"),kotamaSaveSlot2:localStorage.getItem("kotamaSaveSlot2"),kotamaAudioSettings:localStorage.getItem("kotamaAudioSettings")}};
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`kotama-backup-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function adminImportBackup(event){
  const file=event.target.files?.[0];event.target.value="";if(!file)return;
  const reader=new FileReader();reader.onload=()=>{try{
    const backup=JSON.parse(String(reader.result||""));const storage=backup?.format==="kotama-admin-backup-v1"?backup.storage:null;
    if(!storage||typeof storage!=="object")throw new Error("backup format");
    if(storage.fantasyRpgSave){const game=JSON.parse(storage.fantasyRpgSave);if(!game?.state||!Array.isArray(game.state.party)||!Number.isFinite(game.state.gold))throw new Error("save data");}
    for(const key of ["kotamaSaveSlot1","kotamaSaveSlot2"]){if(storage[key]){const slot=JSON.parse(storage[key]);if(!slot?.game?.state||!Array.isArray(slot.game.state.party))throw new Error("slot data");}}
    if(!window.confirm("バックアップ内のセーブデータを復元します。現在のデータはバックアップに含まれていない場合、変更せず維持します。続行しますか？"))return;
    for(const key of ["fantasyRpgSave","kotamaSaveSlot1","kotamaSaveSlot2","kotamaAudioSettings"])if(Object.prototype.hasOwnProperty.call(storage,key)){if(typeof storage[key]==="string")localStorage.setItem(key,storage[key]);else if(storage[key]===null)localStorage.removeItem(key);}
    if(window.confirm("復元したデータを読み込むため、ゲームを再読み込みしますか？"))window.location.reload();else renderAdminPanel();
  }catch(error){window.alert("バックアップを復元できませんでした。ファイル形式または内容を確認してください。");console.warn("管理者バックアップ復元エラー",error);}};reader.readAsText(file);
}
function initAdminTools(){adminPanelMarkup();const overlay=$("tutorial-overlay");if(overlay&&overlay.parentElement!==document.body)document.body.appendChild(overlay);}

