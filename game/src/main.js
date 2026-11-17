// Boot and the one loop: the pen is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between six screens: title, play, paused, cloth-lit, game over and the win
// gallery.
//
// ?seed=N fixes the cloth's sparkles. ?shot=start|play|done|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CLEAR, EVENT_HEART, EVENT_OVER, EVENT_SEGMENT, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_CLEAR, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';
import { createAudio } from './audio.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
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
    // Storage can be off (private windows): the best then lasts this visit only.
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
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let muted = false;
  let pausedFrom = SCREEN_PLAY;

  function announce(message) {
    status.textContent = message;
  }

  function bankBest() {
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.click();
    announce('Playing. Three hearts. Trace the gold guides before the wax cools.');
  }

  function advanceFromClear() {
    const events = world.nextCloth();
    if (events & EVENT_WIN) {
      screen = SCREEN_WIN;
      bankBest();
      audio.win();
      announce(`The gallery is lit. Score ${world.state.score}.`);
    } else {
      screen = SCREEN_PLAY;
      audio.click();
      announce(`Cloth ${world.state.clothIndex + 1} of 7.`);
    }
  }

  // Every state has a reachable next action, and restart always works:
  // Enter advances on a menu screen and restarts mid-play; R restarts
  // from anywhere, even paused.
  function confirm() {
    if (screen === SCREEN_TITLE) startGame();
    else if (screen === SCREEN_CLEAR) advanceFromClear();
    else if (screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
    else if (screen === SCREEN_PAUSED) {
      screen = pausedFrom;
      announce('Playing.');
    } else if (screen === SCREEN_PLAY) {
      startGame();
      announce('Restarted from the first cloth.');
    }
  }

  function pause() {
    if (screen === SCREEN_PLAY) {
      pausedFrom = SCREEN_PLAY;
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (screen === SCREEN_PAUSED) {
      screen = pausedFrom;
      announce('Playing.');
    }
  }

  function mute() {
    muted = audio.toggleMute();
    announce(muted ? 'Muted.' : 'Sound on.');
  }

  const pen = createInput(canvas, (x, y) => renderer.toField(x, y), (action) => {
    if (action === ACTION_CONFIRM) confirm();
    else if (action === ACTION_PAUSE) pause();
    else if (action === ACTION_MUTE) mute();
    else if (action === ACTION_RESTART) startGame();
  });

  // A click (or tap) on a menu screen is a confirm, just like Enter.
  canvas.addEventListener('pointerdown', () => {
    if (screen !== SCREEN_PLAY) confirm();
  });

  // The cooling warning sounds once per cloth, 15 seconds from the end.
  let warnedCloth = -1;
  function frame(now) {
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    if (screen === SCREEN_PLAY) {
      if (world.state.timeLeft <= 15 && warnedCloth !== world.state.clothIndex) {
        warnedCloth = world.state.clothIndex;
        audio.warn();
        announce('The wax is cooling — hurry.');
      }
      accumulator += dt;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = world.step(STEP, pen);
        if (events & EVENT_SEGMENT) audio.segment();
        if (events & EVENT_HEART) audio.heart();
        if (events & EVENT_CLEAR) {
          screen = SCREEN_CLEAR;
          bankBest();
          audio.clear();
          announce('Cloth lit! Press Enter for the next cloth.');
        }
        if (events & EVENT_OVER) {
          screen = SCREEN_OVER;
          bankBest();
          announce(`The darkness took the cloth. Score ${world.state.score}.`);
        }
        if (events & EVENT_WIN) {
          screen = SCREEN_WIN;
          bankBest();
          audio.win();
        }
        if (screen !== SCREEN_PLAY) break;
      }
    }
    renderer.draw(world.state, screen, best, now / 1000, muted);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
