# Ouricinho 🦔

A cozy, fully autonomous 3D virtual hedgehog that lives in a procedural diorama. Built with **Three.js + TypeScript + Vite**, wrapped as standalone **Windows (.exe)** and **Linux (AppImage / .deb)** desktop apps with **Electron + electron-builder**. Everything is generated in code — no CDN, no downloaded models, no external textures, and it works offline.

## Quick start

```bash
cd ouricinho
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Installs all dependencies (offline after the first install). |
| `npm run dev` | Starts the Vite development server. |
| `npm run typecheck` | Typechecks renderer, Vite config and Electron main process. |
| `npm run build` | Typechecks, builds the web bundle into `dist/`, compiles Electron into `dist-electron/`. |
| `npm run dev:electron` | Runs Vite and the Electron shell together with DevTools. |
| `npm run start:electron` | Builds, then launches the packaged app from local files. |
| `npm run build:exe` | Builds the single-file portable Windows app at `release/Ouricinho-Portable-1.0.0.exe`. |
| `npm run build:linux` | Builds both Linux artifacts (AppImage + `.deb`). |
| `npm run build:appimage` | Builds only the portable Linux AppImage. |
| `npm run build:deb` | Builds only the Debian/Ubuntu `.deb` package. |
| `./build.sh` | Shell build script for Linux: builds web + Electron, then packages AppImage and `.deb`. |
| `./build.sh appimage` | Shell build script, AppImage only. |
| `./build.sh deb` | Shell build script, `.deb` only. |
| `./build.sh dir` | Shell build script, unpacked `linux-unpacked` folder only. |
| `./run.sh` | Builds if needed, then launches the app. If run via `sudo`, it drops back to the invoking user with their desktop session. |

## Linux build

```bash
chmod +x build.sh run.sh   # only needed once after copying files
./build.sh                 # AppImage + .deb
./build.sh appimage        # just the portable AppImage
./build.sh deb             # just the Debian/Ubuntu package
```

Artifacts appear in `release/`:

```text
release/Ouricinho-1.0.0-x86_64.AppImage
release/Ouricinho-1.0.0-amd64.deb
release/Ouricinho-Portable-1.0.0.exe   # from build:exe, if also built
```

Run the app without installing a package:

```bash
./run.sh
chmod +x release/Ouricinho-1.0.0-x86_64.AppImage
./release/Ouricinho-1.0.0-x86_64.AppImage
```

Install the Debian package:

```bash
sudo apt install ./release/Ouricinho-1.0.0-amd64.deb
```

### Running as root / with sudo

Do **not** use `sudo` for normal play — Electron/Chromium disables its sandbox when running as root and root cannot use your desktop session's X authority or GPU libraries. If you do run `sudo ./run.sh`, the script detects `EUID=0`, fixes Electron's SUID sandbox helper (`chrome-sandbox` → `root:root`, mode `4755`), recovers `SUDO_USER` plus `DISPLAY`, `XAUTHORITY`, `DBUS_SESSION_BUS_ADDRESS` and `XDG_RUNTIME_DIR` from sudo's parent process, then drops privileges back to you and launches Electron with the sandbox intact:

```bash
sudo ./run.sh   # now re-executes as your normal user
```

Expected output:

```text
Root detected via sudo — dropping back to lucas-soares with your desktop session.
==> Starting Ouricinho...
```

Only when there is no `SUDO_USER` (plain root shell or container) does it fall back to `--no-sandbox --disable-gpu-sandbox` with a warning.

If you see `The SUID sandbox helper binary was found, but is not configured correctly` when launching as a normal user, fix it once with:

```bash
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

Note: `npm install` resets these permissions, so re-apply after reinstalling dependencies. `sudo ./run.sh` does it automatically.

The packaged AppImage has no privilege-dropping wrapper, so run it as your normal user. If you absolutely must run it as root, use:

```bash
sudo env XAUTHORITY=/run/user/1000/gdm/Xauthority \
         XDG_RUNTIME_DIR=/run/user/1000 \
         DISPLAY=:1 \
         ./release/Ouricinho-1.0.0-x86_64.AppImage --no-sandbox --disable-gpu-sandbox
```

Adjust the paths/values to match your session.

## Controls

You never control the hedgehog directly. Your role is to provide gentle environmental enrichment.

| Input | Action |
| --- | --- |
| `H` | Hide/show the HUD |
| `F` | Toggle Free Orbit / Follow Ouricinho |
| `B` | Drop a berry the AI can notice and eat |
| `Space` | Nudge the ball toy |
| `1` / `2` / `3` | Simulation speed 1× / 2× / 5× |
| Mouse drag / wheel | Orbit, zoom and pan the camera |

## How it works

- `src/ai/` — Needs decay, composite mood, weighted-random personality traits and a utility AI that scores eating, drinking, sleeping, grooming, sunbathing, playing, ramp exploration, sniffing, wandering and noticing dropped berries. Organic micro-behaviors add zoomies, pauses and brief startled curling.
- `src/entities/` — Procedural low-poly hedgehog rig (layered quills, blinking eyes, twitching nose, animated paws), steering with arrive/wander/obstacle avoidance, pooled dust/Zzz/heart particles.
- `src/world/` — Wooden/grass diorama, bowls, nest, ramp, ball rigid body, props, sunbeam, warm lighting with PCF soft shadows and a slow day/night cycle.
- `src/ui/` — Glassmorphism HUD, need bars, simulation-speed selector, camera modes and thought bubble projection.
- `electron/` — Secure main process (`contextIsolation`, no Node integration) and a minimal preload bridge for app version info.

## Directory tree

```text
ouricinho/
├── build.sh
├── run.sh
├── electron-builder.yml
├── electron/
│   ├── main.ts
│   └── preload.ts
├── index.html
├── package.json
├── tsconfig.electron.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── README.md
└── src/
    ├── main.ts
    ├── style.css
    ├── ai/
    │   ├── Brain.ts
    │   ├── Needs.ts
    │   └── Personality.ts
    ├── core/
    │   ├── desktop.ts
    │   ├── math.ts
    │   ├── rng.ts
    │   └── types.ts
    ├── entities/
    │   ├── Hedgehog.ts
    │   ├── Particles.ts
    │   ├── Steering.ts
    │   └── hedgehogMesh.ts
    ├── ui/
    │   ├── CameraRig.ts
    │   └── Hud.ts
    └── world/
        ├── Diorama.ts
        ├── Lighting.ts
        ├── Physics.ts
        └── props.ts
```

## Notes

- The Electron window uses the standard framed window; the renderer frame is completely transparent-free and starts with a cozy background color.
- The `portable` target produces one `.exe`; no installer or code signing is required. Windows may still warn on first run because the build is unsigned.
- Cross-building the Windows `.exe` from Linux/macOS is supported by electron-builder for the portable target (`signAndEditExecutable: false` avoids needing Wine on Linux).
- The Linux AppImage is portable: no root access is needed, just mark it executable and run it.
- The `.deb` target works on Debian/Ubuntu and derivatives; other distros should use the AppImage.
- `build.sh` is self-contained: it checks Node/npm, installs dependencies when `node_modules` is absent, builds the sources, then packages the requested Linux target(s).
# ouricinho
