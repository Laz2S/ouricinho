export type Rng = () => number;

/** Small deterministic PRNG so the hedgehog's personality is stable per session seed. */
export function makeRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomBetween(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function randomInt(rng: Rng, minInclusive: number, maxExclusive: number): number {
  return Math.floor(randomBetween(rng, minInclusive, maxExclusive));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[randomInt(rng, 0, items.length)];
}

export function chance(rng: Rng, probability: number): boolean {
  return rng() < probability;
}
