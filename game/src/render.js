// Everything you see. One exported function, one canvas, no assets.
//
// The renderer reads the game state and paints it. It never mutates the state
// and never reaches outside config.js for colours or geometry, so the look of
// the diner can be re-skinned from one file.

import {
  PALETTE,
  LAYOUT,
  WIDTH,
  HEIGHT,
  BIN_COUNT,
  CONTROLS,
  binRect,
  font,
} from './config.js';
import { INGREDIENTS, INGREDIENT_ORDER } from './recipes.js';
import { canServe, expectedItem, focusedTicket } from './world.js';

// ------------------------------------------------------------- helpers ----

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fillRound(ctx, x, y, w, h, r, color) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

function text(ctx, value, x, y, opts = {}) {
  const {
    size = 14,
    weight = 400,
    color = PALETTE.text,
    align = 'left',
    baseline = 'alphabetic',
    alpha = 1,
  } = opts;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(String(value), x, y);
  ctx.restore();
}

function heart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.beginPath();
  const s = size / 2;
  ctx.moveTo(x, y + s * 0.75);
  ctx.bezierCurveTo(x - s * 1.25, y - s * 0.25, x - s * 0.55, y - s * 1.15, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.55, y - s * 1.15, x + s * 1.25, y - s * 0.25, x, y + s * 0.75);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = PALETTE.heart;
    ctx.fill();
  } else {
    ctx.strokeStyle = PALETTE.heart;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

function circle(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// Shorten a label with an ellipsis if it cannot fit the given width. The
// caller must have set ctx.font to the font the text will be drawn in, so the
// measurement matches what lands on the canvas.
function fitText(ctx, value, maxWidth) {
  let s = String(value);
  if (ctx.measureText(s).width <= maxWidth) return s;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) {
    s = s.slice(0, -1);
  }
  return s.length > 1 ? `${s}…` : s;
}

// ------------------------------------------------------ ingredient art ----

// Draws one ingredient centred on (cx, cy) at the given scale. `form` may be
// 'diced' for the ingredients that can be chopped.
function drawIngredient(ctx, ing, cx, cy, scale, form = 'whole') {
  if (!ing) return;
  const diced = form === 'diced';
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  switch (ing.id) {
    case 'bun': {
      ctx.beginPath();
      ctx.moveTo(-26, 12);
      ctx.quadraticCurveTo(-26, -20, 0, -20);
      ctx.quadraticCurveTo(26, -20, 26, 12);
      ctx.closePath();
      ctx.fillStyle = ing.color;
      ctx.fill();
      ctx.fillStyle = ing.light;
      ctx.beginPath();
      ctx.ellipse(-9, -13, 9, 4, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ing.dark;
      ctx.fillRect(-26, 8, 52, 5);
      break;
    }
    case 'patty': {
      circle(ctx, 0, 0, 22, ing.dark);
      circle(ctx, 0, -2, 20, ing.color);
      ctx.strokeStyle = ing.light;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, -8);
      ctx.lineTo(-4, -12);
      ctx.moveTo(2, 4);
      ctx.lineTo(12, 0);
      ctx.stroke();
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = ing.color;
      ctx.beginPath();
      ctx.moveTo(-28, 4);
      for (let i = 0; i <= 8; i += 1) {
        const t = i / 8;
        const x = -28 + t * 56;
        const y = 4 + (i % 2 === 0 ? -12 : 6);
        ctx.quadraticCurveTo(x + 3.5, y - 6, x + 7, 4);
      }
      ctx.lineTo(28, 8);
      ctx.quadraticCurveTo(0, 18, -28, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ing.dark;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = ing.light;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-18, 6);
      ctx.quadraticCurveTo(0, 12, 18, 6);
      ctx.stroke();
      break;
    }
    case 'tomato': {
      circle(ctx, 0, 0, 20, ing.color);
      circle(ctx, 0, 0, 13, ing.light);
      circle(ctx, 0, 0, 6, ing.dark);
      ctx.strokeStyle = ing.color;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
        ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
        ctx.stroke();
      }
      break;
    }
    case 'cheese': {
      ctx.beginPath();
      ctx.moveTo(-24, -14);
      ctx.lineTo(24, -14);
      ctx.lineTo(24, 4);
      ctx.lineTo(16, 16);
      ctx.lineTo(8, 6);
      ctx.lineTo(0, 18);
      ctx.lineTo(-8, 6);
      ctx.lineTo(-16, 16);
      ctx.lineTo(-24, 4);
      ctx.closePath();
      ctx.fillStyle = ing.color;
      ctx.fill();
      ctx.strokeStyle = ing.dark;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = ing.light;
      ctx.fillRect(-22, -12, 44, 4);
      break;
    }
    case 'onion': {
      ctx.lineWidth = 4;
      ctx.strokeStyle = ing.dark;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse(0, 0, 20 - i * 6, 14 - i * 4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = i % 2 === 0 ? ing.color : ing.light;
        ctx.stroke();
      }
      break;
    }
    case 'cucumber': {
      ctx.fillStyle = ing.dark;
      roundRect(ctx, -20, -12, 40, 24, 8);
      ctx.fill();
      ctx.fillStyle = ing.color;
      roundRect(ctx, -20, -10, 40, 20, 7);
      ctx.fill();
      ctx.fillStyle = ing.light;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse(-10 + i * 10, 0, 3.5, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'sauce': {
      ctx.fillStyle = ing.color;
      roundRect(ctx, -14, -12, 28, 30, 6);
      ctx.fill();
      ctx.fillStyle = ing.dark;
      roundRect(ctx, -7, -22, 14, 12, 3);
      ctx.fill();
      ctx.fillStyle = ing.light;
      roundRect(ctx, -10, -6, 8, 18, 3);
      ctx.fill();
      break;
    }
    default: {
      circle(ctx, 0, 0, 20, ing.color);
      circle(ctx, 0, 0, 10, ing.light);
    }
  }

  if (diced) {
    ctx.fillStyle = ing.dark;
    for (let i = 0; i < 4; i += 1) {
      const dx = -18 + i * 12;
      const dy = 12 - (i % 2) * 7;
      roundRect(ctx, dx, dy, 10, 9, 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ----------------------------------------------------------- backdrop -----

function drawWall(ctx) {
  const wall = LAYOUT.wall;
  const grad = ctx.createLinearGradient(0, wall.y, 0, wall.y + wall.h);
  grad.addColorStop(0, PALETTE.wallTop);
  grad.addColorStop(0.55, PALETTE.wallMid);
  grad.addColorStop(1, PALETTE.wallLow);
  ctx.fillStyle = grad;
  ctx.fillRect(0, wall.y, WIDTH, wall.h);

  // wainscot strip along the bottom of the wall
  ctx.fillStyle = PALETTE.wainscot;
  ctx.fillRect(0, wall.y + wall.h - 34, WIDTH, 34);
  ctx.fillStyle = PALETTE.trim;
  ctx.fillRect(0, wall.y + wall.h - 38, WIDTH, 4);
}

function drawWindow(ctx) {
  const w = 500;
  const h = 180;
  const x = (WIDTH - w) / 2;
  const y = LAYOUT.wall.y + 26;

  ctx.save();
  roundRect(ctx, x - 10, y - 10, w + 20, h + 20, 12);
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fill();

  roundRect(ctx, x, y, w, h, 8);
  ctx.clip();

  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, PALETTE.skyHigh);
  sky.addColorStop(0.35, PALETTE.skyMid);
  sky.addColorStop(0.65, PALETTE.skyLow);
  sky.addColorStop(1, PALETTE.skyDeep);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);

  circle(ctx, x + w * 0.68, y + h * 0.56, 30, PALETTE.sun);
  circle(ctx, x + w * 0.68, y + h * 0.56, 42, 'rgba(255,243,204,0.18)');

  ctx.fillStyle = PALETTE.hillFar;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + h * 0.68);
  ctx.quadraticCurveTo(x + w * 0.25, y + h * 0.44, x + w * 0.52, y + h * 0.66);
  ctx.quadraticCurveTo(x + w * 0.78, y + h * 0.86, x + w, y + h * 0.6);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.hillNear;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + h * 0.84);
  ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.7, x + w * 0.6, y + h * 0.84);
  ctx.quadraticCurveTo(x + w * 0.82, y + h * 0.92, x + w, y + h * 0.8);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  // mullions
  ctx.strokeStyle = PALETTE.woodDark;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();

  ctx.restore();

  // frame
  roundRect(ctx, x - 10, y - 10, w + 20, h + 20, 12);
  ctx.strokeStyle = PALETTE.woodEdge;
  ctx.lineWidth = 4;
  ctx.stroke();
}

function drawStove(ctx) {
  // The kitchen cue: a stove with a lit burner and a pan on it, and an
  // extractor hood above. Without it the wall read as a counter in a shop.
  const x = 40;
  const y = LAYOUT.wall.y + 120;
  const w = 196;
  const h = 96;

  // extractor hood
  fillRound(ctx, x - 6, y - 74, w + 12, 20, 6, PALETTE.steelDark);
  fillRound(ctx, x + 16, y - 54, w - 32, 12, 4, PALETTE.steel);
  ctx.fillStyle = PALETTE.steelLight;
  ctx.fillRect(x + 20, y - 42, w - 40, 3);

  // stove body
  fillRound(ctx, x, y, w, h, 8, PALETTE.steelDark);
  fillRound(ctx, x + 6, y + 6, w - 12, h - 12, 6, PALETTE.steel);

  // two burners, one lit
  const burners = [[x + 52, y + 40, false], [x + 144, y + 40, true]];
  for (const [bx, by, lit] of burners) {
    circle(ctx, bx, by, 24, PALETTE.steelLight);
    circle(ctx, bx, by, 17, PALETTE.steelDark);
    if (lit) {
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        circle(ctx, bx + Math.cos(a) * 12, by + Math.sin(a) * 12, 5, PALETTE.flame);
      }
      circle(ctx, bx, by, 6, PALETTE.gold);
    }
  }

  // a pan on the lit burner
  const px = x + 144;
  const py = y + 40;
  fillRound(ctx, px - 30, py - 14, 60, 16, 6, PALETTE.steelLight);
  ctx.fillStyle = PALETTE.steelDark;
  ctx.fillRect(px - 30, py - 6, 60, 8);
  fillRound(ctx, px + 26, py - 11, 34, 8, 4, PALETTE.steelDark);

  // knobs
  for (let i = 0; i < 3; i += 1) {
    circle(ctx, x + 30 + i * 22, y + h - 14, 7, PALETTE.steelLight);
  }
}

