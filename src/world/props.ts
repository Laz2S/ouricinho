import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { randomBetween, type Rng } from '../core/rng';

const palette = {
  wood: new MeshStandardMaterial({ color: 0x8a5a3b, roughness: 0.92 }),
  woodLight: new MeshStandardMaterial({ color: 0xb98052, roughness: 0.88 }),
  woodDark: new MeshStandardMaterial({ color: 0x66412c, roughness: 0.94 }),
  soil: new MeshStandardMaterial({ color: 0x6b4a32, roughness: 1 }),
  grass: new MeshStandardMaterial({ color: 0x7aa968, roughness: 0.98 }),
  grassLight: new MeshStandardMaterial({ color: 0x9bc47c, roughness: 0.98 }),
  flowerPink: new MeshStandardMaterial({ color: 0xf29ab2, roughness: 0.8 }),
  flowerYellow: new MeshStandardMaterial({ color: 0xf6d979, roughness: 0.8 }),
  flowerWhite: new MeshStandardMaterial({ color: 0xfff2de, roughness: 0.82 }),
  stem: new MeshStandardMaterial({ color: 0x5b8a4a, roughness: 0.9 }),
  ceramicBlue: new MeshStandardMaterial({ color: 0x87b8c6, roughness: 0.45, side: DoubleSide }),
  ceramicClay: new MeshStandardMaterial({ color: 0xc57c55, roughness: 0.62, side: DoubleSide }),
  bowlInner: new MeshStandardMaterial({ color: 0x5d4638, roughness: 0.8 }),
  water: new MeshStandardMaterial({
    color: 0x7fc9dd,
    roughness: 0.12,
    metalness: 0.05,
    transparent: true,
    opacity: 0.82,
  }),
  berry: new MeshStandardMaterial({ color: 0x9c4235, roughness: 0.7 }),
  berryDark: new MeshStandardMaterial({ color: 0x6f2f2b, roughness: 0.72 }),
  straw: new MeshStandardMaterial({ color: 0xd3ad6b, roughness: 1 }),
  strawDark: new MeshStandardMaterial({ color: 0xb4884f, roughness: 1 }),
  blanket: new MeshStandardMaterial({ color: 0xd98a72, roughness: 0.95 }),
  stone: new MeshStandardMaterial({ color: 0x9a9a93, roughness: 1, flatShading: true }),
  mushroomCap: new MeshStandardMaterial({ color: 0xcf6b5e, roughness: 0.78 }),
  mushroomStem: new MeshStandardMaterial({ color: 0xf0e0c4, roughness: 0.85 }),
  lanternGlow: new MeshStandardMaterial({
    color: 0xffd59a,
    emissive: 0xffb35e,
    emissiveIntensity: 1.4,
    roughness: 0.5,
  }),
};

function shadows<T extends Object3D>(object: T): T {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return object;
}

export function createBase(rng: Rng): Group {
  const group = new Group();

  const base = new Mesh(new CylinderGeometry(6.25, 6.42, 0.48, 64), palette.wood);
  base.position.y = -0.27;
  group.add(base);

  const soil = new Mesh(new CylinderGeometry(6.06, 6.06, 0.08, 64), palette.soil);
  soil.position.y = -0.01;
  group.add(soil);

  const grass = new Mesh(new CircleGeometry(6.02, 64), palette.grass);
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = 0.035;
  grass.receiveShadow = true;
  group.add(grass);

  const rim = new Mesh(new TorusGeometry(6.22, 0.12, 8, 72), palette.woodLight);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.045;
  group.add(rim);

  for (let i = 0; i < 52; i += 1) {
    const angle = randomBetween(rng, 0, Math.PI * 2);
    const radius = Math.sqrt(rng()) * 5.65;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    if (rng() < 0.32) {
      const flower = createFlower(rng);
      flower.position.set(x, 0.03, z);
      flower.scale.setScalar(randomBetween(rng, 0.55, 0.9));
      group.add(flower);
    } else {
      const tuft = new Mesh(
        new ConeGeometry(randomBetween(rng, 0.06, 0.11), randomBetween(rng, 0.14, 0.28), 5),
        rng() < 0.5 ? palette.grassLight : palette.grass,
      );
      tuft.position.set(x, 0.13, z);
      tuft.rotation.z = randomBetween(rng, -0.25, 0.25);
      group.add(tuft);
    }
  }

  return shadows(group);
}

