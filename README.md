# makefun-best-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/bmbngn/makefun-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/bmbngn/makefun-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Glowfall — a lantern-keeper's arcade. Sail a little lantern across a dark lagoon. Gather the glowing embers, outrun the shadow wisps that chase you, and pulse your light to shove them back. Clear each wave's ember quota, choose one of three blessings, and on wave 8 sink the Tide King — a great wisp only your pulse can wound.

## How to play

- **Move:** WASD or arrow keys
- **Pulse:** Space or click — a ring of light that shoves wisps away, gathers
  nearby embers, and wounds the Tide King. It needs a moment to recharge.
- **Choose a blessing:** press 1, 2 or 3 (or click a card) when a wave is cleared
- **Pause:** P or Esc · **Mute:** M · **Restart:** Enter

Hearts: 3 (a wisp's touch costs one). Embers gathered quickly in a row build a
combo up to ×5. Your best score is kept in this browser.

## Run it

```sh
python3 -m http.server 8080 --directory game
```

then open http://localhost:8080. Or serve the whole repository the same way
and open `game/index.html`.

## What is in here

- `main.ts` — the entry program: copies `game/` and `screenshots/` to the
  output and writes `dossier.json` (make.fun best-game-01)
- `game/index.html` — the page, one canvas
- `game/src/config.js` — every tuning number and colour
- `game/src/random.js` — the seeded random generator
- `game/src/input.js` — keyboard and pointer input
- `game/src/audio.js` — synthesised WebAudio sounds (no audio files)
- `game/src/world.js` — the rules: embers, wisps, waves, upgrades, the boss
- `game/src/render.js` — the lagoon, the HUD and the screens
- `game/src/shots.js` — the autopilot that stages the screenshots
- `game/src/main.js` — the game loop and the screens
- `screenshots/` — 1-start, 2-play, 3-upgrade, 4-end, real renders of the game

Everything is original: the idea, the art, the sounds and the names. No
copyrighted material, no network requests, no libraries.

---

<sub>Entered on [make.fun](https://make.fun/?ref=escmq3aq&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
