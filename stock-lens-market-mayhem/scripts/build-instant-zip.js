'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');
const outputZip = path.join(distDir, 'stock-lens-instant-game-upload.zip');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    ...options
  });

  return result.status === 0;
}

function buildWithPython() {
  const candidates = process.platform === 'win32'
    ? [
        { command: 'py', args: ['-3', 'scripts/build_instant_zip.py'] },
        { command: 'python', args: ['scripts/build_instant_zip.py'] },
        { command: 'python3', args: ['scripts/build_instant_zip.py'] }
      ]
    : [
        { command: 'python3', args: ['scripts/build_instant_zip.py'] },
        { command: 'python', args: ['scripts/build_instant_zip.py'] }
      ];

  for (const candidate of candidates) {
    if (run(candidate.command, candidate.args)) {
      return true;
    }
  }

  return false;
}

function buildWithPowerShell() {
  if (process.platform !== 'win32') return false;
  fs.mkdirSync(distDir, { recursive: true });
  if (fs.existsSync(outputZip)) {
    fs.unlinkSync(outputZip);
  }

  const script = [
    `$Public = '${publicDir.replace(/'/g, "''")}'`,
    `$Output = '${outputZip.replace(/'/g, "''")}'`,
    "Compress-Archive -Path (Join-Path $Public '*') -DestinationPath $Output -Force"
  ].join('; ');

  return run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script]);
}

if (!buildWithPython() && !buildWithPowerShell()) {
  console.error('Could not create the instant-game zip. Install Python or run on Windows with PowerShell available.');
  process.exit(1);
}
