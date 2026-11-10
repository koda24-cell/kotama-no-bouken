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
  sheet.href = "./css/15-battle-ui-refresh.css?v=20261110-2";
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

    // Observe the existing renderer; only set CSS order, never replace cards or handlers.
    function updateRows() {
      const cards = Array.from(party.querySelectorAll(".battle-member"));
      let front = 0, rear = 0;
      for (const card of cards) {
        const isRear = card.dataset.row === "rear";
        const index = isRear ? rear++ : front++;
        card.style.setProperty("--battle-row-order", String((isRear ? 3 : 0) + index));
        card.setAttribute("data-preview-row", isRear ? "rear" : "front");
      }
      party.dataset.frontCount = String(front);
      party.dataset.rearCount = String(rear);
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
      const actor = members.find(c => title.includes(c.name)) || members[0];
      if (!actor) { hud.hidden = true; return; }
      hud.hidden = false;
      if (hud.dataset.actorId !== actor.id) {
        hud.dataset.actorId = actor.id;
        portrait.replaceChildren();
        if (actor.image) {
          const img = document.createElement("img");
          img.src = actor.image;
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
      meterLabel.textContent = skill ? "UNION " + charge + " / " + required : "UNION 未設定";
      meterFill.style.width = percent + "%";
    }
    const title = document.getElementById("command-title");
    const commands = document.getElementById("battle-commands");
    const sync = new MutationObserver(updateHero);
    if (title) sync.observe(title, { childList: true, subtree: true, characterData: true });
    if (commands) sync.observe(commands, { childList: true, subtree: false });
    const partySync = new MutationObserver(updateHero);
    partySync.observe(party, { childList: true });
    updateHero();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup, { once: true });
  else setup();
})();
