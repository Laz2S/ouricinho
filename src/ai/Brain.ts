import { Vector3 } from 'three';
import { clamp, clamp01 } from '../core/math';
import { chance, makeRng, pick, randomBetween, type Rng } from '../core/rng';
import type { AnimationName, BrainWorld, Edible, EmoteKind, PetAction } from '../core/types';
import { Needs } from './Needs';
import { createPersonality, type Personality } from './Personality';

type Phase = 'idle' | 'approach' | 'perform' | 'recover';

interface Candidate {
  action: PetAction;
  score: number;
  target: Vector3;
  treat: Edible | null;
}

const DURATION: Record<PetAction, number> = {
  idle: 1.8,
  wander: 2.2,
  sniff: 2.6,
  eat: 4.2,
  drink: 2.3,
  sleep: 12,
  groom: 3.6,
  sunbathe: 6.5,
  playBall: 5,
  exploreRamp: 4.5,
  zoomies: 2.2,
  startled: 1.2,
  treat: 2.4,
};

const ARRIVE_RADIUS: Record<PetAction, number> = {
  idle: 0.5,
  wander: 0.45,
  sniff: 0.5,
  eat: 0.78,
  drink: 0.78,
  sleep: 0.85,
  groom: 0.5,
  sunbathe: 0.8,
  playBall: 0.95,
  exploreRamp: 0.9,
  zoomies: 0.6,
  startled: 0.5,
  treat: 0.6,
};

const COOLDOWN: Partial<Record<PetAction, number>> = {
  eat: 12,
  drink: 18,
  sleep: 32,
  groom: 24,
  sunbathe: 26,
  playBall: 9,
  exploreRamp: 13,
  zoomies: 11,
  startled: 7,
  treat: 4,
};

const ANIMATION: Record<PetAction, AnimationName> = {
  idle: 'idle',
  wander: 'walk',
  sniff: 'sniff',
  eat: 'eat',
  drink: 'eat',
  sleep: 'sleep',
  groom: 'groom',
  sunbathe: 'rest',
  playBall: 'play',
  exploreRamp: 'walk',
  zoomies: 'walk',
  startled: 'curl',
  treat: 'eat',
};

const APPROACH_THOUGHT: Partial<Record<PetAction, readonly string[]>> = {
  wander: ['Wandering around...', 'Let me see what is over there.', 'A little stroll sounds nice.'],
  sniff: ['Sniffing around...', 'Something interesting smells nearby!', 'Nose to the ground!'],
  eat: ['Something smells tasty...', 'Time for a nibble.', 'Following my tummy.'],
  drink: ['A sip sounds good.', 'Getting a little drink.'],
  sleep: ['Getting sleepy...', 'My nest looks so soft.', 'Just one more nap...'],
  groom: ['Time for a tidy-up.', 'A quick wash would help.'],
  sunbathe: ['Looking for a warm spot.', 'The sunbeam is calling.'],
  playBall: ['Ooh, the ball!', 'I am going to nudge that ball.', 'Playtime!'],
  exploreRamp: ['Up the ramp!', 'A small adventure awaits.'],
  treat: ['Found a berry!', 'That looks delicious!'],
  zoomies: ['Zoomies!', 'Gotta go, gotta go!'],
};

const PERFORM_THOUGHT: Partial<Record<PetAction, readonly string[]>> = {
  idle: ['Taking it all in.', 'What a lovely day.', 'Just being here.'],
  wander: ['Exploring the diorama.', 'Such a big little world.'],
  sniff: ['Sniff, sniff...', 'Very interesting smell!', 'Checking every corner.'],
  eat: ['Nom nom nom.', 'This is delicious!', 'Happy tummy.'],
  drink: ['Refreshing!', 'Ahh, much better.'],
  sleep: ['Dreaming of berries...', 'All cozy and warm.', 'ZZZ...'],
  groom: ['Almost spotless!', 'A hedgehog must be tidy.', 'Just one more whisker.'],
  sunbathe: ['Warming up in the sun.', 'This is the life.', 'So cozy here.'],
  playBall: ['Playing with ball!', 'Boop! Boop!', 'This ball is mine now.'],
  exploreRamp: ['Adventure achieved!', 'I climbed it!'],
  zoomies: ['Wheee!', 'Zoom zoom zoom!'],
  startled: ['Eep! Curling up!', 'Was that a shadow?', 'Safe in a ball.'],
  treat: ['Best. Berry. Ever.', 'Thank you for the treat!', 'Yum!'],
};

/** Autonomous utility AI. No external input is required to keep the pet alive. */
export class Brain {
  readonly personality: Personality;
  readonly needs: Needs;

  private readonly rng: Rng;
  private readonly world: BrainWorld;
  private simTime = 0;
  private actionState: PetAction = 'idle';
  private phase: Phase = 'idle';
  private target = new Vector3();
  private activeTreat: Edible | null = null;
  private phaseTimer = 0;
  private duration = 1;
  private decisionTimer = 0.25;
  private quirkTimer: number;
  private lastPerformed: Partial<Record<PetAction, number>> = {};
  private thoughtText = 'Waking up...';

