import { Scene, Vector3 } from 'three';
import type { Brain } from '../ai/Brain';
import { clamp01, damp, dampAngle } from '../core/math';
import { randomBetween, type Rng } from '../core/rng';
import type { AnimationName, Bounds, Obstacle } from '../core/types';
import { buildHedgehog, type HedgehogParts } from './hedgehogMesh';
import { Steering } from './Steering';

/** Connects autonomous decisions to steering and to the procedural animation rig. */
export class Hedgehog {
  readonly parts: HedgehogParts;
  readonly steering: Steering;

  private readonly rng: Rng;
  private curl = 0;
  private blinkTimer = 2.5;
  private blinkPhase = 0;

  constructor(scene: Scene, rng: Rng) {
    this.rng = rng;
    this.parts = buildHedgehog(rng);
    this.steering = new Steering(rng);
    this.parts.root.position.copy(this.steering.position);
    scene.add(this.parts.root);
  }

  get position(): Vector3 {
    return this.steering.position;
  }

  update(
    dt: number,
    time: number,
    brain: Brain,
    obstacles: readonly Obstacle[],
    bounds: Bounds,
  ): void {
    const target = brain.isApproaching ? brain.currentTarget : null;
    const speedRatio = this.steering.update(
      dt,
      { target, speedScale: brain.speedScale },
      obstacles,
      bounds,
    );

    this.parts.root.position.copy(this.steering.position);

    const velocity = this.steering.velocity;
    if (velocity.lengthSq() > 0.0025) {
      const heading = Math.atan2(velocity.x, velocity.z);
      this.parts.root.rotation.y = dampAngle(this.parts.root.rotation.y, heading, 8, dt);
    }

    const mood = clamp01(brain.needs.state.mood / 100);
    const energy = clamp01(brain.needs.state.energy / 100);
    this.animate(dt, time, brain.animation, speedRatio, mood, energy);
  }

