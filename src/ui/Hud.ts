import type { DesktopInfo } from '../core/desktop';
import type { CameraMode, HudSnapshot, PetAction } from '../core/types';

export interface HudCallbacks {
  onToggleFollow(): void;
  onSpeed(speed: number): void;
  onDropBerry(): void;
  onNudgeBall(): void;
}

const STATE_LABELS: Record<PetAction, string> = {
  idle: 'Idling',
  wander: 'Exploring',
  sniff: 'Sniffing',
  eat: 'Eating',
  drink: 'Drinking',
  sleep: 'Sleeping',
  groom: 'Grooming',
  sunbathe: 'Sunbathing',
  playBall: 'Playing with ball',
  exploreRamp: 'Climbing',
  zoomies: 'Zoomies!',
  startled: 'Startled',
  treat: 'Eating a treat',
};

const BAR_KEYS = ['hunger', 'energy', 'fun', 'mood'] as const;
type BarKey = (typeof BAR_KEYS)[number];

const template = `
  <div class="hud" data-hud>
    <section class="panel main-panel" aria-label="Ouricinho status">
      <header class="brand-row">
        <div class="brand-icon" aria-hidden="true">🦔</div>
        <div class="brand-text">
          <h1>Ouricinho</h1>
          <p data-build-label>autonomous companion</p>
        </div>
        <span class="live-dot" title="Living autonomously"></span>
      </header>

      <div class="state-row">
        <span class="state-pill" data-state>Idling</span>
        <span class="speed-readout" data-speed-readout>1×</span>
      </div>
      <p class="thought-line" data-thought>Waking up...</p>

      <div class="stats">
        <div class="stat" title="Higher means hungrier">
          <div class="stat-head"><span>Hunger</span><span data-value="hunger">0%</span></div>
          <div class="bar"><div class="bar-fill" data-fill="hunger"></div></div>
        </div>
        <div class="stat">
          <div class="stat-head"><span>Energy</span><span data-value="energy">0%</span></div>
          <div class="bar"><div class="bar-fill" data-fill="energy"></div></div>
        </div>
        <div class="stat">
          <div class="stat-head"><span>Fun</span><span data-value="fun">0%</span></div>
          <div class="bar"><div class="bar-fill" data-fill="fun"></div></div>
        </div>
        <div class="stat">
          <div class="stat-head"><span>Mood</span><span data-value="mood">0%</span></div>
          <div class="bar"><div class="bar-fill" data-fill="mood"></div></div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="actions">
        <button type="button" class="btn btn-warm" data-action="berry" title="Drop a berry (B)">🍓 <span>Drop berry</span></button>
        <button type="button" class="btn" data-action="ball" title="Nudge the ball (Space)">⚽ <span>Nudge ball</span></button>
      </div>

      <div class="control-row">
        <span class="control-label">Speed</span>
        <div class="segmented" role="group" aria-label="Simulation speed">
          <button type="button" data-speed="1" class="active">1×</button>
          <button type="button" data-speed="2">2×</button>
          <button type="button" data-speed="5">5×</button>
        </div>
      </div>

      <div class="control-row">
        <span class="control-label">Camera</span>
        <button type="button" class="btn btn-small" data-camera>Free orbit</button>
      </div>

      <p class="hint">H hide · F follow · B berry · Space nudge · 1/2/3 speed</p>
    </section>
  </div>
  <div class="thought-bubble" data-bubble aria-hidden="true"></div>
  <div class="hud-hidden-hint" data-hidden-hint>Press <kbd>H</kbd> to show the HUD</div>
`;

/** Minimalist glassmorphism HUD and keyboard shortcuts. */
export class Hud {
  private readonly root: HTMLElement;
  private readonly callbacks: HudCallbacks;
  private readonly hud: HTMLElement;
  private readonly bubble: HTMLElement;
  private readonly hiddenHint: HTMLElement;
  private readonly stateLabel: HTMLElement;
  private readonly thoughtLabel: HTMLElement;
  private readonly speedReadout: HTMLElement;
  private readonly cameraButton: HTMLButtonElement;
  private readonly fills = new Map<BarKey, HTMLElement>();
  private readonly values = new Map<BarKey, HTMLElement>();
  private readonly speedButtons: HTMLButtonElement[];
  private visible = true;

