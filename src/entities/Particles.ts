import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { randomBetween, type Rng } from '../core/rng';
import type { EmoteKind } from '../core/types';

/** Slow floating dust that gives the diorama a warm, lived-in feeling. */
export class DustMotes {
  readonly points: Points;

  private readonly positions: Float32Array;
  private readonly speeds: Float32Array;
  private readonly count = 110;

  constructor(rng: Rng) {
    this.positions = new Float32Array(this.count * 3);
    this.speeds = new Float32Array(this.count);

    for (let i = 0; i < this.count; i += 1) {
      const index = i * 3;
      this.positions[index] = randomBetween(rng, -5.4, 5.4);
      this.positions[index + 1] = randomBetween(rng, 0.1, 3.2);
      this.positions[index + 2] = randomBetween(rng, -5.4, 5.4);
      this.speeds[i] = randomBetween(rng, 0.035, 0.11);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    const material = new PointsMaterial({
      color: 0xffe9c4,
      size: 0.055,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new Points(geometry, material);
    this.points.frustumCulled = false;
  }

  update(dt: number, time: number): void {
    for (let i = 0; i < this.count; i += 1) {
      const index = i * 3;
      this.positions[index + 1] += this.speeds[i] * dt;
      this.positions[index] += Math.sin(time * 0.4 + i) * 0.0012;
      if (this.positions[index + 1] > 3.4) {
        this.positions[index + 1] = 0.08;
      }
    }
    (this.points.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
  }
}

interface EmoteSprite {
  sprite: Sprite;
  life: number;
  maxLife: number;
  driftX: number;
  driftZ: number;
}

/** Pooled 'Zzz' and heart sprites, drawn procedurally on a canvas (no assets). */
export class EmoteEmitter {
  readonly group = new Group();

  private readonly rng: Rng;
  private readonly pools: Record<'zzz' | 'heart', EmoteSprite[]> = { zzz: [], heart: [] };

  constructor(rng: Rng) {
    this.rng = rng;
    const zzzTexture = makeZzzTexture();
    const heartTexture = makeHeartTexture();

    for (const [kind, texture] of [
      ['zzz', zzzTexture],
      ['heart', heartTexture],
    ] as const) {
      for (let i = 0; i < 8; i += 1) {
        const material = new SpriteMaterial({
          map: texture,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const sprite = new Sprite(material);
        sprite.visible = false;
        sprite.scale.setScalar(0.4);
        this.group.add(sprite);
        this.pools[kind].push({ sprite, life: 0, maxLife: 1, driftX: 0, driftZ: 0 });
      }
    }
  }

  emit(kind: Exclude<EmoteKind, null>, origin: Vector3): void {
    const pool = this.pools[kind];
    const entry = pool.find((item) => item.life <= 0) ?? pool[0];
    entry.maxLife = randomBetween(this.rng, 1.5, 2.2);
    entry.life = entry.maxLife;
    entry.driftX = randomBetween(this.rng, -0.16, 0.16);
    entry.driftZ = randomBetween(this.rng, -0.1, 0.1);
    entry.sprite.position.set(
      origin.x + randomBetween(this.rng, -0.2, 0.2),
      origin.y + 1.15,
      origin.z + randomBetween(this.rng, -0.18, 0.18),
    );
    entry.sprite.scale.setScalar(randomBetween(this.rng, 0.3, 0.48));
    entry.sprite.material.opacity = 0.95;
    entry.sprite.visible = true;
  }

  update(dt: number): void {
    for (const pool of Object.values(this.pools)) {
      for (const entry of pool) {
        if (entry.life <= 0) continue;
        entry.life -= dt;
        if (entry.life <= 0) {
          entry.sprite.visible = false;
          entry.sprite.material.opacity = 0;
          continue;
        }
        const progress = 1 - entry.life / entry.maxLife;
        entry.sprite.position.y += dt * 0.55;
        entry.sprite.position.x += entry.driftX * dt;
        entry.sprite.position.z += entry.driftZ * dt;
        entry.sprite.material.opacity = Math.sin(progress * Math.PI) * 0.95;
      }
    }
  }
}

function makeZzzTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    context.clearRect(0, 0, 128, 128);
    context.font = 'bold 92px system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = 'rgba(80, 60, 120, 0.55)';
    context.shadowBlur = 10;
    context.fillStyle = '#dcd0ff';
    context.fillText('Z', 64, 68);
  }
  return toTexture(canvas);
}

function makeHeartTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    context.clearRect(0, 0, 128, 128);
    context.shadowColor = 'rgba(190, 60, 90, 0.45)';
    context.shadowBlur = 12;
    context.fillStyle = '#ff8fa6';
    context.beginPath();
    context.moveTo(64, 112);
    context.bezierCurveTo(8, 76, 18, 28, 54, 34);
    context.bezierCurveTo(64, 36, 64, 50, 64, 50);
    context.bezierCurveTo(64, 50, 64, 36, 74, 34);
    context.bezierCurveTo(110, 28, 120, 76, 64, 112);
    context.closePath();
    context.fill();
  }
  return toTexture(canvas);
}

function toTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
