// The rules of Ember Street Diner: orders on the board, the plate you are
// building, the clock on each ticket, the money, the lives, the night.
//
// Nothing in this file draws anything and nothing in this file listens to the
// mouse. It is pure state plus pure functions over that state, so the same
// code runs the game and the deterministic screenshot scenes.

import {
  DIFFICULTY,
  LAYOUT,
  SCORING,
  TIMING,
  binRect,
} from './config.js';
import { INGREDIENTS, buildOrder } from './recipes.js';
import { makeRng } from './rng.js';

export const PHASE = { TITLE: 'title', PLAY: 'play', OVER: 'over' };

let ticketSerial = 0;

export function createGame(seed = 1) {
  const rng = makeRng(seed);
  const game = {
    rng,
    seed,
    phase: PHASE.TITLE,
    time: 0,
    score: 0,
    night: 1,
    lives: DIFFICULTY.lives,
    served: 0,
    missed: 0,
    combo: 1,
    bestCombo: 1,
    orders: [],
    plate: [],
    focused: 0,
    pass: [],
    events: [],
    shake: 0,
    flash: 0,
    banner: null,
    spawnTimer: 1.2,
    nightServed: 0,
    lastServe: { name: '', tip: 0, perfect: false },
  };
  return game;
}

// ---------------------------------------------------------------- orders ----

function formPool(id, rng) {
  const ingredient = INGREDIENTS[id];
  if (!ingredient.forms.includes('diced')) return ['whole'];
  // Most diced items are diced on a ticket, but not always: the cook must read
  // the badge on the ticket rather than guess.
  return rng.chance(0.62) ? ['diced', 'whole'] : ['whole', 'diced'];
}

function makeTicket(game) {
  const order = buildOrder(game.rng, game.night);
  const items = order.items.map((id) => ({
    id,
    form: game.rng.pick(formPool(id, game.rng)),
  }));
  const timeMax = Math.max(
    TIMING.ticketMin,
    TIMING.ticketBase +
      items.length * TIMING.ticketPerItem +
      game.night * TIMING.ticketPerLevel,
  );
  ticketSerial += 1;
  return {
    id: ticketSerial,
    order,
    items,
    name: order.name,
    twists: order.twists,
    timeMax,
    timeLeft: timeMax,
    flash: 0,
    born: game.time,
  };
}

function spawnOrder(game) {
  const limit = Math.min(4, 1 + Math.floor(game.night / 2) + (game.night >= 3 ? 1 : 0));
  if (game.orders.length >= limit) return;
  game.orders.push(makeTicket(game));
}

// ------------------------------------------------------------- assembly ----

export function expectedItem(game) {
  const ticket = focusedTicket(game);
  if (!ticket) return null;
  return ticket.items[game.plate.length] ?? null;
}

// The plate belongs to one ticket at a time. Find which ticket it currently
// matches, so the player can serve even after switching focus.
export function matchingTicket(game) {
  for (const ticket of game.orders) {
    if (ticket.items.length !== game.plate.length) continue;
    let ok = true;
    for (let i = 0; i < ticket.items.length; i += 1) {
      const a = game.plate[i];
      const b = ticket.items[i];
      if (a.id !== b.id || a.form !== b.form) {
        ok = false;
        break;
      }
    }
    if (ok) return ticket;
  }
  return null;
}

export function focusedTicket(game) {
  if (!game.orders.length) return null;
  const index = Math.min(game.focused, game.orders.length - 1);
  return game.orders[index];
}

export function canServe(game) {
  return matchingTicket(game) !== null;
}

export function addIngredient(game, id, form = 'whole') {
  if (game.phase !== PHASE.PLAY) return;
  const ticket = focusedTicket(game);
  if (!ticket) return;
  const next = ticket.items[game.plate.length] ?? null;

  if (!next || next.id !== id || next.form !== form) {
    penalty(game, ticket, wrongIngredient(ticket, id, form));
    return;
  }
  game.plate.push({ id, form, chop: form === 'diced' ? TIMING.chopFlash : 0 });
  game.flash = Math.max(game.flash, 0.18);
}

function wrongIngredient(ticket, id, form) {
  const wanted = ticket.items.find((item) => item.id === id);
  if (!wanted) return `${INGREDIENTS[id].name} is not on this ticket`;
  if (wanted.form !== form) {
    return wanted.form === 'diced'
      ? `${INGREDIENTS[id].name} must be DICED`
      : `${INGREDIENTS[id].name} must be WHOLE`;
  }
  return 'out of order';
}

function penalty(game, ticket, message) {
  game.score = Math.max(0, game.score - 8);
  game.combo = 1;
  game.shake = 1;
  ticket.timeLeft = Math.max(0.5, ticket.timeLeft - TIMING.penalty);
  ticket.flash = 0.45;
  pushEvent(game, message, '#ff6a5e', ticket);
}

export function clearPlate(game) {
  if (game.phase !== PHASE.PLAY) return;
  if (!game.plate.length) return;
  game.plate = [];
  game.combo = 1;
  pushEvent(game, 'plate cleared', '#ffd45e', null);
}

export function switchFocus(game, dir = 1) {
  if (!game.orders.length) return;
  const n = game.orders.length;
  game.focused = (game.focused + dir + n) % n;
}

// ---------------------------------------------------------------- serving ---

