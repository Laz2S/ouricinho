#!/usr/bin/env bash
# Creates an end-user release folder containing only runnable binaries + docs.
# End users do NOT need Node, npm, Git, or this source project.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VERSION="$(node -p "require('./package.json').version")"
OUT="$SCRIPT_DIR/release-bundle"
RELEASE="$SCRIPT_DIR/release"

WIN_EXE="Ouricinho-Portable-${VERSION}.exe"
APPIMAGE="Ouricinho-${VERSION}-x86_64.AppImage"
DEB="Ouricinho-${VERSION}-amd64.deb"
TARBALL="Ouricinho-${VERSION}-linux-x64.tar.gz"

if [ "${1:-}" != "--no-build" ]; then
  echo "==> Building all distributables"
  npm run init
else
  echo "==> Using existing artifacts in $RELEASE"
fi

for file in "$WIN_EXE" "$APPIMAGE" "$DEB"; do
  if [ ! -f "$RELEASE/$file" ]; then
    echo "Missing artifact: $RELEASE/$file" >&2
    echo "Run 'npm run release' without --no-build first." >&2
    exit 1
  fi
done

if [ ! -x "$RELEASE/linux-unpacked/ouricinho" ]; then
  echo "Missing unpacked Linux binary: $RELEASE/linux-unpacked/ouricinho" >&2
  exit 1
fi

echo "==> Assembling $OUT"
rm -rf "$OUT"
mkdir -p "$OUT"

cp -p "$RELEASE/$WIN_EXE" "$OUT/"
cp -p "$RELEASE/$APPIMAGE" "$OUT/"
cp -p "$RELEASE/$DEB" "$OUT/"
chmod +x "$OUT/$APPIMAGE"

tar -czf "$OUT/$TARBALL" -C "$RELEASE" linux-unpacked

cat > "$OUT/HOW_TO_RUN.txt" <<EOF
Ouricinho $VERSION
==================

These files are ready to run. You do NOT need Node.js, npm, Git, or the source
project.

WINDOWS
-------
Double-click:
  $WIN_EXE

LUBUNTU / LINUX (portable)
--------------------------
Mark the AppImage executable, then run it:
  chmod +x $APPIMAGE
  ./$APPIMAGE

Some distros need FUSE (libfuse2) for AppImages. If yours does not have it,
use the .tar.gz below instead.

LINUX (no FUSE needed)
----------------------
Extract and run the included binary:
  tar -xzf $TARBALL
  ./linux-unpacked/ouricinho

DEBIAN / UBUNTU / DERIVATIVES
-----------------------------
Install the package, then launch "Ouricinho" from your applications menu:
  sudo apt install ./$DEB

CHECKSUMS
---------
Verify downloads with:
  sha256sum -c SHA256SUMS

No internet connection is required while playing. All visuals are procedural.
EOF

( cd "$OUT" && sha256sum "$WIN_EXE" "$APPIMAGE" "$DEB" "$TARBALL" > SHA256SUMS )

echo
echo "==> Release bundle ready:"
ls -lh "$OUT"
echo
echo "Upload the contents of:"
echo "  $OUT"
