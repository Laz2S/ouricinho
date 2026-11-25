#!/usr/bin/env bash
# Build Ouricinho into Linux distributables (AppImage, .deb, or unpacked dir).
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

TARGET="${1:-all}"
BUILDER="$SCRIPT_DIR/node_modules/.bin/electron-builder"

usage() {
  cat <<'EOF'
Usage: ./build.sh [all|appimage|deb|dir]

  all       (default) build AppImage + .deb from electron-builder.yml
  appimage  build only the portable AppImage
  deb       build only the Debian/Ubuntu package
  dir       build only the unpacked linux-unpacked folder

Examples:
  ./build.sh
  ./build.sh appimage
  ./build.sh deb
EOF
}

case "$TARGET" in
  all | appimage | deb | dir) ;;
  -h | --help | help)
    usage
    exit 0
    ;;
  *)
    echo "Unknown build target: $TARGET" >&2
    usage >&2
    exit 1
    ;;
esac

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required (18+)." >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Error: Node.js 18 or newer is required (found $(node --version))." >&2
  exit 1
fi

if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "node_modules not found — installing dependencies..."
  npm install
fi

echo "==> Building web + Electron sources..."
npm run build

echo "==> Packaging Linux target: $TARGET"
case "$TARGET" in
  all)
    "$BUILDER" --linux --x64 --config electron-builder.yml
    ;;
  appimage)
    "$BUILDER" --linux AppImage --x64 --config electron-builder.yml
    ;;
  deb)
    "$BUILDER" --linux deb --x64 --config electron-builder.yml
    ;;
  dir)
    "$BUILDER" --linux dir --x64 --config electron-builder.yml
    ;;
esac

echo
echo "==> Done. Linux output lives in:"
echo "    $SCRIPT_DIR/release"
echo
ls -lh "$SCRIPT_DIR/release" | sed 's/^/    /'
