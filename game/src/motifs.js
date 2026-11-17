// The seven motifs. Each one is a list of guide strokes: a stroke is a list of
// [x, y] points in cloth-local coordinates (0..1060, 0..500). The player traces
// them with the canting tool; the renderer draws them as faint gold guides and
// the finished cloth glows along them. All seven are drawn from geometry, not
// from copied artwork: circles, waves, stars and diamonds, composed by hand.
import { CLOTH } from './config.js';

const W = CLOTH.width;
const H = CLOTH.height;

function sample(fn, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i += 1) pts.push(fn(i / steps));
  return pts;
}

function circle(cx, cy, r, a0 = 0, a1 = Math.PI * 2, steps = 40) {
  return sample((t) => {
    const a = a0 + (a1 - a0) * t;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  }, steps);
}

function ellipse(cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, steps = 36) {
  return sample((t) => {
    const a = a0 + (a1 - a0) * t;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  }, steps);
}

function wave(x0, x1, yBase, amp, waves, phase = 0, steps = 60) {
  return sample((t) => [
    x0 + (x1 - x0) * t,
    yBase + Math.sin(t * Math.PI * 2 * waves + phase) * amp,
  ], steps);
}

function line(x0, y0, x1, y1, steps = 12) {
  return sample((t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t], steps);
}

function diamond(cx, cy, rx, ry) {
  return [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy], [cx, cy - ry]];
}

function star(cx, cy, rOuter, rInner, points = 8) {
  const pts = [];
  const n = points * 2;
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function petal(cx, cy, len, wid, angle) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const px = -dy;
  const py = dx;
  return sample((t) => {
    const along = t * len;
    const bulge = Math.sin(t * Math.PI) * wid;
    return [cx + dx * along + px * bulge, cy + dy * along + py * bulge];
  }, 18).concat(sample((t) => {
    const along = len - t * len;
    const bulge = Math.sin(t * Math.PI) * wid;
    return [cx + dx * along - px * bulge, cy + dy * along - py * bulge];
  }, 18));
}

// 1. Kawung — one flower of four petals around a centre, ringed by a circle.
function kawung() {
  const cx = W / 2;
  const cy = H / 2;
  const strokes = [circle(cx, cy, 150), circle(cx, cy, 52)];
  for (let k = 0; k < 4; k += 1) {
    strokes.push(petal(cx, cy, 118, 42, (k * Math.PI) / 2 - Math.PI / 2));
  }
  strokes.push(ellipse(cx, cy, 205, 118));
  strokes.push(ellipse(cx, cy, 118, 205));
  return strokes;
}

// 2. Parang — three diagonal blades, each a long sine wave, with a spine line.
function parang() {
  const strokes = [];
  for (let k = 0; k < 3; k += 1) {
    const y0 = 60 + k * 130;
    strokes.push(sample((t) => [
      40 + t * (W - 80),
      y0 + t * 130 + Math.sin(t * Math.PI * 2 * 2) * 34,
    ], 64));
  }
  strokes.push(line(40, H - 60, W - 40, 60));
  strokes.push(line(60, 40, W - 60, H - 40));
  return strokes;
}

// 3. Mega Mendung — three rows of cloud scallops, big at the top, small below.
function megaMendung() {
  const strokes = [];
  const rows = [
    { y: 110, r: 74, n: 6 },
    { y: 250, r: 56, n: 7 },
    { y: 380, r: 42, n: 8 },
  ];
  for (const row of rows) {
    const span = W - 120;
    for (let k = 0; k < row.n; k += 1) {
      const cx = 70 + (span * (k + 0.5)) / row.n;
      strokes.push(circle(cx, row.y, row.r, Math.PI, Math.PI * 2, 20));
    }
    strokes.push(line(60, row.y + row.r * 0.4, W - 60, row.y + row.r * 0.4, 8));
  }
  return strokes;
}

// 4. Truntum — a field of small eight-point stars, with a border diamond.
function truntum() {
  const strokes = [diamond(W / 2, H / 2, 330, 190)];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const cx = 150 + col * 190 + (row % 2 === 1 ? 95 : 0);
      const cy = 110 + row * 140;
      if (cx > W - 80) continue;
      strokes.push(star(cx, cy, 42, 18));
    }
  }
  return strokes;
}

// 5. Sekar Jagad — wobbly islands, one inside the next, like a hand-drawn map.
function sekarJagad() {
  const strokes = [];
  for (let k = 0; k < 4; k += 1) {
    const rx = 300 - k * 62;
    const ry = 180 - k * 38;
    strokes.push(sample((t) => {
      const a = t * Math.PI * 2;
      const wob = 1 + 0.12 * Math.sin(a * 3 + k) + 0.07 * Math.sin(a * 5 + k * 2);
      return [W / 2 + Math.cos(a) * rx * wob, H / 2 + Math.sin(a) * ry * wob];
    }, 56));
  }
  strokes.push(circle(W / 2, H / 2, 26));
  return strokes;
}

// 6. Sidomukti — a lattice of diamonds, each with a dot at its heart.
function sidomukti() {
  const strokes = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const cx = 170 + col * 240 + (row % 2 === 1 ? 120 : 0);
      const cy = 105 + row * 145;
      if (cx > W - 90) continue;
      strokes.push(diamond(cx, cy, 78, 52));
      strokes.push(circle(cx, cy, 12));
    }
  }
  strokes.push(line(60, 60, W - 60, 60, 4));
  strokes.push(line(60, H - 60, W - 60, H - 60, 4));
  return strokes;
}

// 7. Garuda — wide mirrored wings, a tail fan, and a head at the centre.
function garuda() {
  const cx = W / 2;
  const cy = H / 2 + 20;
  const strokes = [];
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k += 1) {
      strokes.push(sample((t) => [
        cx + side * (30 + t * 380),
        cy - 40 - k * 46 + Math.sin(t * Math.PI) * (30 + k * 26) - t * 60,
      ], 40));
    }
    strokes.push(sample((t) => [
      cx + side * (40 + t * 300),
      cy + 60 + Math.sin(t * Math.PI * 2) * 18,
    ], 32));
  }
  strokes.push(ellipse(cx, cy, 46, 78));
  strokes.push(circle(cx, cy - 118, 30));
  strokes.push(line(cx, cy - 88, cx, cy + 130));
  return strokes;
}

export const MOTIFS = [kawung, parang, megaMendung, truntum, sekarJagad, sidomukti, garuda];

/** The guide strokes for cloth `index` (0-based), in cloth-local coordinates. */
export function motifStrokes(index) {
  return MOTIFS[index % MOTIFS.length]();
}
