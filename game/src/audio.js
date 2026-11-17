// Synthesised WebAudio sounds only: no audio files, no network. A soft pluck
// when a segment is finished, a pentatonic chime when a cloth lights up, a low
// thud when a heart is lost, and a warm arpeggio on the win.
const PLUCK_NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 1046.5];
const CHIME_NOTES = [523.25, 659.25, 783.99, 1046.5, 1318.5];
const WIN_NOTES = [392.0, 523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0];

export function createAudio() {
  let ctx = null;
  let muted = false;
  let pluckIndex = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function tone(freq, when, dur, type, gain) {
    const ac = ensure();
    if (!ac || muted) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  return {
    unlock() {
      ensure();
    },
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    segment() {
      const ac = ensure();
      if (!ac) return;
      const f = PLUCK_NOTES[pluckIndex % PLUCK_NOTES.length];
      pluckIndex += 1;
      tone(f, ac.currentTime, 0.5, 'sine', 0.12);
      tone(f * 2, ac.currentTime, 0.25, 'triangle', 0.04);
    },
    clear() {
      const ac = ensure();
      if (!ac) return;
      CHIME_NOTES.forEach((f, i) => tone(f, ac.currentTime + i * 0.09, 0.7, 'sine', 0.1));
    },
    heart() {
      const ac = ensure();
      if (!ac) return;
      tone(196.0, ac.currentTime, 0.4, 'sawtooth', 0.07);
      tone(147.0, ac.currentTime + 0.08, 0.5, 'sawtooth', 0.06);
    },
    // A soft two-note warning when the wax starts cooling: a nudge, not an alarm.
    warn() {
      const ac = ensure();
      if (!ac) return;
      tone(659.25, ac.currentTime, 0.25, 'sine', 0.08);
      tone(523.25, ac.currentTime + 0.22, 0.3, 'sine', 0.08);
    },
    win() {
      const ac = ensure();
      if (!ac) return;
      WIN_NOTES.forEach((f, i) => tone(f, ac.currentTime + i * 0.11, 0.8, 'sine', 0.1));
    },
    click() {
      const ac = ensure();
      if (!ac) return;
      tone(880.0, ac.currentTime, 0.12, 'triangle', 0.06);
    },
  };
}
