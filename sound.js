//cekkkk
// ===== AUDIO EFFECTS (Web Audio API, tanpa file eksternal) =====
const SFX = (() => {
  let ctx;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function beep(freq, duration, type = 'sine', volume = 0.15) {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
      osc.stop(c.currentTime + duration);
    } catch (e) { /* abaikan jika audio diblokir browser */ }
  }

  return {
    success() {
      beep(880, 0.12, 'sine', 0.15);
      setTimeout(() => beep(1320, 0.15, 'sine', 0.12), 100);
    },
    error() {
      beep(220, 0.25, 'square', 0.12);
    },
    click() {
      beep(600, 0.05, 'triangle', 0.08);
    },
    delete() {
      beep(440, 0.1, 'sawtooth', 0.1);
      setTimeout(() => beep(220, 0.2, 'sawtooth', 0.1), 90);
    },
    open() {
      beep(523, 0.08, 'sine', 0.08);
    },
    close() {
      beep(392, 0.08, 'sine', 0.08);
    }
  };
})();