function drawShelf(ctx) {
  const y = LAYOUT.wall.y + 12;
  const x0 = 96;
  const x1 = WIDTH - 96;
  ctx.fillStyle = PALETTE.woodRail;
  ctx.fillRect(x0, y, x1 - x0, 8);
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(x0, y + 8, x1 - x0, 3);

  // jars and a little plant, drawn as simple shapes
  const jar = (x, w, h, color, lid) => {
    fillRound(ctx, x, y - h, w, h, 4, color);
    fillRound(ctx, x - 2, y - h - 6, w + 4, 7, 2, lid);
  };

  jar(x0 + 30, 22, 34, PALETTE.glass, PALETTE.trim);
  jar(x0 + 62, 18, 26, PALETTE.skyLow, PALETTE.trim);
  jar(x0 + 92, 26, 40, PALETTE.cool, PALETTE.trim);

  // plant on the right
  const px = x1 - 60;
  fillRound(ctx, px, y - 24, 30, 24, 4, PALETTE.hot);
  ctx.fillStyle = PALETTE.good;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.ellipse(px + 15 + (i - 2) * 7, y - 30 - (i % 2) * 9, 8, 14, (i - 2) * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  jar(x1 - 160, 20, 30, PALETTE.gold, PALETTE.trim);
  jar(x1 - 128, 24, 38, PALETTE.hot, PALETTE.trim);
}

function drawCounter(ctx) {
  const counter = LAYOUT.counter;
  ctx.fillStyle = PALETTE.woodTop;
  ctx.fillRect(0, counter.y, WIDTH, counter.h);
  ctx.fillStyle = PALETTE.woodEdge;
  ctx.fillRect(0, counter.y, WIDTH, 10);
  ctx.fillRect(0, counter.y + counter.h - 12, WIDTH, 12);

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = PALETTE.woodDark;
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i += 1) {
    const y = counter.y + 26 + i * 24;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(WIDTH * 0.3, y - 5, WIDTH * 0.7, y + 6, WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();
}

// The prep board: the ingredients for the order in progress, laid out loose
// on the counter next to the plate. Without it the only ingredients on screen
// are the buttons in the bottom strip, and the scene does not read as a
// kitchen at work.
function drawPrepBoard(ctx, game) {
  const board = LAYOUT.prepBoard;
  const ticket = focusedTicket(game);
  if (!ticket) return;

  // a pale cutting board on the counter
  fillRound(ctx, board.x, board.y, board.w, board.h, 8, PALETTE.boardWood);
  fillRound(ctx, board.x + 5, board.y + 5, board.w - 10, board.h - 10, 6, PALETTE.woodTop);
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(board.x + 12, board.y + board.h - 16, board.w - 24, 3);

  text(ctx, 'PREPPING', board.x + 12, board.y + 20, {
    size: 13,
    weight: 800,
    color: PALETTE.accent,
  });

  // The ingredients this ticket still wants, loose on the board. The ones the
  // plate already carries are drawn dimmer, so the board reads as a plan.
  const stack = game.plate.map((item) => item.id);
  const items = ticket.items.slice(0, 6);
  const cw = (board.w - 24) / Math.max(1, items.length);

  items.forEach((id, i) => {
    const ing = INGREDIENTS[id];
    if (!ing) return;
    const cx = board.x + 12 + cw * (i + 0.5);
    const cy = board.y + 46;
    const done = stack.includes(id);
    ctx.save();
    ctx.globalAlpha = done ? 0.32 : 1;
    drawIngredient(ctx, ing, cx, cy, 0.62, 'whole');
    ctx.restore();
    text(ctx, ing.short, cx, board.y + board.h - 22, {
      size: 12,
      weight: 700,
      color: done ? PALETTE.inkSoft : PALETTE.ink,
      align: 'center',
    });
  });
}

function drawBins(ctx, game) {
  const strip = LAYOUT.binStrip;
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(strip.x - 8, strip.y - 6, strip.w + 16, strip.h + 12);
  ctx.fillStyle = PALETTE.woodRail;
  ctx.fillRect(strip.x - 8, strip.y - 10, strip.w + 16, 6);

  for (let i = 0; i < BIN_COUNT; i += 1) {
    const id = INGREDIENT_ORDER[i];
    const ing = INGREDIENTS[id];
    const r = binRect(i);

    fillRound(ctx, r.x, r.y, r.w, r.h, 8, PALETTE.woodEdge);
    fillRound(ctx, r.x + 4, r.y + 4, r.w - 8, r.h - 8, 6, PALETTE.boardWood);
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(r.x + 4, r.y + r.h - 20, r.w - 8, 4);

    // the ingredient itself, large in the middle of the bin
    drawIngredient(ctx, ing, r.x + r.w / 2, r.y + 40, 0.92, 'whole');

    // key badge
    fillRound(ctx, r.x + 8, r.y + r.h - 36, 26, 26, 6, PALETTE.accent);
    text(ctx, ing.key, r.x + 21, r.y + r.h - 18, {
      size: 16,
      weight: 800,
      color: PALETTE.ink,
      align: 'center',
      baseline: 'middle',
    });

    text(ctx, ing.short, r.x + r.w / 2, r.y + r.h - 3, {
      size: 13,
      weight: 800,
      color: PALETTE.text,
      align: 'center',
    });

    // diced tag
    if (ing.forms.includes('diced')) {
      const tag = { x: r.x + r.w - 36, y: r.y + r.h - 36, w: 30, h: 30 };
      fillRound(ctx, tag.x, tag.y, tag.w, tag.h, 6, PALETTE.cool);
      text(ctx, 'D', tag.x + tag.w / 2, tag.y + tag.h / 2 + 1, {
        size: 16,
        weight: 800,
        color: PALETTE.ink,
        align: 'center',
        baseline: 'middle',
      });
    }
  }
}

// ----------------------------------------------------------- order board --

function drawBoard(ctx, game) {
  const board = LAYOUT.board;
  ctx.fillStyle = PALETTE.boardWood;
  ctx.fillRect(board.x, board.y, board.w, board.h);
  ctx.fillStyle = PALETTE.woodRail;
  ctx.fillRect(LAYOUT.rail.x, LAYOUT.rail.y, LAYOUT.rail.w, LAYOUT.rail.h);
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(LAYOUT.rail.x, LAYOUT.rail.y + LAYOUT.rail.h - 3, LAYOUT.rail.w, 3);

  const visible = game.orders.slice(0, 4);
  const cardW = 268;
  const gap = 18;
  const total = visible.length * cardW + Math.max(0, visible.length - 1) * gap;
  let x = (WIDTH - total) / 2;

  visible.forEach((ticket, index) => {
    const y = LAYOUT.ticket.y;
    const h = LAYOUT.ticket.h;

    if (ticket.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.5, ticket.flash);
      fillRound(ctx, x, y, cardW, h, 8, PALETTE.hot);
      ctx.restore();
    }

    fillRound(ctx, x, y, cardW, h, 8, PALETTE.paper);
    ctx.strokeStyle = PALETTE.paperEdge;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, cardW, h, 8);
    ctx.stroke();

    if (index === game.focused) {
      ctx.save();
      ctx.shadowColor = PALETTE.accent;
      ctx.shadowBlur = 18;
      roundRect(ctx, x + 1, y + 1, cardW - 2, h - 2, 8);
      ctx.strokeStyle = PALETTE.accent;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // Everything on the card is clipped to it, so a long name or a long
    // row of ingredient codes can never spill onto the next ticket.
    ctx.save();
    roundRect(ctx, x + 2, y + 2, cardW - 4, h - 4, 7);
    ctx.clip();

    // The name shares its line with the countdown, so it is shortened
    // rather than allowed to run under it.
    const timerLabel = `${Math.ceil(ticket.timeLeft)}s`;
    ctx.font = font(17, 700);
    const timerW = ctx.measureText(timerLabel).width;
    ctx.font = font(19, 700);
    const name = fitText(ctx, ticket.name, cardW - 24 - timerW - 10);
    text(ctx, name, x + 12, y + 26, { size: 19, weight: 700, color: PALETTE.ink });

    // ingredient short codes, wrapped onto a second row when the ticket is
    // long, with a badge for diced ones
    const pad = 12;
    ctx.font = font(16, 700);
    let cx = x + pad;
    let row = 0;
    for (const item of ticket.items) {
      const ing = INGREDIENTS[item.id];
      const label = ing ? ing.short : item.id.toUpperCase();
      const w = ctx.measureText(label).width;
      const diced = item.form === 'diced';
      const step = w + 5 + (diced ? 22 : 7);
      if (cx + step > x + cardW - pad && cx > x + pad) {
        row += 1;
        cx = x + pad;
      }
      const ly = y + 50 + row * 18;
      text(ctx, label, cx, ly, { size: 16, weight: 700, color: PALETTE.inkSoft });
      cx += w + 5;
      if (diced) {
        fillRound(ctx, cx, ly - 13, 17, 17, 3, PALETTE.cool);
        text(ctx, 'D', cx + 8, ly - 4, {
          size: 12,
          weight: 800,
          color: PALETTE.ink,
          align: 'center',
          baseline: 'middle',
        });
        cx += 22;
      } else {
        cx += 7;
      }
    }

    if (ticket.twists && ticket.twists.length) {
      text(ctx, ticket.twists.map((t) => t.label).join(' · '), x + 12, row > 0 ? y + 82 : y + 70, {
        size: 13,
        weight: 700,
        color: PALETTE.hot,
      });
    }

    // timer bar
    const barX = x + 12;
    const barY = y + h - 22;
    const barW = cardW - 24;
    const barH = 14;
    const fraction = Math.max(0, Math.min(1, ticket.timeLeft / ticket.timeMax));

    fillRound(ctx, barX, barY, barW, barH, 6, PALETTE.paperShade);
    let color = PALETTE.good;
    if (fraction < 0.5) color = PALETTE.accent;
    if (fraction < 0.25) color = PALETTE.hot;
    fillRound(ctx, barX, barY, Math.max(2, barW * fraction), barH, 6, color);

    text(ctx, timerLabel, x + cardW - 12, y + 26, {
      size: 17,
      weight: 700,
      color: fraction < 0.25 ? PALETTE.hot : PALETTE.ink,
      align: 'right',
    });

    ctx.restore();

    x += cardW + gap;
  });
}

// ---------------------------------------------------------------- plate ---

function drawPlate(ctx, game) {
  const p = LAYOUT.plate;

  ctx.save();
  ctx.globalAlpha = 0.35;
  circle(ctx, p.x, p.y + 8, p.r, PALETTE.shadow);
  ctx.restore();

  circle(ctx, p.x, p.y, p.r, PALETTE.paperShade);
  circle(ctx, p.x, p.y, p.r - 8, PALETTE.paper);
  ctx.strokeStyle = PALETTE.paperEdge;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r - 4, 0, Math.PI * 2);
  ctx.stroke();

  if (!game.plate.length) {
    text(ctx, 'click ingredients to build', p.x, p.y + 4, {
      size: 15,
      color: PALETTE.inkSoft,
      align: 'center',
      baseline: 'middle',
    });
    return;
  }

  // stack from the bottom of the plate upwards. The bands are wide and tall
  // enough that a half-built dish fills a good part of the plate: a small
  // stack on a big plate reads as an empty plate, not a dish being made.
  let y = p.y + p.r - 18;
  game.plate.forEach((item, index) => {
    const ing = INGREDIENTS[item.id];
    if (!ing) return;
    const bandW = Math.min(p.r * 1.6, 150 + index * 5);
    const bandH = 26;

    if (item.form === 'diced') {
      for (let c = 0; c < 6; c += 1) {
        const dx = -bandW / 2 + 14 + c * ((bandW - 28) / 5);
        const dy = (c % 2) * 5;
        fillRound(ctx, p.x + dx - 12, y - bandH + dy, 24, 20, 4, ing.color);
        ctx.fillStyle = ing.dark;
        ctx.fillRect(p.x + dx - 12, y - bandH + dy + 15, 24, 5);
      }
      y -= bandH - 4;
    } else {
      fillRound(ctx, p.x - bandW / 2, y - bandH, bandW, bandH, 8, ing.color);
      ctx.fillStyle = ing.dark;
      ctx.fillRect(p.x - bandW / 2, y - 5, bandW, 5);
      ctx.fillStyle = ing.light;
      ctx.fillRect(p.x - bandW / 2 + 6, y - bandH + 3, bandW - 12, 4);
      y -= bandH - 2;
    }

    if (item.chop > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, item.chop / 0.3) * 0.85;
      fillRound(ctx, p.x - bandW / 2, y - 6, bandW, bandH + 6, 8, PALETTE.paper);
      ctx.restore();
    }
  });

  // The ingredient the ticket still wants, ghosted above the stack: it shows
  // the dish is mid-assembly rather than finished.
  const next = expectedItem(game);
  if (next) {
    const ing = INGREDIENTS[next.id];
    if (ing) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      const bandW = Math.min(p.r * 1.2, 108);
      fillRound(ctx, p.x - bandW / 2, y - 18, bandW, 16, 8, ing.color);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.setLineDash([7, 6]);
      ctx.strokeStyle = PALETTE.inkSoft;
      ctx.lineWidth = 2;
      roundRect(ctx, p.x - bandW / 2, y - 18, bandW, 16, 8);
      ctx.stroke();
      ctx.restore();
    }
  }

  // A label above the plate, so what is on it reads at a glance. It has to
  // sit above the plate: the counter ends where the ingredient bin strip
  // starts, and the bin strip is drawn after the plate, so anything under
  // the plate is painted over.
  const dish = focusedTicket(game);
  if (dish) {
    const labelY = p.y - p.r - 34;
    // a small plaque behind the words, so they read over the busy wall
    ctx.save();
    ctx.globalAlpha = 0.72;
    fillRound(ctx, p.x - 92, labelY - 17, 184, 34, 8, PALETTE.woodDark);
    ctx.restore();
    text(ctx, 'ASSEMBLING', p.x, labelY - 1, {
      size: 14,
      weight: 800,
      color: PALETTE.accent,
      align: 'center',
    });
    text(ctx, dish.name, p.x, labelY + 15, {
      size: 15,
      weight: 700,
      color: PALETTE.text,
      align: 'center',
    });
  }
}

