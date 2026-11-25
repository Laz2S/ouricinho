import { clamp } from '../core/math';
import type { NeedsState, PetAction } from '../core/types';
import type { Personality } from './Personality';

/**
 * Internal drives of the pet. Hunger is a pressure (high = hungry), while
 * energy, fun, comfort and hygiene are resources (high = good). Mood is a
 * smooth composite used by the visuals and by the utility scoring.
 */
export class Needs {
  readonly state: NeedsState = {
    hunger: 22,
    energy: 82,
    fun: 72,
    comfort: 78,
    hygiene: 86,
    mood: 76,
  };

  constructor(private readonly personality: Personality) {
    this.recomputeMood();
  }

  /** Constant background change of every drive, independent of current action. */
  update(dt: number): void {
    this.state.hunger = clamp(this.state.hunger + dt * 1.7, 0, 100);
    this.state.energy = clamp(this.state.energy - dt * 0.9, 0, 100);
    this.state.fun = clamp(this.state.fun - dt * 1.15, 0, 100);
    this.state.comfort = clamp(this.state.comfort - dt * 0.7, 0, 100);
    this.state.hygiene = clamp(this.state.hygiene - dt * 0.5, 0, 100);
    this.recomputeMood();
  }

  /** Action-specific effects are added on top of the passive decay. */
  applyAction(action: PetAction, dt: number): void {
    const s = this.state;
    switch (action) {
      case 'eat':
        s.hunger -= 26 * dt;
        s.comfort += 3 * dt;
        break;
      case 'treat':
        s.hunger -= 34 * dt;
        s.fun += 6 * dt;
        s.comfort += 4 * dt;
        break;
      case 'drink':
        s.hunger -= 14 * dt;
        s.comfort += 5 * dt;
        break;
      case 'sleep':
        s.energy += 16 * dt;
        s.hunger += 0.35 * dt;
        s.comfort += 1.5 * dt;
        break;
      case 'groom':
        s.hygiene += 22 * dt;
        s.comfort += 6 * dt;
        s.energy -= 1 * dt;
        break;
      case 'sunbathe':
        s.comfort += 17 * dt;
        s.energy += 4 * dt;
        s.fun += 1.5 * dt;
        break;
      case 'playBall':
        s.fun += 24 * dt;
        s.energy -= 5.5 * dt;
        s.hunger += 0.5 * dt;
        break;
      case 'exploreRamp':
        s.fun += 14 * dt;
        s.energy -= 3.8 * dt;
        s.hunger += 0.4 * dt;
        break;
      case 'zoomies':
        s.fun += 11 * dt;
        s.energy -= 9 * dt;
        s.hunger += 0.8 * dt;
        break;
      case 'sniff':
        s.fun += 4.5 * dt;
        s.energy -= 1.2 * dt;
        break;
      case 'wander':
        s.fun += 2.5 * dt;
        s.energy -= 2.4 * dt;
        break;
      case 'startled':
        s.comfort -= 3 * dt;
        s.fun -= 2 * dt;
        break;
      case 'idle':
        s.energy += 0.4 * dt;
        break;
    }

    s.hunger = clamp(s.hunger, 0, 100);
    s.energy = clamp(s.energy, 0, 100);
    s.fun = clamp(s.fun, 0, 100);
    s.comfort = clamp(s.comfort, 0, 100);
    s.hygiene = clamp(s.hygiene, 0, 100);
    this.recomputeMood();
  }

  private recomputeMood(): void {
    const s = this.state;
    const satiety = 100 - s.hunger;
    const raw =
      satiety * 0.26 +
      s.energy * 0.27 +
      s.fun * 0.24 +
      s.comfort * 0.13 +
      s.hygiene * 0.1;
    const hungerPenalty = s.hunger > 78 ? (s.hunger - 78) * 0.42 : 0;
    const exhaustionPenalty = s.energy < 22 ? (22 - s.energy) * 0.35 : 0;
    const personalityBonus = this.personality.playfulness * 3 - this.personality.timidity * 2;
    s.mood = clamp(raw - hungerPenalty - exhaustionPenalty + personalityBonus, 0, 100);
  }
}
