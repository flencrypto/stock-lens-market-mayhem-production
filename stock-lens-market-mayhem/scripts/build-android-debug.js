'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

if (!fs.existsSync(androidDir)) {
  console.error('Android project not found. Run: npm run native:add:android');
  process.exit(1);
}

run('npx', ['cap', 'sync', 'android']);

const gradleCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const gradleCwd = androidDir;
const result = spawnSync(gradleCmd, ['assembleDebug'], {
  cwd: gradleCwd,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}

const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (fs.existsSync(apkPath)) {
  console.log(`Debug APK built: ${apkPath}`);
} else {
  console.log('Build finished, but APK path was not found at the default location.');
}
