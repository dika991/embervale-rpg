(function (root, factory) {
  let DATA;
  if (typeof module !== "undefined" && module.exports && typeof require === "function") {
    DATA = require("./data.js");
  } else {
    DATA = root.Embervale && root.Embervale.DATA;
  }
  const api = factory(DATA);
  root.Embervale = root.Embervale || {};
  root.Embervale.RPG = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (DATA) {
  "use strict";

  let uidCounter = 100;
  function nextUid(prefix) {
    uidCounter += 1;
    return `${prefix}_${uidCounter}`;
  }

  function extractUidNumber(uid) {
    if (typeof uid !== "string") return 0;
    const match = /_(\d+)$/.exec(uid);
    return match ? Number(match[1]) : 0;
  }

  function hasUidOnPlayer(player, uid) {
    if (!player) return false;
    if (Array.isArray(player.inventory) && player.inventory.some((e) => e && e.uid === uid)) {
      return true;
    }
    if (player.equipment) {
      for (const slot of ["weapon", "armor", "accessory"]) {
        if (player.equipment[slot] && player.equipment[slot].uid === uid) return true;
      }
    }
    return false;
  }

  function syncUidCounter(player) {
    if (!player) return uidCounter;
    let maxFound = uidCounter;
    if (Array.isArray(player.inventory)) {
      for (const entry of player.inventory) {
        if (entry) maxFound = Math.max(maxFound, extractUidNumber(entry.uid));
      }
    }
    if (player.equipment) {
      for (const slot of ["weapon", "armor", "accessory"]) {
        const eq = player.equipment[slot];
        if (eq) maxFound = Math.max(maxFound, extractUidNumber(eq.uid));
      }
    }
    uidCounter = maxFound;
    return uidCounter;
  }

  function uniqueUidForPlayer(player, prefix) {
    let candidate = nextUid(prefix);
    while (hasUidOnPlayer(player, candidate)) {
      candidate = nextUid(prefix);
    }
    return candidate;
  }

  function expToNext(level) {
    const lv = Math.max(1, Math.floor(level));
    return Math.floor(40 * Math.pow(1.42, lv - 1));
  }

  function createInitialPlayer() {
    return {
      name: "Kael",
      level: 1,
      exp: 0,
      gold: 25,
      skillPoints: 0,
      hp: 100,
      mp: 50,
      x: 11 * 44 + 22,
      y: 44 * 44 + 22,
      facing: -Math.PI / 2,
      comboStep: 0,
      comboResetTimer: 0,
      attackCooldown: 0,
      invulnTimer: 0,
      potionCooldown: 0,
      quickSlotId: "hp_potion",
      equipment: {
        weapon: { uid: "eq_start_w", itemId: "rusty_shortsword" },
        armor: null,
        accessory: null
      },
      inventory: [
        { uid: "st_start_hp", itemId: "hp_potion", qty: 2 }
      ],
      skillRanks: {
        cleave_arc: 1,
        dash_strike: 1,
        sunfire_bolt: 0,
        sentinel_aegis: 0
      },
      skillCooldowns: {
        cleave_arc: 0,
        dash_strike: 0,
        sunfire_bolt: 0,
        sentinel_aegis: 0
      },
      buffs: {
        berserkTimer: 0,
        aegisTimer: 0,
        aegisDefBonus: 0
      },
      quest: {
        activeId: DATA.QUESTS[0].id,
        progress: 0,
        completedIds: []
      },
      statsCounters: {
        slain: 0,
        chestsOpened: 0,
        bossSlainCount: 0
      }
    };
  }

  function computePlayerStats(player) {
    const lv = Math.max(1, player.level || 1);
    let maxHp = 100 + (lv - 1) * 20;
    let maxMp = 50 + (lv - 1) * 8;
    let atk = 14 + (lv - 1) * 3;
    let def = Math.floor(4 + (lv - 1) * 1.5);
    let spd = 158 + Math.min(40, (lv - 1) * 3);
    let crit = 8 + (lv - 1) * 1;
    let weaponTier = 0;
    let armorTier = 0;

    for (const slot of ["weapon", "armor", "accessory"]) {
      const entry = player.equipment && player.equipment[slot];
      if (!entry) continue;
      const item = DATA.ITEMS[entry.itemId];
      if (!item || !item.stats) continue;
      maxHp += item.stats.maxHp || 0;
      maxMp += item.stats.maxMp || 0;
      atk += item.stats.atk || 0;
      def += item.stats.def || 0;
      spd += item.stats.spd || 0;
      crit += item.stats.crit || 0;
      if (slot === "weapon") weaponTier = item.tier || 0;
      if (slot === "armor") armorTier = item.tier || 0;
    }

    if (player.buffs && player.buffs.berserkTimer > 0) {
      atk = Math.round(atk * 1.35);
      spd = Math.round(spd * 1.2);
    }
    if (player.buffs && player.buffs.aegisTimer > 0) {
      def += Math.max(3, Math.round(def * 0.5));
    }

    return {
      maxHp,
      maxMp,
      atk,
      def,
      spd,
      crit: Math.min(65, crit),
      weaponTier,
      armorTier
    };
  }

  function clampVitals(player) {
    const stats = computePlayerStats(player);
    player.hp = Math.max(0, Math.min(stats.maxHp, player.hp));
    player.mp = Math.max(0, Math.min(stats.maxMp, player.mp));
    return stats;
  }

  function grantExp(player, amount) {
    const gained = Math.max(0, Math.floor(amount));
    if (gained <= 0) return { leveledUp: false, levelsGained: 0, newLevel: player.level };

    player.exp += gained;
    let levelsGained = 0;
    let req = expToNext(player.level);
    while (player.exp >= req) {
      player.exp -= req;
      player.level += 1;
      levelsGained += 1;
      player.skillPoints += 1;
      if (player.level === 5) {
        player.skillPoints += 1;
      }
      req = expToNext(player.level);
    }

    if (levelsGained > 0) {
      const stats = computePlayerStats(player);
      player.hp = stats.maxHp;
      player.mp = stats.maxMp;
    }

    return {
      leveledUp: levelsGained > 0,
      levelsGained,
      newLevel: player.level
    };
  }

  function grantGold(player, amount) {
    const gained = Math.max(0, Math.floor(amount));
    player.gold = Math.max(0, (player.gold || 0) + gained);
    return player.gold;
  }

  function addItem(player, itemId, qty) {
    const item = DATA.ITEMS[itemId];
    const count = Math.max(1, Math.floor(qty || 1));
    if (!item) return { ok: false, reason: "Unknown item" };

    if (item.stackable) {
      const existing = player.inventory.find((slot) => slot.itemId === itemId);
      if (existing) {
        existing.qty = Math.min(item.maxStack || 99, existing.qty + count);
        return { ok: true, entry: existing };
      }
      const entry = { uid: uniqueUidForPlayer(player, "st"), itemId, qty: Math.min(item.maxStack || 99, count) };
      player.inventory.push(entry);
      return { ok: true, entry };
    }

    let lastEntry = null;
    for (let i = 0; i < count; i += 1) {
      lastEntry = { uid: uniqueUidForPlayer(player, "eq"), itemId };
      player.inventory.push(lastEntry);
    }
    return { ok: true, entry: lastEntry };
  }

  function getItemCount(player, itemId) {
    let total = 0;
    for (const entry of player.inventory) {
      if (entry.itemId === itemId) total += entry.qty || 1;
    }
    return total;
  }

  function removeItemByUid(player, uid, qty) {
    const idx = player.inventory.findIndex((entry) => entry.uid === uid);
    if (idx === -1) return null;
    const entry = player.inventory[idx];
    const item = DATA.ITEMS[entry.itemId];
    if (item && item.stackable && (entry.qty || 1) > (qty || 1)) {
      entry.qty -= qty || 1;
      return { ...entry, qty: qty || 1 };
    }
    player.inventory.splice(idx, 1);
    return entry;
  }

  function equipItem(player, uid) {
    const idx = player.inventory.findIndex((entry) => entry.uid === uid);
    if (idx === -1) return { ok: false, reason: "Item missing" };
    const entry = player.inventory[idx];
    const item = DATA.ITEMS[entry.itemId];
    if (!item || item.type !== "equipment") {
      return { ok: false, reason: "Not equippable" };
    }

    const oldEquipped = player.equipment[item.slot];
    player.inventory.splice(idx, 1);
    if (oldEquipped) {
      player.inventory.push(oldEquipped);
    }
    player.equipment[item.slot] = entry;
    clampVitals(player);

    return { ok: true, equipped: item, swappedOut: oldEquipped ? DATA.ITEMS[oldEquipped.itemId] : null };
  }

  function compareItemToEquipped(player, itemId) {
    const candidate = DATA.ITEMS[itemId];
    if (!candidate || candidate.type !== "equipment") return null;
    const currentEntry = player.equipment[candidate.slot];
    const current = currentEntry ? DATA.ITEMS[currentEntry.itemId] : null;
    const curStats = (current && current.stats) || {};
    const newStats = candidate.stats || {};
    const keys = ["atk", "def", "maxHp", "maxMp", "spd", "crit"];
    const delta = {};
    for (const key of keys) {
      const diff = (newStats[key] || 0) - (curStats[key] || 0);
      if (diff !== 0) delta[key] = diff;
    }
    return delta;
  }

  function useConsumable(player, identifier) {
    const isById = Boolean(DATA.ITEMS[identifier]);
    const entry = isById
      ? player.inventory.find((it) => it.itemId === identifier)
      : player.inventory.find((it) => it.uid === identifier);

    if (!entry) return { ok: false, reason: "Out of item" };
    const item = DATA.ITEMS[entry.itemId];
    if (!item || item.type !== "consumable") {
      return { ok: false, reason: "Not consumable" };
    }

    const stats = computePlayerStats(player);

    // Prevent wasting full HP/MP potions when already full
    if (item.healHp && !item.healMp && !item.healMpPct && player.hp >= stats.maxHp) {
      return { ok: false, reason: "HP is already full" };
    }
    if (item.healMp && !item.healHp && !item.healHpPct && player.mp >= stats.maxMp) {
      return { ok: false, reason: "MP is already full" };
    }
    if (item.healHpPct && item.healMpPct && player.hp >= stats.maxHp && player.mp >= stats.maxMp) {
      return { ok: false, reason: "HP and MP are already full" };
    }

    let healedHp = 0;
    let healedMp = 0;
    if (item.healHpPct) {
      const target = Math.max(0, Math.round(stats.maxHp * item.healHpPct));
      const before = player.hp;
      player.hp = Math.min(stats.maxHp, player.hp + target);
      healedHp = Math.round(player.hp - before);
    } else if (item.healHp) {
      const before = player.hp;
      player.hp = Math.min(stats.maxHp, player.hp + item.healHp);
      healedHp = Math.round(player.hp - before);
    }

    if (item.healMpPct) {
      const target = Math.max(0, Math.round(stats.maxMp * item.healMpPct));
      const before = player.mp;
      player.mp = Math.min(stats.maxMp, player.mp + target);
      healedMp = Math.round(player.mp - before);
    } else if (item.healMp) {
      const before = player.mp;
      player.mp = Math.min(stats.maxMp, player.mp + item.healMp);
      healedMp = Math.round(player.mp - before);
    }

    if (item.buffType === "berserk") {
      player.buffs.berserkTimer = Math.max(player.buffs.berserkTimer || 0, item.duration || 12);
    }

    removeItemByUid(player, entry.uid, 1);
    return { ok: true, item, healedHp, healedMp };
  }

  function getSellPrice(itemId) {
    const item = DATA.ITEMS[itemId];
    if (!item) return 0;
    return Math.max(4, Math.floor((item.price || 10) * 0.5));
  }

  function buyItem(player, itemId, qty) {
    const count = Math.max(1, Math.floor(qty || 1));
    const item = DATA.ITEMS[itemId];
    if (!item || !DATA.SHOP_STOCK.includes(itemId)) {
      return { ok: false, reason: "Item not sold here" };
    }
    const totalCost = item.price * count;
    if (player.gold < totalCost) {
      return { ok: false, reason: `Need ${totalCost} Gold` };
    }
    player.gold -= totalCost;
    const added = addItem(player, itemId, count);
    return { ok: true, item, totalCost, entry: added.entry };
  }

  function sellItem(player, uid) {
    const entry = player.inventory.find((it) => it.uid === uid);
    if (!entry) return { ok: false, reason: "Item missing" };
    const price = getSellPrice(entry.itemId);
    removeItemByUid(player, uid, 1);
    grantGold(player, price);
    return { ok: true, item: DATA.ITEMS[entry.itemId], earnedGold: price };
  }

  function getSkillParams(skillId, rank) {
    const base = DATA.SKILLS[skillId];
    const r = Math.max(1, rank || 1);
    if (!base) return null;
    if (skillId === "cleave_arc") {
      return {
        mpCost: base.mpCost,
        cooldown: Math.max(1.8, base.cooldown - (r - 1) * 0.15),
        mult: 1.85 + (r - 1) * 0.25,
        radius: 92 + (r - 1) * 5,
        critBonus: 20,
        knockback: 210
      };
    }
    if (skillId === "dash_strike") {
      return {
        mpCost: base.mpCost,
        cooldown: Math.max(2.2, base.cooldown - (r - 1) * 0.15),
        mult: 1.5 + (r - 1) * 0.22,
        dashDist: 138 + (r - 1) * 8,
        hitRadius: 34,
        invuln: 0.28
      };
    }
    if (skillId === "sunfire_bolt") {
      return {
        mpCost: base.mpCost,
        cooldown: Math.max(2.6, base.cooldown - (r - 1) * 0.2),
        mult: 1.7 + (r - 1) * 0.28,
        aoeRadius: 72 + (r - 1) * 5,
        projSpeed: 380,
        burnDpsMult: 0.28 + (r - 1) * 0.05,
        burnDuration: 3.0
      };
    }
    if (skillId === "sentinel_aegis") {
      return {
        mpCost: base.mpCost,
        cooldown: Math.max(5.5, base.cooldown - (r - 1) * 0.35),
        mult: 1.1 + (r - 1) * 0.18,
        radius: 96 + (r - 1) * 6,
        healPct: 0.18 + (r - 1) * 0.04,
        shieldDuration: 5.0 + (r - 1) * 0.5
      };
    }
    return null;
  }

  function canUpgradeSkill(player, skillId) {
    const skill = DATA.SKILLS[skillId];
    if (!skill) return { ok: false, reason: "Unknown skill" };
    const rank = player.skillRanks[skillId] || 0;
    if (rank >= skill.maxRank) return { ok: false, reason: "Max Rank" };
    if (player.level < skill.unlockLevel) {
      return { ok: false, reason: `Requires Lv ${skill.unlockLevel}` };
    }
    if (player.skillPoints < 1) {
      return { ok: false, reason: "Need 1 Skill Point" };
    }
    return { ok: true, nextRank: rank + 1 };
  }

  function upgradeSkill(player, skillId) {
    const check = canUpgradeSkill(player, skillId);
    if (!check.ok) return check;
    player.skillPoints -= 1;
    player.skillRanks[skillId] = check.nextRank;
    return { ok: true, skill: DATA.SKILLS[skillId], rank: check.nextRank };
  }

  function getActiveQuest(player) {
    if (!player.quest || !player.quest.activeId) return null;
    return DATA.QUESTS.find((q) => q.id === player.quest.activeId) || null;
  }

  function isQuestReadyToClaim(player) {
    const quest = getActiveQuest(player);
    if (!quest) return false;
    return (player.quest.progress || 0) >= quest.targetCount;
  }

  function recordQuestKill(player, enemyKind) {
    const quest = getActiveQuest(player);
    if (!quest) return false;
    if (!quest.targetKinds.includes(enemyKind)) return false;
    if (player.quest.progress >= quest.targetCount) return false;
    player.quest.progress += 1;
    return true;
  }

  function claimQuestReward(player) {
    const quest = getActiveQuest(player);
    if (!quest) return { ok: false, reason: "No active quest" };
    if (player.quest.progress < quest.targetCount) {
      return { ok: false, reason: "Quest incomplete" };
    }

    grantGold(player, quest.rewardGold);
    const expRes = grantExp(player, quest.rewardExp);
    const itemsGranted = [];
    for (const rw of quest.rewardItems || []) {
      addItem(player, rw.itemId, rw.qty);
      itemsGranted.push({ item: DATA.ITEMS[rw.itemId], qty: rw.qty });
    }

    player.quest.completedIds.push(quest.id);
    const curIndex = DATA.QUESTS.findIndex((q) => q.id === quest.id);
    const nextQuest = DATA.QUESTS[curIndex + 1] || null;
    player.quest.activeId = nextQuest ? nextQuest.id : null;
    player.quest.progress = 0;

    return {
      ok: true,
      completedQuest: quest,
      nextQuest,
      goldGained: quest.rewardGold,
      expGained: quest.rewardExp,
      expRes,
      itemsGranted
    };
  }

  return {
    expToNext,
    syncUidCounter,
    createInitialPlayer,
    computePlayerStats,
    clampVitals,
    grantExp,
    grantGold,
    addItem,
    getItemCount,
    removeItemByUid,
    equipItem,
    compareItemToEquipped,
    useConsumable,
    getSellPrice,
    buyItem,
    sellItem,
    getSkillParams,
    canUpgradeSkill,
    upgradeSkill,
    getActiveQuest,
    isQuestReadyToClaim,
    recordQuestKill,
    claimQuestReward
  };
});