// -------------------------------------------------------------- buttons ---

function drawButtons(ctx, game) {
  const serve = LAYOUT.serveBtn;
  const ready = canServe(game);

  ctx.save();
  if (ready) {
    ctx.shadowColor = PALETTE.good;
    ctx.shadowBlur = 22;
  }
  fillRound(ctx, serve.x, serve.y, serve.w, serve.h, 12, ready ? PALETTE.good : PALETTE.woodEdge);
  ctx.restore();

  text(ctx, 'SERVE ⏎', serve.x + serve.w / 2, serve.y + serve.h / 2 + 1, {
    size: 22,
    weight: 800,
    color: ready ? PALETTE.ink : PALETTE.textDim,
    align: 'center',
    baseline: 'middle',
  });

  const clear = LAYOUT.clearBtn;
  fillRound(ctx, clear.x, clear.y, clear.w, clear.h, 8, PALETTE.woodDark);
  ctx.strokeStyle = PALETTE.woodEdge;
  ctx.lineWidth = 2;
  roundRect(ctx, clear.x, clear.y, clear.w, clear.h, 8);
  ctx.stroke();
  text(ctx, 'CLEAR ⌫', clear.x + clear.w / 2, clear.y + clear.h / 2, {
    size: 14,
    weight: 700,
    color: PALETTE.text,
    align: 'center',
    baseline: 'middle',
  });
}

