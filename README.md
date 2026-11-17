# makefun-best-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/bmbngn/makefun-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/bmbngn/makefun-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Batik — draw batik patterns to light the cloth. Trace the glowing gold guides with your mouse or finger, finish each motif before the wax cools and the darkness creeps in, and light all seven cloths: Kawung, Parang, Mega Mendung, Truntum, Sekar Jagad, Sidomukti, and Garuda. Three hearts. Your best score is kept in this browser.

## How to play

- **Draw:** press and drag across the cloth with mouse or touch — the canting tool inks gold wherever it follows a guide, and the snap to a guide is generous
- **Finish a cloth:** trace every guide stroke before the wax-cooling timer runs out — a warning flashes and sounds 15 seconds before the darkness arrives
- **Straying far from a guide** only leaves a small blot and costs a few points — it never fails you and never costs a heart
- **Hearts:** three, and losing one rewaxes the same cloth fresh with your score kept
- **Pause:** P or Esc · **Mute:** M · **Start / next cloth:** Enter or click · **Restart any time:** Enter mid-play, or R

## Run it

```sh
python3 -m http.server 8080 --directory game
```

then open http://localhost:8080. Or serve the whole repository the same way and open `game/index.html`.

## What is in here

- `main.ts` — the entry program: copies `game/` and `screenshots/` to the output and writes `dossier.json` (make.fun best-game-01)
- `game/index.html` — the page, one canvas
- `game/src/config.js` — every tuning number and colour
- `game/src/motifs.js` — the seven traditional motifs, drawn from geometry
- `game/src/world.js` — the rules: tracing, scoring, hearts, the cooling wax
- `game/src/input.js` — pointer and keyboard input
- `game/src/audio.js` — synthesised WebAudio sounds (no audio files)
- `game/src/render.js` — the cloth, the glow, the HUD and the screens
- `game/src/shots.js` — the autopilot that stages the screenshots
- `game/src/main.js` — the game loop and the screens
- `screenshots/` — 1-start, 2-play, 3-done, 4-end, real renders of the game

Everything is original: the idea, the art, the sounds and the names. No copyrighted material, no network requests, no libraries.

---

<sub>Entered on [make.fun](https://make.fun/?ref=escmq3aq&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
