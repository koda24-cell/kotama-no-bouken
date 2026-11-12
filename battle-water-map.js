"use strict";
/* battle-water-map.js — 第2階層の戦闘中マップとFOE増援 */
(() => {
  const $ = id => document.getElementById(id);
  let opened = false;
  function render() {
    const panel=$("battle-field-map"), grid=$("battle-field-map-grid"), toggle=$("battle-field-map-toggle");
    if(!panel||!grid||typeof fieldState==="undefined"||typeof fieldArea!=="function")return;
    if(toggle)toggle.hidden=fieldState.area!==2||!battleState?.encounterMode;
    if(fieldState.area!==2){opened=false;panel.hidden=true;return;}
    const a=fieldArea(fieldState.area,fieldState.floor); if(!a)return;
    const player=fieldPlayerTile(), cols=a.w, rows=a.h;
    grid.style.setProperty("--map-cols",cols);
    const foes=new Map((fieldState.foes||[]).filter(f=>!f.defeated).map(f=>[`${f.tx},${f.ty}`,f]));
    const cells=[];
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const ch=a.grid[y]?.[x]||"#", key=`${x},${y}`;
      let cls=ch==="#"?"wall":ch==="~"?"water":"., *".includes(ch)?"floor":"wall", mark="";
      if(x===player.tx&&y===player.ty){cls="player";mark="P";}
      else if(foes.has(key)){cls="foe";mark="F";}
      else if(ch===">"||ch==="<"){cls="stairs";mark=ch;}
      cells.push(`<i class="battle-field-map-cell ${cls}" title="${x},${y}" aria-label="${mark||cls}"></i>`);
    }
    grid.innerHTML=cells.join("");
    $("battle-field-map-turn").textContent=`探索ターン ${fieldState.turn||0}`;
    panel.hidden=!opened;
    $("battle-field-map-toggle")?.setAttribute("aria-expanded",String(opened));
  }
  function addReinforcement(f) {
    const e=battleState.enemy, source=fieldCreateEnemy(f.def.enemy);
    const member={id:`foe-reinforce-${String(f.key).replace(/[^a-z0-9]/gi,"-")}`,name:source.name,displayName:source.name,
      hp:source.hp,maxHp:source.hp,attack:source.attack,spAttack:source.spAttack,defense:source.defense,spDefense:source.spDefense,
      image:source.image,sprite:source.sprite,row:"rear",alive:true,ai:source.ai,fieldFoeKey:f.key,counterRate:source.counterRate||0};
    if(!Array.isArray(e.members)){
      const old={id:"battle-main-enemy",name:e.name,displayName:e.name,hp:e.hp,maxHp:e.maxHp,attack:e.attack,spAttack:e.spAttack,
        defense:e.defense,spDefense:e.spDefense,image:e.image,sprite:e.sprite,row:"front",alive:true};
      e.members=[old];
    }
    e.members.push(member);
    e.hp=e.members.reduce((n,m)=>n+Math.max(0,m.hp),0);
    e.maxHp=(e.maxHp||0)+member.maxHp;
    if(source.ai?.length)e.ai=[...(e.ai||[]),...source.ai.map(a=>({...a,weight:Math.max(1,Math.floor((a.weight||1)*.45))}))];
    f.defeated=true;fieldState.foeDefeated[f.key]=true;
    pushEvent(`FOE「${source.name}」が戦闘に乱入！敵の後衛に加わった！`,"warning");
    renderBattle();
  }
  window.waterBattleMapAdvanceTurn=function(){
    if(!battleState?.encounterMode||!fieldState||fieldState.area!==2)return;
    const a=fieldArea(fieldState.area,fieldState.floor),pt=fieldPlayerTile();
    if(!a)return;
    fieldState.turn=(fieldState.turn||0)+1;
    for(const f of fieldState.foes||[]){
      if(f.defeated)continue;
      fieldFoeAwareness(a,f,pt,true);
      f.paceAcc=(f.paceAcc||0)+(Number(f.def.pace)>0?Number(f.def.pace):1);
      while(f.paceAcc>=1){
        f.paceAcc-=1;
        const step=fieldFoeNextStep(a,f,pt,true);if(!step)break;
        const from={tx:f.tx,ty:f.ty};
        f.dir=fieldFoeDirTo(from,step)||f.dir;fieldFoePlace(f,step.tx,step.ty);
        if(fieldFoeContact(f,pt)){addReinforcement(f);break;}
      }
    }
    fieldFoePlanAll(a);fieldMiniDirty=true;render();
  };
  // 鉱石系の反撃：攻撃を受けた鉱石個体が、攻撃者へ物理反撃する。
  const originalDamage=window.applyDamageToEnemyTarget;
  if(typeof originalDamage==="function"&&!window.__waterCounterWrapped){
    window.__waterCounterWrapped=true;
    window.applyDamageToEnemyTarget=function(enemy,target,amount){
      const dealt=originalDamage.call(this,enemy,target,amount);
      const ore=target?.ref;
      if(dealt>0&&ore?.counterRate>0&&ore.hp>0){
        const actorId=battleState.actingIds?.[0],actor=actorId&&getCharacter(actorId);
        if(actor?.hp>0){
          const counter=Math.max(1,Math.floor(calcPhysical((ore.attack||enemy.attack)*ore.counterRate,effectiveStats(actor).defense,false)));
          pushEvent(`${ore.name||ore.displayName}の反撃！${actor.name}に${counter}ダメージ！`,"warning");
          applyPartyDamageAnimated(actor,counter,{normalAttack:true});
        }
      }
      return dealt;
    };
  }
  document.addEventListener("DOMContentLoaded",()=>{
    // Place the battle map controls immediately above the right-side party area.
    // Keep the original elements and handlers intact; only move their container.
    const party=$("battle-party"), panel=$("battle-field-map"), toggle=$("battle-field-map-toggle");
    if(party&&panel&&toggle){
      let dock=$("battle-field-map-dock");
      if(!dock){
        dock=document.createElement("div");
        dock.id="battle-field-map-dock";
        dock.className="battle-field-map-dock";
        party.before(dock);
      }
      dock.append(toggle,panel);
    }
    const originalRender=window.renderBattle;
    if(typeof originalRender==="function")window.renderBattle=function(...args){
      const members=battleState.enemy?.members;
      if(Array.isArray(members)){const alive=members.filter(m=>m.hp>0);alive.forEach((m,i)=>m.row=i===0?"front":"rear");}
      const result=originalRender.apply(this,args);render();return result;
    };
    if($("battle-field-map-toggle"))$("battle-field-map-toggle").hidden=true;
    $("battle-field-map-toggle")?.addEventListener("click",()=>{opened=!opened;render();});
    $("battle-field-map-close")?.addEventListener("click",()=>{opened=false;render();});
    document.addEventListener("battle:start",render);
    document.addEventListener("turn:end",render);
    const observer=new MutationObserver(()=>{if(!document.querySelector("#battle.active"))opened=false;});
    const battle=$("battle");if(battle)observer.observe(battle,{attributes:true,attributeFilter:["class"]});
  });
})();
