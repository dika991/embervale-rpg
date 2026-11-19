import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const PROJECT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function resolvePlaywrightCore() {
  try {
    return require("playwright-core");
  } catch {
    const linksDir = path.join(process.env.HOME || "", "Library/Caches/ms-playwright/.links");
    if (fs.existsSync(linksDir)) {
      for (const name of fs.readdirSync(linksDir)) {
        const target = fs.readFileSync(path.join(linksDir, name), "utf8").trim();
        if (fs.existsSync(target) && fs.existsSync(path.join(target, "package.json"))) {
          return require(target);
        }
      }
    }
    throw new Error("Could not locate playwright-core on disk");
  }
}

function startStaticServer(rootDir) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8"
  };

  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const cleanUrl = (req.url || "/").split("?")[0];
      const rel = cleanUrl === "/" ? "index.html" : cleanUrl.replace(/^\/+/, "");
      const fullPath = path.resolve(rootDir, rel);
      if (!fullPath.startsWith(rootDir) || !fs.existsSync(fullPath)) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }
      const ext = path.extname(fullPath);
      res.setHeader("Content-Type", mime[ext] || "application/octet-stream");
      fs.createReadStream(fullPath).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${addr.port}/` });
    });
  });
}

async function run() {
  const { chromium } = resolvePlaywrightCore();
  const { server, url } = await startStaticServer(PROJECT_DIR);
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Mobile Portrait (390x844, Touch)
    console.log("Running Mobile Portrait E2E (390x844)...");
    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2
    });
    const page = await mobileCtx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    await page.goto(url, { waitUntil: "networkidle" });

    // Check zero overflow
    const dims = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      sh: document.documentElement.scrollHeight,
      iw: window.innerWidth,
      ih: window.innerHeight
    }));
    assert.ok(dims.sw <= dims.iw, `Horizontal overflow: ${dims.sw} > ${dims.iw}`);
    assert.ok(dims.sh <= dims.ih, `Vertical overflow: ${dims.sh} > ${dims.ih}`);

    // Start game
    await page.locator("#btn-primary-action").click();
    await page.waitForTimeout(120);

    // Verify Touch Control Layout & Non-Overlapping Bounds
    const layoutMetrics = await page.evaluate(() => {
      const joy = document.getElementById("joystick-zone").getBoundingClientRect();
      const atk = document.getElementById("btn-attack").getBoundingClientRect();
      const hud = document.querySelector(".hud-top").getBoundingClientRect();
      const cluster = document.querySelector(".action-cluster").getBoundingClientRect();
      const skills = Array.from(document.querySelectorAll(".skill-btn")).map((el) => el.getBoundingClientRect());
      return { joy, atk, hud, cluster, skills };
    });
    assert.ok(layoutMetrics.atk.width >= 44 && layoutMetrics.atk.height >= 44, "Attack button tap size >= 44px");
    assert.ok(layoutMetrics.joy.right < layoutMetrics.cluster.left, "Joystick must not overlap right action cluster");
    assert.ok(layoutMetrics.hud.bottom < layoutMetrics.cluster.top, "Top HUD must not overlap bottom touch controls");
    for (const sk of layoutMetrics.skills) {
      assert.ok(sk.width >= 44 && sk.height >= 44, "Skill button >= 44px");
    }

    // Verify canvas renders non-blank scene
    const nonBlank = await page.evaluate(() => {
      const c = document.getElementById("game-canvas");
      const ctx = c.getContext("2d");
      const data = ctx.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 6, 6).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) sum += data[i] + data[i + 1] + data[i + 2];
      return sum > 0;
    });
    assert.equal(nonBlank, true, "Canvas pixel sample should be non-blank");

    // Drag Virtual Joystick upward via Pointer Events
    const yBefore = await page.evaluate(() => window.Embervale.APP.getState().player.y);
    const joyCenter = {
      x: layoutMetrics.joy.left + layoutMetrics.joy.width / 2,
      y: layoutMetrics.joy.top + layoutMetrics.joy.height / 2
    };
    await page.evaluate(({ cx, cy }) => {
      const el = document.getElementById("joystick-zone");
      el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, pointerType: "touch", clientX: cx, clientY: cy }));
      el.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 1, pointerType: "touch", clientX: cx, clientY: cy - 36 }));
    }, { cx: joyCenter.x, cy: joyCenter.y });
    await page.waitForTimeout(320);
    await page.evaluate(({ cx, cy }) => {
      const el = document.getElementById("joystick-zone");
      el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, pointerType: "touch", clientX: cx, clientY: cy - 36 }));
    }, { cx: joyCenter.x, cy: joyCenter.y });
    const yAfterMove = await page.evaluate(() => window.Embervale.APP.getState().player.y);
    assert.ok(yAfterMove < yBefore - 15, `Joystick move up failed: ${yBefore} -> ${yAfterMove}`);

    // Walk to Starter Chest & interact
    await page.evaluate(() => {
      const st = window.Embervale.APP.getState();
      const ch = st.chests.find((c) => c.id === "chest_village");
      st.player.x = ch.x + 14;
      st.player.y = ch.y + 14;
    });
    await page.waitForTimeout(100);
    await page.locator("#btn-interact").waitFor({ state: "visible" });
    const goldBeforeChest = await page.evaluate(() => window.Embervale.APP.getState().player.gold);
    await page.locator("#btn-interact").dispatchEvent("pointerdown");
    await page.waitForTimeout(100);
    const goldAfterChest = await page.evaluate(() => window.Embervale.APP.getState().player.gold);
    assert.ok(goldAfterChest > goldBeforeChest, "Opening chest must grant gold");

    // Walk into Whisperwood & fight Spore Slime with Attack + Skills
    await page.evaluate(() => {
      const st = window.Embervale.APP.getState();
      const slime = st.enemies.find((e) => e.kind === "spore_slime" && e.alive);
      st.player.x = slime.x - 32;
      st.player.y = slime.y;
      st.player.facing = 0;
    });
    await page.waitForTimeout(80);
    await page.locator("#btn-skill-cleave_arc").dispatchEvent("pointerdown");
    await page.waitForTimeout(220);
    await page.locator("#btn-attack").dispatchEvent("pointerdown");
    await page.waitForTimeout(450);

    // Ensure slime dies (couple extra taps if needed) and magnet collects coin
    for (let i = 0; i < 4; i += 1) {
      await page.locator("#btn-attack").dispatchEvent("pointerdown");
      await page.waitForTimeout(380);
    }
    await page.waitForTimeout(450);

    const combatResults = await page.evaluate(() => {
      const st = window.Embervale.APP.getState();
      return {
        slain: st.player.statsCounters.slain,
        exp: st.player.exp,
        level: st.player.level,
        gold: st.player.gold,
        cleaveCdText: document.querySelector("#btn-skill-cleave_arc .skill-cd").textContent
      };
    });
    assert.ok(combatResults.slain >= 1, "Slime should be slain in real-time combat");
    assert.ok(combatResults.exp > 0 || combatResults.level > 1, "Slime kill awards EXP");

    // Level up to Lv 2 via combat EXP, unlock Sunfire Bolt in Skills drawer, & shop Oaksteel Blade
    await page.evaluate(() => {
      const st = window.Embervale.APP.getState();
      window.Embervale.RPG.grantExp(st.player, 60);
      window.Embervale.RPG.grantGold(st.player, 80);
    });
    await page.waitForTimeout(100);
    assert.equal(await page.locator("#hud-level").textContent(), "LV 2");

    await page.locator("#btn-menu").click();
    await page.locator('.tab-btn[data-tab="skills"]').click();
    await page.locator('[data-action="upgrade-skill"][data-id="sunfire_bolt"]').click();
    const sunfireRank = await page.evaluate(() => window.Embervale.APP.getState().player.skillRanks.sunfire_bolt);
    assert.equal(sunfireRank, 1, "Sunfire Bolt should unlock to Rank 1");

    await page.locator('.tab-btn[data-tab="shop"]').click();
    await page.locator('[data-action="buy-item"][data-id="oaksteel_blade"]').click();
    await page.locator('.tab-btn[data-tab="bag"]').click();
    const equipBtn = page.locator('.item-card:has-text("Oaksteel Blade") [data-action="equip-item"]');
    await equipBtn.click();
    const equippedWeapon = await page.evaluate(() => window.Embervale.APP.getState().player.equipment.weapon.itemId);
    assert.equal(equippedWeapon, "oaksteel_blade");

    await page.locator("#drawer-close").click();
    await page.waitForTimeout(80);
    // Move to open space facing south and cast newly unlocked Sunfire Bolt!
    await page.evaluate(() => {
      const st = window.Embervale.APP.getState();
      st.player.x = 11 * 44 + 22;
      st.player.y = 44 * 44 + 22;
      st.player.facing = Math.PI / 2;
      st.player.mp = 60;
    });
    await page.locator("#btn-skill-sunfire_bolt").dispatchEvent("pointerdown");
    await page.waitForTimeout(40);
    const sunfireCheck = await page.evaluate(() => {
      const st = window.Embervale.APP.getState();
      return {
        hasProj: st.projectiles.some((p) => p.kind === "sunfire"),
        cdActive: st.player.skillCooldowns.sunfire_bolt > 0
      };
    });
    assert.equal(sunfireCheck.hasProj, true, "Sunfire Bolt should spawn projectile");
    assert.equal(sunfireCheck.cdActive, true, "Sunfire Bolt should trigger cooldown");

    // Persistence check + cross-reload equipment UID integrity
    await page.evaluate(() => {
      const st = window.Embervale.APP.getState();
      st.player.gold = 900;
      window.Embervale.SAVE.saveToStorage(st);
    });
    await page.reload({ waitUntil: "networkidle" });
    const continueText = await page.locator("#btn-primary-action").textContent();
    assert.ok(continueText.includes("Lv 2"), `Expected Continue (Lv 2), got: ${continueText}`);
    await page.locator("#btn-primary-action").click();
    await page.waitForTimeout(100);
    const persistedWeapon = await page.evaluate(() => window.Embervale.APP.getState().player.equipment.weapon.itemId);
    assert.equal(persistedWeapon, "oaksteel_blade", "Persisted save must keep weapon");

    await page.locator("#btn-menu").click();
    await page.locator('.tab-btn[data-tab="shop"]').click();
    await page.locator('[data-action="buy-item"][data-id="runed_halberd"]').click();
    await page.locator('.tab-btn[data-tab="bag"]').click();
    await page.locator('.item-card:has-text("Runed Halberd") [data-action="equip-item"]').click();
    const afterHalberdEquip = await page.evaluate(() => window.Embervale.APP.getState().player.equipment.weapon.itemId);
    assert.equal(afterHalberdEquip, "runed_halberd", "Cross-reload gear purchase & equip must equip Runed Halberd without UID collision");
    await page.locator("#drawer-close").click();

    await page.evaluate(() => window.Embervale.SAVE.saveToStorage(window.Embervale.APP.getState()));
    assert.deepEqual(errors, [], `Mobile console/page errors: ${errors.join("; ")}`);
    await mobileCtx.close();

    // 1b. Portrait Sanctum (360x640) Boss Bar vs Zone Banner separation
    console.log("Running Sanctum 360x640 & Landscape checks...");
    const sanctumCtx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
    const sPage = await sanctumCtx.newPage();
    await sPage.goto(url, { waitUntil: "networkidle" });
    await sPage.locator("#btn-primary-action").click();
    await sPage.waitForTimeout(80);
    await sPage.evaluate(() => {
      const st = window.Embervale.APP.getState();
      const boss = st.enemies.find((e) => e.isBoss);
      st.player.x = boss.x;
      st.player.y = boss.y + 80;
    });
    await sPage.waitForTimeout(140);
    const overlapCheck = await sPage.evaluate(() => {
      const bb = document.getElementById("boss-bar-wrap").getBoundingClientRect();
      const zb = document.getElementById("zone-banner").getBoundingClientRect();
      return {
        bossHidden: document.getElementById("boss-bar-wrap").hidden,
        zoneHidden: document.getElementById("zone-banner").hidden,
        overlapY: Math.max(0, Math.min(bb.bottom, zb.bottom) - Math.max(bb.top, zb.top))
      };
    });
    assert.equal(overlapCheck.bossHidden, false);
    assert.equal(overlapCheck.zoneHidden, false);
    assert.equal(overlapCheck.overlapY, 0, "Boss bar and zone banner must not overlap");
    await sanctumCtx.close();

    // 1c. Mobile Landscape (568x320) Save Modal Fit + Minimap vs Action Cluster Clearance
    const landCtx = await browser.newContext({ viewport: { width: 568, height: 320 }, hasTouch: true, isMobile: true });
    const lPage = await landCtx.newPage();
    await lPage.goto(url, { waitUntil: "networkidle" });
    await lPage.locator("#btn-primary-action").click();
    await lPage.waitForTimeout(80);
    await lPage.evaluate(() => window.Embervale.SAVE.saveToStorage(window.Embervale.APP.getState()));
    await lPage.reload({ waitUntil: "networkidle" });
    const savedModalLayout = await lPage.evaluate(() => {
      const p = document.getElementById("btn-primary-action").getBoundingClientRect();
      const s = document.getElementById("btn-secondary-action").getBoundingClientRect();
      return {
        vh: window.innerHeight,
        primaryBottom: p.bottom,
        secondaryBottom: s.bottom,
        secondaryHidden: document.getElementById("btn-secondary-action").hidden
      };
    });
    assert.equal(savedModalLayout.secondaryHidden, false);
    assert.ok(savedModalLayout.primaryBottom <= savedModalLayout.vh, "Landscape saved title primary button must fit inside viewport");
    assert.ok(savedModalLayout.secondaryBottom <= savedModalLayout.vh, "Landscape saved title secondary button must fit inside viewport");

    await lPage.locator("#btn-primary-action").click();
    await lPage.waitForTimeout(80);
    await lPage.evaluate(() => {
      const st = window.Embervale.APP.getState();
      const boss = st.enemies.find((e) => e.isBoss);
      st.player.x = boss.x;
      st.player.y = boss.y + 80;
    });
    await lPage.waitForTimeout(100);
    const landBossGeometry = await lPage.evaluate(() => {
      const cluster = document.querySelector(".action-cluster").getBoundingClientRect();
      const bb = document.getElementById("boss-bar-wrap").getBoundingClientRect();
      const zb = document.getElementById("zone-banner").getBoundingClientRect();
      const st = window.Embervale.APP.getState();
      const mmRight = window.innerWidth - 10;
      const mmLeft = mmRight - (st.world.cols + 4);
      const mmBottom = 100 + st.world.rows + 2;
      return {
        clusterTop: cluster.top,
        bossRight: bb.right,
        mmLeft,
        mmBottom,
        zbBottom: zb.bottom,
        zbRight: zb.right,
        clusterLeft: cluster.left
      };
    });
    assert.ok(landBossGeometry.mmBottom < landBossGeometry.clusterTop, "Landscape boss minimap must not overlap action cluster");
    assert.ok(landBossGeometry.bossRight + 8 < landBossGeometry.mmLeft, "Landscape boss bar must clear minimap horizontally");
    await landCtx.close();

    // 1d. Restricted localStorage fallback
    const blockedCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bPage = await blockedCtx.newPage();
    await bPage.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("Access denied", "SecurityError");
        }
      });
    });
    const bErrors = [];
    bPage.on("pageerror", (e) => bErrors.push(e.message));
    await bPage.goto(url, { waitUntil: "networkidle" });
    await bPage.locator("#btn-primary-action").click();
    await bPage.waitForTimeout(80);
    assert.equal(await bPage.evaluate(() => Boolean(window.Embervale?.APP?.getState()?.player)), true);
    assert.deepEqual(bErrors, [], `Restricted localStorage console errors: ${bErrors.join("; ")}`);
    await blockedCtx.close();

    // 2. Desktop Viewport (1280x800, Keyboard)
    console.log("Running Desktop E2E (1280x800)...");
    const desktopCtx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      hasTouch: false
    });
    const dPage = await desktopCtx.newPage();
    const dErrors = [];
    dPage.on("pageerror", (e) => dErrors.push(e.message));
    dPage.on("console", (msg) => {
      if (msg.type() === "error") dErrors.push(msg.text());
    });

    await dPage.goto(url, { waitUntil: "networkidle" });
    await dPage.locator("#btn-primary-action").click();
    await dPage.waitForTimeout(100);
    const touchDeckDisplay = await dPage.evaluate(() => getComputedStyle(document.getElementById("touch-deck")).display);
    assert.equal(touchDeckDisplay, "none", "Desktop fine-pointer should hide touch deck");

    const startY = await dPage.evaluate(() => window.Embervale.APP.getState().player.y);
    await dPage.keyboard.down("KeyW");
    await dPage.waitForTimeout(250);
    await dPage.keyboard.up("KeyW");
    const afterKeyY = await dPage.evaluate(() => window.Embervale.APP.getState().player.y);
    assert.ok(afterKeyY < startY - 15, "WASD movement works on desktop");

    await dPage.keyboard.press("KeyB");
    assert.equal(await dPage.locator("#drawer-backdrop").isVisible(), true, "KeyB opens drawer");
    await dPage.keyboard.press("Escape");
    assert.equal(await dPage.locator("#drawer-backdrop").isVisible(), false, "Escape closes drawer");
    assert.deepEqual(dErrors, [], `Desktop errors: ${dErrors.join("; ")}`);
    await desktopCtx.close();

    // 3. Direct file:// Open Verification
    console.log("Running direct file:// boot check...");
    const fileCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const fPage = await fileCtx.newPage();
    const fErrors = [];
    fPage.on("pageerror", (e) => fErrors.push(e.message));
    fPage.on("console", (msg) => {
      if (msg.type() === "error") fErrors.push(msg.text());
    });
    const fileUrl = `file://${path.join(PROJECT_DIR, "index.html")}`;
    await fPage.goto(fileUrl, { waitUntil: "load" });
    await fPage.locator("#btn-primary-action").click();
    await fPage.waitForTimeout(150);
    const loadedState = await fPage.evaluate(() => Boolean(window.Embervale && window.Embervale.APP));
    assert.equal(loadedState, true, "Game must boot cleanly over file:// without module CORS issues");
    assert.deepEqual(fErrors, [], `file:// console errors: ${fErrors.join("; ")}`);
    await fileCtx.close();

    console.log("ALL E2E CHECKS PASSED!");
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