export function createFoodBowl(): Group {
  const group = new Group();

  const outer = new Mesh(new CylinderGeometry(0.56, 0.42, 0.26, 24, 1, true), palette.ceramicClay);
  outer.position.y = 0.13;
  group.add(outer);

  const bottom = new Mesh(new CylinderGeometry(0.42, 0.42, 0.04, 24), palette.bowlInner);
  bottom.position.y = 0.02;
  group.add(bottom);

  const rim = new Mesh(new TorusGeometry(0.55, 0.045, 8, 28), palette.ceramicClay);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.26;
  group.add(rim);

  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2 + 0.4;
    const radius = i % 2 === 0 ? 0.2 : 0.31;
    const berry = new Mesh(new SphereGeometry(0.09, 10, 8), i % 3 === 0 ? palette.berryDark : palette.berry);
    berry.position.set(Math.cos(angle) * radius, 0.13, Math.sin(angle) * radius);
    group.add(berry);
  }

  return shadows(group);
}

export function createWaterBowl(): Group {
  const group = new Group();

  const outer = new Mesh(new CylinderGeometry(0.55, 0.41, 0.25, 24, 1, true), palette.ceramicBlue);
  outer.position.y = 0.125;
  group.add(outer);

  const bottom = new Mesh(new CylinderGeometry(0.41, 0.41, 0.04, 24), palette.bowlInner);
  bottom.position.y = 0.02;
  group.add(bottom);

  const water = new Mesh(new CircleGeometry(0.46, 32), palette.water);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.18;
  group.add(water);

  const rim = new Mesh(new TorusGeometry(0.54, 0.04, 8, 28), palette.ceramicBlue);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.25;
  group.add(rim);

  const ripple = new Mesh(new TorusGeometry(0.2, 0.012, 6, 28), palette.flowerWhite);
  ripple.rotation.x = Math.PI / 2;
  ripple.position.set(0, 0.185, 0);
  group.add(ripple);

  return shadows(group);
}

export function createNest(rng: Rng): Group {
  const group = new Group();

  for (let i = 0; i < 5; i += 1) {
    const ring = new Mesh(
      new TorusGeometry(0.94 - i * 0.035, 0.13, 8, 36),
      i % 2 === 0 ? palette.straw : palette.strawDark,
    );
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = randomBetween(rng, -0.12, 0.12);
    ring.position.y = 0.11 + i * 0.045;
    group.add(ring);
  }

  const cushion = new Mesh(new SphereGeometry(1, 20, 12), palette.straw);
  cushion.scale.set(0.84, 0.21, 0.78);
  cushion.position.y = 0.14;
  group.add(cushion);

  const blanket = new Mesh(new SphereGeometry(1, 18, 12), palette.blanket);
  blanket.scale.set(0.58, 0.12, 0.48);
  blanket.position.set(0.08, 0.29, 0.05);
  blanket.rotation.y = 0.3;
  group.add(blanket);

  return shadows(group);
}

export function createRamp(): Group {
  const group = new Group();

  const plank = new Mesh(new BoxGeometry(1.5, 0.14, 3.2), palette.woodLight);
  plank.position.y = 0.34;
  plank.rotation.x = -0.16;
  group.add(plank);

  for (const side of [-1, 1]) {
    const rail = new Mesh(new BoxGeometry(0.1, 0.2, 3.2), palette.woodDark);
    rail.position.set(side * 0.72, 0.49, 0);
    rail.rotation.x = -0.16;
    group.add(rail);
  }

  for (let i = -1; i <= 1; i += 1) {
    const slat = new Mesh(new BoxGeometry(1.4, 0.05, 0.16), palette.woodDark);
    slat.position.set(0, 0.44, i * 0.9);
    slat.rotation.x = -0.16;
    group.add(slat);
  }

  for (const z of [-1.3, 1.3]) {
    const leg = new Mesh(new BoxGeometry(0.16, 0.34, 0.2), palette.wood);
    leg.position.set(0, 0.17, z);
    group.add(leg);
  }

  return shadows(group);
}

