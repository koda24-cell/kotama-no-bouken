/* 開発者向け拡張ツール：通常セーブから独立した一時テスト設定 */
(function(){
  "use strict";
  const dev=window.kotamaDevTools={noRandomEncounters:false,noFoeBattles:false,oneHitEnemies:false,testBattle:false};
  const $=id=>document.getElementById(id);
  const originalRandom=window.fieldTriggerEncounter;
  if(typeof originalRandom==="function")window.fieldTriggerEncounter=async function(){if(dev.noRandomEncounters)return;return originalRandom.apply(this,arguments);};
  const originalFoe=window.fieldTriggerFoeBattle;
  if(typeof originalFoe==="function")window.fieldTriggerFoeBattle=async function(){if(dev.noFoeBattles)return;return originalFoe.apply(this,arguments);};
  const originalDamage=window.applyDamageToEnemyTarget;
  if(typeof originalDamage==="function")window.applyDamageToEnemyTarget=function(enemy,target,amount){return originalDamage.call(this,enemy,target,dev.oneHitEnemies?99999999:amount);};
  const originalFinish=window.fieldFinishEncounter;
  if(typeof originalFinish==="function")window.fieldFinishEncounter=async function(enemy){
    if(dev.testBattle){
      await playEnemyDefeatAnimation();
      dev.testBattle=false;
      battleState._adminTestBattle=false;
      setSystemMessage("テスト戦闘を終了しました。報酬・討伐記録・経験値は付与していません。");
      if(typeof fieldReturnFromBattle==="function")fieldReturnFromBattle();
      else showScreen("home");
      return;
    }
    return originalFinish.apply(this,arguments);
  };
  function addAdminTabs(){
    const nav=document.querySelector("#kotama-admin-panel .kotama-admin-tabs");
    if(!nav||nav.dataset.extended==="1")return;
    nav.dataset.extended="1";
    [["devbattle","直接戦闘"],["devfield","探索設定"],["deveffects","演出テスト"]].forEach(([id,label])=>{
      const b=document.createElement("button");b.type="button";b.dataset.adminExtraTab=id;b.textContent=label;nav.appendChild(b);
    });
    nav.addEventListener("click",e=>{
      const b=e.target.closest("[data-admin-extra-tab]");if(!b)return;
      e.preventDefault();e.stopImmediatePropagation();
      nav.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));
      renderExtra(b.dataset.adminExtraTab);
    },true);
  }
  function renderExtra(tab){
    const root=$("kotama-admin-content");if(!root)return;
    if(tab==="devbattle"){
      const enemyTable=typeof FIELD_ENEMIES!=="undefined"?FIELD_ENEMIES:{};const ids=Object.keys(enemyTable);
      root.innerHTML='<section class="admin-section"><h3>敵を選んで直接戦闘</h3><p class="admin-note">通常探索を経由せず、選択した敵と戦います。テスト戦闘では報酬・経験値・素材・討伐記録を付与しません。</p><label>敵<select id="admin-test-enemy">'+ids.map(id=>'<option value="'+String(id).replace(/"/g,'&quot;')+'">'+String(enemyTable[id]?.name||id).replace(/</g,'&lt;')+'</option>').join("")+'</select></label><div class="admin-actions"><button type="button" id="admin-launch-test">選択した敵と戦う</button><label><input type="checkbox" id="admin-one-hit" '+(dev.oneHitEnemies?'checked':'')+'> 敵を一撃で倒せるモード</label></div><p class="admin-note">戦闘終了後は探索画面へ戻ります。通常の敵データ定義は変更しません。</p></section>';
      $("admin-launch-test").onclick=()=>{
        const id=$("admin-test-enemy")?.value;if(!id||!enemyTable[id]){setSystemMessage("敵データが見つかりません。");return;}
        dev.testBattle=true;battleState._adminTestBattle=true;
        fieldStartEncounterBattle(id,{adminTest:true});
      };
      $("admin-one-hit").onchange=e=>{dev.oneHitEnemies=e.target.checked;};
    }else if(tab==="devfield"){
      root.innerHTML='<section class="admin-section"><h3>探索テスト設定</h3><label class="admin-edit-row"><span>ランダムエンカウントを停止</span><input type="checkbox" id="admin-no-random" '+(dev.noRandomEncounters?'checked':'')+'></label><label class="admin-edit-row"><span>FOE接触戦闘を停止</span><input type="checkbox" id="admin-no-foe" '+(dev.noFoeBattles?'checked':'')+'></label><p class="admin-note">設定はこのページを開いている間だけ有効です。セーブデータには保存されません。敵シンボルの移動・表示は維持します。</p></section>';
      $("admin-no-random").onchange=e=>{dev.noRandomEncounters=e.target.checked;};
      $("admin-no-foe").onchange=e=>{dev.noFoeBattles=e.target.checked;};
    }else{
      root.innerHTML='<section class="admin-section"><h3>SE・演出テスト</h3><p class="admin-note">SEは assets/se 以下のファイル名（拡張子なし）を入力してください。例：senntou/斬撃音</p><label>SEファイルパス<input id="admin-se-path" type="text" value="senntou/斬撃音" placeholder="フォルダ名/ファイル名"></label><div class="admin-actions"><button type="button" id="admin-play-se">SEを再生</button><button type="button" id="admin-preview-slash">斬撃演出</button><button type="button" id="admin-preview-magic">魔法演出</button><button type="button" id="admin-preview-heal">回復演出</button></div><label>SE音量 <input id="admin-se-volume" type="range" min="0" max="100" value="'+Math.round((typeof seVolume==="number"?seVolume:.2)*100)+'"></label></section>';
      $("admin-play-se").onclick=()=>{const path=$("admin-se-path").value.trim().replace(/^assets\/se\//,"").replace(/\.mp3$/i,"");if(!path||path.includes("..")){setSystemMessage("SEの相対パスを確認してください。");return;}playSe("assets/se/"+path);};
      $("admin-se-volume").oninput=e=>{seVolume=Math.max(0,Math.min(1,Number(e.target.value)/100));applyVolumeControls?.();};
      $("admin-preview-slash").onclick=()=>{showHitEffect("slash");sound("damage",true);};
      $("admin-preview-magic").onclick=()=>{showHitEffect("magic");sound("select",true);};
      $("admin-preview-heal").onclick=()=>{sound("heal",true);};
    }
  }
  const originalMarkup=window.adminPanelMarkup;
  if(typeof originalMarkup==="function")window.adminPanelMarkup=function(){const out=originalMarkup.apply(this,arguments);setTimeout(addAdminTabs,0);return out;};
  document.addEventListener("DOMContentLoaded",()=>{addAdminTabs();});
  const panelObserver=new MutationObserver(()=>addAdminTabs());
  document.addEventListener("DOMContentLoaded",()=>{const panel=$("kotama-admin-panel");if(panel)panelObserver.observe(panel,{childList:true,subtree:true});});
})();