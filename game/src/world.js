// The game rules: seven cloths, one motif each. The player traces the faint
// guide strokes with the canting tool; every guide point the tip passes over
// is inked gold. Finish a cloth before the wax cools and the darkness takes
// it, or lose a heart. Finish all seven and the gallery lights up.
import { BLOT_EVERY, BLOT_RADIUS, CLOTH, CLOTHS, HEARTS, SCORE, TRACE_RADIUS } from './config.js';
import { motifStrokes } from './motifs.js';

export const EVENT_SEGMENT = 1;
export const EVENT_CLEAR = 2;
export const EVENT_HEART = 4;
export const EVENT_OVER = 8;
export const EVENT_WIN = 16;

/** Distance between sampled guide points along a stroke, in cloth pixels. */
const SAMPLE_STEP = 8;

function sampleStroke(stroke) {
  const pts = [];
  for (let i = 0; i < stroke.length - 1; i += 1) {
    const [x0, y0] = stroke[i];
    const [x1, y1] = stroke[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / SAMPLE_STEP));
    for (let k = 0; k < n; k += 1) {
      pts.push({ x: x0 + ((x1 - x0) * k) / n, y: y0 + ((y1 - y0) * k) / n, covered: false });
    }
  }
  const last = stroke[stroke.length - 1];
  pts.push({ x: last[0], y: last[1], covered: false });
  return pts;
}

export function createWorld(random) {
  const state = {
    clothIndex: 0,
    hearts: HEARTS,
    score: 0,
    timeLeft: 0,
    timeLimit: 1,
    progress: 0,
    accuracy: 1,
    streak: 0,
    segmentsDone: 0,
    segmentsTotal: 0,
    status: 'playing',
    clearBonus: 0,
    /** Seconds left on the "a heart is lost" recovery banner; 0 hides it. */
    heartBanner: 0,
    // The guide strokes, sampled: segments[i] is a list of {x, y, covered}.
    segments: [],
    // The gold ink the player has laid down, cloth-local points.
    trail: [],
    blots: [],
    // Sparkles drift over the cloth for life; seeded, so shots are stable.
    sparkles: [],
  };

  let onGuideMoves = 0;
  let totalMoves = 0;
  let blotClock = 0;
  let coveredCount = 0;
  let totalCount = 0;

  function loadCloth(index) {
    const strokes = motifStrokes(index);
    state.segments = strokes.map(sampleStroke);
    state.segmentsTotal = state.segments.length;
    state.segmentsDone = 0;
    state.trail = [];
    state.blots = [];
    state.timeLimit = CLOTHS[index].time;
    state.timeLeft = CLOTHS[index].time;
    state.progress = 0;
    state.accuracy = 1;
    state.streak = 0;
    state.clearBonus = 0;
    onGuideMoves = 0;
    totalMoves = 0;
    blotClock = 0;
    coveredCount = 0;
    totalCount = 0;
    for (const seg of state.segments) totalCount += seg.length;
    state.sparkles = [];
    for (let i = 0; i < 26; i += 1) {
      state.sparkles.push({
        x: random.range(0, CLOTH.width),
        y: random.range(0, CLOTH.height),
        r: random.range(1, 2.6),
        phase: random.range(0, Math.PI * 2),
        speed: random.range(0.4, 1.1),
      });
    }
  }

  function reset() {
    state.clothIndex = 0;
    state.hearts = HEARTS;
    state.score = 0;
    state.status = 'playing';
    loadCloth(0);
  }

  // Losing a heart is a recovery, not a punishment: the same cloth is
  // rewaxed fresh, the score earned so far is kept, and a banner says so.
  // Only the third lost heart ends the game.
  function loseHeart() {
    state.hearts -= 1;
    state.streak = 0;
    if (state.hearts <= 0) {
      state.status = 'over';
      return EVENT_HEART | EVENT_OVER;
    }
    loadCloth(state.clothIndex);
    state.heartBanner = 3;
    return EVENT_HEART;
  }

  /** Advance to the next cloth after a clear; returns the win event if done. */
  function nextCloth() {
    state.clothIndex += 1;
    if (state.clothIndex >= CLOTHS.length) {
      state.status = 'win';
      return EVENT_WIN;
    }
    loadCloth(state.clothIndex);
    state.status = 'playing';
    return 0;
  }

  /**
   * One fixed step. `pen` is {x, y, drawing} in field coordinates, or null when
   * the pointer is not over the cloth. Returns an event bitmask.
   */
  function step(dt, pen) {
    if (state.heartBanner > 0) state.heartBanner = Math.max(0, state.heartBanner - dt);
    if (state.status !== 'playing') return 0;
    let events = 0;
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      return loseHeart();
    }
    if (!pen || !pen.drawing) return events;
    const lx = pen.x - CLOTH.x;
    const ly = pen.y - CLOTH.y;
    if (lx < -20 || ly < -20 || lx > CLOTH.width + 20 || ly > CLOTH.height + 20) return events;

    // Find the nearest uncovered guide point to the tip.
    let best = null;
    let bestD = Infinity;
    let bestSeg = -1;
    for (let s = 0; s < state.segments.length; s += 1) {
      for (const p of state.segments[s]) {
        if (p.covered) continue;
        const d = Math.hypot(p.x - lx, p.y - ly);
        if (d < bestD) {
          bestD = d;
          best = p;
          bestSeg = s;
        }
      }
    }
    totalMoves += 1;
    if (bestD <= TRACE_RADIUS) {
      onGuideMoves += 1;
      state.trail.push({ x: lx, y: ly });
      // Ink every uncovered point near the tip, not just the nearest one.
      for (const seg of state.segments) {
        for (const p of seg) {
          if (!p.covered && Math.hypot(p.x - lx, p.y - ly) <= TRACE_RADIUS) {
            p.covered = true;
            coveredCount += 1;
          }
        }
      }
      state.progress = totalCount === 0 ? 1 : coveredCount / totalCount;
      // A finished segment pays, and the streak grows.
      let segDone = true;
      for (const p of state.segments[bestSeg]) {
        if (!p.covered) { segDone = false; break; }
      }
      if (segDone && !state.segments[bestSeg].paid) {
        state.segments[bestSeg].paid = true;
        state.segmentsDone += 1;
        state.streak += 1;
        const pts = SCORE.segment + SCORE.segmentPerCloth * state.clothIndex + state.streak * 5;
        state.score += pts;
        events |= EVENT_SEGMENT;
      }
      if (state.progress >= 1) {
        const accuracy = totalMoves === 0 ? 1 : onGuideMoves / totalMoves;
        state.accuracy = accuracy;
        const timeBonus = Math.round(state.timeLeft * SCORE.timeBonusPerSecond);
        const accBonus = Math.round(accuracy * SCORE.accuracyBonus);
        state.clearBonus = timeBonus + accBonus;
        state.score += state.clearBonus;
        state.status = 'clear';
        events |= EVENT_CLEAR;
      }
    } else if (bestD > BLOT_RADIUS) {
      // Wandering far from any guide leaves a small blot mark and costs a
      // few points — never a fail, never a lost heart, and the streak stands.
      blotClock += dt;
      if (blotClock >= BLOT_EVERY) {
        blotClock = 0;
        state.blots.push({ x: lx, y: ly, r: 7 + random.range(0, 6) });
        state.score = Math.max(0, state.score - SCORE.blotPenalty);
      }
    }
    return events;
  }

  reset();
  return { state, reset, loadCloth, step, nextCloth };
}
