"use strict";
/* ============================================================
   tutorial.js — 初回チュートリアル・操作ガイド
   状態データとゲーム本体の関数は script.js が提供する。
   ============================================================ */
function tutorialSave(){
  if(!tutorialState.started||tutorialState.completed)return;
  try{localStorage.setItem("fantasyRpgSave",JSON.stringify(createSaveData()));}catch(e){}
}
function tutorialOverlay(title,message,button="次へ"){
  const overlay=$("tutorial-overlay");if(!overlay)return;
  // 親画面のtransform等によるスタッキングコンテキストの影響を避け、画面直下に配置する。
  if(overlay.parentElement!==document.body)document.body.appendChild(overlay);
  // ガイド本文は画面最上部に表示し、対象箇所のスポットライトとは独立させる。
  $("tutorial-title").textContent=title;$("tutorial-message").textContent=message;
  $("tutorial-next").textContent=button||"次へ";overlay.hidden=false;
  overlay.setAttribute("data-tutorial-phase",tutorialState.phase||"intro");overlay.classList.toggle("tutorial-battle-mode",!!battleState.tutorialMode);
  overlay.classList.toggle("tutorial-welcome",tutorialState.phase==="welcome");
  tutorialSyncNextButton();syncTutorialActive();
  if(tutorialSpotlightTarget)updateTutorialSpotlight();
}
// 「次へ」を押しても次の説明に進まず消えるだけの段階では、ボタンを出さず、
// 光っている対象を直接操作させる。
const TUTORIAL_NO_NEXT=["welcome","battle-command","battle-sp-command","battle-guard-command","battle-union-command","battle-retreat","formation-intro","formation-remove","formation-add","equip-hero-sword","shop-nav","shop-armor","shop-potion","complete"];
function tutorialSyncNextButton(){const b=$("tutorial-next");if(!b)return;const hide=TUTORIAL_NO_NEXT.includes(tutorialState.phase);b.hidden=hide;if(b.parentElement)b.parentElement.hidden=hide;}
function syncTutorialActive(){document.body.classList.toggle("tutorial-active",!!(tutorialState.started&&!tutorialState.completed));}
// 初期装備：コタマ以外は最初から装備している状態にする（空きスロットのみ補完）。
function ensureStarterGear(){
  const starters={knight:{weapon:"sword",armor:"leather-armor"},mage:{weapon:"mage-staff",armor:"leather-armor"},healer:{weapon:"mage-staff",armor:"leather-armor"},samurai:{katana1:"katana",armor:"leather-armor"}};
  for(const [cid,slots] of Object.entries(starters))for(const [slot,id] of Object.entries(slots))if(equipment[cid]&&!equipment[cid][slot])equipment[cid][slot]=id;
}
function updateTutorialSpotlight(){
  const spot=$("tutorial-spotlight"),overlay=$("tutorial-overlay"),target=tutorialSpotlightTarget;
  if(!spot)return;
  if(!target||!target.isConnected||!overlay||overlay.hidden){spot.hidden=true;return;}
  const r=target.getBoundingClientRect(),pad=7;
  spot.style.left=`${Math.max(3,r.left-pad)}px`;
  spot.style.top=`${Math.max(3,r.top-pad)}px`;
  spot.style.width=`${Math.max(8,r.width+pad*2)}px`;
  spot.style.height=`${Math.max(8,r.height+pad*2)}px`;
  spot.hidden=false;
  positionTutorialPanel(r,pad);
}
// 説明パネルが緑の発光エリアと重なる場合は、重ならない側（上／下）へ移動する。
function positionTutorialPanel(r,pad=7){
  const overlay=$("tutorial-overlay"),panel=overlay?.querySelector(".tutorial-panel");
  if(!overlay||!panel||overlay.classList.contains("tutorial-welcome"))return;
  const hits=p=>r.top-pad<p.bottom&&r.bottom+pad>p.top&&r.left-pad<p.right&&r.right+pad>p.left;
  overlay.classList.remove("tutorial-panel-top");
  const bottomRect=panel.getBoundingClientRect();
  if(!hits(bottomRect))return;
  overlay.classList.add("tutorial-panel-top");
  const topRect=panel.getBoundingClientRect();
  // 上側でも重なる場合は、重なりの少ない下側へ戻す。
  if(hits(topRect)){
    const ov=p=>Math.max(0,Math.min(r.bottom,p.bottom)-Math.max(r.top,p.top));
    if(ov(bottomRect)<=ov(topRect))overlay.classList.remove("tutorial-panel-top");
  }
}
function tutorialClose(){const overlay=$("tutorial-overlay");if(overlay)overlay.hidden=true;tutorialSpotlightTarget=null;const spot=$("tutorial-spotlight");if(spot)spot.hidden=true;document.querySelectorAll(".tutorial-highlight").forEach(n=>n.classList.remove("tutorial-highlight"));tutorialSyncCommandLock();syncTutorialActive();}
function tutorialCommandAllowed(button){
  const phase=tutorialState.phase, mode=battleState.menuMode;
  if(!battleState.tutorialMode)return true;
  // 画面説明中はコマンド操作を全面禁止。指定された段階の指定操作だけ許可する。
  if(["battle","battle-enemy","battle-event","battle-event-warning","battle-party","battle-command-ui","battle-info-ui"].includes(phase))return false;
  if(phase==="battle-command")return mode==="target"?button.hasAttribute("data-enemy-target"):button.dataset.action==="attack";
  if(phase==="battle-sp-command")return mode==="target"?button.hasAttribute("data-enemy-target"):mode==="skill"?button.hasAttribute("data-skill"):button.dataset.action==="skill";
  if(phase==="battle-guard-command")return button.dataset.action==="guard";
  if(phase==="battle-union-command")return button.matches(".union-command,[data-union]");
  return false;
}
function tutorialSyncCommandLock(){
  const box=$("battle-commands");if(!box)return;
  const active=tutorialState.started&&!tutorialState.completed&&battleState.tutorialMode;
  box.querySelectorAll("button").forEach(b=>{
    if(!active){
      b.classList.remove("tutorial-command-allowed","tutorial-command-blocked");
      if(b.dataset.tutorialLocked==="1"){b.disabled=b.dataset.tutorialWasDisabled==="1";delete b.dataset.tutorialLocked;delete b.dataset.tutorialWasDisabled;}
      return;
    }
    const allowed=tutorialCommandAllowed(b);
    if(!b.dataset.tutorialLocked)b.dataset.tutorialWasDisabled=b.disabled?"1":"0";
    if(!allowed){b.dataset.tutorialLocked="1";b.disabled=true;b.classList.add("tutorial-command-blocked");b.classList.remove("tutorial-command-allowed");}
    else{b.dataset.tutorialLocked="0";b.disabled=b.dataset.tutorialWasDisabled==="1";b.classList.add("tutorial-command-allowed");b.classList.remove("tutorial-command-blocked");}
  });
}
function tutorialHighlight(selector){
  document.querySelectorAll(".tutorial-highlight").forEach(n=>n.classList.remove("tutorial-highlight"));
  const el=selector?document.querySelector(selector):null;
  tutorialSpotlightTarget=el||null;
  if(el){el.classList.add("tutorial-highlight");el.scrollIntoView({block:"nearest",behavior:"auto"});}
  updateTutorialSpotlight();
  tutorialSyncCommandLock();tutorialSyncNextButton();
  return el;
}
window.addEventListener("resize",updateTutorialSpotlight);
window.addEventListener("scroll",updateTutorialSpotlight,true);
function tutorialAdvancePhase(phase,title,message,selector=null,button="次へ"){
  tutorialState.phase=phase;tutorialSave();tutorialHighlight(selector||"");tutorialOverlay(title,message,button);
}
function showTutorialWelcome(){
  tutorialState.started=true;
  tutorialState.completed=false;
  tutorialState.phase="welcome";
  tutorialState.battlePhase="tutorial-intro";
  tutorialSave();
  tutorialHighlight(null);
  tutorialOverlay(
    "ようこそ、冒険者！",
    "FANTASY RPGの世界へようこそ！ これから仲間との冒険を始めよう。画面の見方や戦い方を、ひとつずつ案内するよ。準備ができたら、緑に光っている「チュートリアル開始」ボタンを押してね。",
    "チュートリアル開始"
  );
  const overlay=$("tutorial-overlay");
  if(overlay)overlay.classList.add("tutorial-welcome");
}
function beginTutorial(resume=false){
  document.body.classList.remove("tutorial-home-focus");
  if(!resume) tutorialState={started:true,completed:false,phase:"battle",battlePhase:"tutorial-intro",heroSwordGranted:false,heroSwordEquipped:false,armorBought:false,potionBought:false,healerRemoved:false,healerReadded:false,accessoryExplained:false};
  else {tutorialState.started=true;tutorialState.completed=false;}
  battleState.tutorialMode=true;battleState.hiddenBossMode=false;battleState.maxStage=5;battleState.stage=1;resetTransientBattleState();
  state.party=["kotama","knight","mage","healer"];
  equipment.kotama.weapon=null;equipment.kotama.armor=null;ensureStarterGear();
  getParty().forEach(c=>{c.hp=effectiveStats(c).maxHp;c.sp=c.maxSp;});
  battleState.unionGauges={kotama:0,knight:0,healer:0,warrior:0,mage:0,samurai:0};
  battleState.enemy={name:"スライムa",element:"無属性",weaknesses:["炎","氷","雷","聖"],resistances:[],physicalResistances:["斬撃","打撃","壊","突"],hp:2400,maxHp:2400,attack:12,defense:999,spDefense:35,physicalDamageRate:.03,gold:0,sprite:"slime",image:"assets/monsters/suraimu.png",members:[{id:"slime-a-1",name:"スライム",displayName:"スライムa",hp:1200,maxHp:1200,attack:12,defense:999,spDefense:35,gold:0,sprite:"slime",image:"assets/monsters/suraimu.png",alive:true},{id:"slime-a-2",name:"スライム",displayName:"スライムa",hp:1200,maxHp:1200,attack:12,defense:999,spDefense:35,gold:0,sprite:"slime",image:"assets/monsters/suraimu.png",alive:true}],memberCount:2};
  battleState.turnCount=tutorialState.battlePhase==="sp"||tutorialState.battlePhase==="sp-resolved"?1:tutorialState.battlePhase==="guard"||tutorialState.battlePhase==="guard-resolved"?2:tutorialState.battlePhase==="union"||tutorialState.battlePhase==="union-resolved"||tutorialState.battlePhase==="retreat"?3:0;battleState.koCount=0;battleState.rankResult=null;battleState.busy=true;battleState.actions=[];battleState.consumedActors=[];battleState.guarding={};battleState.tauntTarget=null;battleState.enemyStunned=false;battleState.defenseCampTurns=0;battleState.magicGuardActive=false;battleState.fullGuardActive=false;battleState.knightFullGuardCooldown=0;battleState.aegisActive=false;battleState.log=[];battleState.stageFinished=false;battleState.lastRewardGold=0;battleState.turnOrder=tutorialState.battlePhase==="sp"?["kotama"]:tutorialState.battlePhase==="guard"?["kotama","knight","mage","healer"]:tutorialState.battlePhase==="union"?["kotama"]:["kotama","knight","mage","healer"];battleState.currentActorIndex=0;
  battleState.unionGauges.kotama=tutorialState.battlePhase==="union"?unionSkills.kotama.requiredHits:0;goblinCharging=false;goblinTeamAttackPending=false;goblinTeamAttackUsed=false;specialOmenShown={};
  $("stage-title").textContent="TUTORIAL BATTLE";$("battle-result").hidden=true;$("battle-commands").hidden=false;$("battle-support").hidden=false;$("battle-support").textContent="チュートリアル戦闘";$("event-log").replaceChildren();$("battle-log").replaceChildren();
  showScreen("battle");$("battle-commands").inert=false;battleState.busy=false;renderBattle();if(tutorialState.battlePhase!=="retreat")renderActionMenu();tutorialSyncCommandLock();
  if(resume&&tutorialState.battlePhase==="sp")pushEvent("このスライムは物理攻撃に強いみたいだ。通常攻撃ではほとんどダメージを与えられないぞ！");
  if(resume&&tutorialState.battlePhase==="guard")pushEvent("次のターン、強力な攻撃が来るみたいだ……！ 全員で防御しよう。","warning");
  if(resume&&tutorialState.battlePhase==="union")pushEvent("強力な全体攻撃を防いだ！ コタマのユニオンスキルを使おう。");
  if(tutorialState.phase==="battle"||tutorialState.phase==="intro"){
    tutorialState.phase="battle-enemy";
    tutorialOverlay("冒険へようこそ！","まずは敵の表示を確認しよう。敵のHPゲージを見ながら戦うのが基本だよ。");
    tutorialHighlight("#battle-enemy");
  }else if(tutorialState.battlePhase==="sp")tutorialOverlay("SPスキルを使おう","SPスキルはSPゲージを消費して発動するよ。スライムaは物理攻撃に強いけれど、防御を貫通するSP攻撃なら大きくダメージを与えられるよ。スキルを選んで右側の説明も確認しよう。");else if(tutorialState.battlePhase==="guard")tutorialOverlay("防御しよう","強力な全体攻撃が来るよ。味方全員で防御してダメージを軽減しよう。");else if(tutorialState.battlePhase==="union")tutorialOverlay("ユニオンスキルを使おう","コタマのユニオンゲージが満タンになったよ。ユニオンスキルを発動しよう。");tutorialSave();
}
function resumeTutorial(){
  if(!tutorialState.started||tutorialState.completed){openStageSelectDialog();return;}
  if(["intro","battle","battle-enemy","battle-event","battle-event-warning","battle-party","battle-command-ui","battle-info-ui","battle-command","battle-sp","battle-sp-command","battle-guard","battle-guard-command","battle-union","battle-union-command","battle-retreat"].includes(tutorialState.phase)){
    if(tutorialState.phase==="battle-retreat"){
      beginTutorial(true);tutorialState.battlePhase="retreat";battleState.turnOrder=[];battleState.busy=true;$("battle-commands").hidden=true;tutorialOverlay("戦い方の基本は完了！","撤退ボタンを押して拠点に戻ろう。");tutorialHighlight("#retreat-button");return;
    }
    beginTutorial(tutorialState.phase!=="intro");
    if(tutorialState.phase==="battle-enemy")tutorialOverlay("敵の表示","敵のHPゲージを確認しよう。敵のHPを減らして撃破するのが戦闘の基本だよ。");
    else if(tutorialState.phase==="battle-event")tutorialOverlay("EVENT画面","戦闘中の重要な情報や、大技の予告がここに表示されるよ。");
    else if(tutorialState.phase==="battle-event-warning")tutorialOverlay("赤い警告表示について","赤い警告は、敵が次の行動で強力な攻撃や特殊行動を行う合図です。表示されたら敵の属性や攻撃範囲を確認し、防御・回復・ユニオンスキルなどで備えましょう。警告はイベント欄に追加されるので、見逃さないようにしてください。");else if(tutorialState.phase==="battle-party"){tutorialOverlay("プレイヤー枠","HPは体力、SPを消費してスキルを発動するよ。");tutorialHighlight("#battle-party");}
    else if(tutorialState.phase==="battle-command-ui")tutorialOverlay("コマンド欄について","ここから攻撃・SPスキル・防御・道具を選びます。今はまだ操作せず、次に右側の説明欄を確認しよう。");
    else if(tutorialState.phase==="battle-info-ui")tutorialOverlay("コマンド説明欄について","ここには選択中の攻撃やスキルの効果、消費SPなどが表示されます。内容を確認してから行動を決めよう。");
    else if(tutorialState.phase==="battle-command")tutorialOverlay("通常攻撃を試そう","まずは全員でスライムに【攻撃】をしてみよう。緑に光っている攻撃コマンドを押してね。");else if(tutorialState.phase==="battle-sp"||tutorialState.phase==="battle-sp-command")tutorialOverlay("SP攻撃を使おう","SPスキルを選択して説明を確認し、使ってみよう。");else if(tutorialState.phase==="battle-guard"||tutorialState.phase==="battle-guard-command")tutorialOverlay("防御しよう","全員で防御して強力な攻撃に備えよう。");else if(tutorialState.phase==="battle-union"||tutorialState.phase==="battle-union-command")tutorialOverlay("ユニオンスキルを使おう","コタマのユニオンスキルを発動しよう。");
    return;
  }
  if(tutorialState.phase==="shop-nav"){showScreen("formation");tutorialOverlay("SHOPへ移動しよう","装備できたね！装備品はSHOPで購入できるよ。画面上部のショップを押して移動しよう。");tutorialHighlight('.main-nav [data-screen="shop"]');return;}
  if(tutorialState.phase==="formation-intro"){showScreen("home");tutorialOverlay("拠点に戻ってきた！","編成タブを開いて、仲間の編成を確認しよう。");tutorialHighlight('.main-nav [data-screen="formation"]');return;}
  if(tutorialState.phase.startsWith("formation")||tutorialState.phase==="equipment-intro"||tutorialState.phase==="equipment-grant"||tutorialState.phase==="equip-hero-sword"){
    showScreen("formation");
    const messages={"formation-intro":["拠点に戻ってきた！","編成を確認しよう。仲間は最大4人まで編成できるよ。"],"formation-remove":["治癒士を外そう","編成中の治癒士の『編成から外す』を押してみよう。"],"formation-add":["治癒士を編成に戻そう","仲間候補から治癒士を選んで、再び編成に加えよう。"],"equipment-intro":["装備を確認しよう","各キャラクターの装備欄から武器・防具・アクセサリを管理できるよ。"],"equipment-grant":["勇者の剣を入手！","勇者の剣を1本受け取ったよ。コタマの武器欄から装備してみよう。"],"equip-hero-sword":["勇者の剣を装備しよう","コタマの武器欄から勇者の剣を装備してみよう。"]};
    const m=messages[tutorialState.phase]||messages["formation-intro"];tutorialOverlay(m[0],m[1]);return;
  }
  if(tutorialState.phase==="shop-accessory"){showScreen("formation");tutorialOverlay("アクセサリについて","アクセサリは2種類装備できるよ。次は回復薬を購入しよう。");tutorialHighlight('#selected-party select[data-equip^="accessory"]');return;}
  if(tutorialState.phase.startsWith("shop")){
    showScreen("shop");shopBuyerId="kotama";currentCategory=tutorialState.phase==="shop-potion"?"other":"armor";renderShop();
    const m=tutorialState.phase==="shop-potion"?["回復薬を購入しよう","その他カテゴリから回復薬を1個購入しよう。"]:tutorialState.phase==="shop-accessory"?["アクセサリについて","アクセサリは2種類装備できるよ。次は回復薬を購入しよう。"]:["革の鎧を購入しよう","防具は防御力を高める装備だよ。革の鎧をコタマに購入して装備しよう。"];
    tutorialOverlay(m[0],m[1]);return;
  }
}
function tutorialAfterRetreat(){
  battleState.tutorialMode=false;tutorialState.phase="formation-intro";tutorialState.battlePhase="done";tutorialSave();
  showScreen("home");tutorialOverlay("拠点に戻ってきた！","次は編成タブを開いて、仲間の編成を確認しよう。");tutorialHighlight('.main-nav [data-screen="formation"]');tutorialSave();
}
function tutorialFinish(){tutorialState.completed=true;tutorialState.started=false;tutorialState.phase="complete";battleState.tutorialMode=false;tutorialClose();tutorialSave();try{localStorage.setItem("fantasyRpgSave",JSON.stringify(createSaveData()));}catch(e){}showScreen("home");if($("start-button"))$("start-button").textContent="START";tutorialOverlay("チュートリアル完了！","編成・装備・買い物の準備ができたよ。これでチュートリアルは終了。STARTを押して、冒険に出発しよう！");tutorialHighlight("#start-button");}
