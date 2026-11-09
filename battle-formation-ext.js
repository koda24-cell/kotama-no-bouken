"use strict";
/* GPT integration layer: front/rear rows, compact status badges, slime packs and Snowdrift. */
(function () {
  const REAR_IDS = new Set(["mage", "healer", "princess", "gunner"]);
  const original = {};
  const wrap = (name, fn) => {
    if (typeof window[name] !== "function" || window[name]._formationWrapped) return;
    const base = window[name];
    const next = fn(base);
    next._formationWrapped = true;
    window[name] = next;
  };
  const rowOfParty = c => REAR_IDS.has(c?.id) ? "rear" : "front";
  const rowLabel = row => row === "rear" ? "後衛" : "前衛";
  const compactStatus = (type, status, def) => {
    const turns = Math.max(0, Math.floor(Number(status?.turns) || 0));
    return ` <span class="status-ext ${def.harm ? "status-ext-bad" : "status-ext-good"} status-icon-only" title="${esc(def.label)}：残り${turns}ターン" aria-label="${esc(def.label)} 残り${turns}ターン">${def.icon || "•"}<b>${turns}</b></span>`;
  };

  // Battle HUD status: icon + remaining turns only. Full names remain in ANALYZE.
  window.extStatusBadges = function (unit) {
    const bag = typeof extStatusBag === "function" ? extStatusBag(unit, false) : null;
    const html = Object.entries(bag || {}).filter(([, st]) => st.turns > 0).map(([type, st]) => {
      const def = EXT_STATUS_DEFS[type] || { label: type, icon: "•", harm: true };
      return compactStatus(type, st, def);
    });
    if (typeof burnedTurns !== "undefined" && Number(burnedTurns[unit.id]) > 0 && !(bag?.burn?.turns > 0)) html.push(compactStatus("burn", { turns: burnedTurns[unit.id] }, EXT_STATUS_DEFS.burn));
    if (Number(unit._defenseDownTurns) > 0 && !(bag?.defenseDown?.turns > 0)) html.push(compactStatus("defenseDown", { turns: unit._defenseDownTurns }, EXT_STATUS_DEFS.defenseDown));
    return html.join("");
  };
  window.extEnemyStatusBadges = function (unit) {
    const bag = typeof extStatusBag === "function" ? extStatusBag(unit, false) : null;
    const html = Object.entries(bag || {}).filter(([, st]) => st.turns > 0).map(([type, st]) => {
      const def = EXT_STATUS_DEFS[type] || { label: type, icon: "•", harm: true };
      const turns = Math.max(0, Math.floor(Number(st.turns) || 0));
      return `<span class="${def.harm ? "enemy-status-debuff" : "enemy-status-buff"} status-icon-only" title="${esc(def.label)}：残り${turns}ターン" aria-label="${esc(def.label)} 残り${turns}ターン">${def.icon || "•"}<b>${turns}</b></span>`;
    });
    if (Number(unit._defenseDownTurns) > 0 && !(bag?.defenseDown?.turns > 0)) {
      const def = EXT_STATUS_DEFS.defenseDown, turns = unit._defenseDownTurns;
      html.push(`<span class="enemy-status-debuff status-icon-only" title="${esc(def.label)}：残り${turns}ターン">${def.icon}<b>${turns}</b></span>`);
    }
    return html;
  };

  // Enemy target policy: taunt and explicit rear targeting take precedence.
  if (typeof extPickPartyTarget === "function") {
    const basePick = extPickPartyTarget;
    window.extPickPartyTarget = function (alive, act) {
      const taunt = alive.find(c => c.id === battleState.tauntTarget);
      if (taunt) return taunt;
      if (act?.target === "rear" || String(battleState.enemy?.name || "").includes("アーチャー")) {
        const rear = alive.filter(c => rowOfParty(c) === "rear");
        if (rear.length) return rear[Math.floor(Math.random() * rear.length)];
      }
      if (String(battleState.enemy?.name || "").includes("ゴブリン")) {
        const min = Math.min(...alive.map(c => effectiveStats(c).defense));
        const candidates = alive.filter(c => effectiveStats(c).defense === min);
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
      return basePick(alive, act);
    };
  }

  // Rear-row party members take 40% of normal melee damage. Magic/ranged actions are untouched.
  wrap("applyPartyDamageAnimated", base => async function (character, damage, options = {}) {
    const rearMelee = rowOfParty(character) === "rear" && options.normalAttack === true && !options.ranged;
    return base.call(this, character, rearMelee ? Math.max(1, Math.floor(damage * .4)) : damage, options);
  });

  // A marker scopes rear-row enemy mitigation to the exact physical action.
  wrap("applyDamageToEnemyTarget", base => function (enemy, target, amount) {
    const reduced = battleState._formationPhysicalHit === true && target?.ref?.row === "rear";
    return base.call(this, enemy, reduced ? Math.max(1, Math.floor(amount * .4)) : amount);
  });
  wrap("applyDamageToEnemy", base => function (enemy, amount) {
    const member = enemy?.members?.find(m => m.hp > 0);
    const reduced = battleState._formationPhysicalHit === true && member?.row === "rear";
    return base.call(this, enemy, reduced ? Math.max(1, Math.floor(amount * .4)) : amount);
  });
  wrap("executeUnion", base => async function (action) {
    const type = unionSkills[action?.actor]?.type;
    const previous = battleState._formationPhysicalHit;
    battleState._formationPhysicalHit = type === "stun" || type === "samurai-slash" || type === "cross-break";
    try { return await base.call(this, action); }
    finally { battleState._formationPhysicalHit = previous; }
  });
  wrap("executeAction", base => async function (action) {
    const actor = getCharacter(action?.actor);
    const skill = action?.type === "skill" ? getCharacterSkills(actor).find(s => s.id === action.skillId) : null;
    const physical = (action?.type === "attack" && actor?.id !== "mage" && actor?.id !== "gunner") ||
      (action?.type === "skill" && actor?.id !== "mage" && actor?.id !== "gunner" &&
        (skill?.xj?.kind === "phys" || ["burst-blade", "multiSlash", "pierce", "charge"].includes(skill?.type)));
    const previous = battleState._formationPhysicalHit;
    battleState._formationPhysicalHit = !!physical;
    try { return await base.call(this, action); }
    finally { battleState._formationPhysicalHit = previous; }
  });
  wrap("extDamageSkill", base => async function (actor, skill, action, x, mult) {
    const previous = battleState._formationPhysicalHit;
    battleState._formationPhysicalHit = x?.kind === "phys" && actor?.id !== "gunner" && actor?.id !== "mage";
    try { return await base.call(this, actor, skill, action, x, mult); }
    finally { battleState._formationPhysicalHit = previous; }
  });

  // Assign visible rows to existing scripted group enemies without changing their save format.
  wrap("createEnemy", base => function (stage) {
    // The old 3–5 goblin gate group is relocated to the deep end of first-stratum 2F.
    // Other stage-2 starts retain a single captain instead of duplicating the relocated group.
    if (stage === 2 && !battleState.encounterMode) {
      const captain = JSON.parse(JSON.stringify(FIELD_ENEMIES["foe-goblin-captain"]));
      return { ...captain, maxHp: captain.hp, spDefense: captain.spDefense ?? Math.floor(captain.defense / 2), compendiumAs: "ゴブリン", dropAs: "ゴブリン" };
    }
    if (stage === 1 && !battleState.encounterMode && fieldState?.area === 1 && fieldState?.floor === 2) {
      return makeSnowdrift();
    }
    const enemy = base.call(this, stage);
    if (Array.isArray(enemy?.members)) {
      enemy.members.forEach((m, i) => { m.row = i < 2 ? "front" : "rear"; });
      if (enemy.name === "ゴブリン") enemy.ai = [
        { name: "棍棒の一撃", weight: 65, kind: "phys", power: 1 },
        { name: "ゴブリン連携攻撃", weight: 35, all: true, kind: "phys", power: .5, everyTurns: 3 }
      ];
    }
    return enemy;
  });

  function makeSnowdrift() {
    const d = SNOWDRIFT_BOSS_DATA, hp = d.hp;
    const boss = {
      id: "snowdrift", name: d.name, displayName: d.name, row: "front",
      hp, maxHp: hp, attack: d.attack, defense: d.defense, spDefense: d.spDefense, image: d.image, alive: true
    };
    return {
      ...d, variantId: "snowdrift-boss", hp, maxHp: hp,
      ai: d.ai, members: [boss], _snowdriftSummonCount: 0, compendiumAs: "スライム"
    };
  }
  if (Array.isArray(EXT_BOSS_NAMES) && !EXT_BOSS_NAMES.includes("スノードリフト")) EXT_BOSS_NAMES.push("スノードリフト");
  if (typeof EXT_ENEMY_SPEED === "object") EXT_ENEMY_SPEED["スノードリフト"] = 78;

  // Snowdrift periodically calls one snow wolf, up to three. Existing group damage/targeting handles them.
  wrap("extVariantAction", base => async function (enemy, turn) {
    if (enemy?.variantId === "snowdrift-boss" && turn % 3 === 0 && enemy._snowdriftSummonCount < 3 && enemyHpTotal(enemy) > 0) {
      const n = ++enemy._snowdriftSummonCount, hp = 430;
      enemy.members.push({
        id: `snow-wolf-${n}`, name: "スノーウルフ", displayName: `スノーウルフ ${n}`, row: n === 1 ? "front" : "rear",
        hp, maxHp: hp, attack: 58, defense: 22, spDefense: 16, image: "assets/monsters/ookami.png", alive: true
      });
      enemy.hp = enemyHpTotal(enemy);
      enemy.maxHp += hp;
      pushEvent("スノードリフトの遠吠えに応え、スノーウルフが駆けつけた！", "warning");
      renderBattle();
      return;
    }
    if (enemy?.formationTag === "fire-slime-pack") {
      const living = enemy.members.filter(m => m.hp > 0);
      const saved = enemy.ai;
      enemy.ai = living.length === 3 ? saved : saved.filter(a => a.name !== "燃え広がる");
      try { return await base.call(this, enemy, turn); }
      finally { enemy.ai = saved; }
    }
    return base.call(this, enemy, turn);
  });

  // Field encounter packs: 1–3 fire/poison slimes. Only three living fire slimes unlock the party-wide blaze.
  wrap("fieldCreateEnemy", base => function (id, scale) {
    if (id === "foe-goblin-pack") {
      const def = FIELD_ENEMIES[id], d = enemyData[1], count = 3 + Math.floor(Math.random() * 3);
      const members = Array.from({ length: count }, (_, i) => ({
        id: `goblin-pack-${i + 1}`, name: "ゴブリン", displayName: `ゴブリン ${i + 1}`,
        hp: d.hp, maxHp: d.hp, attack: d.attack, defense: d.defense, spDefense: Math.floor(d.defense / 2),
        gold: d.gold, sprite: d.sprite, image: d.image, actionName: d.actionName,
        row: i < 2 ? "front" : "rear", alive: true
      }));
      const totalHp = count * d.hp;
      return { ...d, ...def, name: "ゴブリン隊長と護衛", hp: totalHp, maxHp: totalHp, members, gold: def.gold || count * d.gold,
        exp: def.exp || 220, memberCount: count, spDefense: Math.floor(d.defense / 2),
        ai: [
          { name: "棍棒の一撃", weight: 65, kind: "phys", power: 1 },
          { name: "ゴブリン連携攻撃", weight: 35, all: true, kind: "phys", power: .5, everyTurns: 3 }
        ], compendiumAs: "ゴブリン", dropAs: "ゴブリン" };
    }
    if (id !== "fire-slime" && id !== "poison-slime") {
      const enemy = base.call(this, id, scale);
      if (Array.isArray(enemy?.members)) enemy.members.forEach((m, i) => { m.row = i < 2 ? "front" : "rear"; });
      return enemy;
    }
    const def = FIELD_ENEMIES[id], k = Number.isFinite(scale) ? scale : 1;
    const count = 1 + Math.floor(Math.random() * 3);
    const fire = id === "fire-slime";
    const hp = Math.round(def.hp * k), attack = Math.round(def.attack * k);
    const members = Array.from({ length: count }, (_, i) => ({
      id: `${id}-${i + 1}`, name: def.name, displayName: `${def.name} ${i + 1}`,
      hp, maxHp: hp, attack, defense: Math.round(def.defense * k), spDefense: Math.round(def.spDefense * k),
      image: def.image, sprite: def.sprite, row: i < 2 ? "front" : "rear", alive: true
    }));
    const ai = fire ? [
      { name: "火の粉", weight: 65, kind: "sp", power: 1, element: "炎", status: { type: "burn", chance: .35, turns: 2 } },
      { name: "燃え広がる", weight: 35, all: true, kind: "sp", power: .62, element: "炎", status: { type: "burn", chance: .25, turns: 2 }, everyTurns: 3 }
    ] : [
      { name: "毒液", weight: 65, kind: "phys", power: .85, status: { type: "poison", chance: .6, turns: 3, power: .05 } },
      { name: "溶解液", weight: 35, kind: "sp", power: .8, status: { type: "defenseDown", chance: .55, turns: 2, power: 4 } }
    ];
    const totalHp = members.reduce((n, m) => n + m.hp, 0);
    return { ...def, hp: totalHp, maxHp: totalHp, attack, members, ai, formationTag: fire ? "fire-slime-pack" : "poison-slime-pack", gold: (def.gold || 8) * count, exp: (def.exp || 12) * count, compendiumAs: "スライム", dropAs: "スライム" };
  });

  // Apply row metadata after the existing renderer has rebuilt the cards.
  wrap("renderBattle", base => function (...args) {
    const result = base.apply(this, args);
    document.querySelectorAll("#battle-party .battle-member").forEach(card => {
      const c = getCharacter(card.dataset.partyId), row = rowOfParty(c);
      card.dataset.row = row;
      const head = card.querySelector(".member-head");
      if (head && !head.querySelector(".formation-row-label")) {
        const tag = document.createElement("span"); tag.className = "formation-row-label"; tag.textContent = rowLabel(row); head.appendChild(tag);
      } else if (head) head.querySelector(".formation-row-label").textContent = rowLabel(row);
      card.classList.toggle("party-front-row", row === "front");
      card.classList.toggle("party-rear-row", row === "rear");
    });
    document.querySelectorAll("#battle-enemy .enemy-group-unit").forEach(unit => {
      const id = unit.dataset.enemyId;
      const e = battleState.enemy;
      const member = e?.members?.find(m => m.id === id) || (battleState.wolfClones || []).find(m => m.id === id);
      const row = member?.row || "front";
      unit.dataset.row = row;
      if (!unit.querySelector(".formation-row-label")) {
        const tag = document.createElement("em"); tag.className = "formation-row-label"; tag.textContent = rowLabel(row); unit.appendChild(tag);
      }
    });
    // The legacy stun badge also uses the same compact icon-only treatment.
    document.querySelectorAll("#battle-party .status-stun").forEach(node => {
      const turns = (node.textContent.match(/\d+/) || [""])[0];
      node.textContent = turns ? `⛓${turns}` : "⛓";
      node.title = turns ? `行動不能：残り${turns}ターン` : "行動不能";
    });
    return result;
  });

  // Snowdrift's field boss is the 3F gate guardian of the first stratum.
  document.addEventListener("battle:start", () => {
    if (battleState.enemy?.variantId === "snowdrift") {
      pushEvent("白銀の狼王スノードリフトが立ちはだかった！");
    }
  });
})();
