# ember-street-diner

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/lexlion11/ember-street-diner/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/lexlion11/ember-street-diner/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

**Ember Street Diner** — a fast-paced 2D canvas cooking game where you assemble
sunset burgers against the clock. Read the order board, chop ingredients on the
counter, stack them on the plate in the right order, and serve before the timer
runs out. Each night the street gets busier, the tickets get longer, and the
tips get bigger.

- **Keyboard and mouse**: click ingredients or press 1–8, ENTER serves,
  BACKSPACE clears, TAB switches orders, double-tap (or Shift+key) for diced.
- **Pure static files**: no build step, no network requests, no libraries —
  original canvas-drawn art and original game design.
- **Deterministic screenshot scenes**: `?shot=start|play|end|rush` with fixed
  seeds for reproducible captures.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

To build the hand-in output:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
