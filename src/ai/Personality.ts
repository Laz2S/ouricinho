import { randomBetween, type Rng } from '../core/rng';

export interface Personality {
  /** Likes exploring, sniffing and unusual corners of the diorama. */
  curiosity: number;
  /** Enjoys the ball, the ramp and sudden zoomies. */
  playfulness: number;
  /** Starts looking for food sooner and eats with more enthusiasm. */
  gluttony: number;
  /** Tires faster and prefers naps and sunbeams. */
  laziness: number;
  /** More likely to get startled and curl into a ball. */
  timidity: number;
  /** Grooms more often and cares more about comfort. */
  tidiness: number;
}

export function createPersonality(rng: Rng): Personality {
  return {
    curiosity: randomBetween(rng, 0.35, 0.95),
    playfulness: randomBetween(rng, 0.35, 0.95),
    gluttony: randomBetween(rng, 0.3, 0.9),
    laziness: randomBetween(rng, 0.25, 0.8),
    timidity: randomBetween(rng, 0.15, 0.75),
    tidiness: randomBetween(rng, 0.3, 0.9),
  };
}