export function serve(game) {
  if (game.phase !== PHASE.PLAY) return;
  const ticket = matchingTicket(game);
  if (!ticket) {
    const focused = focusedTicket(game);
    if (focused) penalty(game, focused, 'that is not an order');
    return;
  }
  const fraction = Math.max(0, ticket.timeLeft / ticket.timeMax);
  const base = SCORING.pointsPerItem * ticket.items.length + SCORING.dishBonus;
  const tip = Math.round(SCORING.tipMax * fraction * game.combo);
  const perfect = fraction > 0.82;
  const perfectBonus = perfect ? SCORING.perfectBonus : 0;
  const gained = base + tip + perfectBonus;

  game.score += gained;
  game.served += 1;
  game.nightServed += 1;
  game.combo = Math.min(SCORING.comboCap, game.combo + SCORING.comboStep);
  game.bestCombo = Math.max(game.bestCombo, game.combo);
  game.lastServe = { name: ticket.name, tip, perfect };

  game.pass.push({
    items: game.plate.map((item) => ({ ...item })),
    name: ticket.name,
    tip,
    perfect,
    age: 0,
    life: TIMING.passDisplay,
  });
  if (game.pass.length > 3) game.pass.shift();

  game.plate = [];
  game.orders = game.orders.filter((item) => item.id !== ticket.id);
  if (game.focused >= game.orders.length) game.focused = Math.max(0, game.orders.length - 1);
  pushEvent(game, `served ${ticket.name}`, '#8ce89a', null);

  if (game.nightServed >= DIFFICULTY.servedPerNight) {
    advanceNight(game);
  }
}

function advanceNight(game) {
  game.night += 1;
  game.nightServed = 0;
  game.lives = Math.min(DIFFICULTY.lives, game.lives + 1);
  game.banner = { text: `NIGHT ${game.night}`, sub: 'the street gets busier', life: TIMING.rushBanner };
  game.shake = 0.6;
  const rush = Math.min(3, 1 + game.night);
  for (let i = 0; i < rush; i += 1) spawnOrder(game);
}

// ----------------------------------------------------------------- frame ----

function pushEvent(game, text, color, ticket) {
  game.events.push({ text, color, life: 1.6, age: 0, x: ticket ? 640 : 640, y: 300 });
  if (game.events.length > 6) game.events.shift();
}

export function update(game, dt) {
  game.time += dt;
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * TIMING.shakeDecay);
  if (game.flash > 0) game.flash = Math.max(0, game.flash - dt * 4);

  for (const event of game.events) event.age += dt;
  game.events = game.events.filter((event) => event.age < event.life);
  if (game.banner) {
    game.banner.life -= dt;
    if (game.banner.life <= 0) game.banner = null;
  }
  for (const item of game.pass) item.age += dt;
  game.pass = game.pass.filter((item) => item.age < item.life);

  if (game.phase !== PHASE.PLAY) return;

  for (const item of game.plate) {
    if (item.chop > 0) item.chop = Math.max(0, item.chop - dt);
  }
  for (const ticket of game.orders) {
    if (ticket.flash > 0) ticket.flash = Math.max(0, ticket.flash - dt);
    ticket.timeLeft -= dt;
  }

  const expired = game.orders.filter((ticket) => ticket.timeLeft <= 0);
  for (const ticket of expired) {
    game.lives -= 1;
    game.missed += 1;
    game.combo = 1;
    game.shake = 1;
    pushEvent(game, `${ticket.name} got cold`, '#ff6a5e', null);
  }
  if (expired.length) {
    game.orders = game.orders.filter((ticket) => ticket.timeLeft > 0);
    if (game.focused >= game.orders.length) game.focused = Math.max(0, game.orders.length - 1);
    if (game.plate.length) {
      const still = matchingTicket(game);
      if (!still) game.plate = [];
    }
  }

  if (game.lives <= 0) {
    game.lives = 0;
    game.phase = PHASE.OVER;
    return;
  }

  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    game.spawnTimer = TIMING.spawnDelay + game.rng() * TIMING.spawnJitter;
    if (game.orders.length < Math.min(4, 1 + Math.floor(game.night / 2) + (game.night >= 3 ? 1 : 0))) {
      spawnOrder(game);
    }
  }
}

// ----------------------------------------------------------------- setup ----

export function startGame(game) {
  game.phase = PHASE.PLAY;
  game.time = 0;
  game.score = 0;
  game.night = 1;
  game.lives = DIFFICULTY.lives;
  game.served = 0;
  game.missed = 0;
  game.combo = 1;
  game.orders = [];
  game.plate = [];
  game.pass = [];
  game.events = [];
  game.focused = 0;
  game.nightServed = 0;
  game.spawnTimer = 0.4;
  for (let i = 0; i < 2; i += 1) spawnOrder(game);
}

// ------------------------------------------------------------ hit testing ---

export function hitIngredient(x, y) {
  for (let i = 0; i < 8; i += 1) {
    const r = binRect(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      const ids = Object.keys(INGREDIENTS);
      const id = ids[i];
      const ingredient = INGREDIENTS[id];
      const dicedTag = { x: r.x + r.w - 34, y: r.y + r.h - 34, w: 28, h: 28 };
      const form =
        ingredient.forms.includes('diced') &&
        x >= dicedTag.x &&
        y >= dicedTag.y &&
        x <= dicedTag.x + dicedTag.w &&
        y <= dicedTag.y + dicedTag.h
          ? 'diced'
          : 'whole';
      return { index: i, id, form };
    }
  }
  return null;
}

export function hitRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function hitServe(x, y) {
  return hitRect(x, y, LAYOUT.serveBtn);
}

export function hitClear(x, y) {
  return hitRect(x, y, LAYOUT.clearBtn);
}
