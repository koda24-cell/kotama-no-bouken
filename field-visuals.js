/* ============================================================
   field-visuals.js — GPT担当：フィールド入場演出
   field.js の field:* 通知を購読するだけ。移動・判定・セーブには触れない。
   ============================================================ */
(() => {
  "use strict";
  const shownAreas = new Set();
  let hideTimer = null;
  let activeCard = null;

  document.addEventListener("field:enter", event => {
    const detail = event.detail || {};
    const area = Number(detail.area);
    const name = String(detail.areaName || "");
    const viewport = document.getElementById("field-viewport");
    if (!viewport || !name || !area || shownAreas.has(area)) return;
    shownAreas.add(area);

    if (hideTimer) clearTimeout(hideTimer);
    activeCard?.remove();

    const card = document.createElement("div");
    card.className = "field-area-intro";
    card.setAttribute("aria-hidden", "true");
    const index = document.createElement("span");
    index.className = "field-area-intro-index";
    index.textContent = "AREA " + String(area).padStart(2, "0");
    const title = document.createElement("strong");
    title.className = "field-area-intro-title";
    title.textContent = name;
    card.append(index, title);
    viewport.appendChild(card);
    activeCard = card;

    hideTimer = setTimeout(() => {
      card.classList.add("is-leaving");
      setTimeout(() => {
        if (card.isConnected) card.remove();
        if (activeCard === card) activeCard = null;
      }, 420);
    }, 1450);
  });
})();
