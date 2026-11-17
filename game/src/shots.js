// The screenshot scenes behind ?shot=start|play|upgrade|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot, so the frame is what a real game looks like and the same seed always
// gives the same frame. The upgrade scene plays until a wave is cleared and stops on
// the choice screen; the end scene's pilot is short-sighted, so it is caught out as
// a hurried player is, and the frame shows the game-over screen.
//
// The pilot scores eight directions each step: it likes moving toward the nearest
// ember, it dislikes moving toward a wisp (more so the closer the wisp is), and it
// prefers staying near the middle of the lagoon so it is never pinned in a corner.
// It pulses when a wisp gets close enough to shove.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WAVE_CLEAR } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 30;
const END_LIMIT_SECONDS = 600;
const UPGRADE_LIMIT_SECONDS = 180;

const DIRECTIONS = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
  { x: 0.7071, y: 0.7071 }, { x: -0.7071, y: 0.7071 },
  { x: 0.7071, y: -0.7071 }, { x: -0.7071, y: -0.7071 },
];

/**
 * The steering vector for one step, and whether to pulse. `careful` weighs the
 * wisps more heavily: the play pilot dodges early, the end pilot reacts late.
 */
function autopilot(state, careful) {
  const player = state.player;
  let ember = null;
  let emberD = Infinity;
  for (const e of state.embers) {
    if (!e.active) continue;
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d < emberD) {
      emberD = d;
      ember = e;
    }
  }
  let wispD = Infinity;
  for (const w of state.wisps) {
    if (!w.active) continue;
    const d = Math.hypot(w.x - player.x, w.y - player.y);
    if (d < wispD) wispD = d;
  }
  const wispWeight = careful ? 3.2 : 1.4;
  const lookAhead = 0.45;
  let best = DIRECTIONS[0];
  let bestScore = -Infinity;
  for (const dir of DIRECTIONS) {
    const nx = Math.min(FIELD.width - 20, Math.max(20, player.x + dir.x * 300 * lookAhead));
    const ny = Math.min(FIELD.height - 20, Math.max(76, player.y + dir.y * 300 * lookAhead));
    let score = 0;
    if (ember) score -= Math.hypot(ember.x - nx, ember.y - ny) * 0.01;
    let nearWisp = Infinity;
    for (const w of state.wisps) {
      if (!w.active) continue;
      const d = Math.hypot(w.x - nx, w.y - ny);
      if (d < nearWisp) nearWisp = d;
    }
    if (nearWisp !== Infinity) score += Math.min(nearWisp, 320) * 0.01 * wispWeight;
    // Prefer the middle of the lagoon: a corner is a trap.
    score -= Math.hypot(nx - FIELD.width / 2, ny - FIELD.height / 2) * 0.001;
    if (score > bestScore) {
      bestScore = score;
      best = dir;
    }
  }
  return { steer: best, pulse: wispD < 190 };
}

/**
 * Set `world` to the named scene (start, play, upgrade or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      const a = autopilot(world.state, true);
      if (world.step(STEP, a.steer, a.pulse, false) & EVENT_OVER) break;
    }
    return { screen: world.state.hearts === 0 ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'upgrade') {
    for (let i = 0; i < UPGRADE_LIMIT_SECONDS / STEP; i += 1) {
      const a = autopilot(world.state, true);
      const events = world.step(STEP, a.steer, a.pulse, false);
      if (events & EVENT_WAVE_CLEAR) break;
      if (events & EVENT_OVER) break;
    }
    return { screen: world.state.offer.length > 0 ? SCREEN_UPGRADE : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      const a = autopilot(world.state, false);
      if (world.step(STEP, a.steer, a.pulse, false) & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  // Start: the lagoon drifts behind the title, harmless, for a few seconds.
  for (let i = 0; i < START_SECONDS / STEP; i += 1) {
    world.step(STEP, { x: 0, y: 0 }, false, true);
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
