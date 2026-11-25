import { Vector3 } from 'three';
import { clamp } from '../core/math';
import { randomBetween, type Rng } from '../core/rng';
import type { Bounds, Obstacle } from '../core/types';

export interface SteeringInput {
  target: Vector3 | null;
  speedScale: number;
}

/** Lightweight 2D steering layer: arrive, wander, repulsion and soft boundaries. */
export class Steering {
  readonly position = new Vector3(0, 0, 2.6);
  readonly velocity = new Vector3();
  maxSpeed = 1.5;
  maxAcceleration = 5;

  private readonly desired = new Vector3();
  private readonly steer = new Vector3();
  private readonly repel = new Vector3();
  private readonly toTarget = new Vector3();
  private wanderAngle = Math.PI * 0.22;
  private wanderTimer = 0.5;

  constructor(private readonly rng: Rng) {}

  update(dt: number, input: SteeringInput, obstacles: readonly Obstacle[], bounds: Bounds): number {
    const speed = this.maxSpeed * clamp(input.speedScale, 0, 2.5);
    this.desired.set(0, 0, 0);

    if (input.target) {
      this.toTarget.subVectors(input.target, this.position);
      this.toTarget.y = 0;
      const distance = this.toTarget.length();
      if (distance > 0.0001) {
        this.toTarget.divideScalar(distance);
        const arriveFactor = clamp(distance / 1.15, 0.1, 1);
        this.desired.copy(this.toTarget).multiplyScalar(speed * arriveFactor);
      }
    } else {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderAngle += randomBetween(this.rng, -1.1, 1.1);
        this.wanderTimer = randomBetween(this.rng, 0.7, 1.9);
      }
      this.desired.set(Math.cos(this.wanderAngle) * speed * 0.6, 0, Math.sin(this.wanderAngle) * speed * 0.6);
    }

    for (const obstacle of obstacles) {
      const dx = this.position.x - obstacle.position.x;
      const dz = this.position.z - obstacle.position.z;
      const distance = Math.hypot(dx, dz);
      const influence = obstacle.radius + 1.0;
      if (distance >= influence || distance < 0.0001) continue;

      let strength = Math.pow(1 - distance / influence, 2) * speed * 2.4;
      if (input.target && input.target.distanceToSquared(obstacle.position) < Math.pow(obstacle.radius + 0.45, 2)) {
        strength *= 0.14;
      }
      this.repel.set(dx / distance, 0, dz / distance).multiplyScalar(strength);
      this.desired.add(this.repel);
    }

    const margin = 0.85;
    const edgeForce = speed * 2.6;
    if (this.position.x < bounds.minX + margin) this.desired.x += edgeForce;
    if (this.position.x > bounds.maxX - margin) this.desired.x -= edgeForce;
    if (this.position.z < bounds.minZ + margin) this.desired.z += edgeForce;
    if (this.position.z > bounds.maxZ - margin) this.desired.z -= edgeForce;

    this.steer.subVectors(this.desired, this.velocity);
    const maxSteer = this.maxAcceleration * dt;
    if (this.steer.lengthSq() > maxSteer * maxSteer) this.steer.setLength(maxSteer);
    this.velocity.add(this.steer);
    if (this.velocity.lengthSq() > speed * speed) this.velocity.setLength(speed);

    this.position.addScaledVector(this.velocity, dt);
    this.position.y = 0;
    this.position.x = clamp(this.position.x, bounds.minX + 0.25, bounds.maxX - 0.25);
    this.position.z = clamp(this.position.z, bounds.minZ + 0.25, bounds.maxZ - 0.25);

    return clamp(this.velocity.length() / this.maxSpeed, 0, 1.6);
  }
}
