"use strict";
/* ============================================================
   admin-tools.js — 開発者用管理パネル
   ゲーム状態・セーブ処理は script.js が提供する。通常プレイの処理から分離。
   ============================================================ */
// ===== 開発者用管理パネル（確認・バックアップ中心） =====
let adminActiveTab="player";
window.kotamaAdminBattleSettings ||= { infiniteResources:false, oneHitKill:false, statOverrides:{}, enemyActions:{}, enemyTargetId:"" };
function adminBattleSettings(){return window.kotamaAdminBattleSettings;}
function adminEnemyUnits(){const e=battleState.enemy;return e?(Array.isArray(e.members)?e.members:[e]):[];}
function adminEnemyKey(e){return e?.id||e?.fieldEnemyId||e?.name||"enemy";}

function adminEnemyStatFields(){
 const enemy=battleState.enemy,units=adminEnemyUnits();
 if(!enemy)return '<p class="admin-note">敵ステータスの編集は戦闘中に利用できます。</p>';
 const selected=units.find(e=>adminEnemyKey(e)===(adminBattleSettings().enemyStatSelected||adminEnemyKey(units[0])))||units[0];
 const options=units.map(e=>'<option value="'+esc(adminEnemyKey(e))+'" '+(e===selected?'selected':'')+'>'+esc(e.name||"敵")+'（HP '+Math.max(0,e.hp)+'/'+Math.max(1,e.maxHp||1)+'）</option>').join('');
 const keys=[["hp","現在HP"],["maxHp","最大HP"],["attack","攻撃"],["spAttack","SP攻撃"],["defense","防御"],["spDefense","SP防御"],["speed","速度"],["speed","素早さ"],["gold","ゴールド報酬"],["exp","経験値"]];
 return '<div class="admin-section"><h3>敵ステータス書き換え</h3><label class="admin-select-row">編集する敵<select id="admin-enemy-stat-unit">'+options+'</select></label><div class="admin-stat-inputs">'+keys.map(([key,label])=>'<label>'+label+'<input type="number" min="0" max="999999" step="1" data-admin-enemy-stat="'+key+'" value="'+Math.max(0,Math.floor(Number(selected?.[key])||0))+'"></label>').join('')+'</div><button type="button" id="admin-enemy-stat-apply" '+(state.screen==="battle"&&!battleState.busy?'':'disabled')+'>敵ステータスを適用</button><p class="admin-note">混成敵の場合は選択した個体だけを変更し、編成全体のHPを再集計します。</p></div>';
}
function adminItemEditor(){
 const cfg=adminBattleSettings(),items=shopItems.filter(i=>i&&i.id),selected=items.find(i=>i.id===(cfg.itemStatSelected||items[0]?.id))||items[0];
 if(!selected)return '';
 const options=items.map(i=>'<option value="'+esc(i.id)+'" '+(i===selected?'selected':'')+'>'+esc(i.name||i.id)+'</option>').join('');
 const keys=[["price","販売価格"],["hpBonus","HP加算"],["attackBonus","攻撃加算"],["spAttackBonus","SP攻撃加算"],["defenseBonus","防御加算"],["spDefenseBonus","SP防御加算"],["damageReduction","ダメージ軽減（小数）"],["lowHpReduction","低HP時ダメージ軽減（小数）"],["evasionRate","回避率（小数）"],["hpRate","HP倍率加算（小数）"],["attackRate","攻撃倍率加算（小数）"],["spAttackRate","SP攻撃倍率加算（小数）"]];
 return '<div class="admin-section"><h3>商品のステータス書き換え</h3><label class="admin-select-row">編集する商品<select id="admin-item-stat-select">'+options+'</select></label><div class="admin-stat-inputs">'+keys.map(([key,label])=>'<label>'+label+'<input type="number" step="'+(key.toLowerCase().includes("rate")||key==="damageReduction"||key==="evasionRate"?"0.01":"1")+'" data-admin-item-stat="'+key+'" value="'+(Number.isFinite(selected[key])?selected[key]:0)+'"></label>').join('')+'</div><button type="button" id="admin-item-stat-apply">商品データに適用</button><p class="admin-note">数値変更は現在のゲームセッション中の商品データに反映します。装備効果は再計算されます。</p></div>';
}
function adminBattleEquipmentEditor(party){
 const slots=[["weapon","武器"],["armor","防具"],["accessory1","装飾品1"],["accessory2","装飾品2"],["katana1","刀1"],["katana2","刀2"]];
 return '<div class="admin-section"><h3>戦闘時の装備変更</h3>'+party.map(c=>'<article class="admin-card"><h4>'+esc(c.name)+'</h4><div class="admin-stat-inputs">'+slots.filter(([slot])=>slot in (equipment[c.id]||{})&&!(c.id==="samurai"&&slot==="armor")).map(([slot,label])=>{const current=equipment[c.id][slot]||"",category=slot==="armor"?"armor":slot.startsWith("accessory")?"accessory":"weapon",owned=shopItems.filter(i=>i.category===category&&(inventory[i.id]>0||i.id===current)&&(i.classes||[]).includes(c.id)&&(slot!=="armor"||i.armorRole===(EXT_REAR_IDS.includes(c.id)?"back":"front"))&&((slot.startsWith("katana")?i.slot==="katana":slot==="weapon"?!i.slot:true)));return '<label>'+label+'<select data-admin-equip-char="'+esc(c.id)+'" data-admin-equip-slot="'+slot+'" '+(state.screen==="battle"&&!battleState.busy?'':'disabled')+'><option value="">なし</option>'+owned.map(i=>'<option value="'+esc(i.id)+'" '+(current===i.id?'selected':'')+'>'+esc(i.name)+(inventory[i.id]>0?' ×'+inventory[i.id]:'（装備中）')+'</option>').join('')+'</select></label>';}).join('')+'</div></article>').join('')+'<p class="admin-note">所持品から変更します。装備適性の制限は管理者操作として適用せず、元の装備は所持品へ戻します。</p></div>';
}
function adminBattlePartyEditor(party){
 const reserve=characters.filter(c=>!state.party.includes(c.id));
 return '<div class="admin-section"><h3>戦闘時の編成メンバー入れ替え</h3>'+party.map((c,index)=>'<label class="admin-select-row">参加枠 '+(index+1)+'（'+esc(c.name)+'）<select data-admin-party-slot="'+index+'" '+(state.screen==="battle"&&!battleState.busy&&battleState.currentActorIndex===0&&!(battleState.actions||[]).length?'':'disabled')+'><option value="'+esc(c.id)+'">'+esc(c.name)+'（現在）</option>'+reserve.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('')+'</select></label>').join('')+'<p class="admin-note">ターン開始時（行動処理前）に入れ替えできます。交代した仲間のHP・SP・装備は維持します。</p></div>';
}
function adminUnionGaugeEditor(party){
 return '<div class="admin-section"><h3>ユニオンゲージ操作</h3>'+party.map(c=>{const u=unionSkills[c.id],g=battleState.unionGauges[c.id]||0,max=u?.requiredHits||0;return '<div class="admin-union-row"><span>'+esc(c.name)+'：'+g+' / '+(max||'—')+'</span><button type="button" data-admin-union-add="'+esc(c.id)+'" '+(state.screen==="battle"&&!battleState.busy&&u&&g<max?'':'disabled')+'>＋1</button><button type="button" data-admin-union-max="'+esc(c.id)+'" '+(state.screen==="battle"&&!battleState.busy&&u&&g<max?'':'disabled')+'>最大まで</button></div>';}).join('')+'<p class="admin-note">ゲージは各キャラクターのユニオンスキル必要量を上限に増加します。</p></div>';
}
function adminRenderBattleControls(){
 const cfg=adminBattleSettings(),enemy=battleState.enemy,units=adminEnemyUnits(),active=units.find(e=>e.hp>0)||units[0],actorKey=adminEnemyKey(active),party=getParty();
 const flags='<div class="admin-cheat-grid"><label class="admin-encounter-toggle"><input type="checkbox" data-admin-mode="infiniteResources" '+(cfg.infiniteResources?'checked':'')+'> ゴールド・素材を無限所持（購入・製作・強化で消費しない）</label><label class="admin-encounter-toggle"><input type="checkbox" data-admin-mode="oneHitKill" '+(cfg.oneHitKill?'checked':'')+'> 敵を一撃で倒せるモード</label></div>';
 const statKeys=[["hp","現在HP"],["sp","現在SP"],["maxHp","最大HP"],["maxSp","最大SP"],["attack","攻撃"],["spAttack","SP攻撃"],["defense","防御"],["spDefense","SP防御"]];
 const stats=party.map(c=>{const o=cfg.statOverrides[c.id]||{},st=effectiveStats(c);const values={hp:c.hp,sp:c.sp,maxHp:o.maxHp??st.maxHp,maxSp:o.maxSp??st.maxSp,attack:o.attack??st.attack,spAttack:o.spAttack??st.spAttack,defense:o.defense??st.defense,spDefense:o.spDefense??st.spDefense,speed:o.speed??st.speed};return '<article class="admin-card admin-stat-editor"><h3>'+esc(c.name)+' <small>戦闘中ステータス</small></h3><div class="admin-stat-inputs">'+statKeys.map(([key,label])=>'<label>'+label+'<input type="number" min="0" max="999999" step="1" data-admin-stat="'+key+'" data-admin-character="'+esc(c.id)+'" value="'+Math.max(0,Math.floor(Number(values[key])||0))+'" '+(state.screen==="battle"&&!battleState.busy?"":"disabled")+'></label>').join('')+'</div><button type="button" data-admin-stat-reset="'+esc(c.id)+'" '+(state.screen==="battle"&&!battleState.busy?"":"disabled")+'>この仲間の補正を解除</button></article>';}).join('');
 const enemyOptions=units.map(e=>'<option value="'+esc(adminEnemyKey(e))+'" '+(adminEnemyKey(e)===(cfg.enemySelectedActor||actorKey)?'selected':'')+'>'+esc(e.name)+(e.hp<=0?'（撃破）':'')+'</option>').join('');
 const selected=units.find(e=>adminEnemyKey(e)===(cfg.enemySelectedActor||actorKey))||active;
 const moveOptions=(selected?.ai||[]).map(a=>'<option value="'+esc(a.name)+'" '+(cfg.enemyActions[adminEnemyKey(selected)]===a.name?'selected':'')+'>'+esc(a.name)+(a.all?'（全体）':'')+'</option>').join('');
 const targetOptions=party.map(c=>'<option value="'+esc(c.id)+'" '+(cfg.enemyTargetId===c.id?'selected':'')+'>'+esc(c.name)+(c.hp<=0?'（戦闘不能）':'')+'</option>').join('');
 const battleControls=enemy?'<div class="admin-section"><h3>敵の行動を指定</h3><label class="admin-select-row">行動する敵<select id="admin-enemy-actor">'+enemyOptions+'</select></label><label class="admin-select-row">攻撃技<select id="admin-enemy-action"><option value="">通常AIに任せる</option>'+moveOptions+'</select></label><label class="admin-select-row">単体攻撃の対象<select id="admin-enemy-target"><option value="">通常の対象選択に任せる</option>'+targetOptions+'</select></label><p class="admin-note">指定した敵の次回以降の行動に適用します。全体攻撃では対象指定は無視されます。</p></div>':'<p class="admin-note">敵の攻撃技・対象の指定は戦闘中に利用できます。</p>';
 const skips=Object.entries(FIELD_AREAS||{}).map(([n,a])=>'<div class="admin-skip-floor-group"><strong>'+esc(a.name||('第'+n+'階層'))+'</strong> '+a.floors.map((_,f)=>'<button type="button" data-admin-skip-stage="'+n+'" data-admin-skip-floor="'+f+'">'+esc(fieldFloorLabel(Number(n),f))+' へ</button>').join(' ')+'</div>').join('');
 return '<div class="admin-section"><h3>開発用モード（複数同時にON可能）</h3>'+flags+'<div class="admin-actions"><button type="button" id="admin-battle-full-heal" '+(state.screen==='battle'&&!battleState.busy?'':'disabled')+'>味方全員を全回復（戦闘中）</button></div><p class="admin-note">全回復はHP・SPと戦闘中の不利な状態異常を回復します。</p></div><div class="admin-section"><h3>マップスキップ移動</h3><p class="admin-note">未踏破・未解放でも任意のフロアへ移動できます。通常の進行条件は変更しません。</p><div class="admin-actions admin-skip-actions">'+skips+'</div><div class="admin-actions"><button type="button" id="admin-reveal-current-map">現在のフロアを100%解放</button></div><p class="admin-note">地図の踏破表示だけを解放します。宝箱・ボス・イベントは変更しません。</p></div>'+adminField3dPreview()+'<div class="admin-section"><h3>味方ステータス書き換え</h3><p class="admin-note">戦闘中の数値を直接変更できます。能力値は戦闘中のみ補正として適用します。</p><div class="admin-grid">'+stats+'</div></div>'+adminEnemyStatFields()+adminItemEditor()+adminBattleEquipmentEditor(party)+adminBattlePartyEditor(party)+adminUnionGaugeEditor(party)+battleControls;
}
// [FIELD-3D] 第2階層（凍てつく水源）の3D表示の試験。localStorage だけを使い、セーブ・進行には触れない
function adminField3dPreview(){
 const api=window.KotamaField3D;if(!api||!api.setPreview)return '';
 const on=api.previewOn(2);
 return '<div class="admin-section"><h3>3D表示の試験（第2階層・凍てつく水源）</h3><label class="admin-encounter-toggle"><input type="checkbox" id="admin-f3d-b2" '+(on?'checked':'')+'> 第2階層を一人称3Dで表示する（この端末だけ・試験用）</label><div class="admin-actions admin-skip-actions">'+[0,1,2].map(f=>'<button type="button" data-admin-f3d-floor="'+f+'" '+(on?'':'disabled')+'>第2階層 '+(f+1)+'F を3Dで確認</button>').join('')+'</div><p class="admin-note">通常の進行では第2階層は2D表示のままです。フロアの移動は「マップスキップ移動」と同じ扱いです。URL に ?f3d=b2 を付けても一時的に有効になります。</p></div>';
}
function adminBindBattleControls(){
 const content=$("kotama-admin-content"),cfg=adminBattleSettings();if(!content)return;
 content.querySelectorAll("[data-admin-mode]").forEach(el=>el.addEventListener("change",()=>{cfg[el.dataset.adminMode]=el.checked;if(el.dataset.adminMode==="infiniteResources")renderAll();renderAdminPanel();}));
 content.querySelectorAll("[data-admin-stat]").forEach(el=>el.addEventListener("change",()=>{const c=getCharacter(el.dataset.adminCharacter),key=el.dataset.adminStat,n=Math.max(0,Math.min(999999,Math.floor(Number(el.value)||0)));if(!c||state.screen!=="battle"||battleState.busy)return;if(key==="hp"||key==="sp")c[key]=Math.min(n,key==="hp"?effectiveStats(c).maxHp:effectiveStats(c).maxSp);else(cfg.statOverrides[c.id]||={})[key]=n;renderAll();renderAdminPanel();}));
 content.querySelectorAll("[data-admin-stat-reset]").forEach(el=>el.addEventListener("click",()=>{delete cfg.statOverrides[el.dataset.adminStatReset];renderAll();renderAdminPanel();}));
 $("admin-enemy-actor")?.addEventListener("change",e=>{cfg.enemySelectedActor=e.target.value;renderAdminPanel();});
 $("admin-enemy-action")?.addEventListener("change",e=>{const key=$("admin-enemy-actor")?.value;if(!key)return;if(e.target.value)cfg.enemyActions[key]=e.target.value;else delete cfg.enemyActions[key];});
 $("admin-enemy-target")?.addEventListener("change",e=>{cfg.enemyTargetId=e.target.value;});
 $("admin-enemy-stat-unit")?.addEventListener("change",e=>{cfg.enemyStatSelected=e.target.value;renderAdminPanel();});
 $("admin-enemy-stat-apply")?.addEventListener("click",()=>{if(state.screen!=="battle"||battleState.busy)return;const key=$("admin-enemy-stat-unit")?.value,unit=adminEnemyUnits().find(e=>adminEnemyKey(e)===key);if(!unit)return;content.querySelectorAll("[data-admin-enemy-stat]").forEach(input=>{const k=input.dataset.adminEnemyStat,n=Math.max(0,Math.min(999999,Math.floor(Number(input.value)||0)));if(k==="maxHp")unit.maxHp=Math.max(1,n);else unit[k]=n;});unit.hp=Math.min(unit.hp,unit.maxHp);const enemy=battleState.enemy;if(enemy?.members){enemy.hp=enemy.members.reduce((n,m)=>n+Math.max(0,m.hp),0);enemy.maxHp=enemy.members.reduce((n,m)=>n+Math.max(1,m.maxHp||1),0);}else{enemy.hp=Math.min(enemy.hp,enemy.maxHp);enemy.maxHp=unit.maxHp;}renderBattle();renderAdminPanel();});
 $("admin-item-stat-select")?.addEventListener("change",e=>{cfg.itemStatSelected=e.target.value;renderAdminPanel();});
 $("admin-item-stat-apply")?.addEventListener("click",()=>{const item=itemById(cfg.itemStatSelected);if(!item)return;content.querySelectorAll("[data-admin-item-stat]").forEach(input=>{const k=input.dataset.adminItemStat,n=Number(input.value);if(Number.isFinite(n))item[k]=Math.max(0,Math.min(999999,n));});renderAll();renderAdminPanel();});
 content.querySelectorAll("[data-admin-equip-char]").forEach(el=>el.addEventListener("change",()=>{if(state.screen!=="battle"||battleState.busy)return;const id=el.dataset.adminEquipChar,slot=el.dataset.adminEquipSlot,newId=el.value||null,old=equipment[id]?.[slot]||null;if(newId===old)return;const item=newId?itemById(newId):null;if(newId&&(!item||!(inventory[newId]>0)))return;if(old)inventory[old]=(inventory[old]||0)+1;if(newId){inventory[newId]--;if(inventory[newId]<=0)delete inventory[newId];}equipment[id][slot]=newId;renderAll();renderAdminPanel();pushEvent("管理者操作："+getCharacter(id).name+"の装備を変更した。");}));
 content.querySelectorAll("[data-admin-party-slot]").forEach(el=>el.addEventListener("change",()=>{if(state.screen!=="battle"||battleState.busy||battleState.currentActorIndex!==0||(battleState.actions||[]).length)return;const slot=Number(el.dataset.adminPartySlot),next=el.value,old=state.party[slot];if(!getCharacter(next)||state.party.includes(next)||!Number.isInteger(slot)||slot<0||slot>=state.party.length)return;state.party[slot]=next;battleState.turnOrder=getParty().filter(c=>c.hp>0).map(c=>c.id);battleState.currentActorIndex=0;battleState.consumedActors=[];battleState.actions=[];renderAll();renderAdminPanel();pushEvent("管理者操作："+getCharacter(old).name+"を"+getCharacter(next).name+"に交代した。");}));
 content.querySelectorAll("[data-admin-union-add]").forEach(el=>el.addEventListener("click",()=>{if(state.screen!=="battle"||battleState.busy)return;chargeGauge(getCharacter(el.dataset.adminUnionAdd),1);renderBattle();renderAdminPanel();}));
 content.querySelectorAll("[data-admin-union-max]").forEach(el=>el.addEventListener("click",()=>{if(state.screen!=="battle"||battleState.busy)return;const id=el.dataset.adminUnionMax,u=unionSkills[id];if(u)battleState.unionGauges[id]=u.requiredHits;renderBattle();renderAdminPanel();}));

 $("admin-battle-full-heal")?.addEventListener("click",()=>{if(state.screen!=="battle"||battleState.busy)return;for(const c of getParty()){const st=effectiveStats(c);c.hp=st.maxHp;c.sp=st.maxSp;if(typeof extClearHarmful==="function")extClearHarmful(c);if(typeof burnedTurns!=="undefined")burnedTurns[c.id]=0;c._defenseDownTurns=0;c._stunTurns=0;c._actionDisabledTurns=0;c._stunned=false;c.stunned=false;c.actionDisabled=false;}battleState.koCount=0;renderAll();renderAdminPanel();pushEvent("管理者操作：味方全員のHP・SPと不利な状態異常を全回復した。");});
 $("admin-f3d-b2")?.addEventListener("change",e=>{window.KotamaField3D?.setPreview(2,e.target.checked);renderAdminPanel();});
 content.querySelectorAll("[data-admin-f3d-floor]").forEach(el=>el.addEventListener("click",async()=>{if(state.screen!=="field"){window.alert("フィールド探索中に使用してください。");return;}const f=Number(el.dataset.adminF3dFloor);await fieldEnterArea(2,{floor:0,adminSkip:true});if(f>0){fieldState.floor=f;fieldState.positioned=false;fieldState.built="";fieldShow();}}));
 content.querySelectorAll("[data-admin-skip-stage]").forEach(el=>el.addEventListener("click",async()=>{const n=Number(el.dataset.adminSkipStage),f=Number(el.dataset.adminSkipFloor)||0;await fieldEnterArea(n,{floor:f,adminSkip:true});renderAdminPanel();}));
  $("admin-reveal-current-map")?.addEventListener("click",()=>{const a=fieldArea();if(!a)return;fieldExplored(a).fill(1);fieldState.lastTileKey="";if(state.screen==="field"){fieldUpdateVision(true);fieldRender();}fieldMiniDirty=true;persistAutoSave();renderAdminPanel();});
}

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
  const items=Object.entries(inventory).filter(([,n])=>Number(n)>0).map(([id,n])=>`${itemById(id)?.name||id} ×${n}`);const mats=Object.entries(materials).filter(([,n])=>Number(n)>0).map(([id,n])=>`${materialNames[id]||id} ×${adminBattleSettings().infiniteResources?"∞":n}`);
  return `<div class="admin-section"><h3>プレイヤー情報</h3>${adminRow("所持ゴールド",adminBattleSettings().infiniteResources?"∞（無限モード）":`${state.gold} G`)}${adminRow("編成",getParty().map(c=>c.name).join(" / "))}<h3>所持品</h3>${adminRow("アイテム・装備",items.join("、")||"なし")}${adminRow("素材",mats.join("、")||"なし")}</div><div class="admin-grid">${members}</div>`;
}
function adminRenderProgress(){
  const names=["樹海の入り口","ゴブリンの森","霧の森","炎竜の巣","魔王の城"];
  const stages=names.map((name,i)=>{const n=i+1,boss=["スライム","ゴブリン","オオカミ","ドラゴン","魔王"][i];return `<article class="admin-card"><h3>STAGE ${n}：${name}</h3>${adminRow("解放状態",n<=(state.maxUnlockedStage||1)?"解放済み":"未解放")}${adminRow("到達記録",stageEntered[n]?"到達済み":"未到達")}${adminRow("クリア記録",stageCleared[n]?"クリア済み":"未クリア")}${adminRow(`${boss} 討伐記録`,compendium[boss]?.defeated?"討伐済み":"未討伐")}</article>`;}).join("");
  return `<div class="admin-section"><h3>進行状況</h3>${adminRow("現在の解放上限",`STAGE ${state.maxUnlockedStage||1}`)}${adminRow("最初のステージ開始",state.firstStageStarted?"開始済み":"未開始")}${adminRow("討伐数",totalEnemyDefeats)}<p class="admin-note">討伐記録（図鑑）とステージクリア・解放フラグを別々に表示しています。</p></div><div class="admin-grid">${stages}</div>`;
}
function adminRenderBattle(){
  const enemy=battleState.enemy;const party=characters.map(c=>`<article class="admin-card"><h3>${esc(c.name)}</h3>${adminRow("HP / SP",`${c.hp} / ${c.sp}`)}${adminRow("状態",[c._stunTurns>0?`スタン ${c._stunTurns}`:"",c._actionDisabledTurns>0?`行動不能 ${c._actionDisabledTurns}`:"",burnedTurns[c.id]>0?`やけど ${burnedTurns[c.id]}`:"",c._defenseDownTurns>0?`防御低下 ${c._defenseDownTurns}`:""].filter(Boolean).join("・")||"なし")}</article>`).join("");
  const enemyText=enemy?`${enemy.name} ／ HP ${enemy.hp}${enemy.maxHp?` / ${enemy.maxHp}`:""}`:"戦闘中ではありません";
  return `<div class="admin-section"><h3>現在の戦闘</h3>${adminRow("画面",state.screen)}${adminRow("ステージ",battleState.hiddenBossMode?"HIDDEN BOSS":`STAGE ${battleState.stage} / ${battleState.maxStage}`)}${adminRow("ターン",battleState.turnCount)}${adminRow("敵",enemyText)}${adminRow("敵の攻撃 / 防御",enemy?`${enemy.attack??"—"} / ${enemy.defense??"—"}`:"—")}${adminRow("敵の出現数",enemy?.members?.length|| (enemy?1:0))}${adminRow("戦闘処理",battleState.busy?"処理中":"入力待ち")}</div><div class="admin-grid">${party}</div>${adminRenderBattleControls()}`;
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
  if(adminActiveTab==="battle")adminBindBattleControls();
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

