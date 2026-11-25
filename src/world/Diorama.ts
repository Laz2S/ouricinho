import { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three';
import type { BrainWorld } from '../core/types';
import { DustMotes, EmoteEmitter } from '../entities/Particles';
import { randomBetween, type Rng } from '../core/rng';
import type { Bounds, DioramaAnchors, Edible, EmoteKind, Obstacle } from '../core/types';
import { BallToy } from './Physics';
import {
  createBase,
  createFence,
  createFlower,
  createFoodBowl,
  createLantern,
  createMushroom,
  createNest,
  createRamp,
  createRock,
  createSunbeam,
  createWaterBowl,
} from './props';

export const DIORAMA_BOUNDS: Bounds = { minX: -5.4, maxX: 5.4, minZ: -5.4, maxZ: 5.4 };

const FOOD_POSITION = new Vector3(-2.65, 0, 1.55);
const WATER_POSITION = new Vector3(-2.75, 0, -0.4);
const NEST_POSITION = new Vector3(2.75, 0, -2.05);
const RAMP_POSITION = new Vector3(0.35, 0, -3.35);
const SUNBEAM_POSITION = new Vector3(1.55, 0, 1.85);

class BerryTreat implements Edible {
  readonly mesh = new Group();
  readonly position: Vector3;
  available = true;

  private readonly phase: number;
  private age = 0;
  private readonly colors = [0xb8493d, 0xd4634c, 0x8f3d35];

  constructor(rng: Rng, position: Vector3) {
    this.position = position.clone();
    this.position.y = 0;
    this.phase = randomBetween(rng, 0, Math.PI * 2);
    this.mesh.position.set(this.position.x, 0.16, this.position.z);

    for (let i = 0; i < 3; i += 1) {
      const berry = new Mesh(
        new SphereGeometry(0.11, 12, 9),
        new MeshStandardMaterial({ color: this.colors[i % this.colors.length], roughness: 0.68 }),
      );
      const angle = (i / 3) * Math.PI * 2;
      berry.position.set(Math.cos(angle) * 0.1, i === 0 ? 0.06 : 0, Math.sin(angle) * 0.1);
      berry.castShadow = true;
      this.mesh.add(berry);
    }

    const leaf = new Mesh(
      new SphereGeometry(0.06, 8, 6),
      new MeshStandardMaterial({ color: 0x6d9b55, roughness: 0.85 }),
    );
    leaf.scale.set(1, 0.3, 1.6);
    leaf.position.set(0, 0.13, 0.06);
    this.mesh.add(leaf);
  }

  consume(): void {
    if (!this.available) return;
    this.available = false;
    this.mesh.visible = false;
  }

  update(dt: number): void {
    if (!this.available) return;
    this.age += dt;
    this.mesh.position.y = 0.16 + Math.sin(this.age * 4 + this.phase) * 0.025;
    this.mesh.rotation.y += dt * 0.45;
  }
}

/** The complete cozy diorama plus the entities the AI can interact with. */
export class Diorama implements BrainWorld {
  readonly group = new Group();
  readonly anchors: DioramaAnchors;
  readonly obstacles: Obstacle[] = [];
  readonly ball: BallToy;
  readonly treats: BerryTreat[] = [];
  readonly dust: DustMotes;

  private readonly rng: Rng;
  private readonly emotes: EmoteEmitter;
  private readonly sunbeam: Mesh;
  private readonly bounds = DIORAMA_BOUNDS;

  constructor(rng: Rng) {
    this.rng = rng;
    this.emotes = new EmoteEmitter(rng);
    this.ball = new BallToy(rng);
    this.dust = new DustMotes(rng);

    this.group.add(createBase(rng));
    this.group.add(createFence());

    const foodBowl = createFoodBowl();
    foodBowl.position.copy(FOOD_POSITION);
    this.group.add(foodBowl);

    const waterBowl = createWaterBowl();
    waterBowl.position.copy(WATER_POSITION);
    this.group.add(waterBowl);

    const nest = createNest(rng);
    nest.position.copy(NEST_POSITION);
    this.group.add(nest);

    const ramp = createRamp();
    ramp.position.copy(RAMP_POSITION);
    this.group.add(ramp);

    this.sunbeam = createSunbeam();
    this.sunbeam.position.copy(SUNBEAM_POSITION);
    this.group.add(this.sunbeam);

    const lantern = createLantern();
    lantern.position.set(3.85, 0, -3.6);
    this.group.add(lantern);

    const mushrooms: Vector3[] = [
      new Vector3(-4.25, 0, -2.5),
      new Vector3(1.9, 0, 3.9),
      new Vector3(-0.8, 0, -4.5),
    ];
    for (const position of mushrooms) {
      const mushroom = createMushroom(rng);
      mushroom.position.copy(position);
      this.group.add(mushroom);
      this.obstacles.push({ position: position.clone(), radius: 0.3 });
    }

    const rocks: Vector3[] = [
      new Vector3(4.25, 0, 1.15),
      new Vector3(-4.35, 0, 3.25),
      new Vector3(2.9, 0, 4.1),
    ];
    for (const position of rocks) {
      const rock = createRock(rng);
      rock.position.copy(position);
      this.group.add(rock);
      this.obstacles.push({ position: position.clone(), radius: 0.42 });
    }

    for (let i = 0; i < 5; i += 1) {
      const flower = createFlower(rng);
      flower.position.set(randomBetween(rng, -4.8, 4.8), 0.03, randomBetween(rng, -4.8, 4.8));
      flower.scale.setScalar(randomBetween(rng, 0.8, 1.35));
      this.group.add(flower);
    }

    this.obstacles.push(
      { position: FOOD_POSITION.clone(), radius: 0.54 },
      { position: WATER_POSITION.clone(), radius: 0.53 },
      { position: NEST_POSITION.clone(), radius: 0.98 },
      { position: RAMP_POSITION.clone(), radius: 0.82 },
      { position: lantern.position.clone(), radius: 0.22 },
    );

    this.anchors = {
      food: FOOD_POSITION.clone(),
      water: WATER_POSITION.clone(),
      nest: NEST_POSITION.clone(),
      ball: this.ball.position.clone(),
      rampBottom: new Vector3(RAMP_POSITION.x, 0, RAMP_POSITION.z + 1.65),
      rampTop: new Vector3(RAMP_POSITION.x, 0, RAMP_POSITION.z - 1.65),
      sunbeam: SUNBEAM_POSITION.clone(),
      center: new Vector3(0, 0, 0),
    };

    this.group.add(this.ball.mesh);
    this.group.add(this.dust.points);
    this.group.add(this.emotes.group);

    this.dropBerry(new Vector3(-0.9, 0, 2.35));
  }

  get ballPosition(): Vector3 {
    return this.ball.position;
  }

  update(dt: number, time: number): void {
    this.ball.update(dt, this.obstacles, this.bounds);
    this.anchors.ball.copy(this.ball.position);
    this.dust.update(dt, time);
    this.emotes.update(dt);
    for (const treat of this.treats) treat.update(dt);
    const beamMaterial = this.sunbeam.material as MeshBasicMaterial;
    beamMaterial.opacity = 0.135 + Math.sin(time * 0.7) * 0.025;
  }

  dropBerry(at?: Vector3): void {
    const position = at
      ? at.clone()
      : new Vector3(randomBetween(this.rng, -3.6, 3.6), 0, randomBetween(this.rng, -3.4, 3.4));
    position.y = 0;

    const reusableIndex = this.treats.findIndex((treat) => !treat.available);
    if (reusableIndex >= 0) {
      const [reusable] = this.treats.splice(reusableIndex, 1);
      this.group.remove(reusable.mesh);
    }

    const treat = new BerryTreat(this.rng, position);
    this.treats.push(treat);
    this.group.add(treat.mesh);

    if (this.treats.length > 10) {
      const oldest = this.treats.shift();
      if (oldest) this.group.remove(oldest.mesh);
    }
  }

  nudgeBall(from: Vector3): void {
    this.ball.nudge(from);
  }

  emitEmote(kind: Exclude<EmoteKind, null>, position: Vector3): void {
    this.emotes.emit(kind, position);
  }
}
