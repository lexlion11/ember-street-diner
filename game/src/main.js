// Ember Street Diner - entry point.
//
// Boots the game: finds the canvas, reads the URL (a seed and an optional
// screenshot scene), wires the input layer to the rules and runs the frame
// loop. When the URL asks for a shot, one frame is drawn and nothing else
// happens, which is how the deterministic screenshots are produced.

import { render } from './render.js';
import { attachInput } from './input.js';
import { runShot } from './shots.js';
import {
  PHASE,
  addIngredient,
  clearPlate,
  createGame,
  serve,
  startGame,
  switchFocus,
  update,
} from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '1', 10);
const seed = Number.isFinite(seedParam) ? seedParam : 1;
const shot = params.get('shot');

// ---------------------------------------------------------------- shot mode --
// A screenshot scene: build the world, set the scene up, draw one frame.
if (shot) {
  const shotGame = createGame(seed);
  runShot(ctx, shotGame, shot);
} else {
  let game = createGame(seed);

  attachInput(canvas, game, {
    ingredient: (id, form) => addIngredient(game, id, form),
    serve: () => serve(game),
    clear: () => clearPlate(game),
    focusNext: () => switchFocus(game, 1),
    start: () => startGame(game),
    restart: () => {
      game = createGame(seed);
      startGame(game);
    },
  });

  // The frame loop. dt is clamped so a background tab or a slow frame cannot
  // teleport the clocks forward.
  let last = performance.now();
  const frame = (now) => {
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 1 / 120)) dt = 1 / 120;
    if (dt > 1 / 10) dt = 1 / 10;
    update(game, dt);
    render(ctx, game);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

export { PHASE };