// ----------------------------------------------------------- pass window --

function drawPass(ctx, game) {
  const pass = LAYOUT.pass;
  fillRound(ctx, pass.x, pass.y, pass.w, pass.h, 10, PALETTE.woodEdge);
  fillRound(ctx, pass.x + 8, pass.y + 8, pass.w - 16, pass.h - 16, 6, PALETTE.woodDark);
  ctx.fillStyle = PALETTE.glass;
  roundRect(ctx, pass.x + 8, pass.y + 8, pass.w - 16, pass.h - 16, 6);
  ctx.fill();

  text(ctx, 'THE PASS', pass.x + 16, pass.y + 26, {
    size: 15,
    weight: 800,
    color: PALETTE.accent,
  });

  // The pass window is only so wide: the slots share it, so a window with
  // three dishes on it gives each a third, and a long name wraps to two
  // lines under its plate instead of running under the next dish.
  const slotW = Math.min(190, (pass.w - 32) / Math.max(1, game.pass.length));

  game.pass.forEach((dish, i) => {
    const fade = 1 - Math.max(0, dish.age / dish.life);
    const x = pass.x + 16 + i * slotW;
    const y = pass.y + 40;

    ctx.save();
    ctx.globalAlpha = Math.max(0.15, fade);
    // nothing of this dish may spill into the next slot, ever
    ctx.beginPath();
    ctx.rect(x, y, slotW, pass.y + pass.h - 8 - y);
    ctx.clip();

    // the plated dish, drawn big enough to read at a glance
    const cx = x + slotW / 2;
    const cy = y + 34;
    const r = 30;
    circle(ctx, cx, cy, r, PALETTE.paperShade);
    circle(ctx, cx, cy, r - 5, PALETTE.paper);
    ctx.strokeStyle = PALETTE.paperEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
    ctx.stroke();

    // mini dish
    dish.items.forEach((item, index) => {
      const ing = INGREDIENTS[item.id];
      if (!ing) return;
      const ly = cy + 26 - index * 11;
      const w = 50 - index * 5;
      fillRound(ctx, cx - w / 2, ly - 12, w, 12, 5, ing.color);
      ctx.fillStyle = ing.dark;
      ctx.fillRect(cx - w / 2, ly - 5, w, 5);
      ctx.fillStyle = ing.light;
      ctx.fillRect(cx - w / 2 + 4, ly - 10, w - 8, 4);
    });

    // the name, wrapped to two lines centred under the plate: a long dish
    // name cannot run off its slot or under the next one.
    ctx.font = font(13, 700);
    const maxLine = slotW - 10;
    const words = dish.name.split(' ');
    const lines = [''];
    for (const word of words) {
      const last = lines[lines.length - 1];
      const trial = last ? `${last} ${word}` : word;
      if (ctx.measureText(trial).width <= maxLine || !last) {
        lines[lines.length - 1] = trial;
      } else if (lines.length < 2) {
        lines.push(word);
      } else {
        // past two lines: keep the rest on the second line and let
        // fitText shorten it, so no word is ever dropped silently
        lines[1] = `${lines[1]} ${word}`;
      }
    }
    lines.forEach((line, li) => {
      const fitted = fitText(ctx, line, maxLine);
      text(ctx, fitted, cx, y + 74 + li * 16, {
        size: 13,
        weight: 700,
        color: PALETTE.text,
        align: 'center',
      });
    });

    text(ctx, `+$${dish.tip}`, cx, y + 110, {
      size: 14,
      weight: 800,
      color: PALETTE.gold,
      align: 'center',
    });
    if (dish.perfect) {
      text(ctx, 'PERFECT!', cx, y + 128, {
        size: 12,
        weight: 800,
        color: PALETTE.good,
        align: 'center',
      });
    }
    ctx.restore();
  });
}

