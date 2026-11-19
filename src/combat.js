(function (root, factory) {
  let DATA, RPG, WORLD;
  if (typeof module !== "undefined" && module.exports && typeof require === "function") {
    DATA = require("./data.js");
    RPG = require("./rpg.js");
    WORLD = require("./world.js");
  } else {
    DATA = root.Embervale && root.Embervale.DATA;
    RPG = root.Embervale && root.Embervale.RPG;
    WORLD = root.Embervale && root.Embervale.WORLD;
  }
  const api = factory(DATA, RPG, WORLD);
  root.Embervale = root.Embervale || {};
  root.Embervale.COMBAT = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (DATA, RPG, WORLD) {
  "use strict";

  const PLAYER_RADIUS = 14;
  let entitySeq = 1;

  function makeEnemy(spawn) {
    const def = DATA.ENEMIES[spawn.kind];
    return {
      id: spawn.id,
      kind: spawn.kind,
      name: def.name,
      zoneId: spawn.zoneId,
      x: spawn.x,
      y: spawn.y,
      spawnX: spawn.x,
      spawnY: spawn.y,
      radius: def.radius,
      hp: def.maxHp,
      maxHp: def.maxHp,
      atk: def.atk,
      def: def.def,
      speed: def.speed,
      vx: 0,
      vy: 0,
      knockVx: 0,
      knockVy: 0,
      state: "patrol",
      stateTimer: 0.4 + Math.random() * 1.4,
      attackCdTimer: 0,
      facing: Math.random() * Math.PI * 2,
      patrolAngle: Math.random() * Math.PI * 2,
      windupTarget: null,
      hitFlashTimer: 0,
      burnTimer: 0,
      burnDps: 0,
      burnAccum: 0,
      respawnTimer: 0,
      respawnDuration: spawn.respawn || 20,
      alive: true,
      isBoss: Boolean(def.isBoss),
      phase: 1,
      summonedAdds: false,
      bossAttackIndex: 0
    };
  }

  function createGameState(world, savedPlayer, openedChestIds) {
    const player = savedPlayer || RPG.createInitialPlayer();
    RPG.syncUidCounter(player);
    RPG.clampVitals(player);
    const openedSet = new Set(openedChestIds || []);
    const chests = world.chests.map((c) => ({
      ...c,
      opened: openedSet.has(c.id)
    }));

    return {
      world,
      player,
      chests,
      enemies: world.enemySpawns.map(makeEnemy),
      pickups: [],
      projectiles: [],
      slashes: [],
      telegraphs: [],
      particles: [],
      floatingTexts: [],
      dashState: { active: false, timer: 0, vx: 0, vy: 0, hitIds: new Set() },
      camera: { x: player.x, y: player.y, shake: 0 },
      hitStopTimer: 0,
      regenDelayTimer: 0,
      pendingSfx: [],
      zoneBanner: null,
      lastZoneId: WORLD.getZoneAt(world, player.x, player.y).id,
      bossSlainVictoryShown: (player.statsCounters && player.statsCounters.bossSlainCount > 0) || false,
      mode: "playing" // playing | gameover | victory
    };
  }

  function pushSfx(state, name) {
    state.pendingSfx.push(name);
  }

  function addFloatingText(state, x, y, text, color, scale) {
    state.floatingTexts.push({
      x,
      y,
      vy: -36,
      text: String(text),
      color: color || "#ffffff",
      scale: scale || 1,
      timer: 0.85,
      maxTimer: 0.85
    });
  }

  function spawnParticles(state, x, y, color, count, speed, life) {
    for (let i = 0; i < count; i += 1) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.35 + Math.random() * 0.75) * (speed || 100);
      state.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        radius: 2 + Math.random() * 2.5,
        color,
        timer: life || 0.35,
        maxTimer: life || 0.35
      });
    }
  }

  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function findAutoAimAngle(state, maxRange, maxCone) {
    const p = state.player;
    let bestEnemy = null;
    let bestScore = Infinity;

    for (const en of state.enemies) {
      if (!en.alive) continue;
      const dx = en.x - p.x;
      const dy = en.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > (maxRange || 125) + en.radius) continue;
      const ang = Math.atan2(dy, dx);
      const diff = Math.abs(normalizeAngle(ang - p.facing));
      // Very close threats always connect even from behind; medium range respects cone
      if (dist > 68 && diff > (maxCone || 1.45)) continue;
      const score = dist + diff * 35;
      if (score < bestScore) {
        bestScore = score;
        bestEnemy = en;
      }
    }

    if (bestEnemy) {
      return Math.atan2(bestEnemy.y - p.y, bestEnemy.x - p.x);
    }
    return p.facing;
  }

  function damageEnemy(state, en, rawAmount, critChanceBonus, knockForce, knockAngle) {
    if (!en.alive) return 0;
    const stats = RPG.computePlayerStats(state.player);
    const critChance = Math.min(85, stats.crit + (critChanceBonus || 0));
    const isCrit = Math.random() * 100 < critChance;
    const variance = 0.93 + Math.random() * 0.14;
    let dmg = rawAmount * variance * (isCrit ? 1.65 : 1.0);
    dmg = Math.max(1, Math.round(dmg - en.def * 0.45));

    en.hp = Math.max(0, en.hp - dmg);
    en.hitFlashTimer = 0.14;
    if (knockForce > 0) {
      const resistance = en.isBoss ? 0.25 : 1.0;
      en.knockVx += Math.cos(knockAngle) * knockForce * resistance;
      en.knockVy += Math.sin(knockAngle) * knockForce * resistance;
    }

    // Aggro immediately on hit
    if (en.state === "idle" || en.state === "patrol") {
      en.state = "chase";
    }

    addFloatingText(
      state,
      en.x + (Math.random() - 0.5) * 14,
      en.y - en.radius - 6,
      isCrit ? `CRIT ${dmg}!` : `-${dmg}`,
      isCrit ? "#fbbf24" : "#f8fafc",
      isCrit ? 1.25 : 1.0
    );
    spawnParticles(state, en.x, en.y, isCrit ? "#fbbf24" : "#fda4af", isCrit ? 9 : 5, 115, 0.28);

    if (isCrit) {
      state.camera.shake = Math.max(state.camera.shake, 4.5);
      state.hitStopTimer = 0.03;
      pushSfx(state, "crit");
    } else {
      state.camera.shake = Math.max(state.camera.shake, 2);
      pushSfx(state, "hit");
    }

    // Boss Phase 2 Trigger
    if (en.isBoss && en.alive && en.hp > 0 && en.phase === 1 && en.hp <= en.maxHp * 0.5) {
      en.phase = 2;
      state.camera.shake = 8;
      addFloatingText(state, en.x, en.y - 44, "CINDER RAGE!", "#fb923c", 1.35);
      spawnParticles(state, en.x, en.y, "#f97316", 22, 175, 0.55);
      if (!en.summonedAdds) {
        en.summonedAdds = true;
        for (const offset of [-85, 85]) {
          const pos = WORLD.resolveCircleWorldCollision(state.world, en.x + offset, en.y + 42, 14);
          const add = makeEnemy({
            id: `boss_add_${++entitySeq}`,
            kind: "spore_slime",
            zoneId: "sanctum",
            x: pos.x,
            y: pos.y,
            respawn: 9999
          });
          add.state = "chase";
          add.isSummon = true;
          state.enemies.push(add);
        }
      }
    }

    if (en.hp <= 0) {
      handleEnemyDeath(state, en);
    }
    return dmg;
  }

  function handleEnemyDeath(state, en) {
    en.alive = false;
    en.state = "dead";
    en.windupTarget = null;
    en.burnTimer = 0;
    en.respawnTimer = en.isSummon ? 999999 : en.respawnDuration;

    const def = DATA.ENEMIES[en.kind];
    spawnParticles(state, en.x, en.y, def.color, en.isBoss ? 28 : 14, en.isBoss ? 190 : 120, 0.45);
    pushSfx(state, "kill");

    state.player.statsCounters.slain += 1;
    const questTick = RPG.recordQuestKill(state.player, en.kind);

    // Grant EXP directly with crisp feedback
    const expRes = RPG.grantExp(state.player, def.exp);
    addFloatingText(state, en.x, en.y - 22, `+${def.exp} EXP`, "#38bdf8", 1.0);

    if (questTick) {
      const q = RPG.getActiveQuest(state.player);
      if (q && state.player.quest.progress >= q.targetCount) {
        addFloatingText(state, state.player.x, state.player.y - 46, "Quest Ready!", "#4ade80", 1.15);
      }
    }

    if (expRes.leveledUp) {
      triggerLevelUpVfx(state, expRes.newLevel);
    }

    // Spawn Gold Coin Drops
    const [minG, maxG] = def.goldRange;
    const totalGold = minG + Math.floor(Math.random() * (maxG - minG + 1));
    const coinStacks = en.isBoss ? 5 : (totalGold > 20 ? 3 : 2);
    let rem = totalGold;
    for (let i = 0; i < coinStacks; i += 1) {
      const amt = i === coinStacks - 1 ? rem : Math.max(1, Math.floor(rem / (coinStacks - i)));
      rem -= amt;
      const ang = Math.random() * Math.PI * 2;
      const spd = 65 + Math.random() * 55;
      state.pickups.push({
        id: `pk_${++entitySeq}`,
        kind: "gold",
        amount: amt,
        x: en.x,
        y: en.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        age: 0,
        ttl: 30
      });
    }

    // Roll Item Drops
    for (const drop of def.drops || []) {
      if (Math.random() <= drop.chance) {
        const ang = Math.random() * Math.PI * 2;
        state.pickups.push({
          id: `pk_${++entitySeq}`,
          kind: "item",
          itemId: drop.itemId,
          qty: 1,
          x: en.x,
          y: en.y,
          vx: Math.cos(ang) * 85,
          vy: Math.sin(ang) * 85,
          age: 0,
          ttl: 45
        });
      }
    }

    if (en.isBoss) {
      state.player.statsCounters.bossSlainCount += 1;
      if (!state.bossSlainVictoryShown) {
        state.bossSlainVictoryShown = true;
        state.mode = "victory";
      }
    }
  }

  function triggerLevelUpVfx(state, level) {
    pushSfx(state, "levelup");
    state.camera.shake = Math.max(state.camera.shake, 5);
    addFloatingText(state, state.player.x, state.player.y - 36, `LEVEL ${level}!`, "#fbbf24", 1.45);
    spawnParticles(state, state.player.x, state.player.y, "#fbbf24", 24, 165, 0.55);
  }

  function playerAttack(state) {
    if (state.mode !== "playing") return false;
    const p = state.player;
    if (p.attackCooldown > 0 || state.dashState.active) return false;

    const stats = RPG.computePlayerStats(p);
    const angle = findAutoAimAngle(state, 120, 1.45);
    p.facing = angle;

    const step = p.comboStep;
    const mult = step === 2 ? 1.38 : step === 1 ? 1.08 : 1.0;
    const cd = step === 2 ? 0.42 : 0.32;
    p.comboStep = (step + 1) % 3;
    p.comboResetTimer = 0.85;
    p.attackCooldown = cd;

    const reach = step === 2 ? 78 : 68;
    const arcHalf = step === 2 ? 1.32 : 1.15;
    const knock = step === 2 ? 200 : 120;

    state.slashes.push({
      x: p.x,
      y: p.y,
      angle,
      arcSpan: arcHalf * 2,
      radius: reach,
      color: step === 2 ? "#fbbf24" : "#e2e8f0",
      timer: 0.16,
      duration: 0.16
    });
    pushSfx(state, "slash");

    // Subtle forward lunge step
    const stepPos = WORLD.resolveCircleWorldCollision(
      state.world,
      p.x + Math.cos(angle) * 7,
      p.y + Math.sin(angle) * 7,
      PLAYER_RADIUS
    );
    p.x = stepPos.x;
    p.y = stepPos.y;

    for (const en of state.enemies) {
      if (!en.alive) continue;
      const dx = en.x - p.x;
      const dy = en.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > reach + en.radius) continue;
      const angTo = Math.atan2(dy, dx);
      if (dist < 28 || Math.abs(normalizeAngle(angTo - angle)) <= arcHalf) {
        damageEnemy(state, en, stats.atk * mult, step === 2 ? 10 : 0, knock, angTo);
      }
    }
    return true;
  }

  function castSkill(state, skillId) {
    if (state.mode !== "playing") return { ok: false, reason: "Not playing" };
    const p = state.player;
    const skill = DATA.SKILLS[skillId];
    if (!skill) return { ok: false, reason: "Unknown skill" };

    const rank = p.skillRanks[skillId] || 0;
    if (rank <= 0) return { ok: false, reason: `${skill.name} locked` };
    if ((p.skillCooldowns[skillId] || 0) > 0) return { ok: false, reason: "On cooldown" };

    const params = RPG.getSkillParams(skillId, rank);
    if (p.mp < params.mpCost) {
      addFloatingText(state, p.x, p.y - 26, "Low MP!", "#60a5fa", 0.95);
      return { ok: false, reason: "Not enough MP" };
    }

    p.mp -= params.mpCost;
    p.skillCooldowns[skillId] = params.cooldown;
    const stats = RPG.computePlayerStats(p);

    if (skillId === "cleave_arc") {
      const ang = findAutoAimAngle(state, 130, 1.6);
      p.facing = ang;
      state.slashes.push({
        x: p.x,
        y: p.y,
        angle: ang,
        arcSpan: 2.55,
        radius: params.radius,
        color: "#f59e0b",
        timer: 0.24,
        duration: 0.24
      });
      spawnParticles(state, p.x + Math.cos(ang) * 32, p.y + Math.sin(ang) * 32, "#fbbf24", 12, 140, 0.30);
      pushSfx(state, "cleave");
      state.camera.shake = Math.max(state.camera.shake, 4);

      for (const en of state.enemies) {
        if (!en.alive) continue;
        const dx = en.x - p.x;
        const dy = en.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > params.radius + en.radius) continue;
        const angTo = Math.atan2(dy, dx);
        if (dist < 32 || Math.abs(normalizeAngle(angTo - ang)) <= 1.28) {
          damageEnemy(state, en, stats.atk * params.mult, params.critBonus, params.knockback, angTo);
        }
      }
      return { ok: true };
    }

    if (skillId === "dash_strike") {
      const ang = findAutoAimAngle(state, 175, 1.4);
      p.facing = ang;
      const dur = 0.20;
      const spd = params.dashDist / dur;
      state.dashState = {
        active: true,
        timer: dur,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        hitIds: new Set(),
        mult: params.mult,
        hitRadius: params.hitRadius
      };
      p.invulnTimer = Math.max(p.invulnTimer, params.invuln);
      pushSfx(state, "dash");
      spawnParticles(state, p.x, p.y, "#38bdf8", 10, 110, 0.28);
      return { ok: true };
    }

    if (skillId === "sunfire_bolt") {
      const ang = findAutoAimAngle(state, 310, 1.7);
      p.facing = ang;
      state.projectiles.push({
        id: `pr_${++entitySeq}`,
        owner: "player",
        kind: "sunfire",
        x: p.x + Math.cos(ang) * 18,
        y: p.y + Math.sin(ang) * 18,
        vx: Math.cos(ang) * params.projSpeed,
        vy: Math.sin(ang) * params.projSpeed,
        radius: 10,
        aoeRadius: params.aoeRadius,
        damage: stats.atk * params.mult,
        burnDps: stats.atk * params.burnDpsMult,
        burnDuration: params.burnDuration,
        color: "#fb7185",
        ttl: 1.0
      });
      pushSfx(state, "fire");
      return { ok: true };
    }

    if (skillId === "sentinel_aegis") {
      const prevHp = p.hp;
      const healAmount = Math.round(stats.maxHp * params.healPct);
      p.hp = Math.min(stats.maxHp, p.hp + healAmount);
      const gained = Math.round(p.hp - prevHp);
      p.buffs.aegisTimer = params.shieldDuration;

      state.slashes.push({
        x: p.x,
        y: p.y,
        angle: 0,
        arcSpan: Math.PI * 2,
        radius: params.radius,
        color: "#4ade80",
        timer: 0.26,
        duration: 0.26
      });
      addFloatingText(state, p.x, p.y - 28, gained > 0 ? `+${gained} HP +DEF!` : "AEGIS SHIELD!", "#4ade80", 1.15);
      spawnParticles(state, p.x, p.y, "#4ade80", 16, 130, 0.42);
      pushSfx(state, "heal");

      for (const en of state.enemies) {
        if (!en.alive) continue;
        const dx = en.x - p.x;
        const dy = en.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= params.radius + en.radius) {
          damageEnemy(state, en, stats.atk * params.mult, 0, 230, Math.atan2(dy, dx));
        }
      }
      return { ok: true };
    }

    return { ok: false, reason: "Unhandled skill" };
  }

  function useQuickPotion(state) {
    if (state.mode !== "playing") return { ok: false };
    const p = state.player;
    if (p.potionCooldown > 0) return { ok: false, reason: "Cooldown" };

    const rawOrder = [p.quickSlotId || "hp_potion", "hp_potion", "greater_hp", "elixir"];
    const candidates = rawOrder.filter((id, i) => rawOrder.indexOf(id) === i && RPG.getItemCount(p, id) > 0);
    if (candidates.length === 0) {
      addFloatingText(state, p.x, p.y - 26, "No Potions!", "#f87171", 0.9);
      return { ok: false, reason: "No potions" };
    }

    const stats = RPG.computePlayerStats(p);
    if (p.hp >= stats.maxHp) {
      addFloatingText(state, p.x, p.y - 26, "HP is already full", "#94a3b8", 0.85);
      return { ok: false, reason: "HP is already full" };
    }

    let res = null;
    for (const id of candidates) {
      res = RPG.useConsumable(p, id);
      if (res.ok) break;
    }
    if (!res || !res.ok) {
      addFloatingText(state, p.x, p.y - 26, (res && res.reason) || "Cannot use", "#94a3b8", 0.85);
      return res || { ok: false };
    }
    p.potionCooldown = 1.0;
    if (res.healedHp > 0) {
      addFloatingText(state, p.x, p.y - 26, `+${res.healedHp} HP`, "#4ade80", 1.1);
    }
    if (res.healedMp > 0) {
      addFloatingText(state, p.x, p.y - 40, `+${res.healedMp} MP`, "#60a5fa", 1.0);
    }
    spawnParticles(state, p.x, p.y, "#4ade80", 12, 95, 0.35);
    pushSfx(state, "heal");
    return res;
  }

  function interact(state) {
    const found = WORLD.findNearestInteractable(state.world, state.player, state.chests);
    if (!found) return { type: "none" };

    if (found.type === "shop_npc") {
      return { type: "shop", npc: found.target };
    }
    if (found.type === "quest_npc") {
      return { type: "quest", npc: found.target };
    }
    if (found.type === "campfire") {
      const stats = RPG.computePlayerStats(state.player);
      state.player.hp = stats.maxHp;
      state.player.mp = stats.maxMp;
      addFloatingText(state, state.player.x, state.player.y - 30, "Restored & Saved!", "#fbbf24", 1.15);
      spawnParticles(state, found.target.x, found.target.y, "#fbbf24", 16, 80, 0.5);
      pushSfx(state, "heal");
      return { type: "healed", npc: found.target };
    }
    if (found.type === "chest") {
      const chest = found.target;
      chest.opened = true;
      state.player.statsCounters.chestsOpened += 1;
      RPG.grantGold(state.player, chest.gold);
      const gainedNames = [];
      for (const it of chest.items) {
        RPG.addItem(state.player, it.itemId, it.qty);
        const item = DATA.ITEMS[it.itemId];
        if (item) gainedNames.push(it.qty > 1 ? `${item.name} x${it.qty}` : item.name);
      }
      addFloatingText(state, chest.x, chest.y - 24, `+${chest.gold}g!`, "#fbbf24", 1.25);
      if (gainedNames.length > 0) {
        addFloatingText(state, chest.x, chest.y - 44, gainedNames[0], "#38bdf8", 1.0);
      }
      spawnParticles(state, chest.x, chest.y, "#fbbf24", 18, 130, 0.45);
      pushSfx(state, "chest");
      return { type: "chest", chest, gainedNames };
    }
    return { type: "none" };
  }

  function damagePlayer(state, rawDmg, knockAngle, knockDist) {
    const p = state.player;
    if (p.invulnTimer > 0 || state.mode !== "playing") return 0;

    const stats = RPG.computePlayerStats(p);
    const dmg = Math.max(1, Math.round(rawDmg - stats.def * 0.65));
    p.hp = Math.max(0, p.hp - dmg);
    p.invulnTimer = 0.42;
    state.regenDelayTimer = 4.0;
    state.camera.shake = Math.max(state.camera.shake, 5.5);

    if (knockDist > 0) {
      const pushed = WORLD.resolveCircleWorldCollision(
        state.world,
        p.x + Math.cos(knockAngle) * knockDist,
        p.y + Math.sin(knockAngle) * knockDist,
        PLAYER_RADIUS
      );
      p.x = pushed.x;
      p.y = pushed.y;
    }

    addFloatingText(state, p.x, p.y - 24, `-${dmg}`, "#ef4444", 1.15);
    spawnParticles(state, p.x, p.y, "#ef4444", 8, 100, 0.28);
    pushSfx(state, "hurt");

    if (p.hp <= 0) {
      state.mode = "gameover";
    }
    return dmg;
  }

  function respawnAtVillage(state) {
    const p = state.player;
    const stats = RPG.computePlayerStats(p);
    p.hp = stats.maxHp;
    p.mp = stats.maxMp;
    p.x = 11 * WORLD.TILE_SIZE + 22;
    p.y = 45 * WORLD.TILE_SIZE + 22;
    p.invulnTimer = 1.0;
    state.projectiles = [];
    state.telegraphs = [];
    state.dashState.active = false;
    state.enemies = state.enemies.filter((en) => !en.isSummon);
    for (const en of state.enemies) {
      if (en.alive) {
        en.x = en.spawnX;
        en.y = en.spawnY;
        en.hp = en.maxHp;
        en.state = "patrol";
        en.windupTarget = null;
        en.burnTimer = 0;
        en.burnAccum = 0;
        en.knockVx = 0;
        en.knockVy = 0;
        if (en.isBoss) {
          en.phase = 1;
          en.summonedAdds = false;
        }
      }
    }
    state.mode = "playing";
    state.camera.x = p.x;
    state.camera.y = p.y;
    addFloatingText(state, p.x, p.y - 28, "Returned to Village", "#4ade80", 1.05);
  }

  function update(state, dt, moveInput) {
    if (state.mode !== "playing") return;

    if (state.hitStopTimer > 0) {
      state.hitStopTimer = Math.max(0, state.hitStopTimer - dt);
      return;
    }

    const p = state.player;
    const stats = RPG.computePlayerStats(p);
    const currentZone = WORLD.getZoneAt(state.world, p.x, p.y);

    // Zone Banner Trigger
    if (currentZone.id !== state.lastZoneId) {
      state.lastZoneId = currentZone.id;
      state.zoneBanner = {
        name: currentZone.name,
        subtitle: currentZone.subtitle,
        color: currentZone.color,
        timer: 2.3
      };
    }
    if (state.zoneBanner) {
      state.zoneBanner.timer -= dt;
      if (state.zoneBanner.timer <= 0) state.zoneBanner = null;
    }

    // Timers & cooldowns
    if (p.attackCooldown > 0) p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    if (p.comboResetTimer > 0) {
      p.comboResetTimer -= dt;
      if (p.comboResetTimer <= 0) p.comboStep = 0;
    }
    if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
    if (p.potionCooldown > 0) p.potionCooldown = Math.max(0, p.potionCooldown - dt);
    if (state.regenDelayTimer > 0) state.regenDelayTimer = Math.max(0, state.regenDelayTimer - dt);
    if (p.buffs.berserkTimer > 0) p.buffs.berserkTimer = Math.max(0, p.buffs.berserkTimer - dt);
    if (p.buffs.aegisTimer > 0) p.buffs.aegisTimer = Math.max(0, p.buffs.aegisTimer - dt);

    for (const key of DATA.SKILL_ORDER) {
      if ((p.skillCooldowns[key] || 0) > 0) {
        p.skillCooldowns[key] = Math.max(0, p.skillCooldowns[key] - dt);
      }
    }

    // Regen MP (faster in village) and HP in safe village / out of combat
    const mpRate = currentZone.safe ? 8.0 : 2.5;
    p.mp = Math.min(stats.maxMp, p.mp + mpRate * dt);
    if (currentZone.safe) {
      p.hp = Math.min(stats.maxHp, p.hp + 10.0 * dt);
    } else if (state.regenDelayTimer <= 0) {
      p.hp = Math.min(stats.maxHp, p.hp + 1.4 * dt);
    }

    // Player Movement or Dash Strike
    if (state.dashState.active) {
      state.dashState.timer -= dt;
      const next = WORLD.resolveCircleWorldCollision(
        state.world,
        p.x + state.dashState.vx * dt,
        p.y + state.dashState.vy * dt,
        PLAYER_RADIUS
      );
      p.x = next.x;
      p.y = next.y;
      if (Math.random() < 0.7) {
        spawnParticles(state, p.x, p.y, "#38bdf8", 1, 35, 0.2);
      }
      for (const en of state.enemies) {
        if (!en.alive || state.dashState.hitIds.has(en.id)) continue;
        if (Math.hypot(en.x - p.x, en.y - p.y) <= en.radius + state.dashState.hitRadius) {
          state.dashState.hitIds.add(en.id);
          const ang = Math.atan2(en.y - p.y, en.x - p.x);
          damageEnemy(state, en, stats.atk * state.dashState.mult, 12, 160, ang);
        }
      }
      if (state.dashState.timer <= 0) {
        state.dashState.active = false;
      }
    } else if (moveInput && (Math.abs(moveInput.x) > 0.01 || Math.abs(moveInput.y) > 0.01)) {
      const mag = Math.min(1, Math.hypot(moveInput.x, moveInput.y));
      const nx = moveInput.x / Math.max(1, Math.hypot(moveInput.x, moveInput.y));
      const ny = moveInput.y / Math.max(1, Math.hypot(moveInput.x, moveInput.y));
      const next = WORLD.resolveCircleWorldCollision(
        state.world,
        p.x + nx * stats.spd * mag * dt,
        p.y + ny * stats.spd * mag * dt,
        PLAYER_RADIUS
      );
      p.x = next.x;
      p.y = next.y;
      p.facing = Math.atan2(ny, nx);
    }

    // Update Pickups (bounce + magnet pull + collect)
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const pk = state.pickups[i];
      pk.age += dt;
      pk.ttl -= dt;
      if (pk.ttl <= 0) {
        state.pickups.splice(i, 1);
        continue;
      }
      pk.x += pk.vx * dt;
      pk.y += pk.vy * dt;
      pk.vx *= Math.pow(0.05, dt);
      pk.vy *= Math.pow(0.05, dt);

      const dx = p.x - pk.x;
      const dy = p.y - pk.y;
      const dist = Math.hypot(dx, dy);
      if (pk.age > 0.18 && dist < 115 && dist > 1) {
        const pull = 280 * (1 - dist / 140) + 120;
        pk.x += (dx / dist) * pull * dt;
        pk.y += (dy / dist) * pull * dt;
      }

      if (dist <= 22 && pk.age > 0.12) {
        if (pk.kind === "gold") {
          RPG.grantGold(p, pk.amount);
          addFloatingText(state, p.x, p.y - 26, `+${pk.amount}g`, "#fbbf24", 0.95);
          pushSfx(state, "coin");
        } else if (pk.kind === "item") {
          RPG.addItem(p, pk.itemId, pk.qty || 1);
          const item = DATA.ITEMS[pk.itemId];
          const rarity = item ? DATA.RARITIES[item.rarity] : DATA.RARITIES.common;
          addFloatingText(state, p.x, p.y - 34, `+${item ? item.name : "Item"}`, rarity.color, 1.0);
          pushSfx(state, "chest");
        }
        state.pickups.splice(i, 1);
      }
    }

    // Update Enemies
    state.telegraphs = [];
    for (let idx = state.enemies.length - 1; idx >= 0; idx -= 1) {
      const en = state.enemies[idx];
      if (!en.alive) {
        if (en.isSummon) {
          state.enemies.splice(idx, 1);
          continue;
        }
        en.respawnTimer -= dt;
        if (en.respawnTimer <= 0) {
          const def = DATA.ENEMIES[en.kind];
          en.alive = true;
          en.hp = def.maxHp;
          en.x = en.spawnX;
          en.y = en.spawnY;
          en.state = "patrol";
          en.phase = 1;
          en.summonedAdds = false;
          en.burnTimer = 0;
          en.burnAccum = 0;
          en.knockVx = 0;
          en.knockVy = 0;
          if (en.isBoss) {
            state.enemies = state.enemies.filter((other) => !other.isSummon);
            idx = state.enemies.indexOf(en);
          }
        }
        continue;
      }

      const def = DATA.ENEMIES[en.kind];
      if (en.hitFlashTimer > 0) en.hitFlashTimer = Math.max(0, en.hitFlashTimer - dt);
      if (en.attackCdTimer > 0) en.attackCdTimer = Math.max(0, en.attackCdTimer - dt);

      // Burn DoT
      if (en.burnTimer > 0) {
        en.burnTimer -= dt;
        en.burnAccum += en.burnDps * dt;
        if (en.burnAccum >= 1) {
          const tick = Math.floor(en.burnAccum);
          en.burnAccum -= tick;
          en.hp = Math.max(0, en.hp - tick);
          addFloatingText(state, en.x, en.y - en.radius, `-${tick}`, "#fb923c", 0.8);
          if (Math.random() < 0.35) spawnParticles(state, en.x, en.y, "#fb923c", 2, 45, 0.2);
          if (en.hp <= 0) {
            handleEnemyDeath(state, en);
            continue;
          }
        }
      }

      // Knockback velocity decay
      if (Math.abs(en.knockVx) > 1 || Math.abs(en.knockVy) > 1) {
        const res = WORLD.resolveCircleWorldCollision(
          state.world,
          en.x + en.knockVx * dt,
          en.y + en.knockVy * dt,
          en.radius
        );
        en.x = res.x;
        en.y = res.y;
        en.knockVx *= Math.pow(0.002, dt);
        en.knockVy *= Math.pow(0.002, dt);
      }

      const dxToP = p.x - en.x;
      const dyToP = p.y - en.y;
      const distToP = Math.hypot(dxToP, dyToP);
      const distFromSpawn = Math.hypot(en.x - en.spawnX, en.y - en.spawnY);
      const playerSafe = currentZone.safe;

      // Return to spawn if leashed or player retreated to village
      if (en.state !== "windup" && (distFromSpawn > def.leashRange || (playerSafe && distToP > def.aggroRange))) {
        en.state = "return";
      }

      if (en.state === "return") {
        const dxS = en.spawnX - en.x;
        const dyS = en.spawnY - en.y;
        const ds = Math.hypot(dxS, dyS);
        en.hp = Math.min(en.maxHp, en.hp + 15 * dt);
        if (ds < 14) {
          en.state = "patrol";
          en.stateTimer = 1.0;
        } else {
          const mv = WORLD.resolveCircleWorldCollision(
            state.world,
            en.x + (dxS / ds) * en.speed * 1.15 * dt,
            en.y + (dyS / ds) * en.speed * 1.15 * dt,
            en.radius
          );
          en.x = mv.x;
          en.y = mv.y;
          en.facing = Math.atan2(dyS, dxS);
        }
        continue;
      }

      if (en.state === "idle" || en.state === "patrol") {
        if (!playerSafe && distToP <= def.aggroRange && WORLD.hasLineOfSight(state.world, en.x, en.y, p.x, p.y)) {
          en.state = "chase";
        } else {
          en.stateTimer -= dt;
          if (en.state === "patrol") {
            const mv = WORLD.resolveCircleWorldCollision(
              state.world,
              en.x + Math.cos(en.patrolAngle) * en.speed * 0.42 * dt,
              en.y + Math.sin(en.patrolAngle) * en.speed * 0.42 * dt,
              en.radius
            );
            en.x = mv.x;
            en.y = mv.y;
            en.facing = en.patrolAngle;
            if (distFromSpawn > 75) {
              en.patrolAngle = Math.atan2(en.spawnY - en.y, en.spawnX - en.x);
            }
          }
          if (en.stateTimer <= 0) {
            if (en.state === "idle") {
              en.state = "patrol";
              en.stateTimer = 1.1 + Math.random() * 1.4;
              en.patrolAngle = Math.random() * Math.PI * 2;
            } else {
              en.state = "idle";
              en.stateTimer = 0.8 + Math.random() * 1.3;
            }
          }
        }
        continue;
      }

      if (en.state === "chase") {
        const ang = Math.atan2(dyToP, dxToP);
        en.facing = ang;

        const los = WORLD.hasLineOfSight(state.world, en.x, en.y, p.x, p.y);
        const speedMult = en.isBoss && en.phase === 2 ? 1.24 : 1.0;

        if (def.ranged) {
          if (distToP <= def.attackRange && los && en.attackCdTimer <= 0) {
            beginEnemyWindup(state, en, def);
          } else {
            let moveDir = 0;
            if (distToP > def.preferredDist + 20 || !los) moveDir = 1;
            else if (distToP < def.preferredDist - 35) moveDir = -0.8;
            if (moveDir !== 0) {
              const mv = WORLD.resolveCircleWorldCollision(
                state.world,
                en.x + Math.cos(ang) * en.speed * moveDir * dt,
                en.y + Math.sin(ang) * en.speed * moveDir * dt,
                en.radius
              );
              en.x = mv.x;
              en.y = mv.y;
            }
          }
        } else {
          if (distToP <= def.attackRange && en.attackCdTimer <= 0) {
            beginEnemyWindup(state, en, def);
          } else if (distToP > en.radius + PLAYER_RADIUS + 4) {
            const mv = WORLD.resolveCircleWorldCollision(
              state.world,
              en.x + Math.cos(ang) * en.speed * speedMult * dt,
              en.y + Math.sin(ang) * en.speed * speedMult * dt,
              en.radius
            );
            en.x = mv.x;
            en.y = mv.y;
          }
        }
        continue;
      }

      if (en.state === "windup") {
        en.stateTimer -= dt;
        if (en.windupTarget) {
          const dur = en.windupTarget.duration;
          const progress = Math.min(1, 1 - en.stateTimer / dur);
          state.telegraphs.push({
            ...en.windupTarget,
            progress
          });
        }
        if (en.stateTimer <= 0) {
          executeEnemyAttack(state, en, def);
        }
      }
    }

    // Update Projectiles
    for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
      const pr = state.projectiles[i];
      pr.ttl -= dt;
      if (pr.ttl <= 0) {
        if (pr.kind === "sunfire") detonateSunfire(state, pr);
        state.projectiles.splice(i, 1);
        continue;
      }

      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;

      // Wall impact check
      const col = Math.floor(pr.x / state.world.tileSize);
      const row = Math.floor(pr.y / state.world.tileSize);
      const tile = WORLD.getTileAt(state.world, col, row);
      if (tile >= WORLD.TILE.TREE) {
        if (pr.kind === "sunfire") detonateSunfire(state, pr);
        else spawnParticles(state, pr.x, pr.y, pr.color, 5, 70, 0.2);
        state.projectiles.splice(i, 1);
        continue;
      }

      if (pr.owner === "player") {
        let hit = false;
        for (const en of state.enemies) {
          if (!en.alive) continue;
          if (Math.hypot(en.x - pr.x, en.y - pr.y) <= en.radius + pr.radius) {
            hit = true;
            break;
          }
        }
        if (hit) {
          detonateSunfire(state, pr);
          state.projectiles.splice(i, 1);
        }
      } else {
        // Enemy projectile vs Player
        if (Math.hypot(p.x - pr.x, p.y - pr.y) <= PLAYER_RADIUS + pr.radius) {
          damagePlayer(state, pr.damage, Math.atan2(pr.vy, pr.vx), 10);
          spawnParticles(state, pr.x, pr.y, pr.color, 6, 80, 0.22);
          state.projectiles.splice(i, 1);
        }
      }
    }

    // Update Slashes, Particles, Floating Texts, Camera
    for (let i = state.slashes.length - 1; i >= 0; i -= 1) {
      state.slashes[i].timer -= dt;
      if (state.slashes[i].timer <= 0) state.slashes.splice(i, 1);
    }
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.timer -= dt;
      if (pt.timer <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floatingTexts.length - 1; i >= 0; i -= 1) {
      const ft = state.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.vy *= Math.pow(0.25, dt);
      ft.timer -= dt;
      if (ft.timer <= 0) state.floatingTexts.splice(i, 1);
    }

    // Smooth camera follow + shake decay
    const lerp = 1 - Math.pow(0.0008, dt);
    state.camera.x += (p.x - state.camera.x) * lerp;
    state.camera.y += (p.y - state.camera.y) * lerp;
    state.camera.shake = Math.max(0, state.camera.shake - 18 * dt);
  }

  function beginEnemyWindup(state, en, def) {
    const p = state.player;
    const ang = Math.atan2(p.y - en.y, p.x - en.x);
    en.facing = ang;
    const dur = en.isBoss && en.phase === 2 ? def.windupDuration * 0.78 : def.windupDuration;
    en.state = "windup";
    en.stateTimer = dur;

    if (def.ranged) {
      en.windupTarget = {
        kind: "line",
        x: en.x,
        y: en.y,
        angle: ang,
        length: def.attackRange,
        radius: 14,
        duration: dur,
        color: "#f87171"
      };
    } else if (en.isBoss) {
      en.bossAttackIndex = (en.bossAttackIndex + 1) % 2;
      if (en.bossAttackIndex === 0) {
        en.windupTarget = {
          kind: "circle",
          x: en.x,
          y: en.y,
          radius: def.hitRadius,
          duration: dur,
          color: "#f97316",
          bossPattern: "slam"
        };
      } else {
        en.windupTarget = {
          kind: "line",
          x: en.x,
          y: en.y,
          angle: ang,
          length: 230,
          radius: 18,
          duration: dur,
          color: "#fb923c",
          bossPattern: "fan"
        };
      }
    } else {
      en.windupTarget = {
        kind: "circle",
        x: def.slamAoE ? en.x : en.x + Math.cos(ang) * 20,
        y: def.slamAoE ? en.y : en.y + Math.sin(ang) * 20,
        radius: def.hitRadius,
        duration: dur,
        color: def.slamAoE ? "#f59e0b" : "#ef4444"
      };
    }
  }

  function executeEnemyAttack(state, en, def) {
    const p = state.player;
    const target = en.windupTarget;
    en.windupTarget = null;
    en.state = "chase";
    en.attackCdTimer = en.isBoss && en.phase === 2 ? def.attackCooldown * 0.72 : def.attackCooldown;

    if (!target) return;

    if (def.ranged) {
      state.projectiles.push({
        id: `pr_${++entitySeq}`,
        owner: "enemy",
        kind: "bone_bolt",
        x: en.x + Math.cos(target.angle) * 14,
        y: en.y + Math.sin(target.angle) * 14,
        vx: Math.cos(target.angle) * def.projectileSpeed,
        vy: Math.sin(target.angle) * def.projectileSpeed,
        radius: 6,
        damage: def.atk,
        color: "#e2e8f0",
        ttl: 1.15
      });
      return;
    }

    if (en.isBoss && target.bossPattern === "fan") {
      const count = en.phase === 2 ? 5 : 3;
      const spread = 0.34;
      const start = target.angle - spread * ((count - 1) / 2);
      for (let i = 0; i < count; i += 1) {
        const a = start + i * spread;
        state.projectiles.push({
          id: `pr_${++entitySeq}`,
          owner: "enemy",
          kind: "cinder_orb",
          x: en.x + Math.cos(a) * 24,
          y: en.y + Math.sin(a) * 24,
          vx: Math.cos(a) * 245,
          vy: Math.sin(a) * 245,
          radius: 9,
          damage: def.atk * 0.9,
          color: "#fb923c",
          ttl: 1.35
        });
      }
      spawnParticles(state, en.x, en.y, "#fb923c", 10, 120, 0.3);
      return;
    }

    // Melee / Slam circle strike
    spawnParticles(state, target.x, target.y, target.color, 10, 115, 0.28);
    const dist = Math.hypot(p.x - target.x, p.y - target.y);
    if (dist <= target.radius + PLAYER_RADIUS * 0.65) {
      const ang = Math.atan2(p.y - target.y, p.x - target.x);
      damagePlayer(state, def.atk * (en.isBoss ? 1.15 : 1.0), ang, def.slamAoE ? 18 : 12);
    }
  }

  function detonateSunfire(state, pr) {
    spawnParticles(state, pr.x, pr.y, "#f97316", 18, 155, 0.38);
    state.slashes.push({
      x: pr.x,
      y: pr.y,
      angle: 0,
      arcSpan: Math.PI * 2,
      radius: pr.aoeRadius,
      color: "#fb7185",
      timer: 0.22,
      duration: 0.22
    });
    state.camera.shake = Math.max(state.camera.shake, 3.5);
    for (const en of state.enemies) {
      if (!en.alive) continue;
      const dx = en.x - pr.x;
      const dy = en.y - pr.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= pr.aoeRadius + en.radius) {
        damageEnemy(state, en, pr.damage, 8, 125, Math.atan2(dy, dx));
        if (en.alive) {
          en.burnTimer = Math.max(en.burnTimer, pr.burnDuration);
          en.burnDps = Math.max(en.burnDps, pr.burnDps);
        }
      }
    }
  }

  function getActiveBoss(state) {
    const boss = state.enemies.find((en) => en.isBoss && en.alive);
    if (!boss) return null;
    const zone = WORLD.getZoneAt(state.world, state.player.x, state.player.y);
    const dist = Math.hypot(state.player.x - boss.x, state.player.y - boss.y);
    if (zone.id === "sanctum" || dist < 440 || boss.hp < boss.maxHp) {
      return boss;
    }
    return null;
  }

  return {
    PLAYER_RADIUS,
    createGameState,
    playerAttack,
    castSkill,
    useQuickPotion,
    interact,
    update,
    respawnAtVillage,
    getActiveBoss,
    findAutoAimAngle
  };
});
