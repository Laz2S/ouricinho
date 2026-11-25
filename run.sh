#!/usr/bin/env bash
# Launch Ouricinho directly from the built local files on Linux.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Captured before any command substitution: inside $(...) $PPID is the subshell.
PARENT_PID="$PPID"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required." >&2
  exit 1
fi

if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "node_modules not found — installing dependencies..."
  npm install
fi

if [ ! -f "$SCRIPT_DIR/dist/index.html" ] || [ ! -f "$SCRIPT_DIR/dist-electron/main.js" ]; then
  echo "Build output missing — running npm run build..."
  npm run build
fi

echo "==> Starting Ouricinho..."

ELECTRON="$SCRIPT_DIR/node_modules/.bin/electron"
MAIN="$SCRIPT_DIR/dist-electron/main.js"

# Reads one variable from a specific process environment.
env_from_pid() {
  local pid="$1" key="$2"
  [ -r "/proc/$pid/environ" ] || return 0
  tr '\0' '\n' < "/proc/$pid/environ" | grep -m1 "^${key}=" | cut -d= -f2- || true
}

# Walks up the process tree so this also works through `sudo npm start`
# (where the immediate parent is npm/sh and only a grandparent is sudo).
from_session_env() {
  local key="$1" pid="$PARENT_PID" value="" guard=0
  while [ -n "$pid" ] && [ "$pid" != "0" ] && [ "$guard" -lt 40 ]; do
    value="$(env_from_pid "$pid" "$key")"
    if [ -n "$value" ]; then
      printf '%s' "$value"
      return 0
    fi
    pid="$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ' || true)"
    guard=$((guard + 1))
  done
  return 0
}

if [ "$(id -u)" -eq 0 ]; then
  # Best case: sudo tells us who invoked it. Drop back to that user with their
  # original desktop session so Electron keeps its sandbox and X/GPU access.
  if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ] && command -v sudo >/dev/null 2>&1; then
    echo "Root detected via sudo — dropping back to $SUDO_USER with your desktop session." >&2

    # Electron's setuid sandbox helper must be root-owned and mode 4755.
    # npm installs it as the regular user, so fix it once while we are root.
    # .bin/electron links to cli.js, not the real binary. Ask Node for the
    # executable path exported by the electron package (dist/electron).
    ELECTRON_REAL="$(node -p "require('electron')" 2>/dev/null || readlink -f "$ELECTRON" 2>/dev/null || printf '%s' "$ELECTRON")"
    SANDBOX_HELPER="$(dirname "$ELECTRON_REAL")/chrome-sandbox"
    if [ -f "$SANDBOX_HELPER" ]; then
      HELPER_UID="$(stat -c '%u' "$SANDBOX_HELPER" 2>/dev/null || printf 'unknown')"
      HELPER_MODE="$(stat -c '%a' "$SANDBOX_HELPER" 2>/dev/null || printf 'unknown')"
      if [ "$HELPER_UID" != "0" ] || [ "$HELPER_MODE" != "4755" ]; then
        echo "Configuring Electron SUID sandbox helper: $SANDBOX_HELPER" >&2
        chown root:root "$SANDBOX_HELPER"
        chmod 4755 "$SANDBOX_HELPER"
      fi
    fi

    ORIG_DISPLAY="$(from_session_env DISPLAY)"
    [ -n "$ORIG_DISPLAY" ] || ORIG_DISPLAY="${DISPLAY:-}"

    ORIG_XAUTHORITY="$(from_session_env XAUTHORITY)"
    [ -n "$ORIG_XAUTHORITY" ] || ORIG_XAUTHORITY="${XAUTHORITY:-}"

    ORIG_DBUS="$(from_session_env DBUS_SESSION_BUS_ADDRESS)"
    [ -n "$ORIG_DBUS" ] || ORIG_DBUS="${DBUS_SESSION_BUS_ADDRESS:-}"

    ORIG_XDG_RUNTIME_DIR="$(from_session_env XDG_RUNTIME_DIR)"
    [ -n "$ORIG_XDG_RUNTIME_DIR" ] || ORIG_XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-}"

    ORIG_WAYLAND_DISPLAY="$(from_session_env WAYLAND_DISPLAY)"
    [ -n "$ORIG_WAYLAND_DISPLAY" ] || ORIG_WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-}"

    # Derive HOME from SUDO_USER: under nested sudo an ancestor may still be
    # root, whose HOME must not be passed back to the desktop user.
    ORIG_HOME="$(getent passwd "$SUDO_USER" 2>/dev/null | cut -d: -f6 || true)"
    [ -n "$ORIG_HOME" ] || ORIG_HOME="$(from_session_env HOME)"
    [ -n "$ORIG_HOME" ] || ORIG_HOME="${HOME:-$SCRIPT_DIR}"

    ORIG_PATH="$(from_session_env PATH)"
    [ -n "$ORIG_PATH" ] || ORIG_PATH="${PATH:-/usr/local/bin:/usr/bin:/bin}"

    # GNOME stores the X cookie under $XDG_RUNTIME_DIR/gdm/Xauthority.
    if [ -z "$ORIG_XAUTHORITY" ] && [ -n "$ORIG_XDG_RUNTIME_DIR" ] && [ -f "$ORIG_XDG_RUNTIME_DIR/gdm/Xauthority" ]; then
      ORIG_XAUTHORITY="$ORIG_XDG_RUNTIME_DIR/gdm/Xauthority"
    fi
    if [ -z "$ORIG_XAUTHORITY" ] && [ -n "$ORIG_HOME" ] && [ -f "$ORIG_HOME/.Xauthority" ]; then
      ORIG_XAUTHORITY="$ORIG_HOME/.Xauthority"
    fi

    exec sudo -u "$SUDO_USER" -- env \
      HOME="$ORIG_HOME" \
      USER="$SUDO_USER" \
      LOGNAME="$SUDO_USER" \
      PATH="$ORIG_PATH" \
      DISPLAY="$ORIG_DISPLAY" \
      XAUTHORITY="$ORIG_XAUTHORITY" \
      XDG_RUNTIME_DIR="$ORIG_XDG_RUNTIME_DIR" \
      DBUS_SESSION_BUS_ADDRESS="$ORIG_DBUS" \
      WAYLAND_DISPLAY="$ORIG_WAYLAND_DISPLAY" \
      "$ELECTRON" "$MAIN"
  fi

  # No sudo session user (plain root / container): last-resort headless-ish path.
  echo "Warning: Electron cannot use its sandbox as root." >&2
  echo "         Continuing with --no-sandbox --disable-gpu-sandbox." >&2
  exec "$ELECTRON" --no-sandbox --disable-gpu-sandbox "$MAIN"
fi

exec "$ELECTRON" "$MAIN"