// -------------------------------------------------------------- the HUD ---

function drawHud(ctx, game) {
  const hud = LAYOUT.hud;
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(hud.x, hud.y, hud.w, hud.h);
  ctx.fillStyle = PALETTE.woodRail;
  ctx.fillRect(hud.x, hud.y + hud.h - 3, hud.w, 3);

  text(ctx, '★', 24, 30, { size: 22, weight: 800, color: PALETTE.gold });
  text(ctx, game.score, 46, 31, { size: 22, weight: 800, color: PALETTE.gold });

  // hearts
  for (let i = 0; i < 3; i += 1) {
    heart(ctx, 170 + i * 26, 24, 22, i < game.lives);
  }

  text(ctx, `NIGHT ${game.night}`, WIDTH / 2, 32, {
    size: 22,
    weight: 800,
    color: PALETTE.accent,
    align: 'center',
  });

  if (game.combo > 1) {
    text(ctx, `COMBO x${game.combo.toFixed(2)}`, WIDTH - 24, 32, {
      size: 19,
      weight: 800,
      color: PALETTE.good,
      align: 'right',
    });
  } else {
    text(ctx, `SERVED ${game.served}`, WIDTH - 24, 32, {
      size: 17,
      weight: 700,
      color: PALETTE.textDim,
      align: 'right',
    });
  }
}

