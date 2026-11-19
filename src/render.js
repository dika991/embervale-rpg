(function (root, factory) {
  const DATA = root.Embervale && root.Embervale.DATA;
  const WORLD = root.Embervale && root.Embervale.WORLD;
  const RPG = root.Embervale && root.Embervale.RPG;
  let ICONS = root.Embervale && root.Embervale.ICONS;
  if (!ICONS && typeof require === "function") {
    try {
      ICONS = require("./icons.js");
    } catch {}
  }
  const api = factory(DATA, WORLD, RPG, ICONS);
  root.Embervale = root.Embervale || {};
  root.Embervale.RENDER = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (DATA, WORLD, RPG, ICONS) {
  "use strict";

  let minimapCanvas = null;

  function ensureMinimapCanvas(world) {
    if (minimapCanvas) return minimapCanvas;
    minimapCanvas = document.createElement("canvas");
    minimapCanvas.width = world.cols;
    minimapCanvas.height = world.rows;
    const mctx = minimapCanvas.getContext("2d");
    const TILE = WORLD.TILE;

    for (let r = 0; r < world.rows; r += 1) {
      for (let c = 0; c < world.cols; c += 1) {
        const t = world.tiles[r * world.cols + c];
        if (t === TILE.WATER) mctx.fillStyle = "#1d4ed8";
        else if (t === TILE.TREE) mctx.fillStyle = "#163322";
        else if (t === TILE.STONE_WALL || t === TILE.PILLAR) mctx.fillStyle = "#475569";
        else if (t === TILE.PATH || t === TILE.BRIDGE) mctx.fillStyle = "#a3835a";
        else if (t === TILE.TOWN_GROUND) mctx.fillStyle = "#646170";
        else if (t === TILE.RUIN_FLOOR) mctx.fillStyle = "#3a4556";
        else if (t === TILE.SANCTUM_FLOOR) mctx.fillStyle = "#452328";
        else mctx.fillStyle = "#2b5839";
        mctx.fillRect(c, r, 1, 1);
      }
    }
    return minimapCanvas;
  }

  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { cssW: rect.width, cssH: rect.height, dpr };
  }

  function getCameraTransform(cssW, cssH, world, cam) {
    // Portrait phones keep ~385 logical world px wide for clear action visibility
    const scale = cssW < 768
      ? Math.max(0.86, Math.min(1.22, cssW / 385))
      : Math.max(0.95, Math.min(1.28, Math.min(cssW / 760, cssH / 540)));

    const viewW = cssW / scale;
    const viewH = cssH / scale;
    const shakeX = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake * 2 : 0;
    const shakeY = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake * 2 : 0;

    let camX = cam.x - viewW * 0.5;
    let camY = cam.y - viewH * 0.5;
    camX = Math.max(0, Math.min(Math.max(0, world.width - viewW), camX)) + shakeX;
    camY = Math.max(0, Math.min(Math.max(0, world.height - viewH), camY)) + shakeY;

    return { scale, viewW, viewH, camX, camY };
  }

  function renderFrame(canvas, state, time = 0) {
    time = Number.isFinite(time) ? time : 0;
    const { cssW, cssH, dpr } = resizeCanvas(canvas);
    const ctx = canvas.getContext("2d");
    const world = state.world;
    const ts = world.tileSize;
    const TILE = WORLD.TILE;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#0b0f17";
    ctx.fillRect(0, 0, cssW, cssH);

    const view = getCameraTransform(cssW, cssH, world, state.camera);
    ctx.save();
    ctx.scale(view.scale, view.scale);
    ctx.translate(-view.camX, -view.camY);

    const startCol = Math.max(0, Math.floor(view.camX / ts) - 1);
    const endCol = Math.min(world.cols - 1, Math.ceil((view.camX + view.viewW) / ts) + 1);
    const startRow = Math.max(0, Math.floor(view.camY / ts) - 1);
    const endRow = Math.min(world.rows - 1, Math.ceil((view.camY + view.viewH) / ts) + 1);

    // 1. Ground Tiles Pass
    ctx.save();
    for (let r = startRow; r <= endRow; r += 1) {
      for (let c = startCol; c <= endCol; c += 1) {
        drawTerrainTile(ctx, world, c, r, ts, time);
      }
    }

    // The ritual marks are worn into the stone, below all combat indicators.
    const bossSpawn = world.enemySpawns.find((s) => s.kind === "cinder_warden");
    if (bossSpawn && bossSpawn.x + 130 > view.camX && bossSpawn.x - 130 < view.camX + view.viewW &&
        bossSpawn.y + 130 > view.camY && bossSpawn.y - 130 < view.camY + view.viewH) {
      drawRitualFloor(ctx, bossSpawn.x, bossSpawn.y);
    }
    ctx.restore();

    // 2. Windup Telegraphs (ground indicators)
    for (const tel of state.telegraphs) {
      ctx.save();
      if (tel.kind === "circle") {
        ctx.fillStyle = `${tel.color}22`;
        ctx.beginPath();
        ctx.arc(tel.x, tel.y, tel.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `${tel.color}44`;
        ctx.beginPath();
        ctx.arc(tel.x, tel.y, tel.radius * tel.progress, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = tel.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tel.x, tel.y, tel.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tel.kind === "line") {
        ctx.translate(tel.x, tel.y);
        ctx.rotate(tel.angle);
        ctx.fillStyle = `${tel.color}28`;
        ctx.fillRect(0, -tel.radius * 0.5, tel.length, tel.radius);
        ctx.strokeStyle = `${tel.color}aa`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(tel.length * tel.progress, 0);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Chests & Pickups
    for (const chest of state.chests) {
      if (chest.x < view.camX - 40 || chest.x > view.camX + view.viewW + 40 ||
          chest.y < view.camY - 40 || chest.y > view.camY + view.viewH + 40) continue;
      drawChest(ctx, chest, time);
    }

    for (const pk of state.pickups) {
      drawPickup(ctx, pk, time);
    }

    // 4. Y-Sorted Obstacles + Entities (Trees, Walls, Pillars, NPCs, Enemies, Hero)
    const drawList = [];

    for (let r = startRow; r <= endRow; r += 1) {
      for (let c = startCol; c <= endCol; c += 1) {
        const t = world.tiles[r * world.cols + c];
        if (t >= TILE.TREE) {
          const x = c * ts;
          const y = r * ts;
          drawList.push({
            sortY: y + ts,
            draw: () => drawObstacleTile(ctx, t, x, y, ts, terrainSeed(c, r), world.zoneIds[r * world.cols + c])
          });
        }
      }
    }

    for (const npc of world.npcs) {
      drawList.push({
        sortY: npc.y + npc.radius,
        draw: () => drawNpc(ctx, npc, state.player, time)
      });
    }

    for (const en of state.enemies) {
      if (!en.alive) continue;
      drawList.push({
        sortY: en.y + en.radius,
        draw: () => drawEnemy(ctx, en, time)
      });
    }

    drawList.push({
      sortY: state.player.y + 14,
      draw: () => drawPlayer(ctx, state, time)
    });

    drawList.sort((a, b) => a.sortY - b.sortY);
    for (const entry of drawList) {
      entry.draw();
    }

    // 5. Projectiles, Slash Arcs, Particles, Floating Texts
    for (const pr of state.projectiles) {
      ctx.save();
      ctx.fillStyle = pr.color;
      ctx.shadowColor = pr.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff7ed";
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const sl of state.slashes) {
      const alpha = Math.max(0, sl.timer / sl.duration);
      ctx.save();
      ctx.translate(sl.x, sl.y);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = sl.color;
      ctx.lineWidth = sl.arcSpan > 5 ? 6 : 11 * alpha + 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, sl.radius * (sl.arcSpan > 5 ? 1.05 - alpha * 0.2 : 0.88), sl.angle - sl.arcSpan * 0.5, sl.angle + sl.arcSpan * 0.5);
      ctx.stroke();
      ctx.restore();
    }

    for (const pt of state.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.timer / pt.maxTimer);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const ft of state.floatingTexts) {
      const alpha = Math.min(1, (ft.timer / ft.maxTimer) * 1.4);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = `900 ${Math.round(13 * ft.scale)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(8, 12, 20, 0.9)";
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();

    ctx.restore(); // camera transform

    // 6. Mini-Map in top-right below HUD
    drawMinimap(ctx, cssW, cssH, state);

    ctx.restore();
  }

  function terrainSeed(c, r) {
    const n = Math.imul(c + 13, 374761393) ^ Math.imul(r + 19, 668265263);
    return (Math.imul(n ^ (n >>> 13), 1274126177) >>> 0) / 4294967296;
  }

  const groundPalettes = {
    village: ["#55504a", "#776a59", "#827461", "#8d7d68"],
    forest: ["#263b29", "#30492f", "#354e32", "#395236"],
    ruins: ["#353d39", "#49534e", "#505a53", "#555e56"],
    sanctum: ["#382927", "#473535", "#4e3838", "#523b39"]
  };

  function drawTerrainTile(ctx, world, c, r, ts, time) {
    const T = WORLD.TILE;
    const index = r * world.cols + c;
    const tile = world.tiles[index];
    const zone = world.zoneIds[index];
    const palette = groundPalettes[zone];
    const x = c * ts, y = r * ts;
    const seed = terrainSeed(c, r);
    if (tile === T.WATER || tile === T.BRIDGE) {
      ctx.fillStyle = tile === T.WATER ? "#254a4f" : "#4a392b";
      ctx.fillRect(x, y, ts, ts);
      if (tile === T.BRIDGE) {
        for (let i = 0; i < 6; i += 1) {
          const py = y + i * ts / 6;
          ctx.fillStyle = i % 2 ? "#876445" : "#957251";
          ctx.fillRect(x, py, ts, ts / 6 - 1);
          ctx.fillStyle = "#b08a5f";
          ctx.fillRect(x, py + 1, ts, 1);
        }
        return;
      }
      ctx.fillStyle = "#386368";
      for (let i = 0; i < 3; i += 1) {
        const py = (time * (11 + i) + seed * ts + i * 15) % ts;
        ctx.fillRect(x + 5 + i * 10, y + py, 9, Math.min(1.5, ts - py));
      }
      for (const side of [-1, 1]) {
        if (WORLD.getTileAt(world, c + side, r) === T.WATER) continue;
        const bank = side < 0 ? x : x + ts - 3;
        ctx.fillStyle = "#52736a";
        ctx.fillRect(bank, y, 3, ts);
        ctx.fillStyle = "#87a59a";
        ctx.fillRect(bank + 1, y + (time * 8 + seed * ts) % (ts - 8), 1, 8);
      }
      return;
    }

    const paving = tile === T.TOWN_GROUND || tile === T.RUIN_FLOOR || tile === T.SANCTUM_FLOOR ||
      tile >= T.STONE_WALL || (tile === T.PATH && zone !== "forest");
    const dirt = tile === T.PATH && !paving;
    ctx.fillStyle = paving ? palette[0] : dirt ? "#655540" : ["#344731", "#384d33", "#3c5036"][Math.floor(seed * 3)];
    ctx.fillRect(x, y, ts, ts);
    if (paving) {
      const courses = zone === "village" ? 3 : 2;
      const h = ts / courses;
      for (let i = 0; i < courses; i += 1) {
        const py = y + i * h;
        const joint = Math.round(ts * (0.27 + 0.45 * terrainSeed(c + i * 73, r)));
        ctx.fillStyle = palette[1 + Math.floor(terrainSeed(c, r + i * 71) * 3)];
        ctx.fillRect(x, py, joint - 1, h - 1);
        ctx.fillRect(x + joint, py, ts - joint, h - 1);
        ctx.fillStyle = "rgba(245,217,175,0.08)";
        ctx.fillRect(x + 2, py + 1, joint - 5, 1);
      }
      if (zone !== "village" && seed < 0.37) {
        const vein = zone === "sanctum";
        ctx.strokeStyle = vein ? "#895445" : "#303934";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x + 7, y);
        ctx.lineTo(x + 16, y + 11);
        ctx.lineTo(x + 12, y + 20);
        ctx.lineTo(x + 25, y + 27);
        ctx.stroke();
        if (!vein) actorOval(ctx, "#586a48", x + 11, y + 22, 7, 3);
      }
      return;
    }
    for (let i = 0; i < 4; i += 1) {
      const px = x + 4 + terrainSeed(c + i * 37, r + 3) * (ts - 10);
      const py = y + 4 + terrainSeed(c + 9, r + i * 53) * (ts - 10);
      if (dirt) {
        ctx.fillStyle = i % 2 ? "#7e6c51" : "#554735";
        ctx.fillRect(px, py, 3, 1.5);
      } else {
        actorShape(ctx, i % 2 ? "#5e7145" : "#2b402d", px, py, px - 2, py - 4, px + 1, py - 2, px + 4, py - 6, px + 3, py);
      }
    }
    if (!dirt && seed < 0.15) {
      actorOval(ctx, "#2a402d", x + 21, y + 29, 9, 4);
      actorOval(ctx, "#64784c", x + 19, y + 26, 6, 3);
      actorOval(ctx, "#87935c", x + 23, y + 24, 4, 2);
    }
  }

  function drawRitualFloor(ctx, x, y) {
    const light = ctx.createRadialGradient(x, y, 8, x, y, 130);
    light.addColorStop(0, "rgba(211,110,66,0.22)");
    light.addColorStop(1, "rgba(211,110,66,0)");
    ctx.fillStyle = light;
    ctx.fillRect(x - 130, y - 130, 260, 260);
    ctx.strokeStyle = "#946651";
    ctx.lineWidth = 1.5;
    for (const radius of [44, 81, 94]) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i += 1) {
      const a = i * Math.PI / 4;
      const px = x + Math.cos(a) * 87, py = y + Math.sin(a) * 87;
      actorShape(ctx, "#ac7a61", px, py - 4, px + 3, py, px, py + 4, px - 3, py);
    }
  }

  function drawObstacleTile(ctx, tile, x, y, ts, seed, zone) {
    const TILE = WORLD.TILE;
    if (tile === TILE.TREE) {
      const cx = x + ts * (0.43 + seed * 0.14);
      const cy = y + ts * 0.78;
      const size = 17 + seed * 4;
      actorOval(ctx, "rgba(15,29,20,0.4)", cx + 6, cy + 3, size, 8);
      actorShape(ctx, "#594634", cx - 13, cy + 4, cx - 5, cy - 2, cx - 3, cy - 19,
        cx + 4, cy - 21, cx + 4, cy - 2, cx + 11, cy + 3, cx + 2, cy + 1);
      actorOval(ctx, "#233b2a", cx, cy - 19, size, size * 0.82);
      actorOval(ctx, "#36543a", cx - 7, cy - 25, size * 0.72, size * 0.66);
      actorOval(ctx, "#2d4933", cx + 8, cy - 23, size * 0.63, size * 0.55);
      actorOval(ctx, "#4b6841", cx - 4, cy - 33, size * 0.54, size * 0.35);
      return;
    }
    const palette = groundPalettes[zone];
    if (tile === TILE.STONE_WALL) {
      ctx.fillStyle = palette[0];
      ctx.fillRect(x, y - 5, ts, ts + 5);
      for (let course = 0; course < 3; course += 1) {
        const py = y - 5 + course * (ts + 5) / 3;
        const joint = ts * (course % 2 ? 0.68 : 0.33);
        ctx.fillStyle = palette[course === 0 ? 3 : 1];
        ctx.fillRect(x + 1, py, joint - 2, 15);
        ctx.fillRect(x + joint, py, ts - joint - 1, 15);
      }
    } else if (tile === TILE.PILLAR) {
      const cx = x + ts * 0.5;
      const cy = y + ts * 0.82;
      actorOval(ctx, "rgba(15,20,20,0.45)", cx + 4, cy + 4, 16, 7);
      actorShape(ctx, palette[0], cx - 14, cy - 5, cx + 14, cy - 5, cx + 14, cy + 5, cx - 14, cy + 5);
      actorShape(ctx, palette[2], cx - 10, cy - 29, cx + 10, cy - 29, cx + 9, cy - 2, cx - 9, cy - 2);
      actorShape(ctx, palette[1], cx + 3, cy - 29, cx + 10, cy - 29, cx + 9, cy - 2, cx + 3, cy - 2);
      actorShape(ctx, palette[3], cx - 12, cy - 27, cx - 8, cy - 33, cx + 8, cy - 33, cx + 12, cy - 27);
    }
  }

  function drawChest(ctx, chest, time) {
    ctx.save();
    ctx.translate(chest.x, chest.y);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 10, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!chest.opened) {
      const glow = 0.25 + 0.15 * Math.sin(time * 4);
      ctx.fillStyle = `rgba(251, 191, 36, ${glow})`;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = chest.opened ? "#4c3828" : "#854d0e";
    ctx.fillRect(-13, -9, 26, 18);
    ctx.strokeStyle = chest.opened ? "#64748b" : "#fbbf24";
    ctx.lineWidth = 2;
    ctx.strokeRect(-13, -9, 26, 18);

    if (!chest.opened) {
      ctx.fillStyle = "#fde047";
      ctx.fillRect(-3, -2, 6, 6);
    } else {
      ctx.fillStyle = "#1e1610";
      ctx.fillRect(-11, -7, 22, 6);
    }
    ctx.restore();
  }

  function drawPickup(ctx, pk, time) {
    if (!Number.isFinite(pk.x) || !Number.isFinite(pk.y)) return;
    ctx.save();
    ctx.translate(pk.x, pk.y);
    if (pk.kind === "gold") {
      const bob = Math.sin(time * 6 + pk.x) * 2.5;
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.beginPath();
      ctx.ellipse(0, 7, 6.2 - bob * 0.25, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(0, bob);
      ctx.fillStyle = "rgba(251, 191, 36, 0.25)";
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fef3c7";
      ctx.beginPath();
      ctx.arc(-2, -2, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const item = DATA.ITEMS[pk.itemId];
      const rar = item ? DATA.RARITIES[item.rarity] : DATA.RARITIES.common;
      const itemBob = Math.sin(time * 5 + (pk.x % 10)) * 3;

      // Ground shadow anchored beneath floating pickup
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 8, Math.max(6, 9.5 - itemBob * 0.25), 3.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Floating rarity aura glow
      const grad = ctx.createRadialGradient(0, -itemBob - 2, 2, 0, -itemBob - 2, 16);
      grad.addColorStop(0, `${rar.color}88`);
      grad.addColorStop(0.5, `${rar.color}28`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -itemBob - 2, 16, 0, Math.PI * 2);
      ctx.fill();

      // Upward sparkle beacon
      ctx.strokeStyle = `${rar.color}aa`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -itemBob - 12);
      ctx.lineTo(0, -itemBob - 18);
      ctx.moveTo(-3, -itemBob - 15);
      ctx.lineTo(3, -itemBob - 15);
      ctx.stroke();

      if (ICONS && ICONS.drawItemCanvas) {
        ICONS.drawItemCanvas(ctx, pk.itemId, 0, -itemBob - 2, 20);
      } else {
        ctx.fillStyle = rar.color;
        ctx.beginPath();
        ctx.roundRect(-7, -9 - itemBob, 14, 14, 4);
        ctx.fill();
        ctx.fillStyle = "#0e121b";
        ctx.fillRect(-3, -4 - itemBob, 6, 4);
      }
    }
    ctx.restore();
  }

  function actorShape(ctx, color, ...points) {
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function actorOval(ctx, color, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawNpc(ctx, npc, player, time) {
    ctx.save();
    ctx.translate(npc.x, npc.y);

    if (npc.kind === "campfire") {
      const pulse = Math.sin(time * 8) * 4;
      const grad = ctx.createRadialGradient(0, -4, 4, 0, -4, 72 + pulse);
      grad.addColorStop(0, "rgba(251, 146, 60, 0.45)");
      grad.addColorStop(1, "rgba(251, 146, 60, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -4, 76, 0, Math.PI * 2);
      ctx.fill();

      actorOval(ctx, "#352723", 1,8, 19,9);
      for (let i = 0; i < 8; i += 1) {
        const a = i * Math.PI / 4;
        actorOval(ctx, i < 4 ? "#887467" : "#5c534e", Math.cos(a) * 15, 6 + Math.sin(a) * 7, 4.5,3);
      }
      actorShape(ctx, "#56311f", -12,3, -9,0, 12,8, 9,11);
      actorShape(ctx, "#865035", -11,8, 9,0, 12,4, -9,11);
      for (let i = 0; i < 3; i += 1) {
        const rise = (time * 19 + i * 11) % 30;
        actorOval(ctx, `rgba(255,187,93,${1 - rise / 30})`, Math.sin(rise / 7 + i) * rise / 4, -10 - rise, 1,1.2);
      }

      // Flame
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(0, -22 - pulse * 0.4);
      ctx.quadraticCurveTo(12, -2, 0, 6);
      ctx.quadraticCurveTo(-12, -2, 0, -22 - pulse * 0.4);
      ctx.fill();
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(0, -3 + pulse * 0.15, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 13, 13, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      if (npc.kind === "shop_npc") {
        // Pip: a low, wide silhouette with a merchant's pack and ledger.
        actorShape(ctx, "#33251d", -15,-10, -10,-14, 6,-10, 13,-3, 14,12, -15,13);
        actorShape(ctx, "#ac7845", -15,-9, -10,-12, -4,-7, -5,8, -15,9);
        actorShape(ctx, "#39614c", -9,-5, 7,-5, 12,3, 10,12, -9,12, -12,4);
        actorOval(ctx, "#c58f68", 0,-12, 8,7);
        actorShape(ctx, "#e7bb78", -12,-15, -7,-17, -5,-23, 5,-24, 9,-17, 13,-15, 7,-12, -10,-12);
        actorShape(ctx, "#785134", -6,-17, 8,-17, 9,-15, -7,-15);
        actorShape(ctx, "#d5aa74", 2,-1, 12,-3, 14,6, 4,9);
        actorShape(ctx, "#68462f", 2,-1, 12,-4, 13,2, 4,6);
        actorOval(ctx, "#33251d", -2,-12, 1,1);
        actorOval(ctx, "#33251d", 4,-12, 1,1);
      } else {
        // Mira: silver braid, floor-length mantle and ashwood staff.
        actorShape(ctx, "#30243d", -7,-14, 6,-15, 10,-7, 14,13, -13,13, -10,-5);
        actorShape(ctx, "#826981", -8,-8, 0,-10, 8,-8, 10,12, -10,12);
        actorShape(ctx, "#c9af8a", -8,-9, 0,-2, 8,-9, 7,-4, 0,3, -7,-4);
        actorOval(ctx, "#b58061", 0,-16, 6,7);
        actorShape(ctx, "#ddd5c2", -8,-16, -7,-23, 1,-25, 7,-22, 7,-16, 2,-20, -4,-18, -4,-8, -7,-5);
        actorShape(ctx, "#8d6540", 12,13, 10,-17, 12,-22, 16,-23, 17,-19, 14,-18, 14,13);
        actorOval(ctx, "#dbe7b8", 15,-21, 2.3,2.3);
        actorOval(ctx, "#33251d", 2,-16, 1,1);
      }
      if (npc.kind !== "shop_npc" && RPG.isQuestReadyToClaim(player)) {
        ctx.fillStyle = "#4ade80";
        ctx.font = "900 15px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("?", 0, -31 + Math.sin(time * 5) * 2);
      } else if (npc.kind !== "shop_npc" && RPG.getActiveQuest(player)) {
        ctx.fillStyle = "#fbbf24";
        ctx.font = "900 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", 0, -30);
      }
    }

    // Label below NPC
    ctx.font = "700 10px ui-sans-serif, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(15, 20, 31, 0.78)";
    const tw = ctx.measureText(npc.name).width + 10;
    ctx.fillRect(-tw * 0.5, 17, tw, 14);
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(npc.name, 0, 27);
    ctx.restore();
  }

  function drawEnemy(ctx, en, time) {
    const def = DATA.ENEMIES[en.kind];
    ctx.save();
    ctx.translate(en.x, en.y);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, en.radius * 0.85, en.radius * 0.9, en.radius * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    const sway = Math.sin(time * 7 + en.spawnX);
    const brace = en.state === "windup" ? 3 : 0;
    const turn = Math.cos(en.facing) < 0 ? -1 : 1;
    const flash = en.hitFlashTimer > 0;
    ctx.save();
    ctx.translate(0, brace + sway * 0.8);
    ctx.scale(turn, 1);
    if (en.kind === "spore_slime") {
      const crest = -10 + sway * 2 + brace;
      ctx.beginPath();
      ctx.moveTo(-15, 6);
      ctx.bezierCurveTo(-12, crest - 8, 8, crest - 8, 13, 1);
      ctx.quadraticCurveTo(20, 13, 0, 12);
      ctx.quadraticCurveTo(-19, 13, -15, 6);
      ctx.fillStyle = "#193b30";
      ctx.fill();
      actorOval(ctx, flash ? "#fff" : "#639c70", -2, crest + 8, 11, 6);
      actorOval(ctx, "#c9ce80", -5, crest + 2, 4, 2.5);
      actorOval(ctx, "#dfb67e", 4, crest + 4, 3, 2);
      actorOval(ctx, "#142923", 1, 3, 1.8, 2);
      actorOval(ctx, "#142923", 7, 3, 1.6, 2);
    } else if (en.kind === "goblin_scout") {
      actorShape(ctx, "#302629", -11,1, -5,-8, 7,-7, 11,3, 6,7, 9,13, 3,13, 0,6, -5,13, -11,13);
      actorShape(ctx, "#9e5b45", -9,-5, 5,-8, 11,-4, 6,0, -4,1);
      actorShape(ctx, flash ? "#fff" : "#8caa60", -7,-12, -16,-19, -6,-18, 3,-21, 10,-17, 18,-21, 13,-12, 7,-7, -3,-8);
      actorShape(ctx, "#45583c", -7,-17, -3,-22, 5,-23, 10,-17, 4,-18);
      actorOval(ctx, "#29252a", 3,-14, 2,1.5);
      actorOval(ctx, "#29252a", 9,-14, 1.5,1.5);
      actorShape(ctx, "#a9bdbe", 10,2, 23,-2-brace, 19,5, 11,7);
    } else if (en.kind === "skeleton_archer") {
      const bone = flash ? "#fff" : "#d8cbb1";
      actorShape(ctx, "#35444b", -8,-14, -4,-23, 4,-24, 9,-16, 8,6, -13,12, -10,-6);
      actorShape(ctx, bone, -3,-3, 3,-3, 4,4, 8,13, 4,13, 0,6, -4,13, -8,13, -4,4);
      actorOval(ctx, bone, 1,-14, 7,7);
      actorShape(ctx, bone, -3,-12, 8,-12, 5,-5, -1,-5);
      actorOval(ctx, "#293039", 0,-14, 2,2.5);
      actorOval(ctx, "#293039", 6,-14, 1.7,2.5);
      for (let i = 0; i < 3; i += 1) actorOval(ctx, bone, 0,-4+i*2.5, 5-i,1);
      ctx.beginPath();
      ctx.moveTo(13, -16);
      ctx.quadraticCurveTo(29, -4, 13, 9);
      ctx.strokeStyle = "#ba8152";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(13, -16);
      ctx.lineTo(13 - brace * 2, -4);
      ctx.lineTo(13, 9);
      ctx.strokeStyle = "#d2c4ac";
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (en.kind === "orc_brute") {
      const hide = flash ? "#fff" : "#849659";
      actorShape(ctx, "#2b2625", -15,1, 13,1, 15,16, 5,17, 1,9, -5,17, -16,16);
      actorShape(ctx, hide, -23,-4, -17,-14, -8,-15, 3,-12, 14,-16, 22,-8, 24,8, 15,11, 11,4, -12,6, -18,11, -24,7);
      actorShape(ctx, "#734c35", -15,-13, -7,-14, 9,5, 5,9, 0,8);
      actorShape(ctx, "#262b25", -9,-16, -5,-23, 8,-24, 14,-18, 12,-8, 1,-5, -8,-9);
      actorShape(ctx, hide, -7,-16, 13,-17, 13,-10, 7,-6, -4,-8);
      actorShape(ctx, "#eaddb0", -3,-8, -5,-14, 0,-8, 7,-8, 12,-14, 10,-8, 7,-5, 0,-5);
      actorShape(ctx, "#897771", 13,1, 24,-2, 30,1, 29,11, 19,14, 13,9);
    } else if (en.isBoss) {
      const ember = en.phase === 2 ? "#ffbd73" : def.accent;
      if (en.phase === 2) actorOval(ctx, "rgba(249,115,22,0.22)", 0,3, en.radius+10+sway*2,en.radius+6);
      actorShape(ctx, "#221b22", -23,-10, 23,-10, 28,18, 13,23, 4,14, -5,16, -13,23, -28,18);
      actorShape(ctx, flash ? "#fff" : "#614044", -28,-15, -21,-25, -12,-19, 13,-19, 24,-26, 30,-17, 27,8, 18,13, 10,4, 4,14, -8,13, -16,3, -22,13, -29,6);
      actorShape(ctx, "#35242c", -13,-17, 13,-17, 16,0, 6,11, -6,11, -16,0);
      actorShape(ctx, ember, -9,-5, -3,-2, 0,-8, 4,-2, 10,-5, 5,3, 0,9, -6,3);
      actorShape(ctx, "#33222a", -12,-26, -25,-38, -19,-39, -7,-30, 8,-30, 20,-42, 24,-39, 16,-25, 11,-15, -10,-15);
      actorShape(ctx, ember, -10,-24, -2,-22, -3,-19, -9,-21);
      actorShape(ctx, ember, 2,-22, 11,-24, 9,-20, 3,-19);
      if (en.phase === 2) {
        for (let i = 0; i < 4; i += 1) {
          const rise = (time * 23 + i * 13) % 42;
          actorOval(ctx, `rgba(255,163,92,${1 - rise / 42})`, (i - 1.5) * 15 + sway * 2, -12-rise, 1.5,1.5);
        }
      }
    }
    ctx.restore();

    // Burn indicator
    if (en.burnTimer > 0) {
      ctx.strokeStyle = "#fb923c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, en.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // HP Bar above enemy when damaged or boss
    if (en.hp < en.maxHp) {
      const bw = en.isBoss ? 54 : 32;
      const by = en.isBoss ? -en.radius - 21 : -en.radius - 15;
      ctx.fillStyle = "rgba(9, 12, 20, 0.85)";
      ctx.fillRect(-bw * 0.5 - 1, by - 1, bw + 2, 6);
      ctx.fillStyle = en.isBoss ? "#f97316" : "#ef4444";
      ctx.fillRect(-bw * 0.5, by, bw * Math.max(0, en.hp / en.maxHp), 4);
    }

    ctx.restore();
  }

  function drawPlayer(ctx, state, time) {
    const p = state.player;
    const stats = RPG.computePlayerStats(p);
    const armorItem = p.equipment.armor ? DATA.ITEMS[p.equipment.armor.itemId] : null;
    const weaponItem = p.equipment.weapon ? DATA.ITEMS[p.equipment.weapon.itemId] : null;
    const armorColor = (armorItem && armorItem.color) || "#3b82f6";
    const weaponColor = (weaponItem && weaponItem.color) || "#cbd5e1";

    ctx.save();
    ctx.translate(p.x, p.y);

    // Invuln blink
    if (p.invulnTimer > 0 && Math.floor(time * 24) % 2 === 0 && !state.dashState.active) {
      ctx.globalAlpha = 0.55;
    }

    // Buff Auras
    if (p.buffs.aegisTimer > 0) {
      ctx.strokeStyle = "rgba(74, 222, 128, 0.72)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 21 + Math.sin(time * 10) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.buffs.berserkTimer > 0) {
      ctx.strokeStyle = "rgba(251, 146, 60, 0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(0, 13, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const turn = Math.cos(p.facing);
    const back = Math.sin(p.facing) < -0.55;
    const sway = Math.sin(time * (state.dashState.active ? 24 : 5)) * (state.dashState.active ? 4 : 1.7);
    actorShape(ctx, "#4f2530", -8,-9, 8,-9, 11-turn*4,7, 7-turn*4+sway,15, -14-turn*4+sway,13);
    actorShape(ctx, "#a94f4e", -8,-7, -2,-3, -4-turn*4+sway,12, -12-turn*4+sway,12);
    actorShape(ctx, "#202228", -8,5, -1,5, -2,13, -9,14);
    actorShape(ctx, "#292831", 1,5, 8,5, 9,13, 2,14);
    actorShape(ctx, "#1d272c", -13,-4, -7,-11, 7,-11, 13,-3, 9,8, -9,8);
    actorShape(ctx, armorColor, -12,-4, -6,-9, 6,-9, 11,-3, 7,6, -7,6);
    actorShape(ctx, "#d5b47a", -9,3, 8,3, 7,6, -8,6);
    actorOval(ctx, "#ffe0a0", 0,4.5, 2,2);
    const head = turn * 2.4;
    actorOval(ctx, "#222732", head,-13, 9,9);
    actorShape(ctx, stats.armorTier >= 3 ? "#afbdc6" : "#b97848", head-8,-14, head-5,-21, head+4,-22, head+8,-17, head+8,-12, head-8,-12);
    if (!back) {
      actorShape(ctx, "#e1b390", head-6,-14, head+6,-14, head+5,-8, head+1,-5, head-5,-8);
      actorOval(ctx, "#20242a", head-2+turn*2,-11, 1,1);
      actorOval(ctx, "#20242a", head+3+turn*2,-11, 1,1);
    }

    ctx.save();
    ctx.translate(turn * 10, 1 + Math.sin(p.facing) * 6);
    ctx.rotate(p.facing - 0.28);
    const tip = 16 + stats.weaponTier * 1.6;
    actorShape(ctx, "#392c29", -2,-2, 8,-2, 8,2, -2,2);
    actorShape(ctx, "#d5ad6a", 4,-5, 7,-5, 7,5, 4,5);
    actorShape(ctx, weaponColor, 7,-3, tip-5,-3.5, tip,0, tip-5,3, 7,2);
    actorShape(ctx, "#fff3d0", 8,-2.5, tip-5,-3, tip,0, 8,-0.3);
    ctx.restore();

    ctx.restore();
  }

  function drawMinimap(ctx, cssW, cssH, state) {
    const world = state.world;
    const mm = ensureMinimapCanvas(world);
    const boss = state.enemies.find((e) => e.isBoss && e.alive);
    const bossActive = Boolean(
      boss &&
      (WORLD.getZoneAt(world, state.player.x, state.player.y).id === "sanctum" ||
        Math.hypot(state.player.x - boss.x, state.player.y - boss.y) < 440 ||
        boss.hp < boss.maxHp)
    );
    const mx = cssW - world.cols - 12;
    const bossBarWidth = Math.min(360, Math.max(0, cssW - 24));
    const bossBarRight = cssW * 0.5 + bossBarWidth * 0.5;
    const clearsBossHoriz = mx - 8 > bossBarRight;
    const baseTop = cssH <= 480 ? 100 : 114;
    const my = bossActive && !clearsBossHoriz ? 164 : baseTop;

    ctx.save();
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = "#090d14";
    ctx.fillRect(mx - 2, my - 2, world.cols + 4, world.rows + 4);
    ctx.drawImage(mm, mx, my);

    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;
    ctx.strokeRect(mx - 1.5, my - 1.5, world.cols + 3, world.rows + 3);

    // Unopened chests gold dots
    ctx.fillStyle = "#fbbf24";
    for (const ch of state.chests) {
      if (ch.opened) continue;
      ctx.fillRect(mx + Math.floor(ch.x / world.tileSize), my + Math.floor(ch.y / world.tileSize), 2, 2);
    }

    // Boss red marker
    if (boss) {
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(mx + Math.floor(boss.x / world.tileSize) - 1, my + Math.floor(boss.y / world.tileSize) - 1, 3, 3);
    }

    // Player pulsing green/white marker
    const px = mx + state.player.x / world.tileSize;
    const py = my + state.player.y / world.tileSize;
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return {
    renderFrame
  };
});