  constructor(world: BrainWorld, rng: Rng = makeRng(Date.now())) {
    this.world = world;
    this.rng = rng;
    this.personality = createPersonality(rng);
    this.needs = new Needs(this.personality);
    this.quirkTimer = randomBetween(rng, 5, 11);
  }

  get action(): PetAction {
    return this.actionState;
  }

  get isApproaching(): boolean {
    return this.phase === 'approach';
  }

  get currentTarget(): Vector3 | null {
    return this.phase === 'approach' ? this.target : null;
  }

  get thought(): string {
    return this.thoughtText;
  }

  get animation(): AnimationName {
    return ANIMATION[this.actionState];
  }

  get emote(): EmoteKind {
    if (this.phase === 'perform') {
      if (this.actionState === 'sleep') return 'zzz';
      if (this.actionState === 'playBall' || this.actionState === 'treat') return 'heart';
    }
    return null;
  }

  /** Speed multiplier driven by mood, energy, personality and current drive. */
  get speedScale(): number {
    const s = this.needs.state;
    let scale = 0.78 + clamp01(s.mood / 100) * 0.42;
    if (s.energy < 35) scale *= 0.78;
    scale *= 1.06 - this.personality.laziness * 0.16;
    if (this.actionState === 'zoomies') scale *= 1.95;
    if (this.actionState === 'startled') scale *= 0;
    return clamp(scale, 0.55, 2.2);
  }

  update(dt: number, position: Vector3): void {
    this.simTime += dt;
    this.needs.update(dt);
    this.phaseTimer += dt;

    if (this.phase === 'approach' && this.actionState === 'playBall') {
      this.target.copy(this.world.ballPosition);
    }

    if (
      this.phase === 'approach' &&
      this.distanceToTarget(position) < ARRIVE_RADIUS[this.actionState]
    ) {
      this.beginPerform();
    }

    if (this.phase === 'approach' && this.actionState === 'zoomies' && this.phaseTimer > 3.4) {
      this.beginRecover();
    }

    if (this.phase === 'perform') {
      this.needs.applyAction(this.actionState, dt);
      if (
        this.actionState === 'treat' &&
        this.activeTreat?.available === true &&
        this.phaseTimer >= this.duration * 0.6
      ) {
        this.activeTreat.consume();
      }
      if (this.phaseTimer >= this.duration) {
        this.beginRecover();
      }
    } else if (this.phase === 'recover') {
      if (this.phaseTimer >= this.duration) {
        this.phase = 'idle';
        this.phaseTimer = 0;
        this.decisionTimer = randomBetween(this.rng, 0.15, 0.55);
      }
    } else if (this.phase === 'idle') {
      this.decisionTimer -= dt;
      if (this.decisionTimer <= 0) {
        this.chooseAction(position);
      }
    }

    this.quirkTimer -= dt;
    if (this.quirkTimer <= 0) {
      this.quirkTimer = randomBetween(this.rng, 7, 16);
      this.tryQuirk(position);
    }
  }