// ------------------------------------------------------------- overlays ---

function drawEvents(ctx, game) {
  for (const event of game.events) {
    const alpha = Math.max(0, 1 - event.age / event.life);
    const y = event.y - event.age * 40;
    // A solid plaque behind the text: floating type over the sunset window
    // was unreadable and looked like stray debug output. The plaque is
    // measured to the text, so a long event never outruns its background.
    ctx.font = font(17, 700);
    const plaqueW = Math.max(120, Math.ceil(ctx.measureText(event.text).width) + 28);
    ctx.save();
    ctx.globalAlpha = alpha * 0.78;
    fillRound(ctx, event.x - plaqueW / 2, y - 22, plaqueW, 34, 8, PALETTE.woodDark);
    ctx.restore();
    text(ctx, event.text, event.x, y + 2, {
      size: 17,
      weight: 700,
      color: event.color,
      align: 'center',
      alpha,
    });
  }
}

function drawBanner(ctx, game) {
  const banner = game.banner;
  if (!banner) return;
  const alpha = Math.max(0, Math.min(1, banner.life / 0.8));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(0, 250, WIDTH, 130);
  text(ctx, banner.text, WIDTH / 2, 310, {
    size: 54,
    weight: 800,
    color: PALETTE.accent,
    align: 'center',
  });
  if (banner.sub) {
    text(ctx, banner.sub, WIDTH / 2, 348, {
      size: 20,
      weight: 600,
      color: PALETTE.text,
      align: 'center',
    });
  }
  ctx.restore();
}

