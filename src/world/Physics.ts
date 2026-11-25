import {
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { randomBetween, type Rng } from '../core/rng';
import type { Bounds, Obstacle } from '../core/types';

/** Small impulse-driven rigid body for the rolling ball toy. */
export class BallToy {
  readonly mesh = new Group();
  readonly radius = 0.34;

  private readonly velocity = new Vector3();
  private readonly spinAxis = new Vector3();
  private readonly rng: Rng;

  constructor(rng: Rng) {
    this.rng = rng;
    const shell = new Mesh(
      new SphereGeometry(this.radius, 24, 18),
      new MeshStandardMaterial({ color: 0x67b9b2, roughness: 0.42 }),
    );
    shell.castShadow = true;
    shell.receiveShadow = true;
    this.mesh.add(shell);

    const stripeMaterial = new MeshStandardMaterial({ color: 0xf2a65a, roughness: 0.5 });
    for (const rotation of [0, Math.PI / 2]) {
      const stripe = new Mesh(new TorusGeometry(this.radius + 0.006, 0.036, 8, 36), stripeMaterial);
      stripe.rotation.y = rotation;
      stripe.castShadow = true;
      this.mesh.add(stripe);
    }

    this.mesh.position.set(1.3, this.radius + 0.04, 1.1);
  }

  get position(): Vector3 {
    return this.mesh.position;
  }

  update(dt: number, obstacles: readonly Obstacle[], bounds: Bounds): void {
    this.velocity.y = 0;
    this.mesh.position.addScaledVector(this.velocity, dt);
    this.velocity.multiplyScalar(Math.exp(-0.95 * dt));
    if (this.velocity.lengthSq() < 0.0004) this.velocity.set(0, 0, 0);

    const limitX = Math.min(Math.abs(bounds.minX), Math.abs(bounds.maxX)) - this.radius;
    const limitZ = Math.min(Math.abs(bounds.minZ), Math.abs(bounds.maxZ)) - this.radius;
    if (this.mesh.position.x > limitX) {
      this.mesh.position.x = limitX;
      this.velocity.x = -Math.abs(this.velocity.x) * 0.72;
    } else if (this.mesh.position.x < -limitX) {
      this.mesh.position.x = -limitX;
      this.velocity.x = Math.abs(this.velocity.x) * 0.72;
    }
    if (this.mesh.position.z > limitZ) {
      this.mesh.position.z = limitZ;
      this.velocity.z = -Math.abs(this.velocity.z) * 0.72;
    } else if (this.mesh.position.z < -limitZ) {
      this.mesh.position.z = -limitZ;
      this.velocity.z = Math.abs(this.velocity.z) * 0.72;
    }

    for (const obstacle of obstacles) {
      const dx = this.mesh.position.x - obstacle.position.x;
      const dz = this.mesh.position.z - obstacle.position.z;
      const distance = Math.hypot(dx, dz);
      const minimum = this.radius + obstacle.radius;
      if (distance >= minimum || distance < 0.0001) continue;

      const normal = new Vector3(dx / distance, 0, dz / distance);
      this.mesh.position.set(
        obstacle.position.x + normal.x * minimum,
        this.mesh.position.y,
        obstacle.position.z + normal.z * minimum,
      );
      if (this.velocity.dot(normal) < 0) {
        this.velocity.reflect(normal).multiplyScalar(0.76);
      }
    }

    const speed = this.velocity.length();
    if (speed > 0.01) {
      this.spinAxis.set(this.velocity.z, 0, -this.velocity.x).normalize();
      this.mesh.rotateOnWorldAxis(this.spinAxis, (speed / this.radius) * dt);
    }
    this.mesh.position.y = this.radius + 0.04;
  }

  nudge(from: Vector3, strength = 2.7): void {
    const direction = new Vector3(
      this.mesh.position.x - from.x,
      0,
      this.mesh.position.z - from.z,
    );
    if (direction.lengthSq() < 0.02) {
      const angle = randomBetween(this.rng, 0, Math.PI * 2);
      direction.set(Math.cos(angle), 0, Math.sin(angle));
    }
    direction.normalize();
    this.velocity.addScaledVector(direction, strength);
    if (this.velocity.length() > 4.3) this.velocity.setLength(4.3);
  }
}
