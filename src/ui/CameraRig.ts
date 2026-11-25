import { PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { damp } from '../core/math';
import type { CameraMode } from '../core/types';

/** Orbit camera with a gentle follow mode that preserves the user's orbit angle. */
export class CameraRig {
  private readonly controls: OrbitControls;
  private readonly camera: PerspectiveCamera;
  private readonly followTarget = new Vector3();
  private readonly previousTarget = new Vector3();
  private readonly delta = new Vector3();
  private mode: CameraMode = 'free';

  constructor(camera: PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 14;
    this.controls.minPolarAngle = 0.18;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = false;
    this.controls.target.set(0, 0.45, 0);
    this.controls.update();
  }

  get currentMode(): CameraMode {
    return this.mode;
  }

  toggle(petPosition: Vector3): CameraMode {
    this.setMode(this.mode === 'free' ? 'follow' : 'free', petPosition);
    return this.mode;
  }

  setMode(mode: CameraMode, petPosition: Vector3): void {
    this.mode = mode;
    if (mode === 'follow') {
      this.followTarget.set(petPosition.x, petPosition.y + 0.45, petPosition.z);
      this.previousTarget.copy(this.followTarget);
      this.controls.target.copy(this.followTarget);
    }
  }

  update(dt: number, petPosition: Vector3): void {
    if (this.mode === 'follow') {
      this.previousTarget.copy(this.followTarget);
      this.followTarget.x = damp(this.followTarget.x, petPosition.x, 4.5, dt);
      this.followTarget.y = damp(this.followTarget.y, petPosition.y + 0.45, 4.5, dt);
      this.followTarget.z = damp(this.followTarget.z, petPosition.z, 4.5, dt);
      this.delta.subVectors(this.followTarget, this.previousTarget);
      this.controls.target.add(this.delta);
      this.camera.position.add(this.delta);
    }
    this.controls.update(dt);
  }
}
