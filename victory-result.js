"use strict";
// Presentation only: reward data has already been awarded and saved by the caller.
function showVictoryResult(levelResult, drops) {
  const old = document.getElementById("victory-screen");
  if (old) { if (old.open) old.close(); old.remove(); }
  const dialog = document.createElement("dialog");
  dialog.id = "victory-screen";
  dialog.setAttribute("aria-labelledby","victory-heading");
  dialog.tabIndex = -1;
  const title = document.getElementById("result-title").textContent;
  const summary = document.getElementById("result-message").textContent;
  const rows = (levelResult?.members || []).slice().sort((a,b)=>Number(b.active)-Number(a.active));
  const aggregated = new Map();
  for (const item of drops || []) {
    const key = item.id || item.name;
    const previous = aggregated.get(key);
    if (previous) previous.count += item.count;
    else aggregated.set(key,{...item});
  }
  const cards = rows.map((m,i)=>{
    const c=getCharacter(m.id);
    return '<article class="victory-member'+(m.ko?' is-ko':'')+'" data-xp-index="'+i+'"><div class="victory-portrait">'+(c?getCharacterImage(c):'')+'</div><div class="victory-member-data"><div class="victory-member-head"><strong>'+esc(m.name)+'</strong><small>'+(m.active?'':'控え')+'</small><span class="victory-level"></span></div><div class="victory-xp-track"><i></i></div><div class="victory-member-foot"><span class="victory-xp-number"></span><span class="victory-xp-gain"></span><strong class="victory-level-up" hidden>LEVEL UP</strong></div></div></article>';
  }).join("");
  const loot = [...aggregated.values()].map(item=>'<div class="victory-loot"><span aria-hidden="true">◇</span><strong>'+esc(item.name)+'</strong><small>×'+esc(String(item.count))+'</small></div>').join("");
  dialog.innerHTML='<main class="victory-content"><header class="victory-header"><span> BATTLE RESULT </span><h1 id="victory-heading">'+esc(title)+'</h1><p>'+esc(summary.split("\n").filter(line=>!line.startsWith("経験値")&&!line.includes("（スキルポイント獲得）")).join("\n"))+'</p></header><section class="victory-exp"><h2>EXPERIENCE <small>経験値</small></h2><div class="victory-members">'+(cards||'<p>経験値の獲得なし</p>')+'</div></section><section class="victory-drops" hidden><h2>ITEM DROPS <small>獲得アイテム</small></h2><div class="victory-loot-list">'+(loot||'<p>ドロップアイテムなし</p>')+'</div></section><p class="victory-hint" hidden>クリック / タップで進む</p></main>';
  document.body.appendChild(dialog);
  // Keep the original result node for existing battle observers, but never expose its old buttons.
  document.body.classList.add("victory-open");
  dialog.addEventListener("cancel",event=>event.preventDefault());
  dialog.addEventListener("close",()=>{document.body.classList.remove("victory-open");dialog.remove();},{once:true});
  dialog.showModal();
  dialog.focus({preventScroll:true});
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ready=false, leaving=false;
  function advance(){
    if(!ready||leaving)return;
    leaving=true;
    dialog.close();
    nextStage();
  }
  dialog.addEventListener("click",advance);
  dialog.addEventListener("keydown",event=>{
    if(["Enter"," "].includes(event.key)){
      event.preventDefault();event.stopPropagation();
      if(!event.repeat)advance();
    }
  });
  function paint(m,i,t){
    const el=dialog.querySelector('[data-xp-index="'+i+'"]');
    if(!el)return;
    let lv=m.from, cur=m.before+Math.floor(m.gained*t);
    while(lv<m.to&&cur>=levelExpToNext(lv)){cur-=levelExpToNext(lv);lv++;}
    if(t>=1){lv=m.to;cur=m.after;}
    const cap=lv>=LEVEL_CAP, need=levelExpToNext(lv);
    el.querySelector(".victory-level").textContent="Lv."+lv;
    el.querySelector(".victory-xp-track i").style.width=(cap?100:Math.min(100,cur/Math.max(1,need)*100))+"%";
    el.querySelector(".victory-xp-number").textContent=cap?"MAX":cur+" / "+need;
    el.querySelector(".victory-xp-gain").textContent=m.ko?"戦闘不能":cap&&!m.gained?"上限到達":"+"+Math.floor(m.gained*t)+" EXP";
    el.querySelector(".victory-level-up").hidden=lv<=m.from;
    el.classList.toggle("has-level-up",lv>m.from);
  }
  rows.forEach((m,i)=>paint(m,i,0));
  const fade=reduced?0:380, duration=reduced?0:1300;
  const start=performance.now()+fade;
  function tick(now){
    if(!dialog.open)return;
    const t=duration?Math.max(0,Math.min(1,(now-start)/duration)):1;
    rows.forEach((m,i)=>paint(m,i,t));
    if(now<start||t<1){requestAnimationFrame(tick);return;}
    dialog.querySelector(".victory-drops").hidden=false;
    dialog.querySelector(".victory-hint").hidden=false;
    // Leave a short beat after the item reveal to prevent accidental click-through.
    setTimeout(()=>{if(dialog.open)ready=true;},reduced?0:280);
  }
  requestAnimationFrame(tick);
}
