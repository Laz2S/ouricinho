#!/usr/bin/env node
'use strict';

// Platform-specific "prepare + play" entry point used by npm start,
// npm run start-linux and npm run start-windows.

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const requested = (process.argv[2] || 'auto').toLowerCase();
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

function run(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWindows,
    ...options,
  });

  if (result.error) {
    console.error(`Failed to run: ${command} ${args.join(' ')}`);
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function prepareLinux() {
  // init.sh installs, builds, packages both platforms and fixes chrome-sandbox.
  run(npmCmd, ['run', 'init']);
}

function launchLinux() {
  // run.sh drops back to the invoking user when started through sudo.
  run('bash', ['run.sh']);
}

function prepareWindows() {
  // Avoid bash here: npm on Windows uses cmd.exe by default.
  run(npmCmd, ['install']);
  run(npmCmd, ['run', 'build']);
  run(npmCmd, ['run', 'build:exe']);
}

function launchWindows() {
  const exe = path.join(root, 'release', 'Ouricinho-Portable-1.0.0.exe');

  if (!isWindows) {
    console.log('');
    console.log('Windows build is ready:');
    console.log(`  ${exe}`);
    console.log('This host is not Windows, so the .exe cannot be launched here.');
    console.log('Copy it to Windows and run it there.');
    console.log('');
    return;
  }

  const result = spawnSync(exe, [], { cwd: root, stdio: 'inherit', windowsHide: false });
  if (result.error) {
    console.error(`Failed to launch: ${exe}`);
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

switch (requested) {
  case 'linux':
    prepareLinux();
    launchLinux();
    break;
  case 'windows':
    prepareWindows();
    launchWindows();
    break;
  case 'auto':
    if (isWindows) {
      prepareWindows();
      launchWindows();
    } else {
      prepareLinux();
      launchLinux();
    }
    break;
  default:
    console.error(`Unknown target: ${requested}`);
    console.error('Use: node scripts/start.js [auto|linux|windows]');
    process.exit(1);
}
