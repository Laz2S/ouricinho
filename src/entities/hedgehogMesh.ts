import {
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { randomBetween, type Rng } from '../core/rng';

export interface HedgehogParts {
  root: Group;
  bodyGroup: Group;
  body: Mesh;
  belly: Mesh;
  headGroup: Group;
  snoutGroup: Group;
  nose: Mesh;
  eyes: Mesh[];
  pupils: Mesh[];
  ears: Group[];
  paws: Group[];
  tail: Mesh;
  quills: Mesh[];
}

const BODY_CENTER = new Vector3(0, 0.52, 0);
const BODY_RADII = new Vector3(0.6, 0.47, 0.72);
const UP = new Vector3(0, 1, 0);

/** Builds the entire hedgehog from primitives; no textures, models or network assets. */
export function buildHedgehog(rng: Rng): HedgehogParts {
  const root = new Group();
  root.name = 'Ouricinho';

  const fur = new MeshStandardMaterial({ color: 0xd2a26d, roughness: 0.88, flatShading: false });
  const bellyFur = new MeshStandardMaterial({ color: 0xf2d6a9, roughness: 0.9 });
  const cream = new MeshStandardMaterial({ color: 0xf6dfbd, roughness: 0.85 });
  const pink = new MeshStandardMaterial({ color: 0xf2a1ae, roughness: 0.75 });
  const pinkInner = new MeshStandardMaterial({ color: 0xe98b9c, roughness: 0.8 });
  const eyeWhite = new MeshStandardMaterial({ color: 0xfff9ee, roughness: 0.35 });
  const pupil = new MeshStandardMaterial({ color: 0x1d1615, roughness: 0.25 });
  const sparkle = new MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222, roughness: 0.2 });
  const quillMaterials = [
    new MeshStandardMaterial({ color: 0x6b4a34, roughness: 0.72, flatShading: true }),
    new MeshStandardMaterial({ color: 0x4a3227, roughness: 0.76, flatShading: true }),
    new MeshStandardMaterial({ color: 0x8a6444, roughness: 0.72, flatShading: true }),
    new MeshStandardMaterial({ color: 0x38271f, roughness: 0.8, flatShading: true }),
  ];

  const sphere = new SphereGeometry(1, 20, 16);

  const bodyGroup = new Group();
  bodyGroup.position.copy(BODY_CENTER);
  root.add(bodyGroup);

  const body = new Mesh(sphere, fur);
  body.scale.copy(BODY_RADII);
  body.position.set(0, 0, 0);
  bodyGroup.add(body);

  const belly = new Mesh(sphere, bellyFur);
  belly.scale.set(0.44, 0.31, 0.5);
  belly.position.set(0, -0.16, 0.2);
  bodyGroup.add(belly);

  const headGroup = new Group();
  headGroup.position.set(0, 0.18, 0.58);
  bodyGroup.add(headGroup);

  const head = new Mesh(sphere, fur);
  head.scale.set(0.38, 0.34, 0.36);
  headGroup.add(head);

  const eyes: Mesh[] = [];
  const pupils: Mesh[] = [];
  for (const side of [-1, 1]) {
    const white = new Mesh(sphere, eyeWhite);
    white.scale.setScalar(0.096);
    white.position.set(side * 0.17, 0.09, 0.298);
    headGroup.add(white);
    eyes.push(white);

    const iris = new Mesh(sphere, pupil);
    iris.scale.setScalar(0.052);
    iris.position.set(side * 0.174, 0.088, 0.378);
    headGroup.add(iris);
    pupils.push(iris);

    const shine = new Mesh(sphere, sparkle);
    shine.scale.setScalar(0.016);
    shine.position.set(side * 0.16 - 0.012, 0.112, 0.416);
    headGroup.add(shine);
  }

  const ears: Group[] = [];
  for (const side of [-1, 1]) {
    const ear = new Group();
    ear.position.set(side * 0.3, 0.27, -0.02);
    ear.rotation.z = side * -0.22;

    const outer = new Mesh(sphere, fur);
    outer.scale.set(0.13, 0.15, 0.075);
    ear.add(outer);

    const inner = new Mesh(sphere, pinkInner);
    inner.scale.set(0.08, 0.095, 0.038);
    inner.position.z = 0.048;
    ear.add(inner);
    headGroup.add(ear);
    ears.push(ear);
  }

  const snoutGroup = new Group();
  snoutGroup.position.set(0, -0.06, 0.31);
  headGroup.add(snoutGroup);

  const snout = new Mesh(new ConeGeometry(0.12, 0.3, 12), cream);
  snout.rotation.x = Math.PI / 2;
  snout.position.z = 0.12;
  snoutGroup.add(snout);

  const nose = new Mesh(sphere, pink);
  nose.scale.set(0.073, 0.062, 0.058);
  nose.position.set(0, -0.012, 0.275);
  snoutGroup.add(nose);

  const whiskerGeometry = new CylinderGeometry(0.005, 0.005, 0.3, 4);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i += 1) {
      const whisker = new Mesh(whiskerGeometry, cream);
      whisker.position.set(side * 0.12, 0.01 + i * 0.035, 0.16);
      whisker.rotation.z = side * (Math.PI / 2 - 0.22 - i * 0.18);
      whisker.rotation.y = side * 0.25;
      snoutGroup.add(whisker);
    }
  }

  const paws: Group[] = [];
  const pawGeometry = new CapsuleGeometry(0.085, 0.13, 4, 8);
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const paw = new Group();
      paw.position.set(x * 0.35, -0.34, z * 0.4);
      const pawMesh = new Mesh(pawGeometry, cream);
      pawMesh.rotation.x = Math.PI / 2;
      pawMesh.scale.set(1.05, 0.95, 1);
      paw.add(pawMesh);
      bodyGroup.add(paw);
      paws.push(paw);
    }
  }

  const tail = new Mesh(sphere, bellyFur);
  tail.scale.set(0.14, 0.12, 0.18);
  tail.position.set(0, -0.08, -0.74);
  bodyGroup.add(tail);

  const quills: Mesh[] = [];
  const quillGeometry = new ConeGeometry(1, 1, 6);
  const layers = [
    { theta: 0.28, count: 10, length: 0.32, radius: 0.085 },
    { theta: 0.55, count: 15, length: 0.42, radius: 0.1 },
    { theta: 0.82, count: 18, length: 0.47, radius: 0.105 },
    { theta: 1.08, count: 17, length: 0.4, radius: 0.095 },
    { theta: 1.3, count: 12, length: 0.31, radius: 0.08 },
  ];

  layers.forEach((layer, layerIndex) => {
    for (let i = 0; i < layer.count; i += 1) {
      const phi = (i / layer.count) * Math.PI * 2 + layerIndex * 0.22;
      const normal = new Vector3(
        Math.sin(layer.theta) * Math.cos(phi),
        Math.cos(layer.theta),
        Math.sin(layer.theta) * Math.sin(phi),
      );
      if (normal.z > 0.28 && normal.y < 0.7) continue;

      const length = layer.length * randomBetween(rng, 0.82, 1.14);
      const radius = layer.radius * randomBetween(rng, 0.85, 1.16);
      const quill = new Mesh(quillGeometry, quillMaterials[(i + layerIndex) % quillMaterials.length]);
      quill.scale.set(radius, length, radius);
      quill.quaternion.setFromUnitVectors(UP, normal);

      const surface = new Vector3(
        BODY_CENTER.x + normal.x * BODY_RADII.x * 0.92,
        BODY_CENTER.y + normal.y * BODY_RADII.y * 0.92,
        BODY_CENTER.z + normal.z * BODY_RADII.z * 0.92,
      );
      quill.position.copy(surface).addScaledVector(normal, length * 0.45);
      quill.userData.basePosition = quill.position.clone();
      quill.userData.baseQuaternion = quill.quaternion.clone();
      quill.userData.baseScale = quill.scale.clone();
      quill.userData.normal = normal.clone();
      quill.userData.phase = randomBetween(rng, 0, Math.PI * 2);
      bodyGroup.add(quill);
      quills.push(quill);
    }
  });

  root.traverse((child) => {
    if (child instanceof Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return { root, bodyGroup, body, belly, headGroup, snoutGroup, nose, eyes, pupils, ears, paws, tail, quills };
}
