(function (root) {
  "use strict";

  const { RPG, WORLD, COMBAT, SAVE, AUDIO, RENDER, INPUT, UI } = root.Embervale;

  const canvas = document.getElementById("game-canvas");
  const world = WORLD.buildWorld();
  let state = COMBAT.createGameState(world);
  let pausedByDrawer = false;
  let started = false;
  let resultModalOpen = false;
  let lastLevel = state.player.level;
  let autoSaveTimer = 0;

  const savedPreview = SAVE.loadFromStorage();

  const ui = UI.createUiController({
    getState: () => state,
    onPauseChanged: (paused) => {
      pausedByDrawer = paused;
      input.resetJoystick();
    },
    onToggleMute: () => AUDIO.toggleMute(),
    onPlaySfx: (name) => AUDIO.play(name),
    onSaveGame: () => SAVE.saveToStorage(state),
    onAutoSave: () => SAVE.saveToStorage(state),
    onNewGame: () => {
      SAVE.clearStorage();
      state = COMBAT.createGameState(world);
      lastLevel = state.player.level;
      started = true;
      resultModalOpen = false;
      SAVE.saveToStorage(state);
      ui.syncHud(state);
    },
    onStartGame: (useSave) => {
      AUDIO.unlock();
      if (useSave) {
        const loaded = SAVE.loadFromStorage();
        if (loaded) {
          state = COMBAT.createGameState(world, loaded.player, loaded.openedChestIds);
          state.bossSlainVictoryShown = loaded.bossSlainVictoryShown;
        }
      } else {
        SAVE.clearStorage();
        state = COMBAT.createGameState(world);
        SAVE.saveToStorage(state);
      }
      lastLevel = state.player.level;
      started = true;
      resultModalOpen = false;
      ui.syncHud(state);
    },
    onRevive: () => {
      COMBAT.respawnAtVillage(state);
      resultModalOpen = false;
      SAVE.saveToStorage(state);
      ui.syncHud(state);
    },
    onContinueAfterVictory: () => {
      state.mode = "playing";
      resultModalOpen = false;
      SAVE.saveToStorage(state);
      ui.syncHud(state);
    }
  });

  const input = INPUT.createInputController({
    onGesture: () => AUDIO.unlock(),
    onAttack: () => {
      if (!started || pausedByDrawer || state.mode !== "playing") return;
      COMBAT.playerAttack(state);
    },
    onSkill: (skillId) => {
      if (!started || pausedByDrawer || state.mode !== "playing") return;
      COMBAT.castSkill(state, skillId);
    },
    onPotion: () => {
      if (!started || pausedByDrawer || state.mode !== "playing") return;
      COMBAT.useQuickPotion(state);
    },
    onInteract: () => {
      if (!started || pausedByDrawer || state.mode !== "playing") return;
      const res = COMBAT.interact(state);
      if (res.type === "shop") {
        ui.openDrawer("shop");
      } else if (res.type === "quest") {
        ui.openDrawer("hero");
      } else if (res.type === "healed" || res.type === "chest") {
        SAVE.saveToStorage(state);
      }
    },
    onToggleDrawer: (tab) => {
      if (!started || state.mode !== "playing") return;
      ui.toggleDrawer(tab);
    },
    onEscape: () => {
      if (ui.isDrawerOpen()) ui.closeDrawer();
    }
  });

  ui.setMuteIcon(AUDIO.isMuted());
  ui.syncHud(state);
  ui.showTitleScreen(Boolean(savedPreview), savedPreview ? savedPreview.player.level : 1);

  // Expose debug handle for automated test verification
  root.Embervale.APP = {
    getState: () => state,
    ui
  };

  let lastFrameTime = performance.now();
  let accumulator = 0;
  const FIXED_STEP = 1 / 60;

  function frame(now) {
    const dt = Math.min(0.1, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;

    if (started && !pausedByDrawer && state.mode === "playing") {
      accumulator += dt;
      while (accumulator >= FIXED_STEP) {
        COMBAT.update(state, FIXED_STEP, input.getMoveVector());
        accumulator -= FIXED_STEP;
      }

      // Drain audio cue queue
      while (state.pendingSfx.length > 0) {
        AUDIO.play(state.pendingSfx.shift());
      }

      // Auto-save subtly on level up or periodic 10s interval
      if (state.player.level !== lastLevel) {
        lastLevel = state.player.level;
        SAVE.saveToStorage(state);
      }
      autoSaveTimer += dt;
      if (autoSaveTimer >= 10) {
        autoSaveTimer = 0;
        SAVE.saveToStorage(state);
      }

      ui.syncHud(state);
    } else if (started && state.mode === "gameover" && !resultModalOpen) {
      resultModalOpen = true;
      while (state.pendingSfx.length > 0) AUDIO.play(state.pendingSfx.shift());
      ui.syncHud(state);
      ui.showGameOverScreen(state);
    } else if (started && state.mode === "victory" && !resultModalOpen) {
      resultModalOpen = true;
      while (state.pendingSfx.length > 0) AUDIO.play(state.pendingSfx.shift());
      SAVE.saveToStorage(state);
      ui.syncHud(state);
      ui.showVictoryScreen(state);
    }

    RENDER.renderFrame(canvas, state, now / 1000);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})(typeof globalThis !== "undefined" ? globalThis : window);
