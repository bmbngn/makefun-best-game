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
 * Generous timers: the warning comes long before the darkness does.
 * Each cloth also carries a real-world price tier, rising with difficulty:
 * real batik is priced by how it is made — printed cloth is cheap, stamped
 * cap costs more, hand-drawn tulis costs the most and takes months. The
 * value is a range per metre, approximate, in Indonesian rupiah: printed
 * ~Rp 25k–80k, cap ~Rp 150k–500k, tulis from ~Rp 500k past Rp 5M, and
 * premium tulis houses (Iwan Tirta) Rp 5M–25M+. The `trivia` line is one
 * verified fact per motif, shown when the cloth is lit. */
export const CLOTHS = [
  { name: 'Kawung', note: 'four petals, one flower', time: 120, craft: 'printed', value: [25000, 80000], trivia: 'Kawung is among the oldest Javanese motifs — palm-flower geometry, drawn for centuries.' },
  { name: 'Parang', note: 'blades running diagonal', time: 115, craft: 'cap', value: [150000, 500000], trivia: 'Parang was once worn only by royalty in the courts of Yogyakarta and Solo.' },
  { name: 'Mega Mendung', note: 'clouds over the sea', time: 110, craft: 'cap', value: [200000, 500000], trivia: 'Mega Mendung is a cloud motif from Cirebon, on Java\u2019s north coast.' },
  { name: 'Truntum', note: 'a field of small stars', time: 105, craft: 'tulis', value: [500000, 1500000], trivia: 'Legend says Truntum was created by a queen of Surakarta.' },
  { name: 'Sekar Jagad', note: 'islands on a map', time: 100, craft: 'tulis', value: [1000000, 3000000], trivia: '\u2018Sekar Jagad\u2019 means \u2018flower of the world\u2019 — islands on a map.' },
  { name: 'Sidomukti', note: 'diamonds, blessed', time: 95, craft: 'tulis', value: [3000000, 5000000], trivia: 'Sidomukti is traditionally worn at weddings.' },
  { name: 'Garuda', note: 'wings spread wide', time: 90, craft: 'premium tulis', value: [5000000, 25000000], trivia: 'Museum-grade batik is serious art: Australia\u2019s National Gallery paid $6.5M for about 400 rare Indonesian textiles.' },
];

/** Short rupiah: 25000 -> "25k", 1500000 -> "1.5M", 25000000 -> "25M". */
export function shortRp(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

/** "Rp 25k", "Rp 1.5M". */
export function formatRp(n) {
  return `Rp ${shortRp(n)}`;
}

/** A cloth's value range, approximate: "~Rp 25k–80k". */
export function valueLabel(cloth) {
  return `~Rp ${shortRp(cloth.value[0])}–${shortRp(cloth.value[1])}`;
}

/** The whole collection's value range: the seven cloths' ranges added up,
 * still approximate. Returns "~Rp 9.9M–35.6M" for the tiers above. */
export function collectionValueLabel() {
  let lo = 0;
  let hi = 0;
  for (const c of CLOTHS) {
    lo += c.value[0];
    hi += c.value[1];
  }
  return `~Rp ${shortRp(lo)}–${shortRp(hi)}`;
}

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
