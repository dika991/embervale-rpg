(function (root, factory) {
  let DATA;
  if (typeof module !== "undefined" && module.exports && typeof require === "function") {
    DATA = require("./data.js");
  } else {
    DATA = root.Embervale && root.Embervale.DATA;
  }
  const api = factory(DATA);
  root.Embervale = root.Embervale || {};
  root.Embervale.WORLD = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (DATA) {
  "use strict";

  const TILE_SIZE = 44;
  const MAP_COLS = 64;
  const MAP_ROWS = 56;

  const TILE = {
    GRASS: 0,
    PATH: 1,
    TOWN_GROUND: 2,
    RUIN_FLOOR: 3,
    SANCTUM_FLOOR: 4,
    BRIDGE: 5,
    WATER: 6,
    TREE: 7,
    STONE_WALL: 8,
    PILLAR: 9
  };

  function isSolidTile(t) {
    return t >= TILE.WATER;
  }

  function tileCenter(col, row) {
    return {
      x: col * TILE_SIZE + TILE_SIZE * 0.5,
      y: row * TILE_SIZE + TILE_SIZE * 0.5
    };
  }

  function buildWorld() {
    const tiles = new Uint8Array(MAP_COLS * MAP_ROWS);
    const zoneIds = new Array(MAP_COLS * MAP_ROWS);

    function idx(c, r) {
      return r * MAP_COLS + c;
    }

    function setTile(c, r, t) {
      if (c < 0 || c >= MAP_COLS || r < 0 || r >= MAP_ROWS) return;
      tiles[idx(c, r)] = t;
    }

    function fillRect(c1, r1, c2, r2, t) {
      for (let r = r1; r <= r2; r += 1) {
        for (let c = c1; c <= c2; c += 1) {
          setTile(c, r, t);
        }
      }
    }

    // 1. Default grass & assign logical zones
    for (let r = 0; r < MAP_ROWS; r += 1) {
      for (let c = 0; c < MAP_COLS; c += 1) {
        tiles[idx(c, r)] = TILE.GRASS;
        if (c <= 20 && r >= 36) {
          zoneIds[idx(c, r)] = "village";
        } else if (c <= 29) {
          zoneIds[idx(c, r)] = "forest";
        } else if (r <= 21) {
          zoneIds[idx(c, r)] = "sanctum";
        } else {
          zoneIds[idx(c, r)] = "ruins";
        }
      }
    }

    // 2. Village courtyard (South-West)
    fillRect(2, 37, 19, 53, TILE.TOWN_GROUND);
    fillRect(3, 38, 18, 52, TILE.TOWN_GROUND);
    // Green trim squares inside village
    fillRect(3, 48, 7, 52, TILE.GRASS);
    fillRect(15, 48, 18, 52, TILE.GRASS);
    // Stone border around village with North & East gates
    fillRect(2, 36, 20, 36, TILE.STONE_WALL);
    fillRect(20, 36, 20, 53, TILE.STONE_WALL);
    fillRect(10, 36, 12, 36, TILE.PATH); // North gate to Whisperwood
    fillRect(20, 39, 20, 41, TILE.PATH); // East gate toward river crossing

    // 3. Sunken Ruins floor (South-East)
    fillRect(31, 22, 61, 53, TILE.RUIN_FLOOR);
    // Crumbling grass edges in ruins
    fillRect(32, 48, 37, 52, TILE.GRASS);
    fillRect(55, 48, 60, 52, TILE.GRASS);

    // 4. Cinder Sanctum (North-East)
    fillRect(31, 2, 61, 21, TILE.SANCTUM_FLOOR);
    fillRect(31, 22, 61, 22, TILE.STONE_WALL);
    fillRect(45, 22, 47, 22, TILE.SANCTUM_FLOOR); // Sanctum boss gate

    // 5. Mistbrook River & Twin Timber Bridges
    fillRect(29, 2, 30, 53, TILE.WATER);
    fillRect(29, 39, 30, 41, TILE.BRIDGE); // South crossing (Village -> South Ruins)
    fillRect(29, 25, 30, 27, TILE.BRIDGE); // North crossing (Whisperwood -> North Ruins)

    // 6. Main interconnected roads (always walkable)
    fillRect(10, 14, 12, 46, TILE.PATH);   // North road from hearth through Whisperwood
    fillRect(10, 14, 26, 16, TILE.PATH);   // Upper Whisperwood loop trail
    fillRect(24, 14, 26, 27, TILE.PATH);   // Eastern Whisperwood path toward North Bridge
    fillRect(12, 25, 28, 27, TILE.PATH);   // Mid Whisperwood trail to North Bridge
    fillRect(10, 39, 28, 41, TILE.PATH);   // Village East road to South Bridge
    fillRect(31, 25, 47, 27, TILE.PATH);   // North Ruins avenue from North Bridge
    fillRect(31, 39, 47, 41, TILE.PATH);   // South Ruins central avenue
    fillRect(45, 10, 47, 41, TILE.PATH);   // Spine from Ruins straight up through Sanctum gate to Boss
    fillRect(43, 6, 49, 14, TILE.SANCTUM_FLOOR); // Open boss altar inside Sanctum

    // 7. Outer world borders (2 tiles thick)
    fillRect(0, 0, MAP_COLS - 1, 1, TILE.TREE);
    fillRect(0, MAP_ROWS - 2, MAP_COLS - 1, MAP_ROWS - 1, TILE.TREE);
    fillRect(0, 0, 1, MAP_ROWS - 1, TILE.TREE);
    fillRect(MAP_COLS - 2, 0, MAP_COLS - 1, MAP_ROWS - 1, TILE.STONE_WALL);
    fillRect(31, 0, MAP_COLS - 1, 1, TILE.STONE_WALL);

    // 8. Whisperwood decorative tree groves (left/right of trails, keeping wide lanes)
    const treeClusters = [
      [4, 29, 7, 32],
      [16, 28, 22, 33],
      [4, 19, 7, 23],
      [18, 19, 22, 23],
      [15, 5, 22, 10],
      [4, 5, 8, 10],
      [25, 29, 27, 34]
    ];
    for (const [c1, r1, c2, r2] of treeClusters) {
      for (let r = r1; r <= r2; r += 2) {
        for (let c = c1; c <= c2; c += 2) {
          setTile(c, r, TILE.TREE);
        }
      }
    }

    // 9. Sunken Ruins & Sanctum tactical pillars (sight-line & cover)
    const pillars = [
      [36, 33], [36, 45], [40, 30], [40, 48],
      [52, 33], [52, 45], [56, 30], [56, 48],
      [37, 26], [55, 26],
      // Sanctum boss arena ring pillars (keep wide spacing around 46,10)
      [39, 8], [39, 14], [53, 8], [53, 14]
    ];
    for (const [c, r] of pillars) {
      setTile(c, r, TILE.PILLAR);
    }

    // 10. Village decorative trees behind plaza
    setTile(4, 49, TILE.TREE);
    setTile(6, 51, TILE.TREE);
    setTile(16, 50, TILE.TREE);
    setTile(18, 48, TILE.TREE);

    // 11. Interactive NPCs & Shrines
    const npcs = [
      {
        id: "campfire",
        kind: "campfire",
        name: "Hearth Campfire",
        role: "Heal & Save",
        ...tileCenter(11, 43),
        radius: 18,
        solid: false
      },
      {
        id: "elder_mira",
        kind: "quest_npc",
        name: "Elder Mira",
        role: "Village Elder",
        ...tileCenter(8, 40),
        radius: 15,
        solid: true
      },
      {
        id: "merchant_pip",
        kind: "shop_npc",
        name: "Merchant Pip",
        role: "Outfit & Potions",
        ...tileCenter(14, 40),
        radius: 15,
        solid: true
      }
    ];

    // 12. Treasure Chests (one-time loot)
    const chests = [
      {
        id: "chest_village",
        ...tileCenter(5, 42),
        gold: 35,
        items: [{ itemId: "hp_potion", qty: 1 }, { itemId: "copper_band", qty: 1 }],
        opened: false
      },
      {
        id: "chest_forest_west",
        ...tileCenter(5, 14),
        gold: 50,
        items: [{ itemId: "oaksteel_blade", qty: 1 }, { itemId: "mp_potion", qty: 1 }],
        opened: false
      },
      {
        id: "chest_forest_east",
        ...tileCenter(25, 22),
        gold: 60,
        items: [{ itemId: "scout_leather", qty: 1 }],
        opened: false
      },
      {
        id: "chest_ruins_south",
        ...tileCenter(56, 44),
        gold: 90,
        items: [{ itemId: "greater_hp", qty: 2 }, { itemId: "windstrider_charm", qty: 1 }],
        opened: false
      },
      {
        id: "chest_ruins_north",
        ...tileCenter(36, 28),
        gold: 100,
        items: [{ itemId: "ironbound_mail", qty: 1 }, { itemId: "berserk_tonic", qty: 1 }],
        opened: false
      },
      {
        id: "chest_sanctum",
        ...tileCenter(46, 4),
        gold: 150,
        items: [{ itemId: "elixir", qty: 1 }, { itemId: "heart_of_vale", qty: 1 }],
        opened: false
      }
    ];

    // 13. Enemy Spawn Manifests
    const enemySpawns = [
      // Whisperwood South / Central — Spore Slimes (easy starter Lv 1)
      { id: "sp_slime_1", kind: "spore_slime", zoneId: "forest", ...tileCenter(12, 32), respawn: 18 },
      { id: "sp_slime_2", kind: "spore_slime", zoneId: "forest", ...tileCenter(9, 28), respawn: 18 },
      { id: "sp_slime_3", kind: "spore_slime", zoneId: "forest", ...tileCenter(14, 25), respawn: 18 },
      { id: "sp_slime_4", kind: "spore_slime", zoneId: "forest", ...tileCenter(23, 35), respawn: 18 },
      { id: "sp_slime_5", kind: "spore_slime", zoneId: "forest", ...tileCenter(8, 17), respawn: 18 },
      { id: "sp_slime_6", kind: "spore_slime", zoneId: "forest", ...tileCenter(24, 19), respawn: 18 },

      // Whisperwood North & Approach — Goblin Scouts (Lv 2-3)
      { id: "sp_goblin_1", kind: "goblin_scout", zoneId: "forest", ...tileCenter(14, 15), respawn: 22 },
      { id: "sp_goblin_2", kind: "goblin_scout", zoneId: "forest", ...tileCenter(24, 14), respawn: 22 },
      { id: "sp_goblin_3", kind: "goblin_scout", zoneId: "forest", ...tileCenter(26, 26), respawn: 22 },
      { id: "sp_goblin_4", kind: "goblin_scout", zoneId: "forest", ...tileCenter(11, 8), respawn: 22 },
      { id: "sp_goblin_5", kind: "goblin_scout", zoneId: "forest", ...tileCenter(25, 8), respawn: 22 },

      // Sunken Ruins — Skeleton Archers & Orc Brutes (Lv 3-5)
      { id: "sp_skel_1", kind: "skeleton_archer", zoneId: "ruins", ...tileCenter(36, 40), respawn: 25 },
      { id: "sp_skel_2", kind: "skeleton_archer", zoneId: "ruins", ...tileCenter(44, 34), respawn: 25 },
      { id: "sp_skel_3", kind: "skeleton_archer", zoneId: "ruins", ...tileCenter(56, 36), respawn: 25 },
      { id: "sp_skel_4", kind: "skeleton_archer", zoneId: "ruins", ...tileCenter(40, 26), respawn: 25 },
      { id: "sp_orc_1", kind: "orc_brute", zoneId: "ruins", ...tileCenter(48, 43), respawn: 28 },
      { id: "sp_orc_2", kind: "orc_brute", zoneId: "ruins", ...tileCenter(52, 29), respawn: 28 },
      { id: "sp_orc_3", kind: "orc_brute", zoneId: "ruins", ...tileCenter(46, 26), respawn: 28 },

      // Cinder Sanctum — Boss
      { id: "sp_boss_warden", kind: "cinder_warden", zoneId: "sanctum", ...tileCenter(46, 10), respawn: 60 }
    ];

    return {
      cols: MAP_COLS,
      rows: MAP_ROWS,
      tileSize: TILE_SIZE,
      width: MAP_COLS * TILE_SIZE,
      height: MAP_ROWS * TILE_SIZE,
      tiles,
      zoneIds,
      npcs,
      chests,
      enemySpawns
    };
  }

  function getTileAt(world, col, row) {
    if (col < 0 || col >= world.cols || row < 0 || row >= world.rows) {
      return TILE.STONE_WALL;
    }
    return world.tiles[row * world.cols + col];
  }

  function getZoneAt(world, x, y) {
    const col = Math.max(0, Math.min(world.cols - 1, Math.floor(x / world.tileSize)));
    const row = Math.max(0, Math.min(world.rows - 1, Math.floor(y / world.tileSize)));
    const id = world.zoneIds[row * world.cols + col] || "forest";
    return DATA.ZONES[id] || DATA.ZONES.forest;
  }

  function resolveCircleWorldCollision(world, x, y, radius) {
    let cx = Math.max(radius, Math.min(world.width - radius, x));
    let cy = Math.max(radius, Math.min(world.height - radius, y));
    const ts = world.tileSize;

    const minCol = Math.max(0, Math.floor((cx - radius - 2) / ts));
    const maxCol = Math.min(world.cols - 1, Math.floor((cx + radius + 2) / ts));
    const minRow = Math.max(0, Math.floor((cy - radius - 2) / ts));
    const maxRow = Math.min(world.rows - 1, Math.floor((cy + radius + 2) / ts));

    for (let rep = 0; rep < 2; rep += 1) {
      for (let r = minRow; r <= maxRow; r += 1) {
        for (let c = minCol; c <= maxCol; c += 1) {
          const tile = world.tiles[r * world.cols + c];
          if (!isSolidTile(tile)) continue;
          const rx1 = c * ts;
          const ry1 = r * ts;
          const rx2 = rx1 + ts;
          const ry2 = ry1 + ts;
          const nearX = Math.max(rx1, Math.min(cx, rx2));
          const nearY = Math.max(ry1, Math.min(cy, ry2));
          const dx = cx - nearX;
          const dy = cy - nearY;
          const distSq = dx * dx + dy * dy;
          if (distSq < radius * radius) {
            const dist = Math.sqrt(distSq);
            if (dist > 0.0001) {
              const overlap = radius - dist;
              cx += (dx / dist) * overlap;
              cy += (dy / dist) * overlap;
            } else {
              // Inside tile center fallback
              const midX = rx1 + ts * 0.5;
              const midY = ry1 + ts * 0.5;
              if (c === 0) {
                cx = rx2 + radius;
              } else if (c === world.cols - 1) {
                cx = rx1 - radius;
              } else if (r === 0) {
                cy = ry2 + radius;
              } else if (r === world.rows - 1) {
                cy = ry1 - radius;
              } else if (Math.abs(cx - midX) > Math.abs(cy - midY)) {
                cx = cx < midX ? rx1 - radius : rx2 + radius;
              } else {
                cy = cy < midY ? ry1 - radius : ry2 + radius;
              }
            }
          }
        }
      }
    }

    // Solid NPC body blocking
    for (const npc of world.npcs) {
      if (!npc.solid) continue;
      const dx = cx - npc.x;
      const dy = cy - npc.y;
      const minD = radius + npc.radius;
      const dSq = dx * dx + dy * dy;
      if (dSq < minD * minD && dSq > 0.0001) {
        const d = Math.sqrt(dSq);
        const push = minD - d;
        cx += (dx / d) * push;
        cy += (dy / d) * push;
      }
    }

    cx = Math.max(radius, Math.min(world.width - radius, cx));
    cy = Math.max(radius, Math.min(world.height - radius, cy));

    return { x: cx, y: cy };
  }

  function hasLineOfSight(world, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    const steps = Math.ceil(dist / 14);
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const col = Math.floor(px / world.tileSize);
      const row = Math.floor(py / world.tileSize);
      const tile = getTileAt(world, col, row);
      // Water does not block arrows/sight, only walls, trees, pillars do
      if (tile >= TILE.TREE) return false;
    }
    return true;
  }

  function findNearestInteractable(world, player, chests) {
    const maxDist = 70;
    let best = null;
    let bestDist = maxDist;

    for (const npc of world.npcs) {
      const d = Math.hypot(player.x - npc.x, player.y - npc.y);
      if (d < bestDist) {
        bestDist = d;
        best = { type: npc.kind, target: npc, dist: d };
      }
    }

    for (const chest of chests) {
      if (chest.opened) continue;
      const d = Math.hypot(player.x - chest.x, player.y - chest.y);
      if (d < bestDist) {
        bestDist = d;
        best = { type: "chest", target: chest, dist: d };
      }
    }

    return best;
  }

  return {
    TILE_SIZE,
    MAP_COLS,
    MAP_ROWS,
    TILE,
    isSolidTile,
    tileCenter,
    buildWorld,
    getTileAt,
    getZoneAt,
    resolveCircleWorldCollision,
    hasLineOfSight,
    findNearestInteractable
  };
});
