// Ember Street Diner - input layer.
//
// This file is the only place that knows about the mouse and the keyboard.
// It never changes the game state itself: it hit-tests, then asks the caller
// to act through the `actions` object it was handed. That keeps the rules in
// world.js and the drawing in render.js, and it means a screenshot scene can
// drive the very same functions the player does.

import { HEIGHT, WIDTH } from './config.js';
import { INGREDIENTS, INGREDIENT_ORDER } from './recipes.js';
import { PHASE, hitClear, hitIngredient, hitServe } from './world.js';

// The digit that picks an ingredient, taken from the recipe table so the key
// printed on the counter and the key the player presses can never disagree.
const KEY_TO_INGREDIENT = new Map();
for (const id of INGREDIENT_ORDER) {
  const ingredient = INGREDIENTS[id];
  if (ingredient && ingredient.key) KEY_TO_INGREDIENT.set(ingredient.key, id);
}

/**
 * Attach mouse and keyboard handling to a canvas.
 *
 * @param {HTMLCanvasElement} canvas the canvas the game draws into
 * @param {object} game the live game state (its `phase` decides what a key means)
 * @param {{ingredient: (id: string, form: string) => void, serve: () => void,
 *          clear: () => void, focusNext: () => void, start: () => void,
 *          restart: () => void}} actions what to call for each player intent
 * @returns {() => void} a detach function that removes every listener again
 */
export function attachInput(canvas, game, actions) {
  // The canvas is drawn at a fixed internal resolution; the page may scale it.
  // Map a pointer position from CSS pixels back into that fixed space.
  const toGame = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (WIDTH / r.width);
    const y = (e.clientY - r.top) * (HEIGHT / r.height);
    return { x, y };
  };

  const onMouseDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (game.phase === PHASE.TITLE) {
      actions.start();
      return;
    }
    if (game.phase === PHASE.OVER) {
      actions.restart();
      return;
    }
    const { x, y } = toGame(e);
    const hit = hitIngredient(x, y);
    if (hit) {
      actions.ingredient(hit.id, hit.form);
      return;
    }
    if (hitServe(x, y)) {
      actions.serve();
      return;
    }
    if (hitClear(x, y)) {
      actions.clear();
    }
  };

  const onKeyDown = (e) => {
    if (e.repeat) return;
    const key = e.key;

    if (game.phase === PHASE.TITLE) {
      if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        actions.start();
      }
      return;
    }

    if (game.phase === PHASE.OVER) {
      if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        actions.restart();
      }
      return;
    }

    if (key >= '1' && key <= '8') {
      const id = KEY_TO_INGREDIENT.get(key);
      if (!id) return;
      e.preventDefault();
      const ingredient = INGREDIENTS[id];
      // Holding shift asks for the diced cut when the ingredient has one.
      const form = e.shiftKey && ingredient.forms.includes('diced') ? 'diced' : 'whole';
      actions.ingredient(id, form);
      return;
    }

    if (key === 'Enter') {
      e.preventDefault();
      actions.serve();
      return;
    }

    if (key === 'Backspace') {
      e.preventDefault();
      actions.clear();
      return;
    }

    if (key === 'Tab') {
      e.preventDefault();
      actions.focusNext();
    }
  };

  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('keydown', onKeyDown);

  return function detach() {
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('keydown', onKeyDown);
  };
}
