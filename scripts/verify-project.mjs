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
  './gradlew testDebugUnitTest lintDebug assembleDebug'
]) {
  assert.ok(workflow.includes(command), `missing CI command: ${command}`);
}
console.log('project structure OK');