export function createMushroom(rng: Rng): Group {
  const group = new Group();
  const scale = randomBetween(rng, 0.75, 1.25);

  const stem = new Mesh(new CylinderGeometry(0.085, 0.12, 0.34, 10), palette.mushroomStem);
  stem.position.y = 0.17;
  group.add(stem);

  const cap = new Mesh(new SphereGeometry(0.34, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), palette.mushroomCap);
  cap.scale.y = 0.72;
  cap.position.y = 0.33;
  group.add(cap);

  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2 + rng();
    const spot = new Mesh(new SphereGeometry(0.045, 8, 6), palette.flowerWhite);
    spot.position.set(Math.cos(angle) * 0.19, 0.49, Math.sin(angle) * 0.19);
    spot.scale.y = 0.5;
    group.add(spot);
  }

  group.scale.setScalar(scale);
  return shadows(group);
}

export function createRock(rng: Rng): Group {
  const group = new Group();
  const radius = randomBetween(rng, 0.22, 0.42);
  const rock = new Mesh(new IcosahedronGeometry(radius, 0), palette.stone);
  rock.scale.set(randomBetween(rng, 0.85, 1.3), randomBetween(rng, 0.6, 0.95), randomBetween(rng, 0.85, 1.2));
  rock.position.y = radius * 0.55;
  rock.rotation.set(rng() * 0.6, rng() * Math.PI, rng() * 0.4);
  group.add(rock);
  return shadows(group);
}

export function createFlower(rng: Rng): Group {
  const group = new Group();
  const stem = new Mesh(new CylinderGeometry(0.018, 0.022, 0.32, 6), palette.stem);
  stem.position.y = 0.16;
  group.add(stem);

  const petalMaterial = rng() < 0.45 ? palette.flowerPink : rng() < 0.7 ? palette.flowerWhite : palette.flowerYellow;
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    const petal = new Mesh(new SphereGeometry(1, 8, 6), petalMaterial);
    petal.scale.set(0.075, 0.04, 0.11);
    petal.position.set(Math.cos(angle) * 0.1, 0.34, Math.sin(angle) * 0.1);
    petal.rotation.y = -angle;
    group.add(petal);
  }

  const center = new Mesh(new SphereGeometry(0.055, 10, 8), palette.flowerYellow);
  center.position.y = 0.36;
  group.add(center);
  return shadows(group);
}

export function createFence(): Group {
  const group = new Group();
  const posts: { x: number; z: number }[] = [];
  const count = 11;

  for (let i = 0; i < count; i += 1) {
    const angle = Math.PI * 1.08 + (i / (count - 1)) * Math.PI * 0.84;
    const x = Math.cos(angle) * 5.35;
    const z = Math.sin(angle) * 5.35;
    posts.push({ x, z });

    const post = new Mesh(new BoxGeometry(0.13, 0.72, 0.13), palette.woodLight);
    post.position.set(x, 0.36, z);
    post.rotation.y = -angle;
    group.add(post);
  }

  for (let i = 0; i < posts.length - 1; i += 1) {
    const a = posts[i];
    const b = posts[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    for (const height of [0.28, 0.55]) {
      const rail = new Mesh(new BoxGeometry(length, 0.075, 0.075), palette.wood);
      rail.position.set((a.x + b.x) / 2, height, (a.z + b.z) / 2);
      rail.rotation.y = -Math.atan2(dz, dx);
      group.add(rail);
    }
  }

  return shadows(group);
}

export function createLantern(): Group {
  const group = new Group();

  const post = new Mesh(new CylinderGeometry(0.055, 0.075, 1.05, 8), palette.woodDark);
  post.position.y = 0.53;
  group.add(post);

  const glow = new Mesh(new BoxGeometry(0.3, 0.34, 0.3), palette.lanternGlow);
  glow.position.y = 1.16;
  group.add(glow);

  const roof = new Mesh(new ConeGeometry(0.28, 0.22, 4), palette.woodDark);
  roof.position.y = 1.44;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  return shadows(group);
}

export function createSunbeam(): Mesh {
  const beam = new Mesh(
    new CircleGeometry(1.45, 32),
    new MeshBasicMaterial({
      color: 0xffe4a6,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    }),
  );
  beam.rotation.x = -Math.PI / 2;
  beam.position.y = 0.042;
  beam.renderOrder = 1;
  return beam;
}
