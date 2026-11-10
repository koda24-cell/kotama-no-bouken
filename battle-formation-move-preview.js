"use strict";
/* Opt-in formation move action for battle UI preview.
 * A selected move consumes the actor's action in the current round.
 * No persistent save-schema changes; positions reset when the page reloads.
 */
(function () {
  if (new URLSearchParams(location.search).get("battleUiPreview") !== "1") return;
  const rearJobs = new Set(["mage", "healer", "princess", "gunner"]);
  const positions = new Map();
  window.kotamaBattleRowOfParty = function (character) {
    return positions.get(character?.id) || (rearJobs.has(character?.id) ? "rear" : "front");
  };
  window.kotamaBattleFormationPositions = positions;

  function selectMove(actor) {
    if (!actor || battleState.busy || battleState.tutorialMode) return;
    const box = document.getElementById("battle-commands");
    const current = window.kotamaBattleRowOfParty(actor);
    const members = getParty().filter(c => c.hp > 0);
    const count = row => members.filter(c => c.id !== actor.id && window.kotamaBattleRowOfParty(c) === row).length;
    battleState.menuMode = "formation-move";
    document.getElementById("command-title").textContent = actor.name + "：移動先を選択";
    box.innerHTML = ["front", "rear"].map(row => {
      const label = row === "front" ? "前衛" : "後衛";
      const blocked = row === current || count(row) >= 3;
      return '<button class="command-option" data-move-row="' + row + '"' + (blocked ? ' disabled' : '') + '>' + label + (row === current ? "（現在位置）" : count(row) >= 3 ? "（満員）" : "へ移動") + '</button>';
    }).join("") + '<button class="command-option" data-action="back">戻る</button>';
    document.getElementById("command-description").textContent = "移動したキャラクターは、このターン攻撃・防御などの別行動を行えません。";
    box.querySelectorAll("[data-move-row]").forEach(button => button.addEventListener("click", () => {
      const row = button.dataset.moveRow;
      if (row === current || count(row) >= 3) return;
      commitAction({type:"formation-move",actor:actor.id,row});
    }));
    box.querySelector('[data-action="back"]').addEventListener("click", () => renderActionMenu());
  }
  window.kotamaBattleSelectMove = selectMove;

  const originalExecute = window.executeAction;
  if (typeof originalExecute === "function") {
    window.executeAction = async function (action) {
      if (action?.type !== "formation-move") return originalExecute.apply(this, arguments);
      const actor = getCharacter(action.actor);
      if (!actor || !["front","rear"].includes(action.row)) return;
      const occupied = getParty().filter(c => c.id !== actor.id && window.kotamaBattleRowOfParty(c) === action.row).length;
      if (occupied >= 3) {
        pushEvent(actor.name + "は移動先が満員で移動できなかった。");
        return;
      }
      positions.set(actor.id, action.row);
      pushEvent(actor.name + "は" + (action.row === "front" ? "前衛" : "後衛") + "へ移動した！");
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
        const id = card.dataset.characterId || card.dataset.character || card.dataset.id;
        if (id) card.dataset.row = window.kotamaBattleRowOfParty(getCharacter(id));
      });
      return result;
    };
  }
})();
