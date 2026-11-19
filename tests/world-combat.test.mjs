import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const DATA = require("../src/data.js");
const RPG = require("../src/rpg.js");
const WORLD = require("../src/world.js");
const COMBAT = require("../src/combat.js");
const SAVE = require("../src/save.js");

test("World map reachability: BFS from Village Hearth reaches every chest, NPC, and Boss", () => {
  const world = WORLD.buildWorld();
  const player = RPG.createInitialPlayer();
  const startCol = Math.floor(player.x / world.tileSize);
  const startRow = Math.floor(player.y / world.tileSize);
  assert.equal(WORLD.isSolidTile(WORLD.getTileAt(world, startCol, startRow)), false);

  const visited = new Uint8Array(world.cols * world.rows);
  const queue = [[startCol, startRow]];
  visited[startRow * world.cols + startCol] = 1;

  for (let head = 0; head < queue.length; head += 1) {
    const [c, r] = queue[head];
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nc >= world.cols || nr < 0 || nr >= world.rows) continue;
      const i = nr * world.cols + nc;
      if (visited[i]) continue;
      if (WORLD.isSolidTile(world.tiles[i])) continue;
      visited[i] = 1;
      queue.push([nc, nr]);
    }
  }

  for (const chest of world.chests) {
    const c = Math.floor(chest.x / world.tileSize);
    const r = Math.floor(chest.y / world.tileSize);
    assert.equal(visited[r * world.cols + c], 1, `Chest ${chest.id} must be reachable`);
  }

  for (const sp of world.enemySpawns) {
    const c = Math.floor(sp.x / world.tileSize);
    const r = Math.floor(sp.y / world.tileSize);
    assert.equal(visited[r * world.cols + c], 1, `Spawn ${sp.id} must be reachable`);
  }

  for (const npc of world.npcs) {
    const c = Math.floor(npc.x / world.tileSize);
    const r = Math.floor(npc.y / world.tileSize);
    // NPC tile or adjacent tile must be reachable
    const adjReachable = [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]].some(([dc, dr]) => {
      const nc = c + dc;
      const nr = r + dr;
      return visited[nr * world.cols + nc] === 1;
    });
    assert.equal(adjReachable, true, `NPC ${npc.id} must be approachable`);
  }
});

test("Real-time combat: basic attack, skills, enemy death drops, pickup magnet, and boss victory", () => {
  const world = WORLD.buildWorld();
  const state = COMBAT.createGameState(world);

  // Move player next to first slime
  const slime = state.enemies.find((e) => e.kind === "spore_slime");
  state.player.x = slime.x - 32;
  state.player.y = slime.y;
  state.player.facing = 0; // face right

  const attacked = COMBAT.playerAttack(state);
  assert.equal(attacked, true);
  assert.ok(slime.hp < slime.maxHp);

  // Cast Cleave Arc to finish slime
  const cleave = COMBAT.castSkill(state, "cleave_arc");
  assert.equal(cleave.ok, true);
  assert.ok(state.player.mp < 50);

  // Simulate enough swings to kill slime if still alive
  let safety = 0;
  while (slime.alive && safety < 20) {
    COMBAT.update(state, 0.1, { x: 0, y: 0 });
    COMBAT.playerAttack(state);
    safety += 1;
  }
  assert.equal(slime.alive, false);
  assert.ok(state.player.exp > 0 || state.player.level > 1);
  assert.ok(state.pickups.some((p) => p.kind === "gold"));

  // Step simulation so gold magnet pulls coins into player
  const goldBefore = state.player.gold;
  for (let i = 0; i < 60; i += 1) {
    COMBAT.update(state, 0.05, { x: 0, y: 0 });
  }
  assert.ok(state.player.gold > goldBefore);

  // Test Sunfire Bolt skill unlocked at Lv 2
  RPG.grantExp(state.player, 100);
  RPG.upgradeSkill(state.player, "sunfire_bolt");
  RPG.upgradeSkill(state.player, "sentinel_aegis");
  state.player.mp = RPG.computePlayerStats(state.player).maxMp;

  const fire = COMBAT.castSkill(state, "sunfire_bolt");
  assert.equal(fire.ok, true);
  assert.equal(state.projectiles.some((p) => p.kind === "sunfire"), true);

  state.player.hp = 20;
  const aegis = COMBAT.castSkill(state, "sentinel_aegis");
  assert.equal(aegis.ok, true);
  assert.ok(state.player.hp > 20);
  assert.ok(state.player.buffs.aegisTimer > 0);

  const dash = COMBAT.castSkill(state, "dash_strike");
  assert.equal(dash.ok, true);
  assert.equal(state.dashState.active, true);
  for (let i = 0; i < 6; i += 1) {
    COMBAT.update(state, 0.05, { x: 0, y: 0 });
  }
  assert.equal(state.dashState.active, false);

  // Boss defeat triggers victory mode
  const boss = state.enemies.find((e) => e.isBoss);
  state.player.x = boss.x - 36;
  state.player.y = boss.y;
  state.player.facing = 0;
  boss.hp = 5;
  state.player.attackCooldown = 0;
  assert.equal(COMBAT.playerAttack(state), true);
  assert.equal(boss.alive, false);
  assert.equal(state.mode, "victory");
});