// ---------------------------------------------------------- the phases ----

function drawTitle(ctx, game) {
  drawKitchen(ctx, game);

  ctx.fillStyle = 'rgba(20, 10, 16, 0.68)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  text(ctx, 'EMBER STREET DINER', WIDTH / 2, 250, {
    size: 64,
    weight: 800,
    color: PALETTE.accent,
    align: 'center',
  });
  text(ctx, 'sunset burgers, made to order', WIDTH / 2, 292, {
    size: 22,
    weight: 500,
    color: PALETTE.textDim,
    align: 'center',
  });

  CONTROLS.forEach((line, i) => {
    text(ctx, line, WIDTH / 2, 360 + i * 30, {
      size: 16,
      weight: 500,
      color: PALETTE.text,
      align: 'center',
    });
  });

  const pulse = 0.5 + 0.5 * Math.sin(game.time * 4);
  text(ctx, 'PRESS ENTER OR CLICK TO START', WIDTH / 2, 500, {
    size: 20,
    weight: 700,
    color: PALETTE.good,
    align: 'center',
    alpha: 0.35 + pulse * 0.65,
  });
}

function drawOver(ctx, game) {
  drawKitchen(ctx, game);

  ctx.fillStyle = 'rgba(20, 10, 16, 0.74)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  fillRound(ctx, 240, 150, WIDTH - 480, 420, 16, PALETTE.boardWood);
  ctx.strokeStyle = PALETTE.accent;
  ctx.lineWidth = 3;
  roundRect(ctx, 240, 150, WIDTH - 480, 420, 16);
  ctx.stroke();

  text(ctx, 'SERVICE CLOSED', WIDTH / 2, 240, {
    size: 48,
    weight: 800,
    color: PALETTE.hot,
    align: 'center',
  });
  text(ctx, `Final Score: ${game.score}`, WIDTH / 2, 306, {
    size: 28,
    weight: 700,
    color: PALETTE.gold,
    align: 'center',
  });
  text(
    ctx,
    `Nights survived: ${Math.max(0, game.night - 1)} · Dishes served: ${game.served} · Best combo: x${game.bestCombo.toFixed(2)}`,
    WIDTH / 2,
    352,
    { size: 18, weight: 500, color: PALETTE.text, align: 'center' },
  );

  const pulse = 0.5 + 0.5 * Math.sin(game.time * 4);
  text(ctx, 'PRESS ENTER TO TRY AGAIN', WIDTH / 2, 470, {
    size: 22,
    weight: 700,
    color: PALETTE.good,
    align: 'center',
    alpha: 0.35 + pulse * 0.65,
  });
}

