(function (root, factory) {
  const DATA = root.Embervale && root.Embervale.DATA;
  const RPG = root.Embervale && root.Embervale.RPG;
  const WORLD = root.Embervale && root.Embervale.WORLD;
  const COMBAT = root.Embervale && root.Embervale.COMBAT;
  let ICONS = root.Embervale && root.Embervale.ICONS;
  if (!ICONS && typeof require === "function") {
    try {
      ICONS = require("./icons.js");
    } catch {}
  }
  const api = factory(DATA, RPG, WORLD, COMBAT, ICONS);
  root.Embervale = root.Embervale || {};
  root.Embervale.UI = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (DATA, RPG, WORLD, COMBAT, ICONS) {
  "use strict";

  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatStatDelta(delta) {
    if (!delta) return "";
    const labels = {
      atk: "ATK",
      def: "DEF",
      maxHp: "HP",
      maxMp: "MP",
      spd: "SPD",
      crit: "CRIT%"
    };
    const parts = [];
    for (const [key, val] of Object.entries(delta)) {
      const cls = val > 0 ? "delta-up" : "delta-down";
      const arrow = val > 0 ? "▲" : "▼";
      const sign = val > 0 ? "+" : "";
      parts.push(`<span class="${cls}">${arrow} ${sign}${val} ${labels[key] || key}</span>`);
    }
    if (parts.length === 0) return '<div class="delta-row"><span class="item-desc">Same power as equipped</span></div>';
    return `<div class="delta-row">${parts.join("")}</div>`;
  }

  function formatItemStats(stats) {
    if (!stats) return "";
    const labels = { atk: "ATK", def: "DEF", maxHp: "HP", maxMp: "MP", spd: "SPD", crit: "Crit%" };
    return Object.entries(stats)
      .map(([k, v]) => `+${v} ${labels[k] || k}`)
      .join(" · ");
  }

  function createUiController(handlers) {
    const els = {
      gameShell: document.getElementById("game-shell"),
      hudLevel: document.getElementById("hud-level"),
      hudHpFill: document.getElementById("hud-hp-fill"),
      hudHpText: document.getElementById("hud-hp-text"),
      hudMpFill: document.getElementById("hud-mp-fill"),
      hudMpText: document.getElementById("hud-mp-text"),
      hudGoldText: document.getElementById("hud-gold-text"),
      hudExpFill: document.getElementById("hud-exp-fill"),
      hudExpText: document.getElementById("hud-exp-text"),
      hudZone: document.getElementById("hud-zone"),
      hudQuestPill: document.getElementById("hud-quest-pill"),
      hudQuestText: document.getElementById("hud-quest-text"),
      menuNotif: document.getElementById("menu-notif"),
      bossWrap: document.getElementById("boss-bar-wrap"),
      bossName: document.getElementById("boss-name"),
      bossHpText: document.getElementById("boss-hp-text"),
      bossHpFill: document.getElementById("boss-hp-fill"),
      zoneBanner: document.getElementById("zone-banner"),
      zoneBannerTitle: document.getElementById("zone-banner-title"),
      zoneBannerSub: document.getElementById("zone-banner-sub"),
      interactBtn: document.getElementById("btn-interact"),
      interactLabel: document.getElementById("interact-label"),
      potionBtn: document.getElementById("btn-potion"),
      potionIconWrap: document.getElementById("potion-icon-wrap"),
      potionQty: document.getElementById("potion-qty"),
      btnMenu: document.getElementById("btn-menu"),
      btnMute: document.getElementById("btn-mute"),
      iconSoundOn: document.getElementById("icon-sound-on"),
      iconSoundOff: document.getElementById("icon-sound-off"),
      drawerBackdrop: document.getElementById("drawer-backdrop"),
      drawerTitle: document.getElementById("drawer-title"),
      drawerGold: document.getElementById("drawer-gold"),
      drawerClose: document.getElementById("drawer-close"),
      skillTabPip: document.getElementById("skill-tab-pip"),
      questTabPip: document.getElementById("quest-tab-pip"),
      sheetBody: document.getElementById("sheet-body"),
      tabButtons: Array.from(document.querySelectorAll(".tab-btn")),
      screenOverlay: document.getElementById("screen-overlay"),
      modalKicker: document.getElementById("modal-kicker"),
      modalTitle: document.getElementById("modal-title"),
      modalDesc: document.getElementById("modal-desc"),
      modalTips: document.getElementById("modal-tips"),
      modalSummary: document.getElementById("modal-summary"),
      btnPrimary: document.getElementById("btn-primary-action"),
      btnSecondary: document.getElementById("btn-secondary-action")
    };

    let activeTab = "bag";
    let shopSubTab = "buy";
    let drawerOpen = false;
    let feedbackBanner = "";

    function openDrawer(tab) {
      activeTab = tab || "bag";
      drawerOpen = true;
      feedbackBanner = "";
      els.drawerBackdrop.hidden = false;
      for (const btn of els.tabButtons) {
        btn.classList.toggle("is-active", btn.dataset.tab === activeTab);
      }
      renderDrawer(handlers.getState());
      handlers.onPauseChanged?.(true);
    }

    function closeDrawer() {
      if (!drawerOpen) return;
      drawerOpen = false;
      els.drawerBackdrop.hidden = true;
      handlers.onPauseChanged?.(false);
    }

    function isDrawerOpen() {
      return drawerOpen;
    }

    function toggleDrawer(tab) {
      if (drawerOpen) closeDrawer();
      else openDrawer(tab || "bag");
    }

    function setMuteIcon(isMuted) {
      els.iconSoundOn.hidden = isMuted;
      els.iconSoundOff.hidden = !isMuted;
    }

    els.btnMenu.addEventListener("click", () => toggleDrawer("bag"));
    els.hudQuestPill.addEventListener("click", () => openDrawer("hero"));
    els.drawerClose.addEventListener("click", closeDrawer);
    els.drawerBackdrop.addEventListener("click", (e) => {
      if (e.target === els.drawerBackdrop) closeDrawer();
    });

    els.btnMute.addEventListener("click", () => {
      const m = handlers.onToggleMute?.();
      setMuteIcon(Boolean(m));
    });

    for (const btn of els.tabButtons) {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
        feedbackBanner = "";
        for (const t of els.tabButtons) {
          t.classList.toggle("is-active", t.dataset.tab === activeTab);
        }
        renderDrawer(handlers.getState());
      });
    }

    els.sheetBody.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const state = handlers.getState();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const uid = btn.dataset.uid;

      if (action === "use-item") {
        const res = RPG.useConsumable(state.player, uid);
        feedbackBanner = res.ok ? `Used ${res.item.name}` : res.reason;
        if (res.ok) handlers.onPlaySfx?.("heal");
      } else if (action === "equip-item") {
        const res = RPG.equipItem(state.player, uid);
        feedbackBanner = res.ok ? `Equipped ${res.equipped.name}` : res.reason;
        if (res.ok) handlers.onPlaySfx?.("buy");
      } else if (action === "upgrade-skill") {
        const res = RPG.upgradeSkill(state.player, id);
        feedbackBanner = res.ok ? `${res.skill.name} upgraded to Rank ${res.rank}!` : res.reason;
        if (res.ok) handlers.onPlaySfx?.("levelup");
      } else if (action === "claim-quest") {
        const res = RPG.claimQuestReward(state.player);
        if (res.ok) {
          feedbackBanner = `Claimed ${res.goldGained}g & ${res.expGained} EXP!`;
          handlers.onPlaySfx?.(res.expRes.leveledUp ? "levelup" : "chest");
        } else {
          feedbackBanner = res.reason;
        }
      } else if (action === "shop-sub") {
        shopSubTab = id;
        feedbackBanner = "";
      } else if (action === "buy-item") {
        const res = RPG.buyItem(state.player, id, 1);
        feedbackBanner = res.ok ? `Bought ${res.item.name} (-${res.totalCost}g)` : res.reason;
        if (res.ok) handlers.onPlaySfx?.("buy");
      } else if (action === "sell-item") {
        const res = RPG.sellItem(state.player, uid);
        feedbackBanner = res.ok ? `Sold ${res.item.name} (+${res.earnedGold}g)` : res.reason;
        if (res.ok) handlers.onPlaySfx?.("coin");
      } else if (action === "save-game") {
        const ok = handlers.onSaveGame?.();
        feedbackBanner = ok ? "Adventure saved to browser!" : "Could not save progress.";
        if (ok) handlers.onPlaySfx?.("heal");
      } else if (action === "reset-game") {
        closeDrawer();
        handlers.onNewGame?.();
        return;
      }

      handlers.onAutoSave?.();
      syncHud(state);
      renderDrawer(state);
    });

    function syncHud(state) {
      const p = state.player;
      const stats = RPG.computePlayerStats(p);
      const req = RPG.expToNext(p.level);

      els.hudLevel.textContent = `LV ${p.level}`;
      els.hudHpFill.style.width = `${Math.max(0, Math.min(100, (p.hp / stats.maxHp) * 100))}%`;
      els.hudHpText.textContent = `${Math.ceil(p.hp)} / ${stats.maxHp}`;

      els.hudMpFill.style.width = `${Math.max(0, Math.min(100, (p.mp / stats.maxMp) * 100))}%`;
      els.hudMpText.textContent = `${Math.floor(p.mp)} / ${stats.maxMp}`;

      els.hudGoldText.textContent = p.gold;
      els.drawerGold.textContent = `${p.gold}g`;

      els.hudExpFill.style.width = `${Math.max(0, Math.min(100, (p.exp / req) * 100))}%`;
      els.hudExpText.textContent = `EXP ${p.exp} / ${req}`;

      const zone = WORLD.getZoneAt(state.world, p.x, p.y);
      els.hudZone.textContent = zone.name;

      // Active Quest Pill
      const quest = RPG.getActiveQuest(p);
      const questReady = RPG.isQuestReadyToClaim(p);
      els.hudQuestPill.classList.toggle("is-ready", questReady);
      if (quest) {
        els.hudQuestText.textContent = questReady
          ? `Claim: ${quest.title}!`
          : `${quest.title} (${p.quest.progress}/${quest.targetCount})`;
      } else {
        els.hudQuestText.textContent = "All Quests Complete";
      }

      const hasNotif = p.skillPoints > 0 || questReady;
      els.menuNotif.hidden = !hasNotif;
      els.skillTabPip.hidden = p.skillPoints <= 0;
      els.questTabPip.hidden = !questReady;

      // Zone Banner
      if (state.zoneBanner) {
        els.zoneBanner.hidden = false;
        els.zoneBannerTitle.textContent = state.zoneBanner.name;
        els.zoneBannerTitle.style.color = state.zoneBanner.color;
        els.zoneBannerSub.textContent = state.zoneBanner.subtitle;
      } else {
        els.zoneBanner.hidden = true;
      }

      // Boss Bar
      const boss = COMBAT.getActiveBoss(state);
      if (els.gameShell) {
        els.gameShell.classList.toggle("has-boss-bar", Boolean(boss));
      }
      if (boss) {
        els.bossWrap.hidden = false;
        els.bossName.textContent = boss.phase === 2 ? `${boss.name} (Enraged)` : boss.name;
        els.bossHpText.textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
        els.bossHpFill.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
      } else {
        els.bossWrap.hidden = true;
      }

      // Contextual Interact Button
      const found = WORLD.findNearestInteractable(state.world, p, state.chests);
      if (found && state.mode === "playing" && !drawerOpen) {
        els.interactBtn.hidden = false;
        if (found.type === "shop_npc") els.interactLabel.textContent = "Shop (Pip)";
        else if (found.type === "quest_npc") els.interactLabel.textContent = questReady ? "Claim Quest!" : "Talk (Mira)";
        else if (found.type === "campfire") els.interactLabel.textContent = "Heal & Save";
        else if (found.type === "chest") els.interactLabel.textContent = "Open Chest";
      } else {
        els.interactBtn.hidden = true;
      }

      // Quick Potion Icon & Count
      const potionIconWrap = els.potionIconWrap;
      const activePotionId = p.quickSlotId && RPG.getItemCount(p, p.quickSlotId) > 0 ? p.quickSlotId
        : RPG.getItemCount(p, "hp_potion") > 0 ? "hp_potion"
          : RPG.getItemCount(p, "greater_hp") > 0 ? "greater_hp"
            : RPG.getItemCount(p, "elixir") > 0 ? "elixir" : "hp_potion";
      if (potionIconWrap && ICONS && potionIconWrap.dataset.potionId !== activePotionId) {
        potionIconWrap.dataset.potionId = activePotionId;
        potionIconWrap.innerHTML = ICONS.getItemSvg(activePotionId, 24);
      }
      const activePotionItem = DATA.ITEMS[activePotionId];
      if (els.potionBtn && activePotionItem) {
        const potionLabel = `Use ${activePotionItem.name}`;
        if (els.potionBtn.getAttribute("aria-label") !== potionLabel) {
          els.potionBtn.setAttribute("aria-label", potionLabel);
        }
      }
      const totalHeals = RPG.getItemCount(p, "hp_potion") + RPG.getItemCount(p, "greater_hp") + RPG.getItemCount(p, "elixir");
      els.potionQty.textContent = totalHeals;

      // Skill Buttons Cooldown & Lock State
      for (const skillId of DATA.SKILL_ORDER) {
        const btn = document.getElementById(`btn-skill-${skillId}`);
        if (!btn) continue;
        const skill = DATA.SKILLS[skillId];
        const rank = p.skillRanks[skillId] || 0;
        const params = RPG.getSkillParams(skillId, Math.max(1, rank));
        const cdRem = p.skillCooldowns[skillId] || 0;
        const locked = rank <= 0;
        const noMp = p.mp < params.mpCost;

        btn.classList.toggle("is-locked", locked);
        btn.classList.toggle("is-no-mp", !locked && noMp);

        const lockEl = btn.querySelector(".skill-lock");
        const cdEl = btn.querySelector(".skill-cd");
        const sweepEl = btn.querySelector(".skill-sweep");

        if (locked) {
          lockEl.hidden = false;
          lockEl.textContent = p.level >= skill.unlockLevel ? "Unlock" : `Lv${skill.unlockLevel}`;
          cdEl.hidden = true;
          sweepEl.style.background = "transparent";
        } else if (cdRem > 0.05) {
          lockEl.hidden = true;
          cdEl.hidden = false;
          cdEl.textContent = cdRem >= 1 ? Math.ceil(cdRem) : cdRem.toFixed(1);
          const deg = Math.min(360, (cdRem / params.cooldown) * 360);
          sweepEl.style.background = `conic-gradient(rgba(8, 12, 20, 0.78) ${deg}deg, transparent ${deg}deg)`;
        } else {
          lockEl.hidden = true;
          cdEl.hidden = true;
          sweepEl.style.background = "transparent";
        }
      }
    }

    function renderDrawer(state) {
      const p = state.player;
      els.drawerGold.textContent = `${p.gold}g`;

      const titles = {
        bag: "Bag & Equipment",
        skills: "Active Skills",
        hero: "Hero & Quests",
        shop: "Merchant Pip's Shop"
      };
      els.drawerTitle.textContent = titles[activeTab] || "Pack";

      const bannerHtml = feedbackBanner
        ? `<div class="quest-card" style="padding:8px 12px;border-color:rgba(56,189,248,0.5)"><p style="color:#e0f2fe;font-weight:700">${esc(feedbackBanner)}</p></div>`
        : "";

      if (activeTab === "bag") {
        els.sheetBody.innerHTML = bannerHtml + buildBagHtml(p);
      } else if (activeTab === "skills") {
        els.sheetBody.innerHTML = bannerHtml + buildSkillsHtml(p);
      } else if (activeTab === "hero") {
        els.sheetBody.innerHTML = bannerHtml + buildHeroQuestHtml(p);
      } else if (activeTab === "shop") {
        els.sheetBody.innerHTML = bannerHtml + buildShopHtml(p);
      }
    }

    function buildBagHtml(p) {
      const slotHtml = ["weapon", "armor", "accessory"].map((slot) => {
        const entry = p.equipment[slot];
        const item = entry ? DATA.ITEMS[entry.itemId] : null;
        const rar = item ? DATA.RARITIES[item.rarity] : null;
        const iconSvg = item && ICONS ? ICONS.getItemSvg(item.id, 26) : (ICONS ? ICONS.getSlotPlaceholderSvg(slot, 22) : "");
        return `
          <div class="equip-slot" style="${rar ? `border-color:${rar.color}66; background:${rar.bg}40;` : ""}">
            <div class="equip-slot-icon" style="${rar ? `border-color:${rar.color}55;` : ""}">${iconSvg}</div>
            <div class="equip-slot-info">
              <span>${slot}</span>
              <strong style="${rar ? `color:${rar.color}` : "color:#64748b"}">${item ? esc(item.name) : "Empty"}</strong>
              <small>${item ? esc(formatItemStats(item.stats)) : "No stats"}</small>
            </div>
          </div>
        `;
      }).join("");

      const consumables = [];
      const gear = [];
      for (const entry of p.inventory) {
        const item = DATA.ITEMS[entry.itemId];
        if (!item) continue;
        if (item.type === "consumable") consumables.push({ entry, item });
        else gear.push({ entry, item });
      }

      const consHtml = consumables.length
        ? consumables.map(({ entry, item }) => {
            const rar = DATA.RARITIES[item.rarity];
            const iconSvg = ICONS ? ICONS.getItemSvg(item.id, 30) : "";
            return `
              <div class="item-card" style="border-left: 3px solid ${rar.color}">
                <div class="item-icon-box" style="border-color:${rar.color}55; background:${rar.bg}">
                  ${iconSvg}
                </div>
                <div class="item-info">
                  <div class="item-title-row">
                    <strong style="color:${rar.color}">${esc(item.name)} x${entry.qty}</strong>
                    <span class="rarity-tag" style="color:${rar.color};background:${rar.bg}">${rar.label}</span>
                  </div>
                  <p class="item-desc">${esc(item.desc)}</p>
                </div>
                <div class="card-actions">
                  <button type="button" class="action-chip is-green" data-action="use-item" data-uid="${esc(entry.uid)}">Use</button>
                </div>
              </div>
            `;
          }).join("")
        : `<p class="empty-note">No consumables in pack. Buy potions from Merchant Pip!</p>`;

      const gearHtml = gear.length
        ? gear.map(({ entry, item }) => {
            const rar = DATA.RARITIES[item.rarity];
            const delta = RPG.compareItemToEquipped(p, item.id);
            const iconSvg = ICONS ? ICONS.getItemSvg(item.id, 30) : "";
            return `
              <div class="item-card" style="border-left: 3px solid ${rar.color}">
                <div class="item-icon-box" style="border-color:${rar.color}55; background:${rar.bg}">
                  ${iconSvg}
                </div>
                <div class="item-info">
                  <div class="item-title-row">
                    <strong style="color:${rar.color}">${esc(item.name)}</strong>
                    <span class="rarity-tag" style="color:${rar.color};background:${rar.bg}">${item.slot.toUpperCase()}</span>
                  </div>
                  <p class="item-desc">${esc(formatItemStats(item.stats))}</p>
                  ${formatStatDelta(delta)}
                </div>
                <div class="card-actions">
                  <button type="button" class="action-chip" data-action="equip-item" data-uid="${esc(entry.uid)}">Equip</button>
                </div>
              </div>
            `;
          }).join("")
        : `<p class="empty-note">No unequipped gear in pack. Loot chests &amp; defeat foes!</p>`;

      return `
        <p class="section-label">Equipped Gear</p>
        <div class="equip-grid">${slotHtml}</div>
        <p class="section-label">Consumables (${consumables.length})</p>
        ${consHtml}
        <p class="section-label">Gear in Bag (${gear.length})</p>
        ${gearHtml}
      `;
    }

    function buildSkillsHtml(p) {
      const spBanner = `
        <div class="quest-card" style="flex-direction:row;justify-content:space-between;align-items:center">
          <div>
            <h3>Skill Mastery</h3>
            <p>Gain +1 Skill Point every level up.</p>
          </div>
          <span class="sheet-gold">${p.skillPoints} SP</span>
        </div>
      `;

      const list = DATA.SKILL_ORDER.map((id) => {
        const sk = DATA.SKILLS[id];
        const rank = p.skillRanks[id] || 0;
        const params = RPG.getSkillParams(id, Math.max(1, rank));
        const check = RPG.canUpgradeSkill(p, id);
        const btnLabel = rank === 0
          ? (p.level < sk.unlockLevel ? `Lv ${sk.unlockLevel}` : "Unlock (1 SP)")
          : (rank >= sk.maxRank ? "Max" : "Upgrade (1 SP)");

        return `
          <div class="item-card">
            <div class="item-info">
              <div class="item-title-row">
                <strong style="color:${sk.color}">${esc(sk.name)}</strong>
                <span class="rarity-tag" style="color:#e2e8f0;background:#263042">Rank ${rank}/${sk.maxRank}</span>
              </div>
              <p class="item-desc">${esc(sk.desc)}</p>
              <p class="item-desc" style="color:#93c5fd">MP: ${params.mpCost} · CD: ${params.cooldown.toFixed(1)}s · Power: ${Math.round(params.mult * 100)}% ATK</p>
            </div>
            <div class="card-actions">
              <button type="button" class="action-chip is-gold" data-action="upgrade-skill" data-id="${sk.id}" ${check.ok ? "" : "disabled"}>${btnLabel}</button>
            </div>
          </div>
        `;
      }).join("");

      return spBanner + list;
    }

    function buildHeroQuestHtml(p) {
      const stats = RPG.computePlayerStats(p);
      const quest = RPG.getActiveQuest(p);
      const ready = RPG.isQuestReadyToClaim(p);

      let questHtml = "";
      if (quest) {
        const rewards = [
          `${quest.rewardGold}g`,
          `${quest.rewardExp} EXP`,
          ...(quest.rewardItems || []).map((ri) => `${DATA.ITEMS[ri.itemId].name}${ri.qty > 1 ? ` x${ri.qty}` : ""}`)
        ].join(" · ");
        questHtml = `
          <div class="quest-card">
            <h3>${esc(quest.title)}</h3>
            <p>${esc(quest.summary)}</p>
            <p style="color:#fde68a">Progress: ${p.quest.progress} / ${quest.targetCount}</p>
            <p style="color:#86efac;font-size:12px">Reward: ${esc(rewards)}</p>
            ${ready ? `<button type="button" class="action-chip is-green" data-action="claim-quest">Claim Reward</button>` : ""}
          </div>
        `;
      } else {
        questHtml = `
          <div class="quest-card">
            <h3>Hero of Embervale</h3>
            <p>All Elder Mira quests complete! Feel free to rematch the Cinder Warden or collect epic gear.</p>
          </div>
        `;
      }

      const heroTitle = `
        <div class="stats-grid">
          <div class="stat-box"><span>Level</span><strong>${p.level}</strong></div>
          <div class="stat-box"><span>Gold</span><strong style="color:#fde68a">${p.gold}g</strong></div>
          <div class="stat-box"><span>Attack (ATK)</span><strong>${stats.atk}</strong></div>
          <div class="stat-box"><span>Defense (DEF)</span><strong>${stats.def}</strong></div>
          <div class="stat-box"><span>Max HP</span><strong>${stats.maxHp}</strong></div>
          <div class="stat-box"><span>Max MP</span><strong>${stats.maxMp}</strong></div>
          <div class="stat-box"><span>Move Speed</span><strong>${stats.spd}</strong></div>
          <div class="stat-box"><span>Crit Chance</span><strong>${stats.crit}%</strong></div>
          <div class="stat-box"><span>Monsters Slain</span><strong>${p.statsCounters.slain}</strong></div>
          <div class="stat-box"><span>Chests Opened</span><strong>${p.statsCounters.chestsOpened}</strong></div>
        </div>
      `;

      const controlsHtml = `
        <p class="section-label">Save &amp; Session</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button type="button" class="action-chip is-green" data-action="save-game">Save Game</button>
          <button type="button" class="action-chip is-danger" data-action="reset-game">New Game</button>
        </div>
      `;

      return `<p class="section-label">Active Quest</p>${questHtml}<p class="section-label">Hero Attributes</p>${heroTitle}${controlsHtml}`;
    }

    function buildShopHtml(p) {
      const subBar = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button type="button" class="action-chip ${shopSubTab === "buy" ? "is-gold" : ""}" data-action="shop-sub" data-id="buy">Buy Gear &amp; Items</button>
          <button type="button" class="action-chip ${shopSubTab === "sell" ? "is-gold" : ""}" data-action="shop-sub" data-id="sell">Sell Bag (${p.inventory.length})</button>
        </div>
      `;

      if (shopSubTab === "buy") {
        const itemsHtml = DATA.SHOP_STOCK.map((itemId) => {
          const item = DATA.ITEMS[itemId];
          const rar = DATA.RARITIES[item.rarity];
          const canAfford = p.gold >= item.price;
          const delta = item.type === "equipment" ? RPG.compareItemToEquipped(p, item.id) : null;
          const iconSvg = ICONS ? ICONS.getItemSvg(item.id, 30) : "";
          return `
            <div class="item-card" style="border-left: 3px solid ${rar.color}">
              <div class="item-icon-box" style="border-color:${rar.color}55; background:${rar.bg}">
                ${iconSvg}
              </div>
              <div class="item-info">
                <div class="item-title-row">
                  <strong style="color:${rar.color}">${esc(item.name)}</strong>
                  <span class="rarity-tag" style="color:${rar.color};background:${rar.bg}">${item.type === "equipment" ? item.slot.toUpperCase() : "USE"}</span>
                </div>
                <p class="item-desc">${esc(item.type === "equipment" ? formatItemStats(item.stats) : item.desc)}</p>
                ${delta ? formatStatDelta(delta) : ""}
              </div>
              <div class="card-actions">
                <button type="button" class="action-chip is-gold" data-action="buy-item" data-id="${item.id}" ${canAfford ? "" : "disabled"}>${item.price}g</button>
              </div>
            </div>
          `;
        }).join("");
        return subBar + itemsHtml;
      }

      const sellHtml = p.inventory.length
        ? p.inventory.map((entry) => {
            const item = DATA.ITEMS[entry.itemId];
            if (!item) return "";
            const rar = DATA.RARITIES[item.rarity];
            const sellVal = RPG.getSellPrice(item.id);
            const iconSvg = ICONS ? ICONS.getItemSvg(item.id, 30) : "";
            return `
              <div class="item-card" style="border-left: 3px solid ${rar.color}">
                <div class="item-icon-box" style="border-color:${rar.color}55; background:${rar.bg}">
                  ${iconSvg}
                </div>
                <div class="item-info">
                  <div class="item-title-row">
                    <strong style="color:${rar.color}">${esc(item.name)}${entry.qty > 1 ? ` x${entry.qty}` : ""}</strong>
                  </div>
                  <p class="item-desc">Sell 1 for ${sellVal} Gold</p>
                </div>
                <div class="card-actions">
                  <button type="button" class="action-chip is-gold" data-action="sell-item" data-uid="${esc(entry.uid)}">+${sellVal}g</button>
                </div>
              </div>
            `;
          }).join("")
        : `<p class="empty-note">Your bag is empty.</p>`;

      return subBar + sellHtml;
    }

    function showTitleScreen(hasSave, savedLevel) {
      els.screenOverlay.hidden = false;
      els.modalKicker.textContent = "2D ACTION RPG";
      els.modalTitle.textContent = "Embervale";
      els.modalDesc.textContent = "Venture from Emberhearth Village into Whisperwood and Sunken Ruins. Gather Gold & EXP, equip stronger gear, cast skills, and defeat the Cinder Warden.";
      els.modalTips.hidden = false;
      els.modalSummary.hidden = true;

      if (hasSave) {
        els.btnPrimary.textContent = `Continue Adventure (Lv ${savedLevel})`;
        els.btnSecondary.hidden = false;
        els.btnSecondary.textContent = "Start Fresh";
      } else {
        els.btnPrimary.textContent = "Start Adventure";
        els.btnSecondary.hidden = true;
      }

      els.btnPrimary.onclick = () => {
        els.screenOverlay.hidden = true;
        handlers.onStartGame?.(hasSave);
      };
      els.btnSecondary.onclick = () => {
        els.screenOverlay.hidden = true;
        handlers.onStartGame?.(false);
      };
    }

    function showGameOverScreen(state) {
      els.screenOverlay.hidden = false;
      els.modalKicker.textContent = "FALLEN IN BATTLE";
      els.modalTitle.textContent = "You Were Defeated";
      els.modalDesc.textContent = "Your spirit returns to Emberhearth Campfire with your items, gold, and level intact.";
      els.modalTips.hidden = true;
      els.modalSummary.hidden = false;
      els.modalSummary.innerHTML = `Level <strong>${state.player.level}</strong> · Gold <strong>${state.player.gold}g</strong> · Monsters Slain <strong>${state.player.statsCounters.slain}</strong>`;
      els.btnPrimary.textContent = "Revive at Village";
      els.btnSecondary.hidden = true;

      els.btnPrimary.onclick = () => {
        els.screenOverlay.hidden = true;
        handlers.onRevive?.();
      };
    }

    function showVictoryScreen(state) {
      els.screenOverlay.hidden = false;
      els.modalKicker.textContent = "SANCTUM EXTINGUISHED";
      els.modalTitle.textContent = "Victory!";
      els.modalDesc.textContent = "You vanquished the Cinder Warden and restored peace to Embervale! Claim your Elder Mira quest reward or keep exploring for rare gear.";
      els.modalTips.hidden = true;
      els.modalSummary.hidden = false;
      els.modalSummary.innerHTML = `Level <strong>${state.player.level}</strong> · Gold <strong>${state.player.gold}g</strong> · Monsters Slain <strong>${state.player.statsCounters.slain}</strong>`;
      els.btnPrimary.textContent = "Keep Exploring";
      els.btnSecondary.hidden = false;
      els.btnSecondary.textContent = "New Adventure";

      els.btnPrimary.onclick = () => {
        els.screenOverlay.hidden = true;
        handlers.onContinueAfterVictory?.();
      };
      els.btnSecondary.onclick = () => {
        els.screenOverlay.hidden = true;
        handlers.onNewGame?.();
      };
    }

    return {
      openDrawer,
      closeDrawer,
      toggleDrawer,
      isDrawerOpen,
      setMuteIcon,
      syncHud,
      showTitleScreen,
      showGameOverScreen,
      showVictoryScreen
    };
  }

  return {
    createUiController
  };
});
