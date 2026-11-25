import './style.css';
import {
  ACESFilmicToneMapping,
  Color,
  Fog,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { Brain } from './ai/Brain';
import { getDesktopInfo } from './core/desktop';
import { makeRng } from './core/rng';
import { Hedgehog } from './entities/Hedgehog';
import { CameraRig } from './ui/CameraRig';
import { Hud } from './ui/Hud';
import { Diorama, DIORAMA_BOUNDS } from './world/Diorama';
import { createLighting } from './world/Lighting';

const SEED = 20261125;
const rng = makeRng(SEED);

const app = document.getElementById('app');
if (!app) throw new Error('Missing #app root element.');

const renderer = createRenderer(app);
const scene = new Scene();
scene.background = new Color(0x1b1925);
scene.fog = new Fog(0x1b1925, 16, 34);

const camera = new PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(6.4, 5.2, 8.2);

const diorama = new Diorama(rng);
scene.add(diorama.group);

const lighting = createLighting(scene);
const hedgehog = new Hedgehog(scene, rng);
const brain = new Brain(
  {
    anchors: diorama.anchors,
    ballPosition: diorama.ball.position,
    treats: diorama.treats,
  },
  rng,
);

const cameraRig = new CameraRig(camera, renderer.domElement);
let simulationSpeed = 1;

const hud = new Hud(app, {
  onToggleFollow: () => {
    hud.setCameraMode(cameraRig.toggle(hedgehog.position));
  },
  onSpeed: (speed) => {
    simulationSpeed = speed;
  },
  onDropBerry: () => {
    diorama.dropBerry();
  },
  onNudgeBall: () => {
    diorama.nudgeBall(hedgehog.position);
  },
});

void getDesktopInfo().then((info) => hud.setDesktopInfo(info));

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();

let lastFrame = performance.now();
let simulationTime = 0;
let emoteTimer = 0;
let hudTimer = 0;
const projected = new Vector3();

function frame(now: number): void {
  const realDt = Math.min(Math.max((now - lastFrame) / 1000, 0), 0.05);
  lastFrame = now;

  const dt = realDt * simulationSpeed;
  simulationTime += dt;

  brain.update(dt, hedgehog.position);
  hedgehog.update(dt, simulationTime, brain, diorama.obstacles, DIORAMA_BOUNDS);
  diorama.update(dt, simulationTime);
  lighting.update(simulationTime);
  cameraRig.update(realDt, hedgehog.position);

  emoteTimer -= dt;
  const emote = brain.emote;
  if (emote && emoteTimer <= 0) {
    diorama.emitEmote(emote, hedgehog.position);
    emoteTimer = emote === 'zzz' ? 0.85 : 0.55;
  }

  hudTimer -= realDt;
  if (hudTimer <= 0) {
    hudTimer = 0.1;
    hud.update({
      needs: brain.needs.state,
      action: brain.action,
      thought: brain.thought,
      speed: simulationSpeed,
      cameraMode: cameraRig.currentMode,
    });
  }

  projected.copy(hedgehog.position);
  projected.y += 1.45;
  projected.project(camera);
  const onScreen = projected.z > -1 && projected.z < 1;
  hud.positionThought(
    (projected.x * 0.5 + 0.5) * window.innerWidth,
    (-projected.y * 0.5 + 0.5) * window.innerHeight,
    onScreen,
  );

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

function createRenderer(root: HTMLElement): WebGLRenderer {
  try {
    const instance = new WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    instance.shadowMap.enabled = true;
    instance.shadowMap.type = PCFSoftShadowMap;
    instance.outputColorSpace = SRGBColorSpace;
    instance.toneMapping = ACESFilmicToneMapping;
    instance.toneMappingExposure = 1.08;
    root.appendChild(instance.domElement);
    return instance;
  } catch (error) {
    root.innerHTML =
      '<div style="padding:32px;font:14px system-ui;color:#fbf2e6">Ouricinho needs WebGL. Please enable hardware acceleration and reload.</div>';
    throw error;
  }
}
