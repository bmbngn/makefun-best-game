// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// lagoon is scaled to fit the window and centred, the margin filled with the backdrop
// colour. The lagoon is a dark teal gradient with lily pads and reeds; embers glow gold,
// wisps glow violet, and the lantern throws a warm halo. Text that holds a number is
// rebuilt only when the number changes, so a frame allocates almost nothing.
import { BOSS, FIELD, FONT, PALETTE, WAVE } from './config.js';
import { waveQuota } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 680, top: 150, line: 34, bottom: 76 };
const HEART_R = 11;
const HEART_GAP = 10;

// Lily pads and reeds, fixed so the lagoon reads the same every run.
const LILIES = [
  { x: 90, y: 150, r: 26 }, { x: 1180, y: 120, r: 30 }, { x: 1050, y: 620, r: 24 },
  { x: 170, y: 590, r: 28 }, { x: 620, y: 90, r: 20 }, { x: 880, y: 200, r: 18 },
  { x: 330, y: 330, r: 16 }, { x: 980, y: 480, r: 22 },
];
const REEDS = [
  { x: 40, y: 300 }, { x: 1240, y: 350 }, { x: 60, y: 480 }, { x: 1220, y: 180 },
];

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

function heartPath(context, x, y, size) {
  context.beginPath();
  context.moveTo(x, y + size * 0.35);
  context.bezierCurveTo(x - size, y - size * 0.55, x - size * 0.4, y - size * 1.05, x, y - size * 0.35);
  context.bezierCurveTo(x + size * 0.4, y - size * 1.05, x + size, y - size * 0.55, x, y + size * 0.35);
  context.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const waveLabel = cachedLabel('Wave ');
  const bestLabel = cachedLabel('Best ');
  const finalLabel = cachedLabel('Score ');
  const comboLabel = cachedLabel('Combo x');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  /** A window point (client pixels) back into playfield coordinates. */
  function toField(clientX, clientY) {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) * ratio - view.x) / view.scale,
      y: ((clientY - rect.top) * ratio - view.y) / view.scale,
    };
  }

  function drawLagoon(time) {
    const grad = context.createLinearGradient(0, 56, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.lagoonLight);
    grad.addColorStop(0.5, PALETTE.lagoon);
    grad.addColorStop(1, PALETTE.lagoonDeep);
    context.fillStyle = grad;
    context.fillRect(0, 56, FIELD.width, FIELD.height - 56);
    // Shimmer: a few slow light bands drifting across the water.
    context.globalAlpha = 0.05;
    context.fillStyle = PALETTE.pulse;
    for (let i = 0; i < 3; i += 1) {
      const y = 140 + ((time * 12 + i * 210) % 560);
      context.fillRect(0, y, FIELD.width, 6);
    }
    context.globalAlpha = 1;
    // Lily pads and reeds, dark green, at the edges of the play.
    context.fillStyle = '#1d4a35';
    for (const lily of LILIES) {
      context.beginPath();
      context.arc(lily.x, lily.y, lily.r, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#2a6a4a';
      context.beginPath();
      context.arc(lily.x - lily.r * 0.25, lily.y - lily.r * 0.25, lily.r * 0.55, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#1d4a35';
    }
    context.strokeStyle = '#2a6a4a';
    context.lineWidth = 4;
    for (const reed of REEDS) {
      context.beginPath();
      context.moveTo(reed.x, reed.y + 30);
      context.quadraticCurveTo(reed.x + 8, reed.y - 10, reed.x - 4, reed.y - 34);
      context.stroke();
    }
  }

  function glowCircle(x, y, radius, core, halo, haloRadius) {
    context.globalAlpha = 0.28;
    context.fillStyle = halo;
    context.beginPath();
    context.arc(x, y, haloRadius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = core;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  function drawWorld(state, time) {
    drawLagoon(time);
    // Ripples first, under everything that floats.
    for (const r of state.ripples) {
      if (!r.active) continue;
      context.globalAlpha = Math.max(0, r.life * 1.4);
      context.strokeStyle = PALETTE.pulse;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
    }
    // Embers: gold, pulsing with their own phase.
    for (const e of state.embers) {
      if (!e.active) continue;
      const twinkle = 0.75 + 0.25 * Math.sin(e.phase);
      context.globalAlpha = twinkle;
      glowCircle(e.x, e.y, e.radius * 0.62, PALETTE.emberCore, PALETTE.ember, e.radius * 1.9);
      context.globalAlpha = 1;
    }
    // Wisps: violet shadows with a pale core and a little tail.
    for (const w of state.wisps) {
      if (!w.active) continue;
      const wobble = Math.sin(time * 3 + w.x * 0.02) * 3;
      context.globalAlpha = w.stun > 0 ? 0.45 : 0.9;
      glowCircle(w.x, w.y + wobble, w.radius * 0.6, w.boss ? PALETTE.boss : PALETTE.wispCore, w.boss ? PALETTE.boss : PALETTE.wisp, w.radius * 1.7);
      context.globalAlpha = 1;
      if (w.boss) {
        // The Tide King's crown of spikes and its remaining health.
        context.strokeStyle = PALETTE.boss;
        context.lineWidth = 3;
        for (let i = 0; i < 6; i += 1) {
          const a = (i / 6) * Math.PI * 2 + time * 0.4;
          context.beginPath();
          context.moveTo(w.x + Math.cos(a) * w.radius * 0.9, w.y + Math.sin(a) * w.radius * 0.9);
          context.lineTo(w.x + Math.cos(a) * (w.radius + 16), w.y + Math.sin(a) * (w.radius + 16));
          context.stroke();
        }
        text(`TIDE KING  ${'◆'.repeat(w.health)}${'◇'.repeat(BOSS.health - w.health)}`, FIELD.width / 2, 92, 24, PALETTE.boss, 'center');
      }
    }
    // Particles: sparks and splashes.
    for (const p of state.particles) {
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = p.color === 0 ? PALETTE.ember : p.color === 1 ? PALETTE.wispCore : PALETTE.pulse;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    // The lantern: warm halo, round hull, and a flame that leans where it moves.
    const player = state.player;
    if (player.invulnerable === 0 || Math.floor(player.invulnerable * 10) % 2 === 1) {
      glowCircle(player.x, player.y, PLAYER_RADIUS, PALETTE.playerCore, PALETTE.player, 46);
      context.fillStyle = '#7a5230';
      context.beginPath();
      context.arc(player.x, player.y + 6, 13, 0, Math.PI);
      context.fill();
      context.fillStyle = PALETTE.player;
      context.beginPath();
      context.arc(player.x + player.faceX * 4, player.y + player.faceY * 4 - 4, 7, 0, Math.PI * 2);
      context.fill();
    }
    // The pulse ring, expanding and fading.
    if (state.pulseRing > 0) {
      context.globalAlpha = 0.7;
      context.strokeStyle = PALETTE.pulse;
      context.lineWidth = 5;
      context.beginPath();
      context.arc(player.x, player.y, state.pulseRing, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
    }
  }

  const PLAYER_RADIUS = 18;

  function drawHud(state, muted, pulseCooldownMax) {
    // Top bar.
    context.fillStyle = PALETTE.panel;
    context.fillRect(0, 0, FIELD.width, 56);
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 14, 28, PALETTE.text, 'left');
    text(waveLabel(state.wave) + (state.wave === WAVE.bossWave ? '  —  TIDE KING' : ''), FIELD.width / 2, 14, 28, PALETTE.text, 'center');
    // Hearts, top right.
    const firstHeart = FIELD.width - 24 - state.hearts * (HEART_R * 2 + HEART_GAP) + HEART_GAP;
    for (let i = 0; i < state.hearts; i += 1) {
      context.fillStyle = PALETTE.heart;
      heartPath(context, firstHeart + i * (HEART_R * 2 + HEART_GAP) + HEART_R, 30, HEART_R);
      context.fill();
    }
    // Wave quota: embers gathered toward clearing the wave.
    const quota = waveQuota(state.wave);
    const barX = 24;
    const barW = 260;
    context.fillStyle = '#0a1210';
    context.fillRect(barX, 66, barW, 10);
    context.fillStyle = PALETTE.gold;
    context.fillRect(barX, 66, barW * Math.min(1, state.collected / quota), 10);
    text(`Embers ${Math.min(state.collected, quota)}/${quota}`, barX, 82, 18, PALETTE.muted, 'left');
    // Pulse cooldown, bottom left.
    const cd = state.pulseTimer;
    const cdMax = pulseCooldownMax;
    text(cd <= 0 ? 'PULSE READY — Space / click' : 'Pulse recharging…', 24, FIELD.height - 34, 20, cd <= 0 ? PALETTE.pulse : PALETTE.muted, 'left');
    if (cd > 0) {
      context.fillStyle = '#0a1210';
      context.fillRect(24, FIELD.height - 52, 180, 8);
      context.fillStyle = PALETTE.pulse;
      context.fillRect(24, FIELD.height - 52, 180 * (1 - cd / cdMax), 8);
    }
    if (state.combo > 1) {
      text(comboLabel(state.combo), FIELD.width - 24, FIELD.height - 34, 22, PALETTE.gold, 'right');
    }
    if (muted) text('Muted (M)', FIELD.width - 24, 66, 18, PALETTE.muted, 'right');
    else text('M: mute   P: pause', FIELD.width - 24, 66, 18, PALETTE.muted, 'right');
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, accent || PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 40, 24, PALETTE.gold, 'center');
  }

  function drawUpgrade(state, pulseCooldownMax) {
    drawHud(state, false, pulseCooldownMax);
    const x = (FIELD.width - 900) / 2;
    const y = 180;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, 900, 300);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, 900, 300);
    context.textBaseline = 'alphabetic';
    text(`Wave ${state.wave - 1} cleared!  Choose a blessing:`, FIELD.width / 2, y + 56, 30, PALETTE.text, 'center');
    state.offer.forEach((u, i) => {
      const cx = x + 30 + i * 290;
      context.fillStyle = '#0a1210';
      context.fillRect(cx, y + 90, 260, 150);
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 2;
      context.strokeRect(cx, y + 90, 260, 150);
      text(`[${i + 1}] ${u.name}`, cx + 130, y + 140, 22, PALETTE.gold, 'center');
      text(u.text, cx + 130, y + 180, 18, PALETTE.muted, 'center');
    });
    text('Press 1, 2 or 3 — or click a card', FIELD.width / 2, y + 268, 20, PALETTE.muted, 'center');
  }

  const TITLE_LINES = [
    'Gather the embers. Outrun the shadow wisps.',
    'WASD / arrows to sail · Space or click to pulse',
    'Clear waves, choose blessings, sink the Tide King.',
    '',
  ];

  /** Paint one frame: the lagoon, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, time, muted, pulseCooldownMax = 2.2) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawWorld(state, time);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[3] = bestLabel(best);
      drawPanel('GLOWFALL', TITLE_LINES, 'Press Enter or click to light the lantern');
      return;
    }
    if (screen === SCREEN_UPGRADE) {
      drawUpgrade(state, pulseCooldownMax);
      return;
    }
    drawHud(state, muted, pulseCooldownMax);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The wisps will wait for you.'], 'Press P to keep sailing');
    } else if (screen === SCREEN_OVER) {
      const won = state.won;
      drawPanel(
        won ? 'The Tide King is sunk!' : 'The lagoon went dark',
        [finalLabel(state.score), bestLabel(best), won ? 'You cleared all 8 waves.' : `You reached wave ${state.wave}.`],
        'Press Enter or click to sail again',
        won ? PALETTE.gold : PALETTE.text,
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField };
}
