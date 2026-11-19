# ⚔️ Embervale RPG — 2D Action Adventure

[![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-f7df1e?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas%202D-e34f26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![CSS3](https://img.shields.io/badge/CSS3-Mobile--First-1572b6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen)](#tech-stack--architecture)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A mobile-first, zero-dependency **2D Real-Time Action RPG** built purely with **Vanilla HTML5, CSS3, JavaScript, and Canvas 2D**.

Venture forth from the tranquil sanctuary of **Emberhearth Village** into the monster-infested depths of **Whisperwood**, uncover forgotten treasures within the treacherous **Sunken Ruins**, and face the fiery wrath of the **Cinder Warden** in the Sanctum.

---

## 🌟 Key Features

### ⚔️ Real-Time Fluid Combat
- **3-Hit Attack Combo**: Directional blade swings with fluid hit-pauses, knockbacks, and visual arc particles.
- **Smart Soft Auto-Aim**: Intelligent target acquisition automatically faces nearby enemies within range and angle while respecting manual movement vectors.
- **Visual Attack Telegraphs**: Clear telegraph zones (linear thrusts, charge dashes, radial slam circles) giving players tactical dodge windows.

### ✨ 4 Active Usable Skills
| Skill | Level | MP Cost | Cooldown | Description |
| :--- | :---: | :---: | :---: | :--- |
| **Cleave Arc** | Starter | 12 MP | 3.0s | Sweeps a wide 140° cleave dealing 1.85× damage with heavy knockback and +20% crit chance. |
| **Dash Strike** | Starter | 10 MP | 3.5s | Rapid 135px forward dash with 0.24s invulnerability frames (i-frames) that pierces through foes. |
| **Sunfire Bolt** | Lv 2 | 16 MP | 4.2s | Launches a blistering projectile that detonates on impact (68px AoE) and burns targets over 3 seconds. |
| **Sentinel Aegis**| Lv 2 | 22 MP | 8.5s | Emits a 90px shockwave, instantly restores 18%+ Max HP, and shields the hero with +50% DEF for 5 seconds. |

*Skills can be upgraded up to Rank 5 using Skill Points earned from leveling.*

### 🎒 Deep Itemization & Equipment
- **18 Unique Items**: Across 4 rarity tiers (**Common**, **Uncommon**, **Rare**, **Epic**).
- **3 Equipment Slots**: Weapons, Armor, and Accessories that visibly update the hero's sprite silhouette, weapon models, and armor tints.
- **Live Stat Delta Comparison**: Real-time `▲` (green) and `▼` (red) stat previews against equipped items when browsing Bag or Merchant inventories.
- **Stackable Consumables**: Health Potions, Mana Vials, Greater Potions, Berserk Tonics, and Sunstone Elixirs with dedicated one-tap quick-slots.

### 🗺️ Interconnected Biomes & World Boss
- **Emberhearth Village**: Safe haven with Merchant Pip (Shop), Elder Mira (Quests), Starter Chest, and Campfire Shrine (full restoration & auto-save).
- **Whisperwood (Lv 1–3)**: Teeming with Spore Slimes and agile Goblin Scouts.
- **Sunken Ruins (Lv 3–5)**: Guarded by Skeleton Archers and heavy-hitting Orc Brutes.
- **Cinder Sanctum (Boss Arena)**: The epic 2-phase **Cinder Warden** encounter featuring radial flame slams, projectile ember fans, summon reinforcements, and enrage auras.
- **4-Stage Quest Chain**: Engaging objectives with an innovative **"Claim via Owl"** remote turn-in feature to eliminate tedious backtracking on mobile.

---

## 🎮 Controls

The game features dual control support with automatic interface adaptation:

### 📱 Mobile / Touch Controls
- **Analog Joystick (Bottom-Left)**: Multi-touch virtual joystick with pointer-id isolation for fluid 360° movement.
- **Action Cluster (Bottom-Right)**: Ergonomic thumb arc with primary **Attack**, dedicated **Quick Potion**, and radial **Skill Buttons**.
- **Contextual Action Pill**: Dynamically appears when standing near NPCs, chests, shrines, or shops.

### 💻 Desktop / Keyboard & Mouse
| Key | Action |
| :--- | :--- |
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or Arrow Keys | Character Movement |
| <kbd>Space</kbd> | Basic Attack (Combo) |
| <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> | Cast Skills 1 to 4 |
| <kbd>Q</kbd> | Use Quick Potion |
| <kbd>E</kbd> | Contextual Interact (Talk / Shop / Chest / Shrine) |
| <kbd>B</kbd> or <kbd>I</kbd> | Open Bag, Skills & Quest Menu |
| <kbd>M</kbd> | Toggle Sound Effects |
| <kbd>Esc</kbd> | Close Drawers & Modals |

---

## 🛠️ Tech Stack & Architecture

Built with a strict **zero-runtime-dependency** philosophy:

```
                  ┌───────────────────────────────┐
                  │    Embervale RPG Frontend     │
                  │ (Vanilla HTML5 / CSS3 / ES6)  │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Canvas 2D Core  │    │  Procedural SFX  │    │   SVG Filters    │
│  - 2.5D Renderer │    │  - Web Audio API │    │  - Scoped IDs    │
│  - Particle Sys  │    │  - Synthesized   │    │  - No collisions │
│  - Circle/Tile   │    │  - Zero asset    │    │  - Responsive    │
│    Collisions    │    │    downloads     │    │    DOM views     │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

- **Runtime**: Pure Vanilla JavaScript (ES2022 `<script defer>`), HTML5 Canvas 2D API, and CSS3.
- **Zero Build Step**: No webpack, Vite, or external bundlers required. Operates seamlessly over both direct double-click `file://` protocol and standard HTTP servers.
- **Dual Runtime Architecture**: Modular scripts run under `globalThis.Embervale` in browsers while exporting CommonJS modules (`module.exports`) for seamless execution inside Node.js test runners.
- **Synthesized Audio**: Procedural sound generation powered by the **Web Audio API**—zero audio files downloaded over the network.
- **Dynamic SVG Filter Scoping**: Built-in monotonic counter (`svgFilterSeq`) prevents SVG filter ID shadowing and collisions across hidden/active DOM components.
- **Responsive Layout**: Designed mobile-first utilizing `100dvh`, viewport safe-area insets (`env(safe-area-inset-*)`), and zero-scroll locking.
- **Persistence**: Fast and resilient `localStorage` v1 state engine with format validation, error recovery, and clean state resets.

---

## 📂 Project Structure

```text
embervale-rpg/
├── index.html              # Mobile-first shell, HUD, touch deck & slide-up drawers
├── style.css               # Zero-scroll mobile layout, glassmorphic HUD & desktop media queries
├── src/
│   ├── data.js             # Catalogs for items, skills, enemies, shop inventory & quests
│   ├── icons.js            # Scoped SVG definitions and procedural Canvas 2D item icon renderers
│   ├── rpg.js              # Pure RPG calculations: EXP curves, stats, gear deltas & inventory
│   ├── world.js            # Deterministic 64x56 tilemap, zone definitions & collision sliding
│   ├── combat.js           # Real-time combat loop: combos, skills, enemy AI, boss phases & loot drops
│   ├── audio.js            # Procedural Web Audio API sound synthesizers
│   ├── render.js           # 2.5D top-down Canvas renderer: lighting, sprites, telegraphs & particles
│   ├── input.js            # Multi-touch virtual joystick & desktop keyboard/mouse listeners
│   ├── ui.js               # Reactive DOM HUD, radial cooldown sweeps & bottom sheet drawers
│   ├── save.js             # LocalStorage state serialization, validation & migration
│   └── main.js             # Fixed-timestep (60 FPS) loop, state machine & lifecycle management
└── tests/
    ├── rpg.test.mjs        # Unit tests: EXP, leveling curves, gear deltas, shop balance & skills
    ├── world-combat.test.mjs # Integration tests: BFS connectivity, combat simulation & save cycles
    └── e2e-mobile.mjs      # Headless Playwright suite across mobile, landscape & desktop viewports
```

---

## 🚀 Getting Started

### Option 1: Direct Play (Instant / No Install)
Simply double-click `index.html` in your file explorer to open and play the game directly in your browser (`file:///.../index.html`).

### Option 2: Local HTTP Server
Run any lightweight static server:

```bash
# Using Python 3
python3 -m http.server 8000

# Or using Node.js npx
npx serve .
```

Open `http://localhost:8000` in your web browser.

---

## 🧪 Testing & Verification

The project includes unit, integration, and end-to-end browser tests:

```bash
# Run unit & integration tests (Node.js built-in test runner)
node --test tests/rpg.test.mjs tests/world-combat.test.mjs

# Run Headless Playwright E2E suite (Mobile 390x844, Landscape 480x320 & Desktop 1280x800)
node tests/e2e-mobile.mjs
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