// The kitchen, without any game-specific furniture on top of it.
function drawKitchen(ctx, game) {
  drawWall(ctx);
  drawWindow(ctx);
  drawStove(ctx);
  drawShelf(ctx);
  drawCounter(ctx);
  drawBins(ctx, game);
}

// ------------------------------------------------------------- the API ----

export function render(ctx, game) {
  ctx.save();

  if (game.shake > 0) {
    const amount = game.shake * 8;
    ctx.translate((Math.random() * 2 - 1) * amount, (Math.random() * 2 - 1) * amount);
  }

  if (game.phase === 'title') {
    drawTitle(ctx, game);
  } else if (game.phase === 'over') {
    drawOver(ctx, game);
  } else {
    drawHud(ctx, game);
    drawBoard(ctx, game);
    drawWall(ctx);
    drawWindow(ctx);
    drawStove(ctx);
    drawShelf(ctx);
    drawCounter(ctx);
    drawPrepBoard(ctx, game);
    drawPlate(ctx, game);
    drawButtons(ctx, game);
    drawPass(ctx, game);
    drawBins(ctx, game);
    drawEvents(ctx, game);
    drawBanner(ctx, game);
  }

  if (game.flash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.flash * 0.3);
    ctx.fillStyle = PALETTE.paper;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  ctx.restore();
}
