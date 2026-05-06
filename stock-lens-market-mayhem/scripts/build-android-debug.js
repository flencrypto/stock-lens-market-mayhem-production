'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');

function candidateHasJava(javaHome) {
  if (!javaHome) return false;
  const javaBinary = process.platform === 'win32' ? 'java.exe' : 'java';
  return fs.existsSync(path.join(javaHome, 'bin', javaBinary));
}

function readJavaHomeFromVsCodeSettings() {
  const settingsPath = path.join(rootDir, '.vscode', 'settings.json');
  if (!fs.existsSync(settingsPath)) return '';

  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return typeof settings['java.jdt.ls.java.home'] === 'string' ? settings['java.jdt.ls.java.home'] : '';
  } catch (_) {
    return '';
  }
}

function resolveJavaHome() {
  const candidates = [
    process.env.JAVA_HOME,
    readJavaHomeFromVsCodeSettings(),
    'C:\\Program Files\\Microsoft\\jdk-17.0.19.10-hotspot'
  ].filter(Boolean);

  return candidates.find(candidateHasJava) || '';
}

function candidateHasAndroidSdk(sdkHome) {
  if (!sdkHome) return false;
  return fs.existsSync(path.join(sdkHome, 'platform-tools')) || fs.existsSync(path.join(sdkHome, 'build-tools'));
}

function resolveAndroidSdkHome() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    'C:\\Users\\benrf\\AppData\\Local\\Android\\Sdk',
    'C:\\Users\\benrf\\AppData\\Local\\Programs\\Android\\Sdk',
    'C:\\Android\\Sdk'
  ].filter(Boolean);

  return candidates.find(candidateHasAndroidSdk) || '';
}

function writeAndroidLocalProperties(sdkHome) {
  if (!sdkHome) return;
  const localPropertiesPath = path.join(androidDir, 'local.properties');
  const escapedSdkHome = sdkHome.replace(/\\/g, '\\\\');
  fs.writeFileSync(localPropertiesPath, `sdk.dir=${escapedSdkHome}\n`, 'utf8');
}

const javaHome = resolveJavaHome();
const androidSdkHome = resolveAndroidSdkHome();

if (javaHome) {
  process.env.JAVA_HOME = javaHome;
  const javaBin = path.join(javaHome, 'bin');
  if (!String(process.env.PATH || '').toLowerCase().includes(javaBin.toLowerCase())) {
    process.env.PATH = `${javaBin}${path.delimiter}${process.env.PATH || ''}`;
  }
}

if (androidSdkHome) {
  process.env.ANDROID_HOME = androidSdkHome;
  process.env.ANDROID_SDK_ROOT = androidSdkHome;
  writeAndroidLocalProperties(androidSdkHome);
}

function run(command, args, options = {}) {
  const invocation = process.platform === 'win32'
    ? { command: 'cmd.exe', args: ['/d', '/s', '/c', command, ...args] }
    : { command, args };
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
    shell: false,
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

if (!javaHome) {
  console.error('Java JDK not found. Set JAVA_HOME or configure .vscode/settings.json with java.jdt.ls.java.home.');
  process.exit(1);
}

if (!androidSdkHome) {
  console.error('Android SDK not found. Install the Android SDK and set ANDROID_HOME or ANDROID_SDK_ROOT, or create android/local.properties with sdk.dir=<your-sdk-path>.');
  process.exit(1);
}

run('npx', ['cap', 'sync', 'android']);

const gradleCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const gradleCwd = androidDir;
const gradleInvocation = process.platform === 'win32'
  ? { command: 'cmd.exe', args: ['/d', '/s', '/c', gradleCmd, 'assembleDebug'] }
  : { command: gradleCmd, args: ['assembleDebug'] };
const result = spawnSync(gradleInvocation.command, gradleInvocation.args, {
  cwd: gradleCwd,
  stdio: 'inherit',
  env: process.env,
  shell: false
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
