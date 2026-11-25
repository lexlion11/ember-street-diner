// The menu of Ember Street Diner: what every ingredient looks like on the
// counter, and which stacks of ingredients become which dish.
//
// A ticket is a dish template plus optional twists, so no two nights play the
// same way. The ingredient order on a ticket is the ORDER OF STACKING: bottom
// first. Get it wrong and the plate will not fly.

export const INGREDIENTS = {
  bun: {
    id: 'bun',
    name: 'Bun',
    short: 'BUN',
    color: '#d9964a',
    dark: '#a9672c',
    light: '#f0c17e',
    forms: ['whole'],
    key: '1',
    note: 'toasted kaiser',
  },
  patty: {
    id: 'patty',
    name: 'Patty',
    short: 'PAT',
    color: '#7a3f28',
    dark: '#4d2415',
    light: '#a4603d',
    forms: ['whole'],
    key: '2',
    note: 'flame grilled',
  },
  lettuce: {
    id: 'lettuce',
    name: 'Lettuce',
    short: 'LET',
    color: '#6fbf4f',
    dark: '#3f8a2f',
    light: '#a8e57f',
    forms: ['whole'],
    key: '3',
    note: 'crisp leaf',
  },
  tomato: {
    id: 'tomato',
    name: 'Tomato',
    short: 'TOM',
    color: '#e2503f',
    dark: '#a52f24',
    light: '#ff8a6e',
    forms: ['whole', 'diced'],
    key: '4',
    note: 'cut into coins',
  },
  cheese: {
    id: 'cheese',
    name: 'Cheese',
    short: 'CHS',
    color: '#f2b73d',
    dark: '#c1861c',
    light: '#ffe08a',
    forms: ['whole'],
    key: '5',
    note: 'aged cheddar',
  },
  onion: {
    id: 'onion',
    name: 'Onion',
    short: 'ONI',
    color: '#e6d2ea',
    dark: '#a888b4',
    light: '#fbf0ff',
    forms: ['whole', 'diced'],
    key: '6',
    note: 'paper thin',
  },
  cucumber: {
    id: 'cucumber',
    name: 'Cucumber',
    short: 'CUC',
    color: '#63b96a',
    dark: '#2f7a3d',
    light: '#a4e08c',
    forms: ['whole', 'diced'],
    key: '7',
    note: 'cool ribbons',
  },
  sauce: {
    id: 'sauce',
    name: 'Sauce',
    short: 'SCE',
    color: '#e8562f',
    dark: '#a33018',
    light: '#ff9464',
    forms: ['whole'],
    key: '8',
    note: 'house glaze',
  },
};

export const INGREDIENT_ORDER = [
  'bun',
  'patty',
  'lettuce',
  'tomato',
  'cheese',
  'onion',
  'cucumber',
  'sauce',
];

// Dish templates: the ingredients, bottom of the stack first. `tier` sets the
// base payout; long stacks are worth more but eat more of the ticket clock.
export const DISHES = [
  { id: 'harbor', name: 'Harbor Stack', items: ['bun', 'patty', 'cheese', 'lettuce'], tier: 1 },
  { id: 'sunset', name: 'Sunset Sub', items: ['bun', 'lettuce', 'tomato', 'sauce'], tier: 1 },
  { id: 'smash', name: 'Smash Wrap', items: ['bun', 'patty', 'onion', 'sauce'], tier: 1 },
  { id: 'garden', name: 'Garden Bun', items: ['bun', 'lettuce', 'cucumber', 'tomato'], tier: 1 },
  { id: 'melt', name: 'Double Melt', items: ['bun', 'patty', 'patty', 'cheese'], tier: 2 },
  { id: 'crispy', name: 'Crispy Combo', items: ['bun', 'patty', 'onion', 'cucumber', 'sauce'], tier: 2 },
  { id: 'cheddar', name: 'Cheddar Please', items: ['bun', 'cheese', 'cheese', 'patty'], tier: 2 },
  { id: 'tower', name: 'Tower of Ten', items: ['bun', 'patty', 'cheese', 'tomato', 'lettuce', 'sauce'], tier: 3 },
  { id: 'garden', name: 'Garden Stack', items: ['bun', 'lettuce', 'cucumber', 'tomato', 'cheese'], tier: 2 },
];

// Twists that turn a template into a fresh challenge.
export const TWISTS = [
  { id: 'double', label: 'DOUBLE', note: 'one extra layer' },
  { id: 'hold', label: 'NO', note: 'leave one out' },
  { id: 'dice', label: 'DICED', note: 'chop it fine' },
];

// Build one order. Returns {dish, items, twists, name} where items are the
// ingredient ids that actually go on the plate, in stacking order.
export function buildOrder(rng, night) {
  const dish = rng.pick(DISHES);
  let items = dish.items.slice();
  const twists = [];

  const wanted = Math.min(items.length, 3 + Math.floor(night / 2) + rng.int(0, 1));
  while (items.length > wanted && items.length > 2) {
    items.splice(rng.int(1, items.length - 1), 1);
  }

  if (night >= 1 && rng.chance(0.3 + night * 0.06)) {
    const extra = rng.pick(INGREDIENT_ORDER.filter((id) => id !== 'bun'));
    items.splice(items.length - 1, 0, extra);
    twists.push({ id: 'double', label: 'DOUBLE', item: extra });
  }

  let name = dish.name;
  if (twists.length) {
    name = `${rng.pick(['Big', 'Hot', 'Night', 'Lucky', 'Chef'])} ${name}`;
  }
  return { dish, items, twists, name };
}

// Which ingredients does this order need? Used by the renderer to light up the
// counter bins the cook still has to reach for.
export function neededItems(order) {
  const set = new Set();
  for (const id of order.items) set.add(id);
  return set;
}
