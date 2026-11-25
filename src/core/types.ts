import type { Vector3 } from 'three';

export interface NeedsState {
  /** 0 = satisfied, 100 = starving. */
  hunger: number;
  /** 0 = exhausted, 100 = fully rested. */
  energy: number;
  /** 0 = bored, 100 = very entertained. */
  fun: number;
  /** 0 = uncomfortable, 100 = completely at ease. */
  comfort: number;
  /** 0 = filthy, 100 = pristine. */
  hygiene: number;
  /** 0 = grumpy, 100 = delighted. Composite of the values above. */
  mood: number;
}

export type PetAction =
  | 'idle'
  | 'wander'
  | 'sniff'
  | 'eat'
  | 'drink'
  | 'sleep'
  | 'groom'
  | 'sunbathe'
  | 'playBall'
  | 'exploreRamp'
  | 'zoomies'
  | 'startled'
  | 'treat';

export type AnimationName =
  | 'idle'
  | 'walk'
  | 'sniff'
  | 'eat'
  | 'sleep'
  | 'groom'
  | 'rest'
  | 'play'
  | 'curl';

export type CameraMode = 'free' | 'follow';

export type EmoteKind = 'zzz' | 'heart' | null;

export interface DioramaAnchors {
  food: Vector3;
  water: Vector3;
  nest: Vector3;
  ball: Vector3;
  rampBottom: Vector3;
  rampTop: Vector3;
  sunbeam: Vector3;
  center: Vector3;
}

export interface Obstacle {
  position: Vector3;
  radius: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Anything in the world the brain can decide to walk over and nibble. */
export interface Edible {
  position: Vector3;
  available: boolean;
  consume(): void;
}

export interface BrainWorld {
  anchors: DioramaAnchors;
  ballPosition: Vector3;
  treats: readonly Edible[];
}

export interface HudSnapshot {
  needs: NeedsState;
  action: PetAction;
  thought: string;
  speed: number;
  cameraMode: CameraMode;
}
