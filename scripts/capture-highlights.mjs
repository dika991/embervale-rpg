import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { execSync } from "node:child_process";
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
    ".json": "application/json; charset=utf-8",
    ".png": "image/png"
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

async function main() {
  const { chromium } = resolvePlaywrightCore();
  const { server, url } = await startStaticServer(PROJECT_DIR);
  const browser = await chromium.launch({ headless: true });

  const assetsDir = path.join(PROJECT_DIR, "assets");
  const screensDir = path.join(assetsDir, "screenshots");
  const tmpDir = path.join(PROJECT_DIR, "tmp");
  fs.mkdirSync(screensDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  console.log("Generating screenshots...");

  // Setup mobile context (390x844, 2x DPR)
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2
  });
  const page = await mobileCtx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator("#btn-primary-action").click();
  await page.waitForTimeout(200);

  // 1. Screenshot: Bag & Equipment Stat Comparison
  console.log("1. Capturing inventory-gear-comparison.png...");
  await page.evaluate(() => {
    const { Embervale } = window;
    const state = Embervale.APP.getState();
    const { RPG } = Embervale;
    // Add cool items to bag
    RPG.addItem(state.player, "mossfang_sabre", 1);
    RPG.addItem(state.player, "dawnbreaker", 1);
    RPG.addItem(state.player, "emberplate_aegis", 1);
    RPG.addItem(state.player, "heart_of_vale", 1);
    RPG.addItem(state.player, "greater_hp", 3);
    RPG.addItem(state.player, "berserk_tonic", 2);
    state.player.gold = 185;
    Embervale.APP.ui.syncHud(state);
    // Open bag drawer
    Embervale.APP.ui.openDrawer("bag");
  });
  await page.waitForTimeout(300);

  // Click on Dawnbreaker in inventory to show comparison
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".item-card"));
    const dawnCard = cards.find((c) => c.textContent.includes("Dawnbreaker") || c.textContent.includes("Mossfang"));
    if (dawnCard) dawnCard.click();
  });
  await page.waitForTimeout(200);

  await page.screenshot({
    path: path.join(screensDir, "inventory-gear-comparison.png"),
    fullPage: false
  });

  // 2. Screenshot: Skills Upgrade Tree
  console.log("2. Capturing skills-upgrade-tree.png...");
  await page.evaluate(() => {
    const { Embervale } = window;
    const state = Embervale.APP.getState();
    const { RPG } = Embervale;
    // Level up player to Lv 4 with skill points
    RPG.grantExp(state.player, 250);
    state.player.skillPoints = 2;
    state.player.skillRanks.cleave_arc = 2;
    state.player.skillRanks.dash_strike = 2;
    state.player.skillRanks.sunfire_bolt = 1;
    state.player.skillRanks.sentinel_aegis = 0;
    Embervale.APP.ui.syncHud(state);
    // Open skills drawer
    Embervale.APP.ui.openDrawer("skills");
  });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(screensDir, "skills-upgrade-tree.png"),
    fullPage: false
  });

  // 3. Screenshot: Village Merchant Shop
  console.log("3. Capturing merchant-village-shop.png...");
  await page.evaluate(() => {
    const { Embervale } = window;
    const state = Embervale.APP.getState();
    state.player.gold = 340;
    Embervale.APP.ui.syncHud(state);
    // Open shop drawer
    Embervale.APP.ui.openDrawer("shop");
  });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(screensDir, "merchant-village-shop.png"),
    fullPage: false
  });

  // Close drawer for in-game combat screenshots
  await page.evaluate(() => {
    const { Embervale } = window;
    Embervale.APP.ui.closeDrawer();
  });
  await page.waitForTimeout(200);

  // 4. Screenshot: Whisperwood Real-Time Combat & Telegraphs
  console.log("4. Capturing combat-whisperwood.png...");
  await page.evaluate(() => {
    const { Embervale } = window;
    const state = Embervale.APP.getState();
    // Position player in Whisperwood near slimes
    state.player.x = 550;
    state.player.y = 1430;
    state.player.hp = 110;
    state.player.maxHp = 140;
    state.player.mp = 55;
    state.camera.x = 550;
    state.camera.y = 1430;
    state.camera.zone = "Whisperwood";
    // Find nearby enemy and trigger combat telegraph
    const enemy = state.enemies.find((e) => e.kind === "spore_slime" && e.hp > 0);
    if (enemy) {
      enemy.x = 615;
      enemy.y = 1430;
      enemy.state = "windup";
      enemy.windupTimer = 0.35;
      enemy.windupMax = 0.6;
      enemy.facing = Math.PI;
    }
    // Trigger player attack arc
    Embervale.COMBAT.playerAttack(state);
    // Add floating damage text & particles
    state.floatingTexts.push({
      x: 615,
      y: 1405,
      text: "38!",
      color: "#fbbf24",
      scale: 1.3,
      vy: -36,
      timer: 0.85,
      maxTimer: 0.85
    });
    // Add a gold pickup
    state.pickups.push({
      id: "pk_demo",
      type: "gold",
      amount: 15,
      x: 585,
      y: 1450,
      vx: 0,
      vy: 0,
      radius: 9,
      magnetTimer: 0,
      animTimer: 0.4
    });
    Embervale.APP.ui.syncHud(state);
  });
  await page.waitForTimeout(100);
  await page.screenshot({
    path: path.join(screensDir, "combat-whisperwood.png"),
    fullPage: false
  });

  // 5. Screenshot: Cinder Warden Boss Battle
  console.log("5. Capturing boss-cinder-warden.png...");
  await page.evaluate(() => {
    const { Embervale } = window;
    const state = Embervale.APP.getState();
    // Position player in Cinder Sanctum
    state.player.x = 2024;
    state.player.y = 570;
    state.player.hp = 185;
    state.player.maxHp = 220;
    state.player.mp = 45;
    state.camera.x = 2024;
    state.camera.y = 500;
    state.camera.zone = "Cinder Sanctum";

    // Find boss
    const boss = state.enemies.find((e) => e.isBoss);
    if (boss) {
      boss.x = 2024;
      boss.y = 440;
      boss.hp = 420;
      boss.state = "windup";
      boss.windupTimer = 0.5;
      boss.windupMax = 0.9;
      boss.currentAttack = "flame_slam";
    }
    // Cast sunfire bolt
    Embervale.COMBAT.castSkill(state, "sunfire_bolt");
    Embervale.APP.ui.syncHud(state);
  });
  await page.waitForTimeout(120);
  await page.screenshot({
    path: path.join(screensDir, "boss-cinder-warden.png"),
    fullPage: false
  });

  await mobileCtx.close();

  // 6. Record Animated GIF Gameplay (WebM -> palettegen -> GIF)
  console.log("6. Recording gameplay video for animated GIF...");
  // Clear any old webm in tmp
  for (const f of fs.readdirSync(tmpDir)) {
    if (f.endsWith(".webm")) fs.unlinkSync(path.join(tmpDir, f));
  }

  const videoCtx = await browser.newContext({
    viewport: { width: 390, height: 720 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
    recordVideo: {
      dir: tmpDir,
      size: { width: 390, height: 720 }
    }
  });
  const vPage = await videoCtx.newPage();
  await vPage.goto(url, { waitUntil: "networkidle" });
  await vPage.locator("#btn-primary-action").click();
  await vPage.waitForTimeout(200);

  // Setup gameplay scene: player in forest engaging multiple monsters with combo and skills
  await vPage.evaluate(() => {
    const { Embervale } = window;
    const state = Embervale.APP.getState();
    const { RPG } = Embervale;
    state.player.x = 550;
    state.player.y = 1430;
    RPG.grantExp(state.player, 160);
    state.player.skillRanks.cleave_arc = 2;
    state.player.skillRanks.dash_strike = 2;
    state.player.skillRanks.sunfire_bolt = 1;
    state.player.skillRanks.sentinel_aegis = 1;
    state.player.mp = 90;
    state.player.maxMp = 90;
    Embervale.APP.ui.syncHud(state);
  });

  // Action loop: simulate player movement, combo attacks, skills and pickups over 4 seconds
  const startTime = Date.now();
  let step = 0;
  while (Date.now() - startTime < 4200) {
    step += 1;
    await vPage.evaluate((s) => {
      const { Embervale } = window;
      const state = Embervale.APP.getState();
      // Move slightly towards enemy
      state.player.x += Math.sin(s * 0.15) * 1.8;
      state.player.y -= 0.6;
      state.player.mp = Math.min(state.player.maxMp, state.player.mp + 0.5);

      if (s === 12) {
        Embervale.COMBAT.playerAttack(state);
      } else if (s === 26) {
        Embervale.COMBAT.playerAttack(state);
      } else if (s === 40) {
        Embervale.COMBAT.castSkill(state, "cleave_arc");
      } else if (s === 62) {
        Embervale.COMBAT.castSkill(state, "sunfire_bolt");
      } else if (s === 84) {
        Embervale.COMBAT.castSkill(state, "dash_strike");
      }
    }, step);
    await vPage.waitForTimeout(40);
  }

  // Close context to finish writing video file
  await videoCtx.close();
  await browser.close();
  server.close();

  // Find recorded .webm file
  const videoFiles = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".webm"));
  if (videoFiles.length > 0) {
    const latestWebm = path.join(tmpDir, videoFiles[0]);
    const gifOutput = path.join(assetsDir, "gameplay-combat.gif");
    console.log(`Converting ${latestWebm} to ${gifOutput} via ffmpeg...`);

    const ffmpegCmd = `/opt/homebrew/bin/ffmpeg -y -i "${latestWebm}" -vf "fps=16,scale=360:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" -loop 0 "${gifOutput}"`;
    execSync(ffmpegCmd, { stdio: "inherit" });
    console.log("GIF generated successfully!");
  }

  console.log("All media assets generated successfully!");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
