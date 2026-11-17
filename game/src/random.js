// A small seeded random number generator (splitmix32): the same seed gives the same
// lagoon, which is what makes the screenshot scenes repeatable. It returns a number
// in [0, 1) on every call, and pick() / range() are the only helpers the world needs.

export function createRandom(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function random() {
    a = (a + 0x9e3779b9) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 16), 0x21f0aaad);
    t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

/** A value in [min, max) from a random() function. */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** One element of an array, picked uniformly. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}
