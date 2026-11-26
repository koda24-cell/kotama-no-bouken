/* Presentation-only formation gallery. Existing selection/equipment handlers remain authoritative. */
/* Read-only presentation helpers shared by formation and exploration.
   Mirror the battle preview's normal six-column, two-row layout. */
window.kotamaPartyHudLayout = function(party) {
  const rows=window.kotamaBattleExportRows?.();
  const entries=party.map((c,i)=>({c,row:rows?.[c.id]?.row==="rear"||(!rows?.[c.id]&&i>=3)?"rear":"front",slot:rows?.[c.id]?.slot??i%3}));
  return ["front","rear"].flatMap(row=>{
    const members=entries.filter(e=>e.row===row);
    return members.map((e,i)=>({...e,column:members.length===2?2+i*2:1+e.slot*2,gridRow:row==="rear"?2:1}));
  });
};
window.kotamaPartyHudContent = function(c) {
  const stat=effectiveStats(c),hp=Math.max(0,c.hp),sp=Math.max(0,c.sp),maxHp=stat.maxHp,maxSp=c.maxSp;
  const gauge=(label,value,max,kind)=>'<span class="kph-label kph-'+kind+'-label"><span>'+label+'</span><b>'+value+'/'+max+'</b></span><span class="kph-track kph-'+kind+'"><i style="width:'+Math.min(100,Math.max(0,value/Math.max(1,max)*100))+'%"></i></span>';
  return '<span class="kph-portrait">'+getCharacterImage(c)+'</span><span class="kph-name"><strong>'+esc(c.name)+'</strong><small>Lv.'+(typeof levelOf==="function"?levelOf(c):1)+'</small></span>'+gauge("HP",hp,maxHp,"hp")+gauge("SP",sp,maxSp,"sp");
};
(() => {
  "use strict";
  const legacyRender = renderFormation;
  let focusId = null, mode = "detail", filter = "all";
  const activeTutorial = () => tutorialState.started && !tutorialState.completed;
  const section = () => document.getElementById("formation");
  const byId = id => document.getElementById(id);
  function button(text, handler, className = "") {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = text; b.className = className;
    b.addEventListener("click", handler); return b;
  }
  function show(next) { mode = next; filter = "all"; renderFormation(); }
  function toolbar(root, party) {
    const bar = document.createElement("div");
    bar.id = "formation-gallery-toolbar";
    const title = document.createElement("div");
    title.className = "fg-heading";
    title.innerHTML = '<small>ADVENTURER / PARTY</small><h2>' + (mode === "detail" ? "パーティ編成" : "仲間を選択") + '</h2>';
    const count = document.createElement("span");
    count.className = "fg-count";
    count.textContent = party.length + " / " + PARTY_LIMIT + " 人";
    bar.append(title, count, button(mode === "detail" ? "仲間一覧 ▦" : "‹ 編成に戻る", () => show(mode === "detail" ? "roster" : "detail"), "fg-switch"));
    if (mode === "roster") {
      const controls = document.createElement("div"); controls.className = "fg-filters";
      [["all","すべて"],["available","加入可能"],["selected","編成中"],["locked","未解放"]].forEach(([key,label]) => {
        const b = button(label, () => { filter = key; renderFormation(); });
        b.setAttribute("aria-pressed", String(filter === key)); controls.append(b);
      });
      bar.append(controls);
    }
    root.prepend(bar);
  }
  renderFormation = function formationGalleryRender() {
    const root = section();
    if (!root) return legacyRender();
    root.querySelector("#formation-gallery-toolbar")?.remove();
    root.querySelector("#formation-gallery-rail")?.remove();
    root.classList.remove("formation-gallery");
    delete root.dataset.galleryMode;
    legacyRender();
    const selected = byId("selected-party"), roster = byId("character-roster");
    if (!selected || !roster) return;
    if (activeTutorial()) { mode = "detail"; filter = "all"; return; }
    const party = getParty();
    if (!party.some(c => c.id === focusId)) focusId = party[0]?.id || null;
    root.classList.add("formation-gallery");
    root.dataset.galleryMode = mode;
    toolbar(root, party);
    if (mode === "detail") {
      const rail = document.createElement("nav");
      rail.id = "formation-gallery-rail"; rail.setAttribute("aria-label", "編成中の仲間");
      rail.classList.add("kotama-party-hud");
      window.kotamaPartyHudLayout(party).forEach(({c,row,slot,column,gridRow})=>{
        const b=button("",()=>{focusId=c.id;renderFormation();},"fg-member kph-member");
        b.innerHTML=window.kotamaPartyHudContent(c);
        b.style.gridColumn=column+" / span 2";b.style.gridRow=String(gridRow);
        b.dataset.row=row;b.dataset.slot=String(slot);
        b.classList.toggle("kph-dead",c.hp<=0);
        b.setAttribute("aria-pressed",String(c.id===focusId));
        rail.append(b);
      });
      selected.after(rail);
      const emptySlot=Array.from({length:PARTY_LIMIT},(_,i)=>i).find(i=>!state.party[i]);
      if(emptySlot!==undefined){
        const add=button("＋ 空き枠に仲間を追加",()=>{formationTargetSlot=emptySlot;show("roster");},"fg-switch");
        root.querySelector("#formation-gallery-toolbar")?.append(add);
      }
      Array.from(selected.children).forEach((card, index) => {
        const c = getCharacter(state.party[index]);
        card.hidden = focusId ? c?.id !== focusId : index !== 0;
        if (!c) {
          const add = card.querySelector("[data-select-slot]");
          if (add) add.onclick = () => { formationTargetSlot = index; show("roster"); };
          return;
        }
        const art = card.querySelector(".character-art");
        if (!art) return;
        const panel = document.createElement("div"); panel.className = "fg-detail";
        const caption = document.createElement("small"); caption.className = "fg-kicker"; caption.textContent = "CHARACTER PROFILE";
        panel.append(caption);
        Array.from(card.children).filter(el => el !== art).forEach(el => panel.append(el));
        const remove = panel.querySelector("[data-remove-character]");
        if (remove) remove.onclick = () => { mode = "roster"; filter = "all"; removeCharacter(c.id); };
        card.append(panel);
      });
    } else {
      Array.from(roster.children).forEach((card, index) => {
        const c = characters[index]; if (!c) return;
        const chosen = state.party.includes(c.id), unlocked = extIsJobAvailable(c);
        card.hidden = !(filter === "all" || (filter === "selected" && chosen) || (filter === "available" && unlocked && !chosen) || (filter === "locked" && !unlocked));
        const badge = document.createElement("span"); badge.className = "fg-card-status";
        badge.textContent = chosen ? "編成中" : unlocked ? "加入可能" : "未解放";
        card.append(badge);
        const action = card.querySelector("[data-toggle-character]");
        if (!action) return;
        if (chosen) {
          action.textContent = "詳細を表示";
          action.disabled = false;
          action.onclick = () => { focusId = c.id; show("detail"); };
        } else {
          action.onclick = () => { focusId = c.id; mode = "detail"; filter = "all"; toggleCharacter(c.id); };
        }
      });
      if (!Array.from(roster.children).some(card => !card.hidden)) {
        const empty = document.createElement("p"); empty.className = "fg-empty"; empty.textContent = "該当する仲間はいません。"; roster.append(empty);
      }
    }
  };
})();
