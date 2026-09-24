import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = 'app/src/main/assets/www/';
for (const file of [
  'index.html',
  'styles.css',
  'zotero.css',
  'pwa.css',
  'app.js',
  'icons/icon-192.png',
  'icons/icon-512.png'
]) {
  assert.ok(existsSync(root + file), `missing web asset: ${file}`);
}

const html = readFileSync(root + 'index.html', 'utf8');
const js = readFileSync(root + 'app.js', 'utf8');
assert.match(html, /医学文献检索与写作/);
assert.match(html, /制作者：苏裕盛 教授/);
assert.match(html, /id="install-app-shell"/);
assert.match(js, /appassets\.androidplatform\.net/);
assert.match(js, /install-app-shell/);
assert.match(js, /serviceWorker/);
assert.match(js, /if \(!isAndroidContainer\)/);
console.log('web assets OK');