test("Interactables (chest, campfire, shop NPC) & Save persistence round-trip", () => {
  const world = WORLD.buildWorld();
  const state = COMBAT.createGameState(world);
  const starterChest = state.chests.find((c) => c.id === "chest_village");

  state.player.x = starterChest.x + 12;
  state.player.y = starterChest.y;
  const goldBefore = state.player.gold;
  const chestRes = COMBAT.interact(state);
  assert.equal(chestRes.type, "chest");
  assert.equal(starterChest.opened, true);
  assert.equal(state.player.gold, goldBefore + starterChest.gold);

  // Save/load round-trip using mock storage
  const mapStore = new Map();
  const mockStorage = {
    getItem: (k) => mapStore.get(k) ?? null,
    setItem: (k, v) => mapStore.set(k, v),
    removeItem: (k) => mapStore.delete(k)
  };
  assert.equal(SAVE.saveToStorage(state, mockStorage), true);
  const loaded = SAVE.loadFromStorage(mockStorage);
  assert.ok(loaded);
  assert.equal(loaded.player.gold, state.player.gold);
  assert.deepEqual(loaded.openedChestIds, ["chest_village"]);

  // Recreate state from save
  const state2 = COMBAT.createGameState(world, loaded.player, loaded.openedChestIds);
  const reloadedChest = state2.chests.find((c) => c.id === "chest_village");
  assert.equal(reloadedChest.opened, true);
  assert.equal(DATA.ZONES.village.safe, true);
});

test("Hardening guards: Quick Potion full HP elixir safety, boss add cleanup on respawn, boundary clamp & restricted storage", () => {
  const world = WORLD.buildWorld();
  const state = COMBAT.createGameState(world);

  // 1. Quick Potion must NOT consume Sunstone Elixir when HP is already full even if MP is low
  const stats = RPG.computePlayerStats(state.player);
  state.player.hp = stats.maxHp;
  state.player.mp = 5;
  RPG.addItem(state.player, "elixir", 1);
  const quickRes = COMBAT.useQuickPotion(state);
  assert.equal(quickRes.ok, false);
  assert.equal(RPG.getItemCount(state.player, "elixir"), 1);
  assert.equal(RPG.getItemCount(state.player, "hp_potion"), 2);

  // 2. Boss Phase 2 summons do not accumulate across player death/village respawns
  const boss = state.enemies.find((e) => e.isBoss);
  RPG.grantExp(state.player, 1500);
  boss.hp = Math.floor(boss.maxHp * 0.5) + 1;
  state.player.x = boss.x - 30;
  state.player.y = boss.y;
  state.player.facing = 0;
  COMBAT.playerAttack(state);
  assert.equal(state.enemies.filter((e) => e.isSummon && e.alive).length, 2);
  COMBAT.respawnAtVillage(state);
  assert.equal(state.enemies.filter((e) => e.isSummon).length, 0);
  assert.equal(boss.phase, 1);

  // 3. Extreme world boundary clamp always preserves [radius, width - radius] x [radius, height - radius]
  const tl = WORLD.resolveCircleWorldCollision(world, -500, -500, 14);
  const br = WORLD.resolveCircleWorldCollision(world, 99999, 99999, 14);
  assert.ok(tl.x >= 14 && tl.y >= 14, `Expected >= 14, got (${tl.x}, ${tl.y})`);
  assert.ok(br.x <= world.width - 14 && br.y <= world.height - 14, `Expected <= bounds, got (${br.x}, ${br.y})`);

  // 4. Restricted localStorage getter throws SecurityError -> SAVE falls back gracefully
  const prevDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("Access denied");
    }
  });
  try {
    assert.equal(SAVE.loadFromStorage(), null);
    assert.equal(SAVE.saveToStorage(state), false);
    assert.equal(SAVE.clearStorage(), false);
  } finally {
    if (prevDescriptor) Object.defineProperty(globalThis, "localStorage", prevDescriptor);
    else delete globalThis.localStorage;
  }
});
