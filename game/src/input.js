// Pointer and keyboard input. The canting tool is the pointer: press and drag
// across the cloth to draw. Keyboard: Enter starts / restarts, P pauses,
// M mutes, 1-7 is never needed — the cloths come in order.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_RESTART = 'restart';

/**
 * `toField` maps a client point to field coordinates. `onKey` is called with
 * one of the ACTION_* names. Returns the live pen: {x, y, drawing}.
 */
export function createInput(canvas, toField, onKey) {
  const pen = { x: FIELD.width / 2, y: FIELD.height / 2, drawing: false };
  let down = false;

  function update(e) {
    const rect = canvas.getBoundingClientRect();
    const p = toField(e.clientX - rect.left, e.clientY - rect.top);
    pen.x = p.x;
    pen.y = p.y;
  }

  canvas.addEventListener('pointerdown', (e) => {
    down = true;
    pen.drawing = true;
    update(e);
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    update(e);
    pen.drawing = down;
  });
  function release(e) {
    down = false;
    pen.drawing = false;
    if (e) update(e);
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => {
    pen.drawing = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key === 'Enter' || e.key === ' ') onKey(ACTION_CONFIRM);
    else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') onKey(ACTION_PAUSE);
    else if (e.key === 'm' || e.key === 'M') onKey(ACTION_MUTE);
    else if (e.key === 'r' || e.key === 'R') onKey(ACTION_RESTART);
  });

  return pen;
}
