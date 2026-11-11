"use strict";
/* Opt-in formation move action for battle UI preview.
 * A selected move consumes the actor's action in the current round.
 * Positions are optional metadata in battle snapshots; old saves remain valid.
 */
(function () {
  if (new URLSearchParams(location.search).get("battleUiPreview") === "0") return;
  const rearJobs = new Set(["mage", "healer", "princess", "gunner"]);
  // Five-person parties must still fit the 3-front / 3-rear formation.
  function defaultRow(id) {
    const party = getParty();
    const natural = rearJobs.has(id) ? "rear" : "front";
    const same = party.filter(c => c.id !== id && (rearJobs.has(c.id) ? "rear" : "front") === natural);
    if (same.length < 3) return natural;
    const rank = party.findIndex(c => c.id === id);
    const earlier = same.filter(c => party.findIndex(p => p.id === c.id) < rank).length;
    return earlier < 3 ? natural : natural === "front" ? "rear" : "front";
  }
  // Each row has three stable slots, including an explicit empty third rear slot.
  const positions = new Map();
  const slots = new Map();
  function initializeSlots() {
    const party = getParty();
    const ids = new Set(party.map(c => c.id));
    for (const id of [...slots.keys()]) if (!ids.has(id)) { slots.delete(id); positions.delete(id); }
    for (const c of party) {
      if (slots.has(c.id)) continue;
      const preferred = positions.get(c.id) || defaultRow(c.id);
      let row = preferred;
      const free = candidate => [0,1,2].find(n => ![...slots.values()].some(v => v.row === candidate && v.slot === n));
      let slot = free(row);
      if (slot === undefined) { row = row === "front" ? "rear" : "front"; slot = free(row); }
      if (slot !== undefined) { slots.set(c.id,{row,slot}); positions.set(c.id,row); }
    }
  }
  function rowOf(character) {
    initializeSlots();
    return slots.get(character?.id)?.row || defaultRow(character?.id);
  }
  window.kotamaBattleRowOfParty = rowOf;
  window.kotamaBattleFormationPositions = positions;
  window.kotamaBattleSlotOfParty = character => {
    initializeSlots();
    return slots.get(character?.id)?.slot ?? 0;
  };
  window.kotamaBattleCommandOrder = () => {
    initializeSlots();
    return [...getParty()].filter(c => c.hp > 0).sort((a,b) => {
      const pa=slots.get(a.id),pb=slots.get(b.id);
      return (pa?.row === "rear" ? 3 : 0)+(pa?.slot ?? 0)-
             ((pb?.row === "rear" ? 3 : 0)+(pb?.slot ?? 0));
    }).map(c => c.id);
  };
  window.kotamaBattleExportRows = () => {
    initializeSlots();
    return Object.fromEntries([...slots].map(([id,p]) => [id,{row:p.row,slot:p.slot}]));
  };
  window.kotamaBattleImportRows = data => {
    slots.clear();positions.clear();
    if (!data || typeof data !== "object" || Array.isArray(data)) return;
    const ids = new Set(getParty().map(c => c.id));
    const taken = new Set();
    for (const [id,value] of Object.entries(data)) {
      if (!ids.has(id)) continue;
      const row = typeof value === "string" ? value : value?.row;
      if (!["front","rear"].includes(row)) continue;
      const preferred = Number.isInteger(value?.slot) ? value.slot : -1;
      const choices = preferred >= 0 && preferred <= 2 ? [preferred,0,1,2] : [0,1,2];
      const slot = choices.find(n => !taken.has(row+":"+n));
      if (slot === undefined) continue;
      taken.add(row+":"+slot);slots.set(id,{row,slot});positions.set(id,row);
    }
    initializeSlots();
  };

  function selectMove(actor) {
    if (!actor || battleState.busy || battleState.tutorialMode) return;
    initializeSlots();
    const box = document.getElementById("battle-commands");
    const current = slots.get(actor.id);
    const targetRow = current.row === "front" ? "rear" : "front";
    const label = targetRow === "front" ? "前衛" : "後衛";
    battleState.menuMode = "formation-move";
    document.getElementById("command-title").textContent = actor.name + "：移動先を選択";
    const occupants = [0,1,2].map(slot => {
      const member = getParty().find(c => c.id !== actor.id && slots.get(c.id)?.row === targetRow && slots.get(c.id)?.slot === slot);
      return {slot,member};
    });
    box.innerHTML = '<div class="formation-move-heading">'+label+'：交代する枠を選択</div>'+
      occupants.map(({slot,member}) => '<button class="command-option formation-slot-option" data-move-slot="'+slot+'">'+
        '<span>'+(member ? esc(member.name) : '空欄')+'</span></button>').join("")+
      '<button class="command-option" data-action="back">戻る</button>';
    document.getElementById("command-description").textContent = "前衛・後衛の3枠から移動先を選びます。相手がいる場合は位置を交換します。移動はこのターンの行動を消費します。";
    const partyDisplay = document.getElementById("battle-party");
    const clearTarget = () => partyDisplay?.querySelectorAll(".battle-formation-target").forEach(el => el.classList.remove("battle-formation-target"));
    const highlightSlot = slot => {
      clearTarget();
      const member = occupants.find(item => item.slot === slot)?.member;
      const card = member
        ? [...(partyDisplay?.querySelectorAll(".battle-member") || [])].find(el => el.dataset.partyId === member.id)
        : partyDisplay?.querySelector('.battle-formation-empty-slot[data-slot-key="' + targetRow + '-' + slot + '"]');
      card?.classList.add("battle-formation-target");
    };
    box.querySelectorAll("[data-move-slot]").forEach(button => {
      const slot = Number(button.dataset.moveSlot);
      button.addEventListener("mouseenter", () => highlightSlot(slot));
      button.addEventListener("focus", () => highlightSlot(slot));
      button.addEventListener("mouseleave", clearTarget);
      button.addEventListener("blur", clearTarget);
      button.addEventListener("click", () => {
        clearTarget();
        commitAction({type:"formation-move",actor:actor.id,row:targetRow,slot});
      });
    });
    box.querySelector('[data-action="back"]').addEventListener("click", () => {
      clearTarget();
      renderActionMenu();
      // Restore centered two-member rows immediately on cancel.
      window.kotamaBattleRefreshFormationSlots?.();
    });
    // Update slot indicators after the menu is visible; rendering the entire
    // battle here would destroy and recreate the submenu and its listeners.
    window.kotamaBattleRefreshFormationSlots?.();
  }
  window.kotamaBattleSelectMove = selectMove;

  const originalExecute = window.executeAction;
  if (typeof originalExecute === "function") {
    window.executeAction = async function (action) {
      if (action?.type !== "formation-move") return originalExecute.apply(this, arguments);
      const actor = getCharacter(action.actor);
      if (!actor || !["front","rear"].includes(action.row)) return;
      initializeSlots();
      const source = slots.get(actor.id);
      const destination = Number(action.slot);
      if (!source || !Number.isInteger(destination) || destination < 0 || destination > 2 || source.row === action.row) return;
      const other = getParty().find(c => c.id !== actor.id && slots.get(c.id)?.row === action.row && slots.get(c.id)?.slot === destination);
      slots.set(actor.id,{row:action.row,slot:destination});positions.set(actor.id,action.row);
      if (other) {
        slots.set(other.id,{row:source.row,slot:source.slot});positions.set(other.id,source.row);
      }
      pushEvent(actor.name + "は"+(action.row === "front" ? "前衛" : "後衛")+"の"+(destination+1)+"枠目へ移動"+(other ? "し、"+other.name+"と交代した！" : "した！"));
      renderBattle();
    };
  }
  const originalPriority = window.extActionPriority;
  if (typeof originalPriority === "function") {
    window.extActionPriority = function (action) {
      if (action?.type === "formation-move") return 0;
      return originalPriority.apply(this, arguments);
    };
  }
  const originalRender = window.renderBattle;
  if (typeof originalRender === "function") {
    window.renderBattle = function () {
      const result = originalRender.apply(this, arguments);
      document.querySelectorAll("#battle-party .battle-member").forEach(card => {
        const id = card.dataset.partyId;
        if (id) card.dataset.row = window.kotamaBattleRowOfParty(getCharacter(id));
      });
      return result;
    };
  }
})();
