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
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup, { once: true });
  else setup();
})();
