(function (root, factory) {
  let RPG;
  if (typeof module !== "undefined" && module.exports && typeof require === "function") {
    RPG = require("./rpg.js");
  } else {
    RPG = root.Embervale && root.Embervale.RPG;
  }
  const api = factory(RPG);
  root.Embervale = root.Embervale || {};
  root.Embervale.SAVE = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (RPG) {
  "use strict";

  const STORAGE_KEY = "embervale_rpg_save_v1";
  const SAVE_VERSION = 1;

  function serializeState(state) {
    const openedChests = (state.chests || [])
      .filter((c) => c.opened)
      .map((c) => c.id);

    return JSON.stringify({
      version: SAVE_VERSION,
      savedAt: Date.now(),
      player: state.player,
      openedChestIds: openedChests,
      bossSlainVictoryShown: Boolean(state.bossSlainVictoryShown)
    });
  }

  function parseSave(raw) {
    if (!raw || typeof raw !== "string") return null;
    try {
      const data = JSON.parse(raw);
      if (!data || data.version !== SAVE_VERSION || !data.player) return null;
      const base = RPG.createInitialPlayer();
      const mergedPlayer = {
        ...base,
        ...data.player,
        equipment: { ...base.equipment, ...(data.player.equipment || {}) },
        skillRanks: { ...base.skillRanks, ...(data.player.skillRanks || {}) },
        skillCooldowns: { ...base.skillCooldowns },
        buffs: { ...base.buffs },
        quest: { ...base.quest, ...(data.player.quest || {}) },
        statsCounters: { ...base.statsCounters, ...(data.player.statsCounters || {}) },
        inventory: Array.isArray(data.player.inventory) ? data.player.inventory : base.inventory
      };
      RPG.syncUidCounter(mergedPlayer);
      RPG.clampVitals(mergedPlayer);
      return {
        player: mergedPlayer,
        openedChestIds: Array.isArray(data.openedChestIds) ? data.openedChestIds : [],
        bossSlainVictoryShown: Boolean(data.bossSlainVictoryShown),
        savedAt: data.savedAt || 0
      };
    } catch {
      return null;
    }
  }

  function resolveStorage(storage) {
    if (storage) return storage;
    try {
      return typeof localStorage !== "undefined" ? localStorage : null;
    } catch {
      return null;
    }
  }

  function saveToStorage(state, storage) {
    try {
      const store = resolveStorage(storage);
      if (!store) return false;
      store.setItem(STORAGE_KEY, serializeState(state));
      return true;
    } catch {
      return false;
    }
  }

  function loadFromStorage(storage) {
    try {
      const store = resolveStorage(storage);
      if (!store) return null;
      return parseSave(store.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function clearStorage(storage) {
    try {
      const store = resolveStorage(storage);
      if (!store) return false;
      store.removeItem(STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  return {
    STORAGE_KEY,
    serializeState,
    parseSave,
    saveToStorage,
    loadFromStorage,
    clearStorage
  };
});
