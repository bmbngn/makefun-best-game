// Every tuning number and colour for Glowfall in one place. The playfield is a fixed
// 1280x720 logical lagoon; the renderer scales it to the window, so no rule below
// depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 18,
  speed: 300,
  /** Seconds of flashing safety after a wisp touches the lantern. */
  invulnerable: 1.6,
  maxHearts: 5,
};

export const HEARTS = 3;

/** A glowing ember: drift, value and how often one appears. */
export const EMBER = {
  radius: 10,
  /** Points for one ember before the combo multiplier. */
  points: 10,
  drift: 26,
  /** Seconds between ember spawns at wave 1; each wave shortens it a little. */
  interval: 1.15,
  intervalPerWave: 0.06,
  minInterval: 0.55,
  /** Seconds in which a second ember keeps the combo alive. */
  comboWindow: 3,
  /** Largest combo multiplier. */
  maxCombo: 5,
};

/** A shadow wisp: it chases the lantern, and a touch costs a heart. */
export const WISP = {
  radius: 17,
  speed: 80,
  speedPerWave: 13,
  maxSpeed: 230,
  /** Seconds between wisp spawns at wave 1; each wave shortens it. */
  interval: 3.0,
  intervalPerWave: 0.16,
  minInterval: 0.7,
  /** Points for shoving a wisp away with a pulse. */
  repelPoints: 5,
};

/** The lantern pulse: a ring of light that shoves wisps away and gathers near embers. */
export const PULSE = {
  radius: 135,
  cooldown: 2.2,
  /** How far a repelled wisp is thrown, in pixels. */
  shove: 280,
  /** Seconds a repelled wisp is stunned and cannot chase. */
  stun: 1.4,
};

/** Waves: embers to gather to clear one, wisps allowed out at once, and the last wave. */
export const WAVE = {
  /** Embers to collect to clear wave n: base + perWave * n. */
  quotaBase: 6,
  quotaPerWave: 2,
  /** Wisps out at once on wave n: base + perWave * n, capped. */
  wispCapBase: 2,
  wispCapPerWave: 1,
  wispCapMax: 9,
  /** The Tide King, the boss wisp, arrives on this wave. */
  bossWave: 8,
  /** Points for clearing wave n: base * n. */
  clearPoints: 100,
};

/** The Tide King: a great wisp that only a pulse can wound. */
export const BOSS = {
  radius: 52,
  speed: 70,
  /** Pulse hits needed to sink it. */
  health: 6,
  /** Points for sinking it and winning the game. */
  points: 500,
};

/** Upgrades offered, three at a time, when a wave is cleared. */
export const UPGRADES = [
  { id: 'swift', name: 'Swift Current', text: '+15% lantern speed' },
  { id: 'wide', name: 'Wide Pulse', text: '+45 pulse radius' },
  { id: 'magnet', name: 'Ember Magnet', text: 'Embers drift to you from farther away' },
  { id: 'heart', name: 'Second Heart', text: '+1 heart (up to 5)' },
  { id: 'golden', name: 'Golden Embers', text: 'Every ember is worth double' },
  { id: 'steady', name: 'Steady Light', text: 'Pulse recharges 30% faster' },
];

/** How many things can exist at once; the pools are allocated once, at boot. */
export const POOL = { embers: 48, wisps: 32, particles: 160, ripples: 24 };

export const PALETTE = {
  backdrop: '#0a1210',
  lagoonDeep: '#0d1f1c',
  lagoon: '#123029',
  lagoonLight: '#17443a',
  player: '#ffcf6e',
  playerCore: '#fff3c4',
  ember: '#ffd34d',
  emberCore: '#fff0a8',
  wisp: '#8b7cf6',
  wispCore: '#c9b8ff',
  boss: '#b388ff',
  pulse: '#9fe8ff',
  heart: '#ff6b81',
  panel: '#10231f',
  panelEdge: '#2a5a4c',
  text: '#f2f7ee',
  muted: '#9db8ab',
  gold: '#ffd34d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'glowfall.best';