  constructor(root: HTMLElement, callbacks: HudCallbacks) {
    this.root = root;
    this.callbacks = callbacks;
    this.root.insertAdjacentHTML('beforeend', template);

    this.hud = this.query('[data-hud]');
    this.bubble = this.query('[data-bubble]');
    this.hiddenHint = this.query('[data-hidden-hint]');
    this.stateLabel = this.query('[data-state]');
    this.thoughtLabel = this.query('[data-thought]');
    this.speedReadout = this.query('[data-speed-readout]');
    this.cameraButton = this.query<HTMLButtonElement>('[data-camera]');
    this.speedButtons = Array.from(this.root.querySelectorAll<HTMLButtonElement>('[data-speed]'));

    for (const key of BAR_KEYS) {
      this.fills.set(key, this.query(`[data-fill="${key}"]`));
      this.values.set(key, this.query(`[data-value="${key}"]`));
    }

    this.query<HTMLButtonElement>('[data-action="berry"]').addEventListener('click', () => {
      this.callbacks.onDropBerry();
    });
    this.query<HTMLButtonElement>('[data-action="ball"]').addEventListener('click', () => {
      this.callbacks.onNudgeBall();
    });
    this.cameraButton.addEventListener('click', () => this.callbacks.onToggleFollow());
    for (const button of this.speedButtons) {
      button.addEventListener('click', () => {
        this.callbacks.onSpeed(Number(button.dataset.speed));
      });
    }

    window.addEventListener('keydown', (event) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const key = event.key.toLowerCase();
      if (key === 'h') this.toggle();
      if (key === 'f') this.callbacks.onToggleFollow();
      if (key === 'b') this.callbacks.onDropBerry();
      if (key === ' ') {
        event.preventDefault();
        this.callbacks.onNudgeBall();
      }
      if (key === '1') this.callbacks.onSpeed(1);
      if (key === '2') this.callbacks.onSpeed(2);
      if (key === '3') this.callbacks.onSpeed(5);
    });
  }

  get isVisible(): boolean {
    return this.visible;
  }

  toggle(): boolean {
    this.visible = !this.visible;
    this.hud.classList.toggle('is-hidden', !this.visible);
    this.bubble.classList.toggle('is-hidden', !this.visible);
    this.hiddenHint.classList.toggle('is-visible', !this.visible);
    return this.visible;
  }

  update(snapshot: HudSnapshot): void {
    this.stateLabel.textContent = STATE_LABELS[snapshot.action];
    this.thoughtLabel.textContent = snapshot.thought;
    this.speedReadout.textContent = `${snapshot.speed}× time`;
    this.setCameraMode(snapshot.cameraMode);

    this.updateBar('hunger', snapshot.needs.hunger, true);
    this.updateBar('energy', snapshot.needs.energy, false);
    this.updateBar('fun', snapshot.needs.fun, false);
    this.updateBar('mood', snapshot.needs.mood, false);

    for (const button of this.speedButtons) {
      button.classList.toggle('active', Number(button.dataset.speed) === snapshot.speed);
    }
  }

  setCameraMode(mode: CameraMode): void {
    this.cameraButton.textContent = mode === 'follow' ? 'Follow Ouricinho' : 'Free orbit';
    this.cameraButton.classList.toggle('is-active', mode === 'follow');
  }

  setDesktopInfo(info: DesktopInfo | null): void {
    const label = this.query('[data-build-label]');
    label.textContent = info
      ? `desktop v${info.version} · electron ${info.electron}`
      : 'autonomous companion';
  }

  positionThought(x: number, y: number, visible: boolean): void {
    const clampedX = Math.min(Math.max(x, 130), window.innerWidth - 130);
    const clampedY = Math.min(Math.max(y, 120), window.innerHeight - 40);
    this.bubble.style.left = `${clampedX}px`;
    this.bubble.style.top = `${clampedY}px`;
    this.bubble.style.opacity = visible && this.visible ? '1' : '0';
  }

  private updateBar(key: BarKey, value: number, higherIsWorse: boolean): void {
    const rounded = Math.round(Math.min(100, Math.max(0, value)));
    const fill = this.fills.get(key);
    const text = this.values.get(key);
    if (!fill || !text) return;
    fill.style.width = `${rounded}%`;
    text.textContent = `${rounded}%`;
    const concerning = higherIsWorse ? rounded > 68 : rounded < 32;
    const healthy = higherIsWorse ? rounded < 45 : rounded > 62;
    fill.classList.toggle('warn', concerning);
    fill.classList.toggle('good', healthy);
  }

  private query<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`HUD element not found: ${selector}`);
    return element;
  }
}
