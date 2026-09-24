import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const required = [
  'settings.gradle.kts',
  'app/build.gradle.kts',
  'app/src/main/AndroidManifest.xml',
  'app/src/main/res/values/strings.xml',
  'app/src/main/res/xml/network_security_config.xml'
];
required.forEach(path => assert.ok(existsSync(path), `missing: ${path}`));

const gradle = readFileSync('app/build.gradle.kts', 'utf8');
assert.match(gradle, /namespace = "com\.suyusheng\.medlit"/);
assert.match(gradle, /applicationId = "com\.suyusheng\.medlit"/);
assert.match(gradle, /minSdk = 26/);
assert.match(gradle, /targetSdk = 35/);

const manifest = readFileSync('app/src/main/AndroidManifest.xml', 'utf8');
for (const permission of ['CAMERA','RECORD_AUDIO','ACCESS_FINE_LOCATION','READ_CONTACTS','READ_SMS','READ_EXTERNAL_STORAGE']) {
  assert.ok(!manifest.includes(permission), `forbidden permission: ${permission}`);
}

const workflow = readFileSync('.github/workflows/android-verify.yml', 'utf8');
for (const command of [
  'node scripts/verify-project.mjs',
  'node scripts/verify-web-assets.mjs',
  'bash scripts/check-no-secrets.sh',
  './gradlew testDebugUnitTest lintDebug assembleDebug',
  './gradlew connectedDebugAndroidTest'
]) {
  assert.ok(workflow.includes(command), `missing CI command: ${command}`);
}
assert.match(workflow, /api-level:\s*\[26, 35\]/, 'instrumentation must cover Android 8 and current Android');
assert.match(
  workflow,
  /ReactiveCircus\/android-emulator-runner@a421e43855164a8197daf9d8d40fe71c6996bb0d/,
  'instrumentation runner must be pinned to the reviewed v2.38.0 commit'
);
assert.ok(
  workflow.includes('/etc/udev/rules.d/99-kvm4all.rules'),
  'instrumentation emulator must enable KVM acceleration on the Linux runner'
);
for (const setting of [
  'settings put global package_verifier_enable 0',
  'settings put global verifier_verify_adb_installs 0'
]) {
  assert.ok(
    workflow.includes(setting),
    `instrumentation emulator must disable network-backed APK verification: ${setting}`
  );
}

const release = readFileSync('.github/workflows/android-release.yml', 'utf8');
for (const secret of [
  'ANDROID_KEYSTORE_BASE64',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_PASSWORD'
]) {
  assert.ok(release.includes('secrets.' + secret), `missing secret: ${secret}`);
  assert.doesNotMatch(
    release,
    new RegExp(`^ {6}${secret}:\\s*\\$\\{\\{\\s*secrets\\.${secret}\\s*\\}\\}`, 'm'),
    `${secret} must not be exposed to every job step`
  );
}
for (const step of ['apksigner verify', 'sha256sum', 'assembleRelease', 'if: always()', 'EXPECTED_SIGNER_SHA256']) {
  assert.ok(release.includes(step), `missing release step: ${step}`);
}
assert.match(
  release,
  /workflow_dispatch:\s*\n\s*inputs:\s*\n\s*publish:/,
  'manual release workflow must offer an explicit publish switch'
);
assert.match(
  release,
  /if:\s*startsWith\(github\.ref, 'refs\/tags\/v'\) \|\| inputs\.publish/,
  'GitHub Release publishing must require a version tag or the explicit publish switch'
);
assert.match(
  release,
  /gh release create v1\.0\.0[\s\S]*?--target "\$GITHUB_SHA"/,
  'manual publishing must create v1.0.0 from the verified commit'
);
assert.doesNotMatch(
  release,
  /^ {6}ANDROID_KEYSTORE_PATH:\s*\$\{\{\s*runner\.temp\s*\}\}/m,
  'runner context is unavailable in job-level env'
);
const releaseBuildStep = release.match(
  /      - name: Build signed release APK\n[\s\S]*?(?=\n      - name:)/
)?.[0] ?? '';
assert.match(
  releaseBuildStep,
  /ANDROID_KEYSTORE_PATH:\s*\$\{\{\s*runner\.temp\s*\}\}\/medlit-release\.jks/,
  'release build must receive the runner-scoped keystore path'
);
assert.match(releaseBuildStep, /run: \.\/gradlew assembleRelease/);

const readme = readFileSync('README.md', 'utf8');
for (const topic of [
  '医学文献检索与写作',
  '苏裕盛 教授',
  'Android 8.0',
  '离线',
  '系统浏览器',
  'SHA-256',
  '同一签名',
  '不含分析统计',
  '不申请敏感权限'
]) {
  assert.ok(readme.includes(topic), `missing README topic: ${topic}`);
}
console.log('project structure OK');
