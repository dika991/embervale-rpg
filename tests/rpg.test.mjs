import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const DATA = require("../src/data.js");
const RPG = require("../src/rpg.js");

test("EXP leveling, multi-level spillover, stat scaling, and skill points", () => {
  const player = RPG.createInitialPlayer();
  assert.equal(player.level, 1);
  assert.equal(player.skillPoints, 0);

  const req1 = RPG.expToNext(1);
  const req2 = RPG.expToNext(2);
  assert.equal(req1, 40);
  assert.ok(req2 > req1);

  // Grant enough EXP for 2 levels at once
  player.hp = 12;
  player.mp = 2;
  const res = RPG.grantExp(player, req1 + req2 + 5);
  assert.equal(res.leveledUp, true);
  assert.equal(res.levelsGained, 2);
  assert.equal(player.level, 3);
  assert.equal(player.exp, 5);
  assert.equal(player.skillPoints, 2);

  // Level-up restores full HP & MP to new scaled max
  const stats = RPG.computePlayerStats(player);
  assert.equal(player.hp, stats.maxHp);
  assert.equal(player.mp, stats.maxMp);
  assert.ok(stats.atk > 18); // Level 3 base + starter shortsword
});

test("Inventory stacking, equipment swapping, and stat comparisons", () => {
  const player = RPG.createInitialPlayer();
  assert.equal(RPG.getItemCount(player, "hp_potion"), 2);

  RPG.addItem(player, "hp_potion", 3);
  assert.equal(RPG.getItemCount(player, "hp_potion"), 5);

  const addedBlade = RPG.addItem(player, "oaksteel_blade", 1);
  const delta = RPG.compareItemToEquipped(player, "oaksteel_blade");
  assert.equal(delta.atk, 5); // 9 - 4
  assert.equal(delta.crit, 3);

  const eqRes = RPG.equipItem(player, addedBlade.entry.uid);
  assert.equal(eqRes.ok, true);
  assert.equal(player.equipment.weapon.itemId, "oaksteel_blade");
  assert.equal(eqRes.swappedOut.id, "rusty_shortsword");
  assert.ok(player.inventory.some((it) => it.itemId === "rusty_shortsword"));
});

test("Consumables obey full-vital guards and restore HP/MP/buffs", () => {
  const player = RPG.createInitialPlayer();
  const fullCheck = RPG.useConsumable(player, "hp_potion");
  assert.equal(fullCheck.ok, false);

  player.hp = 40;
  const useRes = RPG.useConsumable(player, "hp_potion");
  assert.equal(useRes.ok, true);
  assert.equal(useRes.healedHp, 55);
  assert.equal(player.hp, 95);
  assert.equal(RPG.getItemCount(player, "hp_potion"), 1);

  RPG.addItem(player, "berserk_tonic", 1);
  const baseAtk = RPG.computePlayerStats(player).atk;
  const tonicRes = RPG.useConsumable(player, "berserk_tonic");
  assert.equal(tonicRes.ok, true);
  assert.ok(RPG.computePlayerStats(player).atk > baseAtk);
});

test("Gold economy: shop buy, insufficient gold guard, and sell back", () => {
  const player = RPG.createInitialPlayer();
  player.gold = 100;

  const failBuy = RPG.buyItem(player, "runed_halberd", 1);
  assert.equal(failBuy.ok, false);
  assert.equal(player.gold, 100);

  const okBuy = RPG.buyItem(player, "oaksteel_blade", 1);
  assert.equal(okBuy.ok, true);
  assert.equal(player.gold, 100 - DATA.ITEMS.oaksteel_blade.price);

  const sellRes = RPG.sellItem(player, okBuy.entry.uid);
  assert.equal(sellRes.ok, true);
  assert.equal(sellRes.earnedGold, RPG.getSellPrice("oaksteel_blade"));
  assert.equal(player.gold, 100 - DATA.ITEMS.oaksteel_blade.price + sellRes.earnedGold);
});

test("Skills unlock level gates, point spending, and rank scaling", () => {
  const player = RPG.createInitialPlayer();
  assert.equal(player.skillRanks.cleave_arc, 1);
  assert.equal(player.skillRanks.sunfire_bolt, 0);

  // Level 1 cannot unlock sunfire_bolt yet
  player.skillPoints = 1;
  assert.equal(RPG.canUpgradeSkill(player, "sunfire_bolt").ok, false);

  // Level up to 2 -> unlock sunfire_bolt
  RPG.grantExp(player, RPG.expToNext(1));
  assert.equal(player.level, 2);
  const up = RPG.upgradeSkill(player, "sunfire_bolt");
  assert.equal(up.ok, true);
  assert.equal(player.skillRanks.sunfire_bolt, 1);

  const r1 = RPG.getSkillParams("cleave_arc", 1);
  const r3 = RPG.getSkillParams("cleave_arc", 3);
  assert.ok(r3.mult > r1.mult);
  assert.ok(r3.cooldown < r1.cooldown);
});

test("Quest tracking and reward progression", () => {
  const player = RPG.createInitialPlayer();
  const q1 = RPG.getActiveQuest(player);
  assert.equal(q1.id, "slime_cull");

  for (let i = 0; i < 4; i += 1) {
    assert.equal(RPG.recordQuestKill(player, "spore_slime"), true);
  }
  assert.equal(RPG.isQuestReadyToClaim(player), true);

  const goldBefore = player.gold;
  const claim = RPG.claimQuestReward(player);
  assert.equal(claim.ok, true);
  assert.equal(player.gold, goldBefore + q1.rewardGold);
  assert.equal(RPG.getActiveQuest(player).id, "goblin_raiders");
});

test("syncUidCounter & uniqueUidForPlayer prevent UID collisions across saved gear", () => {
  const player = RPG.createInitialPlayer();
  player.inventory.push({ uid: "eq_9999", itemId: "oaksteel_blade" });
  player.equipment.accessory = { uid: "eq_10050", itemId: "copper_band" };

  RPG.syncUidCounter(player);
  const added = RPG.addItem(player, "runed_halberd", 1);
  assert.equal(added.ok, true);
  assert.notEqual(added.entry.uid, "eq_9999");
  assert.notEqual(added.entry.uid, "eq_10050");

  const eqRes = RPG.equipItem(player, added.entry.uid);
  assert.equal(eqRes.ok, true);
  assert.equal(player.equipment.weapon.itemId, "runed_halberd");
});
