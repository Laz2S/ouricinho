import { AmbientLight, DirectionalLight, HemisphereLight, PointLight, Scene } from 'three';

export interface LightingRig {
  sun: DirectionalLight;
  update(time: number): void;
}

/** Warm diorama lighting with soft PCF shadows and a very slow day/night breathing cycle. */
export function createLighting(scene: Scene): LightingRig {
  const hemisphere = new HemisphereLight(0xffe7c4, 0x55744f, 1.25);
  scene.add(hemisphere);

  const ambient = new AmbientLight(0xa9b7d2, 0.24);
  scene.add(ambient);

  const sun = new DirectionalLight(0xffe2ad, 2.55);
  sun.position.set(4.5, 9, 5.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 30;
  sun.shadow.camera.left = -8.5;
  sun.shadow.camera.right = 8.5;
  sun.shadow.camera.top = 8.5;
  sun.shadow.camera.bottom = -8.5;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  scene.add(sun.target);

  const hearthLamp = new PointLight(0xffb877, 16, 7, 2);
  hearthLamp.position.set(2.8, 1.65, -2.1);
  scene.add(hearthLamp);

  const period = 260;
  return {
    sun,
    update(time: number): void {
      const phase = ((time % period) / period) * Math.PI * 2;
      const daylight = (Math.sin(phase) + 1) / 2;
      sun.intensity = 2.2 + daylight * 0.55;
      sun.position.x = 4.3 + Math.sin(phase) * 1.7;
      sun.position.z = 5.2 + Math.cos(phase) * 1.4;
      hemisphere.intensity = 1.08 + daylight * 0.3;
      hearthLamp.intensity = 12 + (1 - daylight) * 8;
    },
  };
}
