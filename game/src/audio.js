// All of Glowfall's sound, synthesised with WebAudio: no audio files, no network,
// nothing copyrighted. A tiny bell for an ember (its pitch climbs with the combo),
// a low thump for a pulse, a buzz for a hit, a fanfare for a cleared wave, and a
// deep drone for the Tide King. Sound starts only after the player's first gesture
// (the browser's rule), and M mutes it; every call is safe before that moment.

export function createAudio() {
  let context = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (context !== null) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted || !ensure() || context.state === 'suspended') return;
    try {
      if (context.state === 'suspended') void context.resume();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, context.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, context.currentTime + dur);
      gain.gain.setValueAtTime(vol, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(context.currentTime + dur);
    } catch {
      // Sound is garnish: a failure here must never stop the game.
    }
  }

  return {
    /** Unlock the audio context from the player's first gesture. */
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    /** Ember chime: higher with the combo, so a streak sounds like a climb. */
    ember(combo) {
      const base = 520 * Math.pow(1.059, Math.min(combo, 12));
      tone(base, 0.22, 'sine', 0.5);
      tone(base * 1.5, 0.3, 'sine', 0.25);
    },
    pulse() {
      tone(180, 0.35, 'sine', 0.7, 60);
      tone(1200, 0.12, 'triangle', 0.2, 900);
    },
    hit() {
      tone(140, 0.3, 'sawtooth', 0.5, 70);
    },
    waveClear() {
      tone(523, 0.16, 'triangle', 0.45);
      setTimeout(() => tone(659, 0.16, 'triangle', 0.45), 110);
      setTimeout(() => tone(784, 0.3, 'triangle', 0.5), 220);
    },
    boss() {
      tone(98, 0.8, 'sawtooth', 0.4, 65);
      tone(147, 0.8, 'sine', 0.3, 98);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'triangle', 0.5), i * 130));
    },
  };
}
