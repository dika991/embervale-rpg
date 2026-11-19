(function (root, factory) {
  const api = factory();
  root.Embervale = root.Embervale || {};
  root.Embervale.DATA = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  const RARITIES = {
    common: { id: "common", label: "Common", color: "#a7b4c4", bg: "#242c38" },
    uncommon: { id: "uncommon", label: "Uncommon", color: "#4ade80", bg: "#143022" },
    rare: { id: "rare", label: "Rare", color: "#38bdf8", bg: "#132c3f" },
    epic: { id: "epic", label: "Epic", color: "#fbbf24", bg: "#372610" }
  };

  const ITEMS = {
    // Consumables
    hp_potion: {
      id: "hp_potion",
      name: "Health Potion",
      type: "consumable",
      rarity: "common",
      price: 20,
      stackable: true,
      maxStack: 99,
      healHp: 55,
      icon: "potion_red",
      color: "#f87171",
      desc: "Restores 55 HP instantly."
    },
    mp_potion: {
      id: "mp_potion",
      name: "Mana Vial",
      type: "consumable",
      rarity: "common",
      price: 18,
      stackable: true,
      maxStack: 99,
      healMp: 38,
      icon: "potion_blue",
      color: "#60a5fa",
      desc: "Restores 38 MP instantly."
    },
    greater_hp: {
      id: "greater_hp",
      name: "Greater Potion",
      type: "consumable",
      rarity: "uncommon",
      price: 50,
      stackable: true,
      maxStack: 99,
      healHp: 135,
      icon: "potion_crimson",
      color: "#ef4444",
      desc: "Restores 135 HP instantly."
    },
    berserk_tonic: {
      id: "berserk_tonic",
      name: "Fury Tonic",
      type: "consumable",
      rarity: "rare",
      price: 65,
      stackable: true,
      maxStack: 99,
      buffType: "berserk",
      duration: 12,
      icon: "tonic_amber",
      color: "#f59e0b",
      desc: "Grants +35% ATK and +20% SPD for 12s."
    },
    elixir: {
      id: "elixir",
      name: "Sunstone Elixir",
      type: "consumable",
      rarity: "epic",
      price: 110,
      stackable: true,
      maxStack: 99,
      healHpPct: 1,
      healMpPct: 1,
      icon: "elixir_gold",
      color: "#fbbf24",
      desc: "Fully restores HP and MP."
    },

    // Weapons
    rusty_shortsword: {
      id: "rusty_shortsword",
      name: "Rusty Shortsword",
      type: "equipment",
      slot: "weapon",
      rarity: "common",
      price: 18,
      tier: 1,
      stats: { atk: 4 },
      icon: "sword",
      color: "#a7b4c4",
      desc: "Reliable iron blade for new adventurers."
    },
    oaksteel_blade: {
      id: "oaksteel_blade",
      name: "Oaksteel Blade",
      type: "equipment",
      slot: "weapon",
      rarity: "uncommon",
      price: 65,
      tier: 2,
      stats: { atk: 9, crit: 3 },
      icon: "sword",
      color: "#4ade80",
      desc: "Tempered steel reinforced with a heartwood grip."
    },
    mossfang_sabre: {
      id: "mossfang_sabre",
      name: "Mossfang Sabre",
      type: "equipment",
      slot: "weapon",
      rarity: "rare",
      price: 130,
      tier: 3,
      stats: { atk: 14, spd: 12, crit: 5 },
      icon: "sword",
      color: "#38bdf8",
      desc: "Curved woodland sabre balanced for swiftness."
    },
    runed_halberd: {
      id: "runed_halberd",
      name: "Runed Halberd",
      type: "equipment",
      slot: "weapon",
      rarity: "rare",
      price: 210,
      tier: 4,
      stats: { atk: 21, maxHp: 15, crit: 4 },
      icon: "sword",
      color: "#60a5fa",
      desc: "Ancient poleblade recovered from the Sunken Ruins."
    },
    dawnbreaker: {
      id: "dawnbreaker",
      name: "Dawnbreaker",
      type: "equipment",
      slot: "weapon",
      rarity: "epic",
      price: 380,
      tier: 5,
      stats: { atk: 32, crit: 10, maxMp: 15 },
      icon: "sword",
      color: "#fbbf24",
      desc: "Radiant sun-forged blade of Emberhearth legend."
    },

    // Armors
    traveler_tunic: {
      id: "traveler_tunic",
      name: "Traveler Tunic",
      type: "equipment",
      slot: "armor",
      rarity: "common",
      price: 30,
      tier: 1,
      stats: { def: 3, maxHp: 15 },
      icon: "armor",
      color: "#5b83ad",
      desc: "Stitched cloth and leather brigandine."
    },
    scout_leather: {
      id: "scout_leather",
      name: "Scout Leather",
      type: "equipment",
      slot: "armor",
      rarity: "uncommon",
      price: 75,
      tier: 2,
      stats: { def: 6, maxHp: 30, spd: 10 },
      icon: "armor",
      color: "#389e69",
      desc: "Supple forest hide built for nimble footwork."
    },
    ironbound_mail: {
      id: "ironbound_mail",
      name: "Ironbound Mail",
      type: "equipment",
      slot: "armor",
      rarity: "rare",
      price: 165,
      tier: 3,
      stats: { def: 10, maxHp: 55 },
      icon: "armor",
      color: "#38bdf8",
      desc: "Riveted iron links over padded wool armor."
    },
    emberplate_aegis: {
      id: "emberplate_aegis",
      name: "Emberplate Aegis",
      type: "equipment",
      slot: "armor",
      rarity: "epic",
      price: 340,
      tier: 4,
      stats: { def: 16, maxHp: 90, atk: 4 },
      icon: "armor",
      color: "#f97316",
      desc: "Basalt-forged armor pulsing with hearthfire warmth."
    },

    // Accessories
    copper_band: {
      id: "copper_band",
      name: "Copper Band",
      type: "equipment",
      slot: "accessory",
      rarity: "common",
      price: 32,
      tier: 1,
      stats: { maxMp: 14 },
      icon: "ring",
      color: "#d98a5b",
      desc: "Simple conductive ring widening mana reserves."
    },
    ember_ring: {
      id: "ember_ring",
      name: "Ember Ring",
      type: "equipment",
      slot: "accessory",
      rarity: "uncommon",
      price: 85,
      tier: 2,
      stats: { atk: 5, crit: 6 },
      icon: "ring",
      color: "#f97316",
      desc: "Warm garnet ring sharpening critical strikes."
    },
    windstrider_charm: {
      id: "windstrider_charm",
      name: "Windstrider Charm",
      type: "equipment",
      slot: "accessory",
      rarity: "rare",
      price: 160,
      tier: 3,
      stats: { spd: 20, maxHp: 25, crit: 4 },
      icon: "ring",
      color: "#38bdf8",
      desc: "Feather-carved talisman hastening every stride."
    },
    heart_of_vale: {
      id: "heart_of_vale",
      name: "Heart of the Vale",
      type: "equipment",
      slot: "accessory",
      rarity: "epic",
      price: 350,
      tier: 4,
      stats: { atk: 8, def: 6, maxHp: 40, maxMp: 20 },
      icon: "ring",
      color: "#fbbf24",
      desc: "Living amber jewel brimming with ancient vitality."
    }
  };

  const SKILL_ORDER = ["cleave_arc", "dash_strike", "sunfire_bolt", "sentinel_aegis"];

  const SKILLS = {
    cleave_arc: {
      id: "cleave_arc",
      name: "Cleave Arc",
      shortLabel: "Cleave",
      keyHint: "1",
      unlockLevel: 1,
      maxRank: 5,
      mpCost: 12,
      cooldown: 3.0,
      color: "#f59e0b",
      desc: "Wide 140° arc slash dealing heavy AoE damage and knockback."
    },
    dash_strike: {
      id: "dash_strike",
      name: "Dash Strike",
      shortLabel: "Dash",
      keyHint: "2",
      unlockLevel: 1,
      maxRank: 5,
      mpCost: 10,
      cooldown: 3.5,
      color: "#38bdf8",
      desc: "Swift invincible dash piercing every foe in your path."
    },
    sunfire_bolt: {
      id: "sunfire_bolt",
      name: "Sunfire Bolt",
      shortLabel: "Fire",
      keyHint: "3",
      unlockLevel: 2,
      maxRank: 5,
      mpCost: 16,
      cooldown: 4.2,
      color: "#fb7185",
      desc: "Fires a blazing orb that explodes on hit and burns enemies for 3s."
    },
    sentinel_aegis: {
      id: "sentinel_aegis",
      name: "Sentinel Aegis",
      shortLabel: "Aegis",
      keyHint: "4",
      unlockLevel: 2,
      maxRank: 5,
      mpCost: 22,
      cooldown: 8.5,
      color: "#4ade80",
      desc: "Staggering pulse that heals HP and boosts DEF by 50% for 5s."
    }
  };

  const ENEMIES = {
    spore_slime: {
      id: "spore_slime",
      name: "Spore Slime",
      tier: 1,
      radius: 14,
      maxHp: 42,
      atk: 7,
      def: 1,
      speed: 68,
      aggroRange: 195,
      leashRange: 320,
      attackRange: 44,
      windupDuration: 0.55,
      attackCooldown: 1.35,
      hitRadius: 38,
      exp: 16,
      goldRange: [6, 12],
      color: "#6ee7b7",
      accent: "#059669",
      drops: [
        { itemId: "hp_potion", chance: 0.30 },
        { itemId: "traveler_tunic", chance: 0.10 }
      ]
    },
    goblin_scout: {
      id: "goblin_scout",
      name: "Goblin Scout",
      tier: 2,
      radius: 15,
      maxHp: 76,
      atk: 13,
      def: 2,
      speed: 104,
      aggroRange: 235,
      leashRange: 380,
      attackRange: 48,
      windupDuration: 0.48,
      attackCooldown: 1.15,
      hitRadius: 46,
      exp: 28,
      goldRange: [12, 22],
      color: "#a3e635",
      accent: "#3f6212",
      drops: [
        { itemId: "hp_potion", chance: 0.24 },
        { itemId: "mp_potion", chance: 0.16 },
        { itemId: "oaksteel_blade", chance: 0.12 },
        { itemId: "scout_leather", chance: 0.09 }
      ]
    },
    skeleton_archer: {
      id: "skeleton_archer",
      name: "Skeleton Archer",
      tier: 3,
      radius: 15,
      maxHp: 92,
      atk: 17,
      def: 3,
      speed: 78,
      aggroRange: 290,
      leashRange: 430,
      attackRange: 235,
      preferredDist: 165,
      windupDuration: 0.78,
      attackCooldown: 1.75,
      projectileSpeed: 255,
      ranged: true,
      exp: 42,
      goldRange: [18, 30],
      color: "#e2e8f0",
      accent: "#64748b",
      drops: [
        { itemId: "mp_potion", chance: 0.25 },
        { itemId: "greater_hp", chance: 0.18 },
        { itemId: "mossfang_sabre", chance: 0.11 },
        { itemId: "windstrider_charm", chance: 0.08 }
      ]
    },
    orc_brute: {
      id: "orc_brute",
      name: "Orc Brute",
      tier: 4,
      radius: 20,
      maxHp: 158,
      atk: 24,
      def: 5,
      speed: 74,
      aggroRange: 245,
      leashRange: 400,
      attackRange: 64,
      windupDuration: 0.85,
      attackCooldown: 1.95,
      hitRadius: 70,
      slamAoE: true,
      exp: 64,
      goldRange: [26, 44],
      color: "#f59e0b",
      accent: "#78350f",
      drops: [
        { itemId: "greater_hp", chance: 0.30 },
        { itemId: "berserk_tonic", chance: 0.18 },
        { itemId: "runed_halberd", chance: 0.14 },
        { itemId: "ironbound_mail", chance: 0.12 }
      ]
    },
    cinder_warden: {
      id: "cinder_warden",
      name: "Cinder Warden",
      tier: 5,
      isBoss: true,
      radius: 29,
      maxHp: 540,
      atk: 30,
      def: 7,
      speed: 88,
      aggroRange: 340,
      leashRange: 480,
      attackRange: 90,
      windupDuration: 0.90,
      attackCooldown: 2.0,
      hitRadius: 108,
      slamAoE: true,
      exp: 240,
      goldRange: [140, 190],
      color: "#ef4444",
      accent: "#fbbf24",
      drops: [
        { itemId: "elixir", chance: 1.0 },
        { itemId: "emberplate_aegis", chance: 0.65 },
        { itemId: "heart_of_vale", chance: 0.65 }
      ]
    }
  };

  const SHOP_STOCK = [
    "hp_potion",
    "mp_potion",
    "greater_hp",
    "berserk_tonic",
    "elixir",
    "oaksteel_blade",
    "scout_leather",
    "copper_band",
    "mossfang_sabre",
    "ironbound_mail",
    "windstrider_charm",
    "runed_halberd",
    "emberplate_aegis",
    "heart_of_vale"
  ];

  const ZONES = {
    village: {
      id: "village",
      name: "Emberhearth Village",
      subtitle: "Safe Haven",
      safe: true,
      color: "#4ade80"
    },
    forest: {
      id: "forest",
      name: "Whisperwood",
      subtitle: "Lv 1 - 3",
      safe: false,
      color: "#86efac"
    },
    ruins: {
      id: "ruins",
      name: "Sunken Ruins",
      subtitle: "Lv 3 - 5",
      safe: false,
      color: "#38bdf8"
    },
    sanctum: {
      id: "sanctum",
      name: "Cinder Sanctum",
      subtitle: "Boss Arena",
      safe: false,
      color: "#f87171"
    }
  };

  const QUESTS = [
    {
      id: "slime_cull",
      title: "Clear the Whisperwood",
      giver: "Elder Mira",
      summary: "Defeat 4 Spore Slimes wandering north of the village.",
      targetKinds: ["spore_slime"],
      targetCount: 4,
      rewardGold: 45,
      rewardExp: 55,
      rewardItems: [{ itemId: "hp_potion", qty: 2 }]
    },
    {
      id: "goblin_raiders",
      title: "Bridges of Mistbrook",
      giver: "Elder Mira",
      summary: "Defeat 4 Goblin Scouts guarding Whisperwood crossings.",
      targetKinds: ["goblin_scout"],
      targetCount: 4,
      rewardGold: 95,
      rewardExp: 110,
      rewardItems: [{ itemId: "ember_ring", qty: 1 }]
    },
    {
      id: "ruin_guardians",
      title: "Echoes in the Stone",
      giver: "Elder Mira",
      summary: "Defeat 5 Guardians (Skeleton Archers or Orc Brutes) in the Sunken Ruins.",
      targetKinds: ["skeleton_archer", "orc_brute"],
      targetCount: 5,
      rewardGold: 180,
      rewardExp: 210,
      rewardItems: [{ itemId: "elixir", qty: 1 }]
    },
    {
      id: "cinder_warden",
      title: "Extinguish the Sanctum",
      giver: "Elder Mira",
      summary: "Defeat the Cinder Warden deep inside the Cinder Sanctum.",
      targetKinds: ["cinder_warden"],
      targetCount: 1,
      rewardGold: 350,
      rewardExp: 400,
      rewardItems: [{ itemId: "dawnbreaker", qty: 1 }]
    }
  ];

  return {
    RARITIES,
    ITEMS,
    SKILL_ORDER,
    SKILLS,
    ENEMIES,
    SHOP_STOCK,
    ZONES,
    QUESTS
  };
});
