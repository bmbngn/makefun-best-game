// Everything the player sees: the night, the indigo cloth, the faint gold
// guides, the glowing ink, the creeping darkness, the HUD, and the screens.
// The field is 1280x720 logical; the canvas is scaled to fit the window.
import { CLOTH, CLOTHS, FIELD, PALETTE, WARN_AT_SECONDS, collectionValueLabel, valueLabel } from './config.js';
import { motifStrokes } from './motifs.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    const s = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const ox = (canvas.width - FIELD.width * s) / 2;
    const oy = (canvas.height - FIELD.height * s) / 2;
    ctx.setTransform(s, 0, 0, s, ox, oy);
    return { s, ox, oy };
  }

  function toField(clientX, clientY) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const s = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const ox = (canvas.width - FIELD.width * s) / 2;
    const oy = (canvas.height - FIELD.height * s) / 2;
    return { x: (clientX * dpr - ox) / s, y: (clientY * dpr - oy) / s };
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function strokePoints(pts, ox, oy) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy);
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0] + ox, pts[i][1] + oy);
    ctx.stroke();
  }

  // Draw one guide segment: faint dashed where uninked, bright gold where the
  // player has already traced it.
  function drawSegment(seg) {
    const pts = seg.map((p) => [p.x, p.y]);
    ctx.save();
    ctx.strokeStyle = PALETTE.guide;
    ctx.globalAlpha = 0.38;
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 9]);
    strokePoints(pts, CLOTH.x, CLOTH.y);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = PALETTE.goldBright;
    ctx.lineWidth = 4.5;
    ctx.shadowColor = PALETTE.gold;
    ctx.shadowBlur = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let run = [];
    const flush = () => {
      if (run.length > 1) strokePoints(run, CLOTH.x, CLOTH.y);
      run = [];
    };
    for (const p of seg) {
      if (p.covered) run.push([p.x, p.y]);
      else flush();
    }
    flush();
    ctx.restore();
  }

  function drawCloth(state, time) {
    // Night around the cloth.
    const bg = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    bg.addColorStop(0, PALETTE.night);
    bg.addColorStop(1, PALETTE.nightEdge);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // The cloth itself.
    const cg = ctx.createLinearGradient(CLOTH.x, CLOTH.y, CLOTH.x, CLOTH.y + CLOTH.height);
    cg.addColorStop(0, PALETTE.cloth);
    cg.addColorStop(1, PALETTE.clothDeep);
    ctx.fillStyle = cg;
    roundRect(CLOTH.x, CLOTH.y, CLOTH.width, CLOTH.height, 10);
    ctx.fill();
    ctx.save();
    ctx.strokeStyle = PALETTE.clothEdge;
    ctx.lineWidth = 4;
    roundRect(CLOTH.x + 6, CLOTH.y + 6, CLOTH.width - 12, CLOTH.height - 12, 8);
    ctx.stroke();
    ctx.restore();
    // Woven texture: faint horizontal threads.
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let y = CLOTH.y + 14; y < CLOTH.y + CLOTH.height; y += 14) {
      ctx.beginPath();
      ctx.moveTo(CLOTH.x + 10, y);
      ctx.lineTo(CLOTH.x + CLOTH.width - 10, y);
      ctx.stroke();
    }
    ctx.restore();
    // Guides, ink, blots, sparkles.
    for (const seg of state.segments) drawSegment(seg);
    // Nearly done: the last uninked points pulse, so the player can find them.
    if (state.progress >= 0.85 && state.status === 'playing') {
      ctx.save();
      ctx.fillStyle = PALETTE.goldBright;
      for (const seg of state.segments) {
        for (const p of seg) {
          if (p.covered) continue;
          const a = 0.4 + 0.6 * Math.abs(Math.sin(time * 4));
          ctx.globalAlpha = a;
          ctx.beginPath();
          ctx.arc(p.x + CLOTH.x, p.y + CLOTH.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    if (state.trail.length > 1) {
      ctx.save();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = PALETTE.gold;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(state.trail[0].x + CLOTH.x, state.trail[0].y + CLOTH.y);
      for (let i = 1; i < state.trail.length; i += 1) {
        ctx.lineTo(state.trail[i].x + CLOTH.x, state.trail[i].y + CLOTH.y);
      }
      ctx.stroke();
      ctx.restore();
    }
    for (const b of state.blots) {
      ctx.save();
      ctx.fillStyle = PALETTE.blot;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(b.x + CLOTH.x, b.y + CLOTH.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const s of state.sparkles) {
      const a = 0.25 + 0.55 * Math.abs(Math.sin(time * s.speed + s.phase));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = PALETTE.goldBright;
      ctx.beginPath();
      ctx.arc(s.x + CLOTH.x, s.y + CLOTH.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // The darkness creeping in as the wax cools.
    const frac = state.timeLimit > 0 ? state.timeLeft / state.timeLimit : 1;
    const dark = clamp(1 - frac, 0, 1);
    if (dark > 0.02) {
      const vg = ctx.createRadialGradient(
        FIELD.width / 2, FIELD.height / 2, 220,
        FIELD.width / 2, FIELD.height / 2, 760,
      );
      vg.addColorStop(0, 'rgba(2,3,10,0)');
      vg.addColorStop(1, `rgba(2,3,10,${(dark * 0.85).toFixed(3)})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      const bandH = dark * 130;
      ctx.fillStyle = `rgba(2,3,10,${(dark * 0.7).toFixed(3)})`;
      ctx.fillRect(CLOTH.x, CLOTH.y + CLOTH.height - bandH, CLOTH.width, bandH);
    }
  }

  function heart(x, y, filled, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = filled ? PALETTE.heart : PALETTE.heartEmpty;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-11, -4, -6, -12, 0, -5);
    ctx.bezierCurveTo(6, -12, 11, -4, 0, 6);
    ctx.fill();
    ctx.restore();
  }

  function drawHud(state, best, muted, time) {
    const cloth = CLOTHS[state.clothIndex] || CLOTHS[0];
    ctx.save();
    ctx.fillStyle = 'rgba(5,7,15,0.72)';
    roundRect(24, 14, FIELD.width - 48, 62, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 26px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Cloth ${state.clothIndex + 1} / 7 — ${cloth.name}`, 44, 45);
    // Progress bar.
    const bx = 470;
    const bw = 330;
    ctx.fillStyle = '#2c2a4a';
    roundRect(bx, 30, bw, 16, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    if (state.progress > 0) {
      roundRect(bx, 30, Math.max(16, bw * state.progress), 16, 8);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 18px Georgia, serif';
    ctx.fillText(`${Math.round(state.progress * 100)}%`, bx + bw + 12, 39);
    // Wax / time bar.
    const tx = 900;
    const tw = 150;
    const frac = state.timeLimit > 0 ? state.timeLeft / state.timeLimit : 1;
    ctx.fillStyle = '#2c2a4a';
    roundRect(tx, 30, tw, 16, 8);
    ctx.fill();
    ctx.fillStyle = frac > 0.35 ? '#7ec8e3' : '#e2607a';
    roundRect(tx, 30, Math.max(16, tw * frac), 16, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 18px Georgia, serif';
    ctx.fillText(`${Math.ceil(state.timeLeft)}s`, tx + tw + 10, 39);
    // Score, hearts, mute.
    ctx.textAlign = 'right';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText(`Score ${state.score}`, FIELD.width - 44, 34);
    ctx.font = '16px Georgia, serif';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(`Value ${valueLabel(cloth)} · Best ${best}${muted ? ' · muted (M)' : ''}`, FIELD.width - 44, 60);
    for (let i = 0; i < 3; i += 1) {
      heart(1120 - i * 30, 640, i < state.hearts, 1.4);
    }
    ctx.restore();
    // Cloth note under the HUD, on the night above the cloth.
    ctx.save();
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = 'italic 18px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(cloth.note, FIELD.width / 2, 88);
    ctx.restore();
    // The wax-cooling warning: flashing, long before the darkness arrives.
    if (state.status === 'playing' && state.timeLeft <= WARN_AT_SECONDS) {
      const pulse = 0.6 + 0.4 * Math.sin(time * 6);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#e2607a';
      ctx.font = 'bold 24px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('The wax is cooling — hurry, the cloth is almost done!', FIELD.width / 2, 648);
      ctx.restore();
    }
    // The heart-loss recovery banner: what happened, and that the cloth is fresh.
    if (state.heartBanner > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.heartBanner);
      panel(390, 300, 500, 110);
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 26px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('A heart is lost — the cloth is rewaxed.', FIELD.width / 2, 340);
      ctx.font = '20px Georgia, serif';
      ctx.fillStyle = PALETTE.textDim;
      ctx.fillText(`Your score stands. ${state.hearts} heart${state.hearts === 1 ? '' : 's'} left — try again.`, FIELD.width / 2, 375);
      ctx.restore();
    }
    // Restart is always one key away.
    ctx.save();
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '16px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('Enter or R restarts · P pauses', 24, 648);
    ctx.restore();
  }

  function panel(x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(5,7,15,0.82)';
    roundRect(x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = PALETTE.clothEdgeDim;
    ctx.lineWidth = 2;
    roundRect(x, y, w, h, 16);
    ctx.stroke();
    ctx.restore();
  }

  function drawTitle(state, best, time) {
    drawCloth(state, time);
    ctx.save();
    ctx.fillStyle = 'rgba(5,7,15,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.restore();
    panel(290, 130, 700, 460);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 96px Georgia, serif';
    ctx.fillText('BATIK', FIELD.width / 2, 250);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'italic 28px Georgia, serif';
    ctx.fillText('seven cloths, one glowing thread', FIELD.width / 2, 300);
    ctx.font = '21px Georgia, serif';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText('Draw along the gold guides with your mouse or finger.', FIELD.width / 2, 360);
    ctx.fillText('Finish each motif before the wax cools.', FIELD.width / 2, 392);
    ctx.fillText('Three hearts. Finish all seven cloths to light the gallery.', FIELD.width / 2, 424);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 26px Georgia, serif';
    const pulse = 0.65 + 0.35 * Math.sin(time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillText('Click or press Enter to begin', FIELD.width / 2, 500);
    ctx.globalAlpha = 1;
    ctx.font = '19px Georgia, serif';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(`Best score ${best} · P pauses · M mutes · Enter restarts`, FIELD.width / 2, 545);
    ctx.font = 'italic 17px Georgia, serif';
    ctx.fillText('UNESCO heritage since 2009 — a tulis cloth takes 1–6 months to draw.', FIELD.width / 2, 576);
    ctx.restore();
  }

  function drawPaused(state, best, time) {
    drawCloth(state, time);
    drawHud(state, best, false, time);
    panel(440, 250, 400, 200);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText('Paused', FIELD.width / 2, 320);
    ctx.font = '21px Georgia, serif';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText('P or Enter to carry on', FIELD.width / 2, 375);
    ctx.fillText('M mutes the sound', FIELD.width / 2, 408);
    ctx.restore();
  }

  function wrapLines(text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line === '' ? word : `${line} ${word}`;
      if (ctx.measureText(next).width > maxWidth && line !== '') {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line !== '') lines.push(line);
    return lines;
  }

  function drawClear(state, best) {
    drawCloth(state, 0);
    // The finished cloth blazes: a gold wash over it.
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = PALETTE.gold;
    roundRect(CLOTH.x, CLOTH.y, CLOTH.width, CLOTH.height, 10);
    ctx.fill();
    ctx.restore();
    panel(340, 150, 600, 380);
    const cloth = CLOTHS[state.clothIndex];
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText('Cloth lit!', FIELD.width / 2, 230);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'italic 30px Georgia, serif';
    ctx.fillText(`${cloth.name} — ${cloth.note}`, FIELD.width / 2, 285);
    ctx.font = '24px Georgia, serif';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(`Accuracy ${Math.round(state.accuracy * 100)}% · bonus ${state.clearBonus}`, FIELD.width / 2, 340);
    ctx.fillText(`Score ${state.score} · Best ${Math.max(best, state.score)}`, FIELD.width / 2, 380);
    // The cloth's real-world value and one verified fact about its motif.
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText(`Worth approx. ${valueLabel(cloth)} per metre — ${cloth.craft} batik`, FIELD.width / 2, 414);
    ctx.font = 'italic 19px Georgia, serif';
    ctx.fillStyle = PALETTE.textDim;
    const trivia = wrapLines(cloth.trivia, 540);
    trivia.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 442 + i * 26));
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillText(state.clothIndex + 1 >= CLOTHS.length ? 'Enter — see the gallery' : 'Enter — next cloth', FIELD.width / 2, 500);
    ctx.restore();
  }

  function drawOver(state, best) {
    drawCloth(state, 0);
    panel(340, 170, 600, 340);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.heart;
    ctx.font = 'bold 48px Georgia, serif';
    ctx.fillText('The darkness took the cloth', FIELD.width / 2, 250);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '24px Georgia, serif';
    ctx.fillText(`You lit ${state.clothIndex} of 7 cloths`, FIELD.width / 2, 310);
    ctx.fillText(`Score ${state.score} · Best ${Math.max(best, state.score)}`, FIELD.width / 2, 350);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillText('Enter — try again', FIELD.width / 2, 430);
    ctx.restore();
  }

  function drawWin(state, best) {
    drawCloth(state, 0);
    ctx.save();
    ctx.fillStyle = 'rgba(5,7,15,0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.restore();
    panel(90, 90, 1100, 540);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 54px Georgia, serif';
    ctx.fillText('The gallery is lit', FIELD.width / 2, 165);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'italic 24px Georgia, serif';
    ctx.fillText('all seven cloths, drawn by your hand', FIELD.width / 2, 205);
    // Seven miniature cloths, each motif drawn small in gold.
    const boxW = 138;
    const boxH = 96;
    const gap = 14;
    const totalW = 7 * boxW + 6 * gap;
    let x0 = (FIELD.width - totalW) / 2;
    const y0 = 245;
    for (let i = 0; i < 7; i += 1) {
      const bx = x0 + i * (boxW + gap);
      ctx.save();
      ctx.fillStyle = PALETTE.cloth;
      roundRect(bx, y0, boxW, boxH, 8);
      ctx.fill();
      ctx.strokeStyle = PALETTE.clothEdgeDim;
      ctx.lineWidth = 2;
      roundRect(bx, y0, boxW, boxH, 8);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = PALETTE.gold;
      ctx.shadowBlur = 5;
      const sx = boxW / CLOTH.width;
      const sy = boxH / CLOTH.height;
      for (const stroke of motifStrokes(i)) {
        ctx.beginPath();
        ctx.moveTo(bx + stroke[0][0] * sx, y0 + stroke[0][1] * sy);
        for (let k = 1; k < stroke.length; k += 1) {
          ctx.lineTo(bx + stroke[k][0] * sx, y0 + stroke[k][1] * sy);
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 16px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(CLOTHS[i].name, bx + boxW / 2, y0 + boxH + 24);
      ctx.restore();
    }
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillText(`Score ${state.score} · Best ${Math.max(best, state.score)}`, FIELD.width / 2, 460);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillText(`Collection value approx. ${collectionValueLabel()}`, FIELD.width / 2, 500);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '19px Georgia, serif';
    ctx.fillText('Real prices, approx. per metre: print Rp 25k–80k · cap Rp 150k–500k · tulis Rp 500k–5M+', FIELD.width / 2, 536);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillText('Enter — draw them again', FIELD.width / 2, 588);
    ctx.restore();
  }

  function draw(state, screen, best, time, muted) {
    fit();
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best, time);
      return;
    }
    if (screen === SCREEN_PAUSED) {
      drawPaused(state, best, time);
      return;
    }
    if (screen === SCREEN_CLEAR) {
      drawClear(state, best);
      return;
    }
    if (screen === SCREEN_OVER) {
      drawOver(state, best);
      return;
    }
    if (screen === SCREEN_WIN) {
      drawWin(state, best);
      return;
    }
    drawCloth(state, time);
    drawHud(state, best, muted, time);
  }

  return { draw, toField };
}
