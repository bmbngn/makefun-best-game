// The screenshot scenes behind ?shot=start|play|done|end. Each one plays the
// real rules forward from a fresh world, steered by a pen that traces the
// guide strokes one at a time — lifting between strokes, as a hand would — so
// the frame is what a real game looks like and the same seed always gives the
// same frame. The play scene traces part of the first cloth; the done scene
// traces all of it and stops on the cloth-lit screen; the end scene traces
// all seven cloths and stops on the gallery.
import { STEP } from './config.js';
import { EVENT_CLEAR, EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_CLEAR, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { CLOTH } from './config.js';

function penAt(lx, ly, drawing = true) {
  return { x: lx + CLOTH.x, y: ly + CLOTH.y, drawing };
}

/**
 * Trace the given segments in order, `perStep` guide points per fixed step,
 * lifting the pen between strokes. Stops early on a clear / over / win event
 * and returns the events seen.
 */
function traceSegments(world, segments, perStep, maxSegments = Infinity) {
  let events = 0;
  let done = 0;
  for (const seg of segments) {
    if (done >= maxSegments) break;
    done += 1;
    let idx = 0;
    const pts = seg.filter((p) => !p.covered);
    for (let i = 0; i < 60 * 120 && idx < pts.length; i += 1) {
      const target = pts[Math.min(pts.length - 1, Math.floor(idx))];
      events |= world.step(STEP, penAt(target.x, target.y));
      idx += perStep;
      if (events & (EVENT_CLEAR | EVENT_OVER | EVENT_WIN)) return events;
    }
    // Lift the pen and let the world tick while moving to the next stroke.
    for (let i = 0; i < 4; i += 1) world.step(STEP, penAt(0, 0, false));
    if (events & (EVENT_CLEAR | EVENT_OVER | EVENT_WIN)) return events;
  }
  return events;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    // Mid-draw: trace the first three strokes of the first cloth only.
    traceSegments(world, world.state.segments, 1.5, 3);
    return { screen: world.state.status === 'over' ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'done') {
    // Visit every remaining guide point: the filtered list can be sparse
    // where earlier strokes already inked part of this one, so skipping
    // points would strand a few uninked.
    traceSegments(world, world.state.segments, 1);
    return { screen: world.state.status === 'clear' ? SCREEN_CLEAR : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    // Trace every cloth to the gallery, advancing after each clear.
    for (let c = 0; c < 7; c += 1) {
      traceSegments(world, world.state.segments, 1);
      if (world.state.status === 'clear') {
        const events = world.nextCloth();
        if (events & EVENT_WIN) break;
      } else {
        break;
      }
    }
    return { screen: world.state.status === 'win' ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
  }
  // Start: the cloth shimmers behind the title, untouched, for a few seconds.
  for (let i = 0; i < 6 / STEP; i += 1) world.step(STEP, null);
  return { screen: SCREEN_TITLE, best: 0 };
}