  private chooseAction(position: Vector3): void {
    const s = this.needs.state;
    const p = this.personality;
    const candidates: Candidate[] = [];
    const add = (action: PetAction, score: number, target: Vector3, treat: Edible | null = null) => {
      if (score > 0.01) candidates.push({ action, score, target, treat });
    };

    const bestTreat = this.world.treats
      .filter((treat) => treat.available)
      .sort((a, b) => position.distanceToSquared(a.position) - position.distanceToSquared(b.position))[0];

    if (bestTreat) {
      add('treat', 0.95 + clamp01(s.hunger / 100) * 0.75, bestTreat.position.clone(), bestTreat);
    }

    const foodTarget = this.world.anchors.food.clone();
    foodTarget.x += randomBetween(this.rng, -0.22, 0.22);
    foodTarget.z += randomBetween(this.rng, -0.22, 0.22);
    add('eat', Math.pow(clamp01(s.hunger / 100), 1.5) * (1.25 + p.gluttony * 0.72), foodTarget);

    const waterTarget = this.world.anchors.water.clone();
    add('drink', Math.max(0, s.hunger - 56) / 100 * 0.9, waterTarget);

    const sleepTarget = this.world.anchors.nest.clone();
    add(
      'sleep',
      Math.pow(1 - clamp01(s.energy / 100), 1.6) * (1.42 + p.laziness * 0.85) + (s.energy < 24 ? 0.75 : 0),
      sleepTarget,
    );

    const hygieneNeed = 1 - clamp01(s.hygiene / 100);
    add('groom', Math.pow(hygieneNeed, 1.35) * (1.1 + p.tidiness * 0.85), this.randomPoint(position, 1.4));

    const comfortNeed = 1 - clamp01(s.comfort / 100);
    add('sunbathe', comfortNeed * (0.95 + p.laziness * 0.3), this.world.anchors.sunbeam.clone());

    const funNeed = 1 - clamp01(s.fun / 100);
    add('playBall', funNeed * (1.1 + p.playfulness * 0.85), this.world.ballPosition.clone());
    add(
      'exploreRamp',
      funNeed * (0.62 + p.curiosity * 0.55),
      (chance(this.rng, 0.5) ? this.world.anchors.rampTop : this.world.anchors.rampBottom).clone(),
    );
    add('sniff', 0.34 + p.curiosity * 0.34 + funNeed * 0.2, this.randomPoint(position, 2.4));
    add('wander', 0.42 + p.curiosity * 0.2, this.randomPoint(position, 3.6));
    add('idle', 0.48 + clamp01(s.mood / 100) * 0.28, position.clone());

    for (const candidate of candidates) {
      const since = this.simTime - (this.lastPerformed[candidate.action] ?? -1000);
      const cooldown = COOLDOWN[candidate.action] ?? 0;
      if (since < cooldown) candidate.score *= 0.12;
      if (candidate.action === this.actionState) candidate.score += 0.09;
      candidate.score *= randomBetween(this.rng, 0.93, 1.07);
    }

    candidates.sort((a, b) => b.score - a.score);
    const chosen = candidates[0];
    if (!chosen) return;

    if (chosen.action === 'idle') {
      this.actionState = 'idle';
      this.activeTreat = null;
      this.phase = 'perform';
      this.phaseTimer = 0;
      this.duration = randomBetween(this.rng, 1.1, 2.4);
      this.lastPerformed.idle = this.simTime;
      this.thoughtText = pick(this.rng, PERFORM_THOUGHT.idle ?? ['Just being here.']);
      return;
    }

    this.startAction(chosen.action, chosen.target, chosen.treat);
  }

  private startAction(action: PetAction, target: Vector3, treat: Edible | null = null): void {
    this.actionState = action;
    this.target.copy(target);
    this.activeTreat = treat;
    this.phase = 'approach';
    this.phaseTimer = 0;
    this.duration = DURATION[action];
    this.thoughtText = pick(this.rng, APPROACH_THOUGHT[action] ?? ['On my way...']);
  }

  private beginPerform(): void {
    this.phase = 'perform';
    this.phaseTimer = 0;
    this.duration = this.scaleDuration(this.actionState);
    this.lastPerformed[this.actionState] = this.simTime;
    this.thoughtText = pick(this.rng, PERFORM_THOUGHT[this.actionState] ?? ['Hmm...']);
  }

  private beginRecover(): void {
    this.phase = 'recover';
    this.phaseTimer = 0;
    this.duration = randomBetween(this.rng, 0.45, 1.15);
    this.activeTreat = null;
  }

  private scaleDuration(action: PetAction): number {
    const base = DURATION[action];
    const s = this.needs.state;
    if (action === 'sleep') return clamp(base * (1.4 - s.energy / 180), 6, 15);
    if (action === 'eat' || action === 'treat') {
      return clamp(base * (0.65 + clamp01(s.hunger / 100) * 0.65), 2, 6);
    }
    if (action === 'groom') return base * (0.75 + this.personality.tidiness * 0.5);
    return base * randomBetween(this.rng, 0.85, 1.2);
  }

  private tryQuirk(position: Vector3): void {
    const interruptible =
      this.phase === 'idle' ||
      (this.phase === 'approach' && (this.actionState === 'wander' || this.actionState === 'sniff'));
    if (!interruptible) return;

    const s = this.needs.state;
    if (
      chance(this.rng, 0.1 + this.personality.timidity * 0.2) &&
      s.comfort > 22 &&
      this.actionState !== 'startled'
    ) {
      this.actionState = 'startled';
      this.activeTreat = null;
      this.phase = 'perform';
      this.phaseTimer = 0;
      this.duration = randomBetween(this.rng, 0.8, 1.5);
      this.lastPerformed.startled = this.simTime;
      this.thoughtText = pick(this.rng, PERFORM_THOUGHT.startled ?? ['Eep!']);
      return;
    }

    if (chance(this.rng, 0.2 + this.personality.playfulness * 0.4) && s.energy > 30) {
      this.startAction('zoomies', this.randomPoint(position, 4.4));
    }
  }

  private randomPoint(origin: Vector3, radius: number): Vector3 {
    const angle = randomBetween(this.rng, 0, Math.PI * 2);
    const distance = randomBetween(this.rng, radius * 0.35, radius);
    return new Vector3(
      clamp(origin.x + Math.cos(angle) * distance, -4.6, 4.6),
      0,
      clamp(origin.z + Math.sin(angle) * distance, -4.6, 4.6),
    );
  }

  private distanceToTarget(position: Vector3): number {
    return Math.hypot(position.x - this.target.x, position.z - this.target.z);
  }
}