  private animate(
    dt: number,
    time: number,
    animation: AnimationName,
    speedRatio: number,
    mood: number,
    energy: number,
  ): void {
    const parts = this.parts;
    let gaitAmplitude = 0;
    let gaitFrequency = 8;
    let bob = 0;
    let headPitch = 0;
    let curlTarget = 0;
    let squash = 1;
    let sniffAmount = 0.25;

    switch (animation) {
      case 'walk':
        gaitAmplitude = 0.055 * Math.min(1, speedRatio);
        gaitFrequency = 8 + speedRatio * 4;
        bob = Math.abs(Math.sin(time * gaitFrequency)) * 0.028 * Math.min(1, speedRatio);
        headPitch = 0.04 + Math.sin(time * gaitFrequency) * 0.025;
        sniffAmount = 0.4;
        break;
      case 'sniff':
        headPitch = 0.32 + Math.sin(time * 7.5) * 0.11;
        sniffAmount = 1;
        bob = Math.sin(time * 4) * 0.01;
        break;
      case 'eat':
        headPitch = 0.5 + Math.sin(time * 9) * 0.13;
        sniffAmount = 0.9;
        bob = Math.sin(time * 9) * 0.012;
        break;
      case 'sleep':
        curlTarget = 1;
        headPitch = -0.55;
        squash = 0.96;
        sniffAmount = 0.05;
        break;
      case 'curl':
        curlTarget = 1;
        headPitch = -0.48;
        squash = 0.98;
        break;
      case 'groom':
        headPitch = 0.08 + Math.sin(time * 6) * 0.05;
        bob = Math.sin(time * 5) * 0.01;
        break;
      case 'rest':
        headPitch = -0.12;
        squash = 1.02;
        sniffAmount = 0.1;
        break;
      case 'play':
        gaitAmplitude = 0.045;
        gaitFrequency = 10;
        bob = Math.abs(Math.sin(time * 10)) * 0.075;
        headPitch = 0.12 + Math.sin(time * 10) * 0.08;
        sniffAmount = 0.55;
        break;
      case 'idle':
        headPitch = Math.sin(time * 1.6) * 0.035;
        break;
    }

    this.curl = damp(this.curl, curlTarget, 7, dt);

    const breathFrequency = 2.1 + (1 - energy) * 1.9;
    const breath = Math.sin(time * breathFrequency) * (curlTarget > 0 ? 0.035 : 0.022);
    parts.bodyGroup.position.y = 0.52 + bob - this.curl * 0.13;
    parts.bodyGroup.scale.set(
      1 + this.curl * 0.12,
      squash * (1 - this.curl * 0.17) * (1 + breath),
      1 + this.curl * 0.09,
    );
    parts.bodyGroup.rotation.z = Math.sin(time * gaitFrequency * 0.5) * 0.035 * gaitAmplitude;

    parts.headGroup.position.y = 0.18 - this.curl * 0.17;
    parts.headGroup.position.z = 0.58 - this.curl * 0.2;
    parts.headGroup.rotation.x = damp(parts.headGroup.rotation.x, headPitch, 9, dt);
    parts.headGroup.rotation.z = Math.sin(time * 2.3) * 0.02 * (1 - this.curl);

    parts.snoutGroup.position.z = 0.31 + Math.sin(time * 15) * 0.015 * sniffAmount;
    const noseWiggle = 1 + Math.sin(time * 17) * 0.08 * sniffAmount;
    parts.nose.scale.set(0.073 * noseWiggle, 0.062 / noseWiggle, 0.058);

    this.updateEyes(dt, animation);

    parts.ears.forEach((ear, index) => {
      const side = index === 0 ? -1 : 1;
      const target = side * (-0.22 + (1 - mood) * 0.1 + Math.sin(time * 3 + index) * 0.025 + this.curl * 0.28);
      ear.rotation.z = damp(ear.rotation.z, target, 6, dt);
    });

    parts.paws.forEach((paw, index) => {
      const phase = (index % 2) * Math.PI + (index < 2 ? 0 : Math.PI * 0.55);
      let y = -0.34 + Math.sin(time * gaitFrequency + phase) * 0.085 * gaitAmplitude;
      let rotationX = Math.sin(time * gaitFrequency + phase) * 0.4 * gaitAmplitude;
      if (animation === 'groom' && index % 2 === 1) {
        y += Math.abs(Math.sin(time * 9 + phase)) * 0.2;
        rotationX += 0.55;
      }
      if (this.curl > 0.5) {
        y -= this.curl * 0.04;
        rotationX *= 1 - this.curl;
      }
      paw.position.y = damp(paw.position.y, y, 12, dt);
      paw.rotation.x = damp(paw.rotation.x, rotationX, 12, dt);
    });

    const quillLift = clamp01(0.35 + mood * 0.6 - this.curl * 0.75);
    for (const quill of parts.quills) {
      const basePosition = quill.userData.basePosition as Vector3;
      const baseScale = quill.userData.baseScale as Vector3;
      const normal = quill.userData.normal as Vector3;
      const phase = quill.userData.phase as number;
      const sway = Math.sin(time * 2.6 + phase) * 0.006;
      quill.position.copy(basePosition).addScaledVector(normal, quillLift * 0.055 + sway);
      quill.scale.y = baseScale.y * (0.76 + quillLift * 0.3);
    }
  }

  private updateEyes(dt: number, animation: AnimationName): void {
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = randomBetween(this.rng, 2.4, 5.6);
      this.blinkPhase = 0.0001;
    }
    if (this.blinkPhase > 0) {
      this.blinkPhase += dt / 0.15;
      if (this.blinkPhase >= 1) this.blinkPhase = 0;
    }

    const blink = this.blinkPhase > 0 ? Math.sin(Math.PI * clamp01(this.blinkPhase)) : 0;
    const sleeping = animation === 'sleep' || this.curl > 0.65;
    const openness = sleeping ? 0.04 : Math.max(0.05, 1 - blink);
    for (const eye of this.parts.eyes) {
      eye.scale.y = 0.096 * openness;
    }
    for (const pupil of this.parts.pupils) {
      pupil.scale.y = 0.052 * openness;
    }
  }
}
