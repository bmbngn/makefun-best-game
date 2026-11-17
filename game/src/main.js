// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between six screens: title, play, upgrade, paused and game
// over (won or lost).
//
// ?seed=N fixes the lagoon's pattern. ?shot=start|play|upgrade|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, HEARTS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BOSS, EVENT_EMBER, EVENT_HIT, EVENT_OVER, EVENT_PULSE, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_PULSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE } from './render.js';
import { stageShot } from './shots.js';
import { createAudio } from './audio.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, 12, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (x, y) => renderer.toField(x, y));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let muted = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce(`Playing. ${HEARTS} hearts. Gather the embers.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (world.state.won) {
      audio.win();
      announce(`You won! Score ${world.state.score}. Best ${best}.`);
    } else {
      announce(`Game over. Score ${world.state.score}. Best ${best}.`);
    }
  }

  function chooseUpgrade(index) {
    const offer = world.state.offer;
    if (index < 1 || index > offer.length) return;
    const picked = offer[index - 1];
    world.applyUpgrade(picked.id);
    screen = SCREEN_PLAY;
    announce(`Blessing: ${picked.name}. Wave ${world.state.wave}.`);
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      muted = audio.toggleMute();
      announce(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (screen === SCREEN_UPGRADE) {
      const choice = input.takeChoice();
      if (choice > 0) {
        chooseUpgrade(choice);
        return;
      }
      // A click on a blessing card picks it: the cards sit in a row, 260 wide.
      const p = input.pointer();
      if (p.down && p.y >= 270 && p.y <= 420) {
        const card = Math.floor((p.x - 220) / 290) + 1;
        if (card >= 1 && card <= 3 && (p.x - 220) % 290 < 260) chooseUpgrade(card);
      }
      return;
    }
    if (actions & (ACTION_CONFIRM | ACTION_PULSE) && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function stepWorld(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, false, true);
      return;
    }
    const steer = input.steering();
    const len = Math.hypot(steer.x, steer.y) || 1;
    const norm = { x: steer.x / len, y: steer.y / len };
    const events = world.step(STEP, norm, Boolean(actions & ACTION_PULSE), false);
    if (events & EVENT_EMBER) audio.ember(world.state.combo);
    if (events & EVENT_PULSE) audio.pulse();
    if (events & EVENT_BOSS) {
      audio.boss();
      announce('The Tide King has risen! Pulse it to wound it.');
    }
    if (events & EVENT_HIT) {
      audio.hit();
      announce(world.state.hearts === 1 ? 'Hit. 1 heart left.' : `Hit. ${world.state.hearts} hearts left.`);
    }
    if (events & EVENT_WAVE_CLEAR) {
      audio.waveClear();
      screen = SCREEN_UPGRADE;
      announce(`Wave cleared. Choose a blessing.`);
    }
    if (events & EVENT_WIN) endGame();
    else if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // Take the one-shot presses once per frame and share them: the pulse must
    // reach the world, not be eaten by the screen handler.
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        stepWorld(actions);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, now / 1000, muted, world.pulseCooldown());
  }

  // Leaving the tab pauses a running game rather than letting wisps hunt unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Glowfall. Press Enter or click to light the lantern.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
