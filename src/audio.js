(function (root, factory) {
  const api = factory();
  root.Embervale = root.Embervale || {};
  root.Embervale.AUDIO = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  const MUTE_KEY = "embervale_muted_v1";
  let ctx = null;
  let muted = false;

  try {
    muted = localStorage.getItem(MUTE_KEY) === "1";
  } catch {}

  function ensureCtx() {
    if (muted || typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function unlock() {
    ensureCtx();
  }

  function isMuted() {
    return muted;
  }

  function setMuted(next) {
    muted = Boolean(next);
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {}
    return muted;
  }

  function toggleMute() {
    return setMuted(!muted);
  }

  function playTone(freqStart, freqEnd, duration, type, gainPeak, delay) {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime + (delay || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || "triangle";
    osc.frequency.setValueAtTime(Math.max(40, freqStart), now);
    if (freqEnd && freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak || 0.12, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function play(name) {
    if (muted) return;
    switch (name) {
      case "slash":
        playTone(420, 150, 0.09, "triangle", 0.09);
        break;
      case "hit":
        playTone(190, 75, 0.08, "sawtooth", 0.09);
        break;
      case "crit":
        playTone(620, 260, 0.12, "square", 0.11);
        playTone(940, 1180, 0.14, "sine", 0.09, 0.02);
        break;
      case "kill":
        playTone(280, 110, 0.14, "triangle", 0.1);
        playTone(440, 220, 0.16, "sine", 0.08, 0.03);
        break;
      case "coin":
        playTone(980, 1360, 0.08, "sine", 0.08);
        playTone(1360, 1760, 0.11, "sine", 0.07, 0.05);
        break;
      case "chest":
        playTone(523, 659, 0.12, "triangle", 0.1);
        playTone(659, 784, 0.12, "triangle", 0.1, 0.08);
        playTone(784, 1046, 0.22, "triangle", 0.12, 0.16);
        break;
      case "cleave":
        playTone(320, 95, 0.19, "sawtooth", 0.12);
        playTone(520, 210, 0.16, "triangle", 0.09, 0.02);
        break;
      case "dash":
        playTone(280, 740, 0.14, "sine", 0.09);
        break;
      case "fire":
        playTone(460, 130, 0.22, "sawtooth", 0.11);
        playTone(230, 90, 0.24, "triangle", 0.09, 0.03);
        break;
      case "heal":
        playTone(523, 784, 0.15, "sine", 0.1);
        playTone(659, 1046, 0.22, "sine", 0.09, 0.07);
        break;
      case "hurt":
        playTone(165, 65, 0.14, "sawtooth", 0.14);
        break;
      case "levelup":
        playTone(523.25, 523.25, 0.11, "triangle", 0.13, 0);
        playTone(659.25, 659.25, 0.11, "triangle", 0.13, 0.09);
        playTone(783.99, 783.99, 0.12, "triangle", 0.14, 0.18);
        playTone(1046.5, 1046.5, 0.34, "triangle", 0.16, 0.27);
        break;
      case "buy":
        playTone(740, 980, 0.09, "sine", 0.1);
        playTone(980, 1180, 0.12, "sine", 0.08, 0.06);
        break;
      default:
        break;
    }
  }

  return {
    unlock,
    isMuted,
    setMuted,
    toggleMute,
    play
  };
});
