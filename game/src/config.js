// Tuning constants and the shared visual language of Ember Street Diner.
// One place for every number the designer might want to nudge, and one place for
// every colour, so the renderer never invents a shade and the rules never hide
// a magic value.

export const WIDTH = 1280;
export const HEIGHT = 720;

export const PALETTE = {
  wallTop: '#2b1a2d',
  wallMid: '#472634',
  wallLow: '#5c2f36',
  wainscot: '#3a2028',
  trim: '#7a4038',
  skyHigh: '#ffe0a8',
  skyMid: '#ff9f61',
  skyLow: '#e2607a',
  skyDeep: '#7b3a80',
  sun: '#fff3cc',
  hillFar: '#8c4468',
  hillNear: '#5a2b52',
  woodTop: '#8b5732',
  woodEdge: '#5c3620',
  woodDark: '#38200f',
  woodRail: '#59351f',
  boardWood: '#4b2e20',
  paper: '#f7e9cd',
  paperShade: '#e0cda9',
  paperEdge: '#c2a97e',
  ink: '#3a2416',
  inkSoft: '#8a6642',
  accent: '#ffcf73',
  hot: '#ff5f45',
  good: '#79d17a',
  cool: '#5aa9e6',
  gold: '#ffd45e',
  heart: '#ff6a72',
  text: '#fdf3e0',
  textDim: '#c9b191',
  glass: 'rgba(255, 226, 180, 0.14)',
  shadow: 'rgba(0, 0, 0, 0.38)',
  steel: '#8d99a6',
  steelDark: '#4d5764',
  steelLight: '#c3ced8',
  flame: '#ff8a3d',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, "DejaVu Sans", sans-serif';

export function font(size, weight = 400) {
  return `${weight} ${size}px ${FONT}`;
}

// Screen geometry. The renderer draws from these, the input layer hit-tests
// against the same numbers, so the two can never disagree about what a button is.
export const LAYOUT = {
  hud: { x: 0, y: 0, w: WIDTH, h: 48 },
  board: { x: 0, y: 48, w: WIDTH, h: 128 },
  rail: { x: 0, y: 48, w: WIDTH, h: 12 },
  ticket: { y: 60, h: 112 },
  wall: { y: 176, h: 240 },
  counter: { y: 416, h: 184 },
  shelf: { y: 600, h: 120 },
  plate: { x: 388, y: 498, r: 100 },
  serveBtn: { x: 636, y: 440, w: 190, h: 68 },
  clearBtn: { x: 636, y: 522, w: 190, h: 36 },
  pass: { x: 860, y: 408, w: 410, h: 196 },
  binStrip: { x: 18, y: 604, w: WIDTH - 36, h: 108 },
};

export const BIN_COUNT = 8;
export const BIN_CELL = (LAYOUT.binStrip.w) / BIN_COUNT;

export function binRect(index) {
  const s = LAYOUT.binStrip;
  const w = BIN_CELL - 8;
  return { x: s.x + index * BIN_CELL + 4, y: s.y + 6, w, h: s.h - 12 };
}

export function binCenter(index) {
  const r = binRect(index);
  return { x: r.x + r.w / 2, y: r.y + 44 };
}

export const TIMING = {
  ticketBase: 30, // seconds on the clock for a 3-item ticket at night 1
  ticketPerItem: 1.6,
  ticketPerLevel: 1.35,
  ticketMin: 11,
  spawnDelay: 2.2,
  spawnJitter: 0.9,
  chopAuto: 0.55, // a single tap on a diced item finishes on its own after this
  chopFlash: 0.3,
  penalty: 2.2, // seconds lost on the focused ticket for a wrong ingredient
  passDisplay: 4.5, // how long a finished dish waits on the pass window
  rushBanner: 2.2,
  shakeDecay: 5.5,
};

export const SCORING = {
  pointsPerItem: 14,
  dishBonus: 30,
  tipMax: 90,
  comboStep: 0.25,
  comboCap: 4,
  perfectBonus: 40,
};

export const DIFFICULTY = {
  lives: 3,
  servedPerNight: 4,
  ticketsForNight: (night) => Math.min(5, 2 + Math.floor(night / 2)),
  maxItemsForNight: (night) => Math.min(7, 3 + night),
};

export const CONTROLS = [
  'click an ingredient  ·  or press 1-8',
  'double-tap a diced item  ·  ENTER serves',
  'BACKSPACE clears the plate  ·  TAB switches order',
];
