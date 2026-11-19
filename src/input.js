(function (root, factory) {
  const api = factory();
  root.Embervale = root.Embervale || {};
  root.Embervale.INPUT = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  function createInputController(callbacks) {
    const keys = new Set();
    let joyPointerId = null;
    let joyOriginX = 0;
    let joyOriginY = 0;
    let joyVec = { x: 0, y: 0 };

    const joyZone = document.getElementById("joystick-zone");
    const joyBase = document.getElementById("joystick-base");
    const joyKnob = document.getElementById("joystick-knob");
    const shell = document.getElementById("game-shell");
    const atkBtn = document.getElementById("btn-attack");
    const potionBtn = document.getElementById("btn-potion");
    const interactBtn = document.getElementById("btn-interact");
    const skillBtns = Array.from(document.querySelectorAll(".skill-btn"));

    const MAX_RADIUS = 38;

    function resetJoystick() {
      joyPointerId = null;
      joyVec.x = 0;
      joyVec.y = 0;
      if (joyKnob) {
        joyKnob.style.transform = "translate(0px, 0px)";
      }
    }

    function updateJoystickFromClient(clientX, clientY) {
      let dx = clientX - joyOriginX;
      let dy = clientY - joyOriginY;
      const dist = Math.hypot(dx, dy);
      if (dist > MAX_RADIUS) {
        dx = (dx / dist) * MAX_RADIUS;
        dy = (dy / dist) * MAX_RADIUS;
      }
      joyVec.x = Math.abs(dx) < 5 ? 0 : dx / MAX_RADIUS;
      joyVec.y = Math.abs(dy) < 5 ? 0 : dy / MAX_RADIUS;
      if (joyKnob) {
        joyKnob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
      }
    }

    if (joyZone && joyBase) {
      joyZone.addEventListener("pointerdown", (e) => {
        if (joyPointerId !== null) return;
        e.preventDefault();
        if (e.pointerType === "touch" && shell) shell.classList.add("force-touch");
        callbacks.onGesture?.();
        joyPointerId = e.pointerId;
        try {
          joyZone.setPointerCapture(e.pointerId);
        } catch {}
        const rect = joyBase.getBoundingClientRect();
        joyOriginX = rect.left + rect.width * 0.5;
        joyOriginY = rect.top + rect.height * 0.5;
        updateJoystickFromClient(e.clientX, e.clientY);
      });

      joyZone.addEventListener("pointermove", (e) => {
        if (e.pointerId !== joyPointerId) return;
        e.preventDefault();
        updateJoystickFromClient(e.clientX, e.clientY);
      });

      const endJoy = (e) => {
        if (e.pointerId !== joyPointerId) return;
        resetJoystick();
      };
      joyZone.addEventListener("pointerup", endJoy);
      joyZone.addEventListener("pointercancel", endJoy);
    }

    function bindActionTouch(el, fn) {
      if (!el) return;
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (e.pointerType === "touch" && shell) shell.classList.add("force-touch");
        callbacks.onGesture?.();
        fn();
      });
    }

    bindActionTouch(atkBtn, () => callbacks.onAttack?.());
    bindActionTouch(potionBtn, () => callbacks.onPotion?.());
    bindActionTouch(interactBtn, () => callbacks.onInteract?.());
    for (const btn of skillBtns) {
      const skillId = btn.dataset.skill;
      bindActionTouch(btn, () => callbacks.onSkill?.(skillId));
    }

    window.addEventListener("keydown", (e) => {
      if (e.repeat && (e.code === "Space" || e.code === "KeyE" || e.code === "KeyB" || e.code === "KeyI")) {
        return;
      }
      callbacks.onGesture?.();
      keys.add(e.code);

      if (e.code === "Space" || e.code === "KeyJ") {
        e.preventDefault();
        callbacks.onAttack?.();
      } else if (e.code === "Digit1") {
        callbacks.onSkill?.("cleave_arc");
      } else if (e.code === "Digit2") {
        callbacks.onSkill?.("dash_strike");
      } else if (e.code === "Digit3") {
        callbacks.onSkill?.("sunfire_bolt");
      } else if (e.code === "Digit4") {
        callbacks.onSkill?.("sentinel_aegis");
      } else if (e.code === "KeyQ") {
        callbacks.onPotion?.();
      } else if (e.code === "KeyE") {
        callbacks.onInteract?.();
      } else if (e.code === "KeyB" || e.code === "KeyI") {
        callbacks.onToggleDrawer?.("bag");
      } else if (e.code === "KeyK") {
        callbacks.onToggleDrawer?.("skills");
      } else if (e.code === "Escape") {
        callbacks.onEscape?.();
      }
    });

    window.addEventListener("keyup", (e) => {
      keys.delete(e.code);
    });

    window.addEventListener("blur", () => {
      keys.clear();
      resetJoystick();
    });

    function getMoveVector() {
      let x = joyVec.x;
      let y = joyVec.y;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
      if (keys.has("KeyW") || keys.has("ArrowUp")) y -= 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) y += 1;
      const mag = Math.hypot(x, y);
      if (mag > 1) {
        x /= mag;
        y /= mag;
      }
      return { x, y };
    }

    return {
      getMoveVector,
      resetJoystick
    };
  }

  return {
    createInputController
  };
});
