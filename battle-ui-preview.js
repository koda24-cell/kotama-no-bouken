"use strict";
/* Optional battle UI preview. Enable only with ?battleUiPreview=1.
   No battle rules, saves, party size or command handlers are modified. */
(function () {
  let enabled = false;
  try { enabled = new URLSearchParams(location.search).get("battleUiPreview") === "1"; }
  catch (_) { return; }
  if (!enabled) return;
  const sheet = document.createElement("link");
  sheet.rel = "stylesheet";
  sheet.href = "./css/15-battle-ui-refresh.css?v=20261110-20";
  document.head.appendChild(sheet);
  function setup() {
    const battle = document.getElementById("battle");
    const party = document.getElementById("battle-party");
    if (!battle || !party) return;
    battle.classList.add("battle-ui-preview");
    // Preview-only rearrangement. Move the existing EVENT node instead of
    // cloning it, preserving aria-live, tutorial selectors and log updates.
    const bottom = document.getElementById("battle-bottom");
    const eventWindow = battle.querySelector(".event-window");
    const infoWindow = bottom?.querySelector(".command-info-window");
    if (bottom && eventWindow && infoWindow) {
      bottom.insertBefore(eventWindow, infoWindow);
      bottom.classList.add("battle-preview-bottom");
    }

    // The old battle-support strip is redundant: COMMAND INFO is the single
    // description surface. Keep its element for game logic but hide visually.
    const support = document.getElementById("battle-support");
    if (support) support.hidden = true;
    const commandHint = document.getElementById("command-hint");
    if (commandHint) commandHint.hidden = true;
    const infoDescription = document.getElementById("command-description");
    if (infoDescription) {
      const initialPrompt = "コマンドを選ぶと説明がここに表示されます。";
      let hasSelectedCommand = false;
      const markSelected = event => {
        if (!event.target.closest("#battle-commands button, .battle-preview-primary-rail button")) return;
        hasSelectedCommand = true;
      };
      battle.addEventListener("click", markSelected, true);
      // Show the guidance only before the first command selection.
      // Later skill/attack descriptions remain under control of game logic.
      requestAnimationFrame(() => {
        if (!hasSelectedCommand && battle.classList.contains("active"))
          infoDescription.textContent = initialPrompt;
      });
    }

    // Legacy 3DS-style key badges are removed in preview, without removing buttons.
    const eventTitle = eventWindow?.querySelector(".window-title");
    if (eventTitle) {
      eventTitle.textContent = "EVENT";
      eventTitle.setAttribute("aria-label", "イベントログ");
    }
    // Place the EVENT tab beside the action prompt, like the reference HUD.
    // The log body remains in its existing accessible live region below.
    const actionWindow = bottom?.querySelector(".command-window");
    if (eventTitle && actionWindow) {
      eventTitle.classList.add("battle-event-prompt-tab");
      actionWindow.prepend(eventTitle);
    }
    // Rare slime HP sits above its head; update after enemy changes.
    const enemyDisplay = document.getElementById("battle-enemy");
    const enemyName = document.getElementById("enemy-name");
    if (enemyDisplay && enemyName) {
      const syncRareSlime = () => enemyDisplay.classList.toggle("battle-rare-slime", /はぐれスライム/.test(enemyName.textContent || ""));
      new MutationObserver(syncRareSlime).observe(enemyName, {childList:true,subtree:true,characterData:true});
      syncRareSlime();
    }
    // Move the original LOG / enemy / ally controls to the reference-style top HUD.
    // Moving real nodes preserves their event listeners and dialog behavior.
    const arenaHeader = document.createElement("div");
    arenaHeader.className = "battle-preview-top-hud";
    const tabs = document.createElement("nav");
    tabs.className = "battle-preview-tabs";
    tabs.setAttribute("aria-label", "戦闘情報");
    const logButton = document.getElementById("battle-log-open");
    const analyzeTabs = battle.querySelector(".analyze-tabs");
    if (logButton) { logButton.replaceChildren(document.createTextNode("LOG")); tabs.appendChild(logButton); }
    if (analyzeTabs) {
      const enemyTab = analyzeTabs.querySelector("#analyze-enemy-button");
      const allyTab = analyzeTabs.querySelector("#analyze-party-button") || analyzeTabs.querySelector("#analyze-ally-button") || analyzeTabs.querySelectorAll("button")[1];
      if (enemyTab) enemyTab.replaceChildren(document.createTextNode("敵"));
      if (allyTab) allyTab.replaceChildren(document.createTextNode("味方"));
      tabs.appendChild(analyzeTabs);
    }
    const counter = document.getElementById("turn-counter");
    if (counter) {
      arenaHeader.appendChild(counter);
      const formatTurn = () => {
        const turn = typeof battleState !== "undefined" ? Math.max(1, (Number(battleState.turnCount) || 0) + 1) : 1;
        const label = "TURN " + turn;
        const phase = typeof battleState !== "undefined" && battleState.busy ? "行動中" : "行動選択";
        if (counter.textContent !== label) counter.textContent = label;
        if (counter.dataset.phase !== phase) counter.dataset.phase = phase;
      };
      const turnObserver = new MutationObserver(formatTurn);
      turnObserver.observe(counter, {childList:true,characterData:true,subtree:true});
      formatTurn();
    }
    arenaHeader.appendChild(tabs);
    battle.querySelector(".battle-arena")?.prepend(arenaHeader);
    // Observe the existing renderer; only set CSS order, never replace cards or handlers.
    function updateRows() {
      const cards = Array.from(party.querySelectorAll(".battle-member"));
      let front = 0, rear = 0;
      const totalFront = cards.filter(card => card.dataset.row !== "rear").length;
      const totalRear = cards.length - totalFront;
      for (const card of cards) {
        const isRear = card.dataset.row === "rear";
        const index = isRear ? rear++ : front++;
        const order = String((isRear ? 3 : 0) + index);
        const count = isRear ? totalRear : totalFront;
        const start = count === 1 ? 3 : count === 2 ? 2 + index * 2 : 1 + index * 2;
        const column = String(start) + " / span 2";
        const gridRow = isRear ? "2" : "1";
        const row = isRear ? "rear" : "front";
        if (card.style.getPropertyValue("--battle-row-order") !== order) card.style.setProperty("--battle-row-order", order);
        if (card.style.getPropertyValue("--battle-column") !== column) card.style.setProperty("--battle-column", column);
        if (card.style.getPropertyValue("--battle-grid-row") !== gridRow) card.style.setProperty("--battle-grid-row", gridRow);
        if (card.dataset.previewRow !== row) card.dataset.previewRow = row;
      }
      if (party.dataset.frontCount !== String(front)) party.dataset.frontCount = String(front);
      if (party.dataset.rearCount !== String(rear)) party.dataset.rearCount = String(rear);
    }
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; updateRows(); });
    });
    observer.observe(party, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-row"] });
    updateRows();
    // Read-only actor portrait and individual union charge, sourced from existing game state.
    const arena = battle.querySelector(".battle-arena");
    const hud = document.createElement("aside");
    hud.className = "battle-preview-hero";
    hud.setAttribute("aria-label", "行動中のキャラクターとユニオンゲージ");
    const portrait = document.createElement("div");
    portrait.className = "battle-preview-portrait";
    const name = document.createElement("strong");
    const meter = document.createElement("div");
    meter.className = "battle-preview-union";
    const meterLabel = document.createElement("span");
    const meterTrack = document.createElement("div");
    const meterFill = document.createElement("i");
    meterTrack.appendChild(meterFill);
    meter.append(meterLabel, meterTrack);
    hud.append(portrait, name, meter);
    arena?.appendChild(hud);
    function updateHero() {
      if (!battle.classList.contains("active")) return;
      const members = typeof getParty === "function" ? getParty() : [];
      const title = document.getElementById("command-title")?.textContent || "";
      const activeId = typeof battleState !== "undefined" ? battleState.turnOrder?.[battleState.currentActorIndex] : null;
      const actor = members.find(c => c.id === activeId) || members.find(c => title.includes(c.name)) || members[0];
      if (!actor) { hud.hidden = true; return; }
      hud.hidden = false;
      if (hud.dataset.actorId !== actor.id) {
        hud.dataset.actorId = actor.id;
        portrait.replaceChildren();
        const portraitSrc = actor.image;
        if (portraitSrc) {
          const img = document.createElement("img");
          img.src = portraitSrc;
          img.alt = "";
          img.onerror = () => { img.remove(); portrait.textContent = actor.emblem || "◇"; };
          portrait.appendChild(img);
        } else portrait.textContent = actor.emblem || "◇";
        name.textContent = actor.name;
      }
      const skill = typeof unionSkills !== "undefined" ? unionSkills[actor.id] : null;
      const required = Math.max(1, Number(skill?.requiredHits) || 1);
      const charge = typeof battleState !== "undefined" ? Math.max(0, Number(battleState.unionGauges?.[actor.id]) || 0) : 0;
      const percent = skill ? Math.min(100, charge / required * 100) : 0;
      meterLabel.textContent = skill ? "UNION " + Math.round(percent) + "%" : "UNION";
      meterLabel.title = skill ? charge + " / " + required : "未設定";
      meter.classList.toggle("battle-union-ready", !!skill && percent >= 100);
      // Ready state is shared by the always-visible command and the submenu rail.
      battle.classList.toggle("battle-preview-union-ready", !!skill && percent >= 100);
      document.querySelectorAll("#battle-commands [data-preview-union-toggle], .battle-preview-primary-rail .battle-preview-rail-button").forEach(button => {
        if (button.matches("[data-preview-union-toggle]") || button.textContent.includes("ユニオンスキル"))
          button.classList.toggle("battle-union-command-ready", !!skill && percent >= 100);
      });
      meter.setAttribute("aria-label", skill ? "ユニオンゲージ " + Math.round(percent) + "パーセント" : "ユニオン未設定");
      meterFill.style.width = percent + "%";
      meterTrack.style.setProperty("--battle-union-percent", percent + "%");
    }
    const title = document.getElementById("command-title");
    const commands = document.getElementById("battle-commands");
    const sync = new MutationObserver(updateHero);
    if (title) sync.observe(title, { childList: true, subtree: true, characterData: true });
    if (commands) sync.observe(commands, { childList: true, subtree: false });
    const partySync = new MutationObserver(updateHero);
    partySync.observe(party, { childList: true });
    updateHero();
    // Keep the game's original Union buttons and click handlers intact.
    // Present them behind a dedicated submenu in main command mode.
    const primaryRail = document.createElement("nav");
    primaryRail.className = "battle-preview-primary-rail";
    primaryRail.setAttribute("aria-label", "戦闘メインコマンド");
    arena?.appendChild(primaryRail);
    const railTitle = document.createElement("strong");
    railTitle.className = "battle-preview-rail-title";
    railTitle.textContent = document.getElementById("command-title")?.textContent || "どうする？";
    primaryRail.appendChild(railTitle);
    const railActions = [["攻撃","attack"],["SPスキル","skill"],["防御","guard"],["道具","item"],["編成位置入れ替え","preview-move"],["ユニオンスキル","preview-union-toggle"]];
    for (const [label,action] of railActions) {
      const button = document.createElement("button");
      button.type = "button"; button.className = "battle-preview-rail-button"; button.textContent = label;
      button.addEventListener("click", () => {
        if (battleState.busy) return;
        // Align the submenu first option just below the selected action row.
        const arena = battle.querySelector(".battle-arena");
        if (arena) {
          const selectedTop = button.getBoundingClientRect().top - arena.getBoundingClientRect().top;
          battle.style.setProperty("--battle-submenu-top", Math.max(120, Math.min(325, Math.round(selectedTop - 20))) + "px");
        }
        renderActionMenu();
        requestAnimationFrame(() => {
          const selector = action === "preview-move" ? "[data-preview-move]" : action === "preview-union-toggle" ? "[data-preview-union-toggle]" : "[data-action="+action+"]";
          commands.querySelector(selector)?.click();
        });
      });
      primaryRail.appendChild(button);
    }
    const railSync = new MutationObserver(() => { primaryRail.hidden = !battle.classList.contains("battle-preview-side-open"); });
    if (commands) railSync.observe(commands, {childList:true});
    primaryRail.hidden = true;
    let unionMenuOpen = false;
    let commandSyncPending = false;
    function updateCommandLayout() {
      if (typeof battleState === "undefined") return;
      const box = document.getElementById("battle-commands");
      if (!box) return;
      const main = battleState.menuMode === "main";
      box.classList.toggle("battle-preview-main-menu", main);
      battle.classList.toggle("battle-preview-side-open", !main && !battleState.tutorialMode);
      primaryRail.hidden = main || !!battleState.tutorialMode;
      const actor = typeof currentActor === "function" ? currentActor() : null;
      const union = actor && typeof unionSkills !== "undefined" ? unionSkills[actor.id] : null;
      const ready = !!union && (Number(battleState.unionGauges?.[actor.id]) || 0) >= union.requiredHits;
      primaryRail.querySelectorAll(".battle-preview-rail-button").forEach(button => {
        if (button.textContent.includes("ユニオンスキル")) button.classList.toggle("battle-union-command-ready", ready);
      });
      railTitle.textContent = (typeof currentActor === "function" ? currentActor()?.name : "") + "　どうする？";
      const unionPanel = box.querySelector(".union-panel");
      const existingToggle = box.querySelector("[data-preview-union-toggle]");
      if (!main || !unionPanel) {
        unionMenuOpen = false;
        existingToggle?.remove();
        return;
      }
      // Add the formation move command only in the opt-in preview.
      if (!box.querySelector("[data-preview-move]")) {
        const move = document.createElement("button");
        move.type = "button";
        move.className = "command-option battle-preview-move";
        move.dataset.previewMove = "1";
        move.textContent = "編成位置入れ替え";
        move.disabled = typeof window.kotamaBattleSelectMove !== "function" || !!battleState.tutorialMode;
        move.title = "このターンの行動を使って前衛・後衛を移動";
        move.addEventListener("click", () => {
          const id = battleState.turnOrder?.[battleState.currentActorIndex];
          const actor = typeof getCharacter === "function" ? getCharacter(id) : null;
          window.kotamaBattleSelectMove?.(actor);
        });
        box.insertBefore(move, unionPanel);
      }
      if (!existingToggle) {
        unionMenuOpen = false;
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "command-option battle-preview-union-toggle";
        toggle.dataset.previewUnionToggle = "1";
        toggle.textContent = "ユニオンスキル";
        toggle.setAttribute("aria-expanded", "false");
        toggle.addEventListener("click", () => {
          unionMenuOpen = !unionMenuOpen;
          unionPanel.hidden = !unionMenuOpen;
          toggle.setAttribute("aria-expanded", String(unionMenuOpen));
          toggle.textContent = unionMenuOpen ? "ユニオンを閉じる" : "ユニオンスキル";
          const info = document.getElementById("command-description");
          if (info && unionMenuOpen) info.textContent = "発動するユニオンスキルを選択してください。";
        });
        box.insertBefore(toggle, unionPanel);
      }
      unionPanel.hidden = !unionMenuOpen;
    }
    const commandObserver = new MutationObserver(() => {
      if (commandSyncPending) return;
      commandSyncPending = true;
      requestAnimationFrame(() => { commandSyncPending = false; updateCommandLayout(); });
    });
    if (commands) commandObserver.observe(commands, {childList:true});
    updateCommandLayout();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup, { once: true });
  else setup();
})();
