#!/usr/bin/env bash
# One-shot setup: install, build, package every target, configure the sandbox.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Captured before command substitutions: inside $(...) $PPID is the subshell.
PARENT_PID="$PPID"

from_parent_env() {
  local key="$1"
  [ -r "/proc/$PARENT_PID/environ" ] || return 0
  tr '\0' '\n' < "/proc/$PARENT_PID/environ" | grep -m1 "^${key}=" | cut -d= -f2- || true
}

# If invoked as `sudo npm run init`, run npm/build steps as the real user so
# node_modules and build output are not left owned by root.
DROP_TO_USER=0
if [ "$(id -u)" -eq 0 ] && [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ] && command -v sudo >/dev/null 2>&1; then
  DROP_TO_USER=1
fi

ORIG_PATH="$(from_parent_env PATH)"
[ -n "$ORIG_PATH" ] || ORIG_PATH="${PATH:-/usr/local/bin:/usr/bin:/bin}"

ORIG_HOME="$(from_parent_env HOME)"
[ -n "$ORIG_HOME" ] || ORIG_HOME="${HOME:-$SCRIPT_DIR}"

run_as_user() {
  if [ "$DROP_TO_USER" -eq 1 ]; then
    sudo -H -u "$SUDO_USER" -- env PATH="$ORIG_PATH" HOME="$ORIG_HOME" "$@"
  else
    "$@"
  fi
}

echo "==> Ensuring helper scripts are executable"
chmod +x "$SCRIPT_DIR/build.sh" "$SCRIPT_DIR/run.sh"

echo "==> Installing dependencies"
run_as_user npm install

echo "==> Building renderer + Electron sources"
run_as_user npm run build

BUILDER="$SCRIPT_DIR/node_modules/.bin/electron-builder"

echo "==> Packaging Windows portable .exe"
run_as_user "$BUILDER" --win --x64 --config electron-builder.yml

echo "==> Packaging Linux AppImage + .deb"
run_as_user "$BUILDER" --linux --x64 --config electron-builder.yml

echo "==> Configuring Electron SUID sandbox helper"
ELECTRON_REAL="$(run_as_user node -p "require('electron')" 2>/dev/null || node -p "require('electron')" 2>/dev/null || printf '%s' "$SCRIPT_DIR/node_modules/electron/dist/electron")"
SANDBOX_HELPER="$(dirname "$ELECTRON_REAL")/chrome-sandbox"

if [ -f "$SANDBOX_HELPER" ]; then
  HELPER_UID="$(stat -c '%u' "$SANDBOX_HELPER" 2>/dev/null || printf 'unknown')"
  HELPER_MODE="$(stat -c '%a' "$SANDBOX_HELPER" 2>/dev/null || printf 'unknown')"

  if [ "$HELPER_UID" = "0" ] && [ "$HELPER_MODE" = "4755" ]; then
    echo "    Already configured."
  else
    echo "    Setting $SANDBOX_HELPER to root:root 4755 (sudo may prompt)..."
    if [ "$(id -u)" -eq 0 ]; then
      chown root:root "$SANDBOX_HELPER"
      chmod 4755 "$SANDBOX_HELPER"
    elif command -v sudo >/dev/null 2>&1; then
      if sudo chown root:root "$SANDBOX_HELPER" && sudo chmod 4755 "$SANDBOX_HELPER"; then
        echo "    Sandbox helper configured."
      else
        echo "    Warning: could not configure the helper." >&2
        echo "    Run 'sudo ./run.sh' once or fix it manually:" >&2
        echo "      sudo chown root:root $SANDBOX_HELPER" >&2
        echo "      sudo chmod 4755 $SANDBOX_HELPER" >&2
      fi
    else
      echo "    Warning: sudo unavailable; run 'sudo ./run.sh' once." >&2
    fi
  fi
else
  echo "    Helper not found at $SANDBOX_HELPER; Electron may need --no-sandbox." >&2
fi

echo
echo "==> Ready. Artifacts:"
echo "    Windows: $SCRIPT_DIR/release/Ouricinho-Portable-1.0.0.exe"
echo "    Linux:   $SCRIPT_DIR/release/Ouricinho-1.0.0-x86_64.AppImage"
echo "             $SCRIPT_DIR/release/Ouricinho-1.0.0-amd64.deb"
echo
echo "Launch with: ./run.sh   (or sudo ./run.sh)"
