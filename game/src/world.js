// The game's rules and state, with no drawing and no browser in it: the lantern, the
// drifting embers, the chasing wisps, the pulse, the waves, the upgrades and the Tide
// King. step() advances one fixed step and returns what happened as bit flags, so the
// caller can react without the world knowing about screens or sound. Nothing here
// allocates after createWorld returns: every ember, wisp, particle and ripple comes
// from a pool made at boot.

import { BOSS, EMBER, FIELD, HEARTS, PLAYER, POOL, PULSE, UPGRADES, WAVE, WISP } from './config.js';
import { pick, range } from './random.js';

export const EVENT_EMBER = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_WAVE_CLEAR = 8;
export const EVENT_PULSE = 16;
export const EVENT_WIN = 32;
export const EVENT_BOSS = 64;

export const KIND_EMBER = 0;
export const KIND_WISP = 1;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function waveQuota(wave) {
  return WAVE.quotaBase + WAVE.quotaPerWave * wave;
}

export function wispCap(wave) {
  return Math.min(WAVE.wispCapMax, WAVE.wispCapBase + WAVE.wispCapPerWave * wave);
}

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    radius: PLAYER.radius,
    invulnerable: 0,
    faceX: 0,
    faceY: -1,
  };
  const embers = [];
  for (let i = 0; i < POOL.embers; i += 1) {
    embers.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, radius: EMBER.radius, phase: 0 });
  }
  const wisps = [];
  for (let i = 0; i < POOL.wisps; i += 1) {
    wisps.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, radius: WISP.radius, stun: 0, boss: false, health: 0 });
  }
  const particles = [];
  for (let i = 0; i < POOL.particles; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: 0, size: 2 });
  }
  const ripples = [];
  for (let i = 0; i < POOL.ripples; i += 1) {
    ripples.push({ active: false, x: 0, y: 0, radius: 0, maxRadius: 0, life: 0 });
  }

  const state = {
    player,
    embers,
    wisps,
    particles,
    ripples,
    score: 0,
    hearts: HEARTS,
    wave: 1,
    collected: 0,
    combo: 0,
    comboTimer: 0,
    pulseTimer: 0,
    pulseRing: 0,
    elapsed: 0,
    emberTimer: 0,
    wispTimer: 0,
    won: false,
    // The lantern's earned upgrades, by id.
    upgrades: { speed: 0, wide: 0, magnet: 0, heart: 0, golden: 0, steady: 0 },
    // The three upgrades on offer when a wave is cleared.
    offer: [],
    bossSpawned: false,
  };

  function speed() {
    return PLAYER.speed * (1 + 0.15 * state.upgrades.speed);
  }
  function pulseRadius() {
    return PULSE.radius + 45 * state.upgrades.wide;
  }
  function pulseCooldown() {
    return PULSE.cooldown * Math.pow(0.7, state.upgrades.steady);
  }
  function magnetRadius() {
    return 70 + 60 * state.upgrades.magnet;
  }
  function emberValue() {
    return EMBER.points * (state.upgrades.golden > 0 ? 2 : 1);
  }

  function free(pool) {
    for (let i = 0; i < pool.length; i += 1) if (!pool[i].active) return pool[i];
    return null;
  }

  function burst(x, y, color, count, power) {
    for (let i = 0; i < count; i += 1) {
      const p = free(particles);
      if (!p) return;
      const angle = random() * Math.PI * 2;
      const sp = range(random, power * 0.3, power);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * sp;
      p.vy = Math.sin(angle) * sp;
      p.maxLife = range(random, 0.35, 0.7);
      p.life = p.maxLife;
      p.color = color;
      p.size = range(random, 2, 4.5);
    }
  }

  function addRipple(x, y, maxRadius) {
    const r = free(ripples);
    if (!r) return;
    r.active = true;
    r.x = x;
    r.y = y;
    r.radius = 8;
    r.maxRadius = maxRadius;
    r.life = 0.5;
  }

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2;
    player.invulnerable = 0;
    player.faceX = 0;
    player.faceY = -1;
    for (const e of embers) e.active = false;
    for (const w of wisps) w.active = false;
    for (const p of particles) p.active = false;
    for (const r of ripples) r.active = false;
    state.score = 0;
    state.hearts = HEARTS;
    state.wave = 1;
    state.collected = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.pulseTimer = 0;
    state.pulseRing = 0;
    state.elapsed = 0;
    state.emberTimer = 0.4;
    state.wispTimer = 1.2;
    state.won = false;
    state.offer = [];
    state.bossSpawned = false;
    for (const key of Object.keys(state.upgrades)) state.upgrades[key] = 0;
  }

  function spawnEmber() {
    const e = free(embers);
    if (!e) return;
    e.active = true;
    e.x = range(random, 50, FIELD.width - 50);
    e.y = range(random, 90, FIELD.height - 50);
    e.vx = range(random, -EMBER.drift, EMBER.drift);
    e.vy = range(random, -EMBER.drift * 0.6, EMBER.drift * 0.6);
    e.phase = random() * Math.PI * 2;
  }

  function spawnWisp(boss) {
    const w = free(wisps);
    if (!w) return;
    // Enter from a random edge, away from the lantern.
    const side = Math.floor(random() * 4);
    if (side === 0) { w.x = -30; w.y = range(random, 0, FIELD.height); }
    else if (side === 1) { w.x = FIELD.width + 30; w.y = range(random, 0, FIELD.height); }
    else if (side === 2) { w.x = range(random, 0, FIELD.width); w.y = -30; }
    else { w.x = range(random, 0, FIELD.width); w.y = FIELD.height + 30; }
    w.active = true;
    w.boss = boss;
    w.radius = boss ? BOSS.radius : WISP.radius;
    w.health = boss ? BOSS.health : 0;
    w.stun = 0;
    w.vx = 0;
    w.vy = 0;
  }

  function activeWisps() {
    let n = 0;
    for (const w of wisps) if (w.active) n += 1;
    return n;
  }

  /** Three distinct upgrades for the wave-clear screen; a heart is never offered at full hearts. */
  function rollOffer() {
    const pool = UPGRADES.filter((u) => !(u.id === 'heart' && state.hearts >= PLAYER.maxHearts));
    const offer = [];
    while (offer.length < 3 && pool.length > 0) {
      const u = pick(random, pool);
      pool.splice(pool.indexOf(u), 1);
      offer.push(u);
    }
    state.offer = offer;
  }

  function applyUpgrade(id) {
    if (id in state.upgrades) state.upgrades[id] += 1;
    if (id === 'heart') state.hearts = Math.min(PLAYER.maxHearts, state.hearts + 1);
    state.offer = [];
  }

  function collectEmber(e) {
    e.active = false;
    state.collected += 1;
    state.combo = state.comboTimer > 0 ? Math.min(EMBER.maxCombo, state.combo + 1) : 1;
    state.comboTimer = EMBER.comboWindow;
    state.score += emberValue() * state.combo;
    burst(e.x, e.y, 0, 10, 120);
  }

  /** The pulse: shove wisps, gather near embers, wound the boss. Returns the events it caused. */
  function firePulse() {
    if (state.pulseTimer > 0) return 0;
    state.pulseTimer = pulseCooldown();
    state.pulseRing = pulseRadius();
    addRipple(player.x, player.y, pulseRadius());
    let events = EVENT_PULSE;
    const r = pulseRadius();
    for (const e of embers) {
      if (e.active && dist2(e.x, e.y, player.x, player.y) < r * r) collectEmber(e);
    }
    for (const w of wisps) {
      if (!w.active) continue;
      const d2 = dist2(w.x, w.y, player.x, player.y);
      if (d2 > r * r) continue;
      const d = Math.sqrt(d2) || 1;
      const nx = (w.x - player.x) / d;
      const ny = (w.y - player.y) / d;
      w.x += nx * PULSE.shove;
      w.y += ny * PULSE.shove;
      w.stun = PULSE.stun;
      burst(w.x, w.y, 1, 8, 100);
      if (w.boss) {
        w.health -= 1;
        if (w.health <= 0) {
          w.active = false;
          state.score += BOSS.points;
          state.won = true;
          burst(w.x, w.y, 2, 40, 260);
          events |= EVENT_WIN;
        }
      } else {
        state.score += WISP.repelPoints;
      }
    }
    return events;
  }

  /**
   * One fixed step. `steer` is the normalised steering vector, `pulse` fires the
   * lantern pulse, and `harmless` (the title screen's backdrop) drifts embers and
   * wisps without scoring, hurting or clearing waves.
   */
  function step(dt, steer, pulse, harmless) {
    let events = 0;
    state.elapsed += dt;
    if (state.pulseTimer > 0) state.pulseTimer = Math.max(0, state.pulseTimer - dt);
    if (state.pulseRing > 0) state.pulseRing = Math.max(0, state.pulseRing - dt * 520);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);

    // The lantern moves, and remembers which way it faces for its flame.
    const sp = speed();
    player.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, player.x + steer.x * sp * dt));
    player.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius + 78, player.y + steer.y * sp * dt));
    if (steer.x !== 0 || steer.y !== 0) {
      const len = Math.hypot(steer.x, steer.y) || 1;
      player.faceX = steer.x / len;
      player.faceY = steer.y / len;
    }

    if (pulse && !harmless) events |= firePulse();

    // Embers drift, twinkle, and are pulled in by the magnet.
    state.emberTimer -= dt;
    if (state.emberTimer <= 0) {
      spawnEmber();
      state.emberTimer += Math.max(EMBER.minInterval, EMBER.interval - EMBER.intervalPerWave * (state.wave - 1));
    }
    for (const e of embers) {
      if (!e.active) continue;
      e.phase += dt * 3;
      const md = dist2(e.x, e.y, player.x, player.y);
      const mr = magnetRadius();
      if (!harmless && md < mr * mr) {
        const d = Math.sqrt(md) || 1;
        e.vx += ((player.x - e.x) / d) * 260 * dt;
        e.vy += ((player.y - e.y) / d) * 260 * dt;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < 20 || e.x > FIELD.width - 20) e.vx = -e.vx;
      if (e.y < 76 || e.y > FIELD.height - 20) e.vy = -e.vy;
      if (!harmless && md < (PLAYER.radius + e.radius) * (PLAYER.radius + e.radius)) {
        collectEmber(e);
        events |= EVENT_EMBER;
      }
    }

    // The boss arrives with the last wave, once, from the top of the lagoon.
    if (!harmless && state.wave === WAVE.bossWave && !state.bossSpawned) {
      state.bossSpawned = true;
      spawnWisp(true);
      events |= EVENT_BOSS;
    }

    // Wisps spawn up to the wave's cap and chase the lantern.
    state.wispTimer -= dt;
    if (!harmless && state.wispTimer <= 0 && activeWisps() < wispCap(state.wave)) {
      spawnWisp(false);
      state.wispTimer += Math.max(WISP.minInterval, WISP.interval - WISP.intervalPerWave * (state.wave - 1));
    }
    const wispSpeed = Math.min(WISP.maxSpeed, WISP.speed + WISP.speedPerWave * (state.wave - 1));
    for (const w of wisps) {
      if (!w.active) continue;
      if (w.stun > 0) {
        w.stun -= dt;
        continue;
      }
      const dx = player.x - w.x;
      const dy = player.y - w.y;
      const d = Math.hypot(dx, dy) || 1;
      const spd = w.boss ? BOSS.speed : wispSpeed;
      // A wisp weaves a little so its path is not a dead straight line.
      const weave = Math.sin(state.elapsed * 2 + w.x * 0.01) * 0.35;
      const nx = dx / d - (dy / d) * weave;
      const ny = dy / d + (dx / d) * weave;
      const nl = Math.hypot(nx, ny) || 1;
      w.vx = (nx / nl) * spd;
      w.vy = (ny / nl) * spd;
      w.x += w.vx * dt;
      w.y += w.vy * dt;
      if (harmless || player.invulnerable > 0) continue;
      if (dist2(w.x, w.y, player.x, player.y) < (w.radius + PLAYER.radius - 4) * (w.radius + PLAYER.radius - 4)) {
        state.hearts -= 1;
        player.invulnerable = PLAYER.invulnerable;
        state.combo = 0;
        state.comboTimer = 0;
        burst(player.x, player.y, 1, 16, 180);
        // The wisp that lands a hit is thrown back so it cannot hit twice at once.
        w.x -= (dx / d) * 120;
        w.y -= (dy / d) * 120;
        w.stun = 0.8;
        events |= EVENT_HIT;
        if (state.hearts <= 0) {
          events |= EVENT_OVER;
          break;
        }
      }
    }

    // Particles and ripples fade on their own.
    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 2.4 * dt;
      p.vy *= 1 - 2.4 * dt;
    }
    for (const r of ripples) {
      if (!r.active) continue;
      r.life -= dt;
      r.radius += dt * 420;
      if (r.life <= 0 || r.radius >= r.maxRadius) r.active = false;
    }

    // Clearing the wave's ember quota opens the upgrade choice; the boss wave
    // ends only when the Tide King is sunk, which firePulse reports as a win.
    if (!harmless && !state.won && state.wave < WAVE.bossWave && state.collected >= waveQuota(state.wave)) {
      state.score += WAVE.clearPoints * state.wave;
      state.wave += 1;
      state.collected = 0;
      state.emberTimer = 0.4;
      state.wispTimer = 1.0;
      rollOffer();
      events |= EVENT_WAVE_CLEAR;
    }
    return events;
  }

  reset();
  return { state, reset, step, applyUpgrade, pulseRadius, pulseCooldown, magnetRadius };
}
