// Ember Street Diner - the screenshot scenes.
//
// Each scene builds a deterministic game state and draws one frame. The world
// is driven only through the same public functions the player uses, so a
// screenshot is always a state the game could really be in.
//
// The scenes:
//   start - the title screen, the street at sunset
//   play  - mid-service: orders on the board, a half built plate, a dish
//           waiting in the pass window
//   end   - the shift is over, the final score on the board
//   rush  - night three, more tickets, more pressure

import { render } from './render.js';
import { addIngredient, clearPlate, focusedTicket, serve, startGame, update } from './world.js';

// A frame's worth of simulated time, and how many of them a scene runs.
const STEP = 0.05;

// Put the plate into the middle of a ticket: the first `count` items of that
// ticket, in stacking order. The focused ticket has to be the ticket we are
// building, or the rules reject the ingredients.
function buildPartially(game, ticket, count) {
  if (!ticket) return;
  const index = game.orders.findIndex((item) => item.id === ticket.id);
  if (index < 0) return;
  game.focused = index;
  const items = ticket.items.slice(0, Math.max(0, count));
  for (const item of items) {
    addIngredient(game, item.id, item.form);
  }
}

// Build a ticket completely and send it out: the dish lands in the pass window.
function buildAndServe(game, ticket) {
  if (!ticket) return;
  const index = game.orders.findIndex((item) => item.id === ticket.id);
  if (index < 0) return;
  game.focused = index;
  for (const item of ticket.items) {
    addIngredient(game, item.id, item.form);
  }
  serve(game);
}

// Let the street fill up: a few seconds of the clock so the board has tickets
// and the timers have moved.
function warmUp(game, steps = 60) {
  for (let i = 0; i < steps; i += 1) {
    update(game, STEP);
  }
}

// The busy service scene: one plate half assembled, one dish in the pass.
function serviceScene(game, night) {
  startGame(game);
  if (night && night > 1) {
    game.night = night;
  }
  warmUp(game, 60);

  const tickets = game.orders.slice();
  if (tickets.length === 0) return;

  // A plate caught mid-assembly on the first ticket.
  buildPartially(game, tickets[0], 2);

  // A second ticket built whole and served, so a dish sits in the pass window.
  const second = tickets.find((ticket) => ticket.id !== tickets[0].id);
  if (second) {
    clearPlate(game);
    buildAndServe(game, second);
  }

  // Back to a plate in progress on whatever is focused now.
  const current = focusedTicket(game);
  if (current) {
    clearPlate(game);
    buildPartially(game, current, 1);
  }
}

// Export the scene runner.
export function runShot(ctx, game, shot) {
  switch (shot) {
    case 'start': {
      // The title screen: the game is already in its title phase.
      render(ctx, game);
      return;
    }

    case 'play': {
      serviceScene(game, 0);
      render(ctx, game);
      return;
    }

    case 'rush': {
      serviceScene(game, 3);
      render(ctx, game);
      return;
    }

    case 'end': {
      startGame(game);
      game.score = 420;
      game.night = 3;
      game.served = 12;
      game.lives = 0;
      game.phase = 'over';
      render(ctx, game);
      return;
    }

    default: {
      // An unknown scene name still draws something sensible.
      render(ctx, game);
    }
  }
}
