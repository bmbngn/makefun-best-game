// Keyboard and pointer input for Glowfall. Held keys give a steering vector (WASD or
// arrows); one-shot presses are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. A mouse click or a
// tap fires the lantern pulse, and the pointer position is kept in playfield
// coordinates for the renderer's aim hint.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_PULSE = 4;
export const ACTION_MUTE = 8;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Enter']);
const PULSE = new Set(['Space']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const CHOICE = new Set(['Digit1', 'Digit2', 'Digit3']);

export function createInput(target, toField) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let actions = 0;
  let choice = 0;
  const pointer = { x: 640, y: 360, down: false };

  function mark(code) {
    if (UP.has(code)) up = true;
    else if (DOWN.has(code)) down = true;
    else if (LEFT.has(code)) left = true;
    else if (RIGHT.has(code)) right = true;
    else if (CONFIRM.has(code)) actions |= ACTION_CONFIRM;
    else if (PULSE.has(code)) actions |= ACTION_PULSE;
    else if (PAUSE.has(code)) actions |= ACTION_PAUSE;
    else if (MUTE.has(code)) actions |= ACTION_MUTE;
    else if (CHOICE.has(code)) choice = Number(code.slice(-1));
    else return false;
    return true;
  }

  window.addEventListener('keydown', (event) => {
    if (!mark(event.code)) return;
    // Space scrolls the page and arrows move it too: the game owns those keys.
    if (PULSE.has(event.code) || UP.has(event.code) || DOWN.has(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    up = false;
    down = false;
    left = false;
    right = false;
    pointer.down = false;
  });
  target.addEventListener('pointerdown', (event) => {
    const p = toField(event.clientX, event.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.down = true;
    actions |= ACTION_PULSE;
  });
  target.addEventListener('pointermove', (event) => {
    const p = toField(event.clientX, event.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
  });
  target.addEventListener('pointerup', () => {
    pointer.down = false;
  });

  return {
    /** The steering vector, each component -1, 0 or 1, normalised by the caller. */
    steering() {
      return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
    },
    /** The pointer's last position in playfield coordinates. */
    pointer() {
      return pointer;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The upgrade key (1, 2 or 3) pressed since the last call, or 0. */
    takeChoice() {
      const taken = choice;
      choice = 0;
      return taken;
    },
  };
}
