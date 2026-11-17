// Every tuning number and colour for Batik in one place. The cloth is a fixed
// 1280x720 logical field; the renderer scales it to the window, so no rule below
// depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const BEST_KEY = 'batik-best-score';

export const HEARTS = 3;

/** The cloth the player draws on, in field coordinates. */
export const CLOTH = { x: 110, y: 96, width: 1060, height: 500 };

/** How close the canting tip must pass to a guide point to ink it. Generous
 * on purpose: the game is forgiving, not punishing — a wide snap radius. */
export const TRACE_RADIUS = 40;
/** How far from any guide a stroke may wander before it counts as a blot.
 * A stray line never fails anything on its own; it only leaves a small mark. */
export const BLOT_RADIUS = 110;
/** A stroke that wanders this far from a guide leaves a blot mark, at most
 * one every 0.4 s, so a stray line marks the cloth lightly instead of
 * splattering it. */
export const BLOT_EVERY = 0.4;
/** Seconds of wax left when the cooling warning shows. */
export const WARN_AT_SECONDS = 15;

export const SCORE = {
  segment: 100,
  segmentPerCloth: 25,
  accuracyBonus: 500,
  timeBonusPerSecond: 8,
  blotPenalty: 5,
};

/** One entry per cloth: name, what the motif is, seconds before the wax cools.
 * Generous timers: the warning comes long before the darkness does. */
export const CLOTHS = [
  { name: 'Kawung', note: 'four petals, one flower', time: 120 },
  { name: 'Parang', note: 'blades running diagonal', time: 115 },
  { name: 'Mega Mendung', note: 'clouds over the sea', time: 110 },
  { name: 'Truntum', note: 'a field of small stars', time: 105 },
  { name: 'Sekar Jagad', note: 'islands on a map', time: 100 },
  { name: 'Sidomukti', note: 'diamonds, blessed', time: 95 },
  { name: 'Garuda', note: 'wings spread wide', time: 90 },
];

export const PALETTE = {
  night: '#0b1026',
  nightEdge: '#05070f',
  cloth: '#1b2a6b',
  clothDeep: '#142052',
  clothEdge: '#d8b25c',
  clothEdgeDim: '#8a6f35',
  guide: '#e8c96a',
  gold: '#f2c94c',
  goldBright: '#ffe9a3',
  ink: '#f7d774',
  blot: '#0a0d1f',
  shadow: '#02030a',
  text: '#f4ead0',
  textDim: '#b9a86e',
  heart: '#e2607a',
  heartEmpty: '#3a3350',
};
