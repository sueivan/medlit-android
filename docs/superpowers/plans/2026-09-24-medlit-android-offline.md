# 医学文献检索与写作 Android 离线版实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建可在中国大陆 Android 设备完全离线运行、可用同一正式签名覆盖更新的“医学文献检索与写作”APK。

**Architecture:** 单模块 Kotlin Android 应用使用 WebViewAssetLoader 从 APK assets 提供现有静态教学网站；URLPolicy 将非内置 HTTP(S) 链接交给系统浏览器。GitHub Actions 分别验证 Debug 构建和生成签名 Release APK。

**Tech Stack:** Kotlin 2.0.21、Android Gradle Plugin 8.7.3、Gradle 8.9、Java 17、Android API 35、AndroidX WebKit 1.12.1、JUnit 4、AndroidX Test、GitHub Actions。

**Spec:** `docs/superpowers/specs/2026-09-24-medlit-android-offline-design.md`

## Global Constraints

- 应用名称固定为“医学文献检索与写作”。
- 制作者固定为“苏裕盛 教授”。
- 包名固定为 `com.suyusheng.medlit`。
- `minSdk = 26`，`compileSdk = 35`，`targetSdk = 35`。
- 初始版本为 `versionName = "1.0.0"`、`versionCode = 1`。
- 内置课程必须在飞行模式可用。
- 不申请相机、麦克风、定位、通讯录、短信、存储或后台运行权限。
- 不在仓库、日志、构建产物或 APK 中保存 keystore、密码、Token。
- 外部 HTTP(S) 链接必须交给系统浏览器，不得留在 WebView。
- 第一版不加入登录、云同步、推送、分析统计或应用商店发布。

## Review Focus

- 恶意或意外的非 HTTP(S) URI：默认拒绝，只有明确测试的 `mailto:` 可交给系统。
- 大小写、端口或相似域名伪装的 appassets URL：只有精确主机 `appassets.androidplatform.net` 视为内部。
- 无可处理外部链接的浏览器：应用不能崩溃，应显示简短中文提示。
- 网页脚本误注册 Service Worker 或显示 PWA 安装入口：Android 容器必须关闭这些 Web 专属行为。
- GitHub 签名 Secret 缺失或为空：发布工作流必须在编译前明确失败，且不回显任何 Secret。

---

## 文件结构

```text
.
├── .github/workflows/
│   ├── android-verify.yml          # PR/推送验证、Lint、测试、Debug APK
│   └── android-release.yml         # 正式签名、校验、Release APK
├── app/
│   ├── build.gradle.kts            # Android、依赖、签名环境变量
│   ├── proguard-rules.pro
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml # Activity、主题、安全配置
│       │   ├── java/com/suyusheng/medlit/
│       │   │   ├── MainActivity.kt # WebView 生命周期、返回键、Intent
│       │   │   └── UrlPolicy.kt    # 可独立测试的 URL 判定
│       │   ├── res/
│       │   │   ├── drawable/       # 启动画面和图标
│       │   │   ├── mipmap-*/       # Launcher 图标
│       │   │   ├── values/         # 名称、颜色、主题
│       │   │   └── xml/network_security_config.xml
│       │   └── assets/www/         # 完整静态课程
│       ├── test/.../UrlPolicyTest.kt
│       └── androidTest/.../OfflineAppTest.kt
├── scripts/
│   ├── verify-web-assets.mjs       # 静态资源和 Android 差异检查
│   └── check-no-secrets.sh         # 敏感文件/字符串检查
├── docs/
│   ├── INSTALL.md
│   ├── SIGNING.md
│   └── superpowers/...
├── .gitignore
├── build.gradle.kts
├── gradle.properties
├── settings.gradle.kts
└── gradlew / gradlew.bat / gradle/wrapper/*
```

### Task 1: 建立可重复构建的 Android 工程

**Files:**
- Create: `settings.gradle.kts`
- Create: `build.gradle.kts`
- Create: `gradle.properties`
- Create: `app/build.gradle.kts`
- Create: `app/proguard-rules.pro`
- Create: `app/src/main/AndroidManifest.xml`
- Create: `app/src/main/res/values/strings.xml`
- Create: `app/src/main/res/values/colors.xml`
- Create: `app/src/main/res/values/themes.xml`
- Create: `app/src/main/res/xml/network_security_config.xml`
- Create: `.gitignore`
- Create: Gradle Wrapper files

**Interfaces:**
- Consumes: approved package name and SDK floors from the spec.
- Produces: Gradle task `:app:assembleDebug` and Android application ID `com.suyusheng.medlit`.

- [ ] **Step 1: Write the failing project-structure test**

Create `scripts/verify-project.mjs`:

```js
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
console.log('project structure OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/verify-project.mjs`  
Expected: FAIL with `missing: settings.gradle.kts`.

- [ ] **Step 3: Add the minimal Gradle and Android configuration**

`app/build.gradle.kts` must include:

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "com.suyusheng.medlit"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.suyusheng.medlit"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
}
dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.12.1")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
}
```

`network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
</network-security-config>
```

- [ ] **Step 4: Run structure test and Gradle build**

Run: `node scripts/verify-project.mjs && ./gradlew :app:assembleDebug`  
Expected: `project structure OK` and `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit**

```bash
git add .gitignore settings.gradle.kts build.gradle.kts gradle.properties gradlew gradlew.bat gradle app scripts/verify-project.mjs
git commit -m "build: initialize Android offline app"
```

### Task 2: 以测试先行实现 URL 安全策略

**Files:**
- Create: `app/src/main/java/com/suyusheng/medlit/UrlPolicy.kt`
- Create: `app/src/test/java/com/suyusheng/medlit/UrlPolicyTest.kt`

**Interfaces:**
- Produces: `sealed interface NavigationDecision` and `fun decideNavigation(uri: Uri): NavigationDecision`.
- Consumers: Task 3 `MainActivity`.

- [ ] **Step 1: Write failing unit tests**

```kotlin
class UrlPolicyTest {
    @Test fun exactAppassetsHostStaysInternal() {
        assertEquals(
            NavigationDecision.Internal,
            decideNavigation(Uri.parse("https://appassets.androidplatform.net/assets/www/index.html#search"))
        )
    }

    @Test fun lookalikeHostIsExternal() {
        assertEquals(
            NavigationDecision.External,
            decideNavigation(Uri.parse("https://appassets.androidplatform.net.evil.example/x"))
        )
    }

    @Test fun pubmedIsExternal() {
        assertEquals(
            NavigationDecision.External,
            decideNavigation(Uri.parse("https://pubmed.ncbi.nlm.nih.gov/"))
        )
    }

    @Test fun mailtoIsExternal() {
        assertEquals(
            NavigationDecision.External,
            decideNavigation(Uri.parse("mailto:teacher@example.edu"))
        )
    }

    @Test fun javascriptSchemeIsRejected() {
        assertEquals(
            NavigationDecision.Rejected,
            decideNavigation(Uri.parse("javascript:alert(1)"))
        )
    }
}
```

- [ ] **Step 2: Verify RED**

Run: `./gradlew :app:testDebugUnitTest --tests '*UrlPolicyTest'`  
Expected: compilation FAIL because `NavigationDecision` is undefined.

- [ ] **Step 3: Implement minimal policy**

```kotlin
sealed interface NavigationDecision {
    data object Internal : NavigationDecision
    data object External : NavigationDecision
    data object Rejected : NavigationDecision
}

fun decideNavigation(uri: Uri): NavigationDecision = when {
    uri.scheme.equals("https", true) &&
        uri.host.equals("appassets.androidplatform.net", true) ->
        NavigationDecision.Internal
    uri.scheme.equals("http", true) || uri.scheme.equals("https", true) ||
        uri.scheme.equals("mailto", true) ->
        NavigationDecision.External
    else -> NavigationDecision.Rejected
}
```

- [ ] **Step 4: Verify GREEN**

Run: `./gradlew :app:testDebugUnitTest --tests '*UrlPolicyTest'`  
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/main/java/com/suyusheng/medlit/UrlPolicy.kt app/src/test/java/com/suyusheng/medlit/UrlPolicyTest.kt
git commit -m "feat: enforce safe WebView navigation"
```

### Task 3: 实现离线 WebView 容器

**Files:**
- Create: `app/src/main/java/com/suyusheng/medlit/MainActivity.kt`
- Create: `app/src/main/res/layout/activity_main.xml`
- Create: `app/src/androidTest/java/com/suyusheng/medlit/OfflineAppTest.kt`
- Modify: `app/src/main/AndroidManifest.xml`

**Interfaces:**
- Consumes: `decideNavigation(Uri)` from Task 2.
- Produces: Activity entrypoint and internal URL `APP_URL`.

- [ ] **Step 1: Write failing instrumentation smoke test**

```kotlin
@RunWith(AndroidJUnit4::class)
class OfflineAppTest {
    @get:Rule val scenarioRule = ActivityScenarioRule(MainActivity::class.java)

    @Test fun coldStartLoadsCourseHome() {
        onWebView()
            .withElement(findElement(Locator.ID, "home-title"))
            .check(webMatches(getText(), containsString("从一个问题")))
    }

    @Test fun pwaInstallCardIsHidden() {
        onWebView()
            .withElement(findElement(Locator.ID, "install-app-shell"))
            .check(webMatches(getStyleProperty("display"), equalTo("none")))
    }
}
```

- [ ] **Step 2: Verify RED**

Run: `./gradlew :app:connectedDebugAndroidTest`  
Expected: FAIL because `MainActivity` and layout are missing.

- [ ] **Step 3: Implement Activity**

Use `WebViewAssetLoader.AssetsPathHandler` on `/assets/`; enable JavaScript and DOM storage only; disable file/content access; route `NavigationDecision.External` through `Intent.ACTION_VIEW`; catch `ActivityNotFoundException` and show `Toast.makeText(..., "未找到可打开此链接的应用", ...)`; reject other schemes. Load:

```kotlin
private const val APP_URL =
    "https://appassets.androidplatform.net/assets/www/index.html?android=1#home"
```

Use `OnBackPressedDispatcher` to call `webView.goBack()` when possible, otherwise finish.

- [ ] **Step 4: Run unit, instrumentation and Lint checks**

Run: `./gradlew :app:testDebugUnitTest :app:connectedDebugAndroidTest :app:lintDebug`  
Expected: PASS with no fatal Lint findings.

- [ ] **Step 5: Commit**

```bash
git add app/src/main
git commit -m "feat: add offline WebView container"
```

### Task 4: 封装现有课程并适配 Android 容器

**Files:**
- Create: `app/src/main/assets/www/**`
- Create: `scripts/verify-web-assets.mjs`
- Modify: Android copy of `app.js` and `index.html`

**Interfaces:**
- Consumes: current published MedLit static source.
- Produces: self-contained `assets/www/index.html` and all relative dependencies.

- [ ] **Step 1: Write failing static asset verification**

```js
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = 'app/src/main/assets/www/';
for (const file of ['index.html','styles.css','zotero.css','pwa.css','app.js','icons/icon-192.png','icons/icon-512.png']) {
  assert.ok(existsSync(root + file), `missing web asset: ${file}`);
}
const html = readFileSync(root + 'index.html', 'utf8');
const js = readFileSync(root + 'app.js', 'utf8');
assert.match(html, /医学文献检索与写作/);
assert.match(html, /制作者：苏裕盛 教授/);
assert.match(js, /appassets\.androidplatform\.net/);
assert.match(js, /install-card/);
assert.match(js, /serviceWorker/);
console.log('web assets OK');
```

The Android branch in `app.js` must hide the install section and return before service-worker registration; the test asserts both the detection and controlled feature branch exist.

- [ ] **Step 2: Verify RED**

Run: `node scripts/verify-web-assets.mjs`  
Expected: FAIL with `missing web asset: index.html`.

- [ ] **Step 3: Copy and adapt the complete static site**

Copy the current `dist/` contents into `app/src/main/assets/www/`. Add a stable container ID `install-app-shell` to the install section. In `app.js`:

```js
const isAndroidContainer = location.hostname === 'appassets.androidplatform.net';
if (isAndroidContainer) {
  document.getElementById('install-app-shell')?.setAttribute('hidden', '');
  document.getElementById('network-status')?.setAttribute('hidden', '');
  document.getElementById('update-status')?.setAttribute('hidden', '');
}
```

Wrap PWA install handlers and service-worker registration in `if (!isAndroidContainer) { ... }`. Do not delete the web implementation; the same asset source remains auditable.

- [ ] **Step 4: Verify assets and assemble APK**

Run: `node scripts/verify-web-assets.mjs && ./gradlew :app:assembleDebug`  
Expected: `web assets OK` and `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit**

```bash
git add app/src/main/assets scripts/verify-web-assets.mjs
git commit -m "feat: bundle MedLit course for offline use"
```

### Task 5: 加入品牌图标与泄密防护

**Files:**
- Create: adaptive and legacy launcher resources under `app/src/main/res/mipmap-*`
- Create: `scripts/check-no-secrets.sh`
- Modify: `.gitignore`
- Modify: `app/src/main/AndroidManifest.xml`
- Modify: `app/src/main/res/values/strings.xml`

**Interfaces:**
- Produces: launcher branding and executable secret scan.

- [ ] **Step 1: Write failing security scan**

`scripts/check-no-secrets.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
if find . -type f \( -name '*.jks' -o -name '*.keystore' -o -name 'keystore.properties' \) -not -path './.git/*' | grep -q .; then
  echo 'Forbidden signing file found in repository' >&2
  exit 1
fi
if git grep -En 'ANDROID_(KEYSTORE|KEY)_PASSWORD=.+|BEGIN (RSA )?PRIVATE KEY' -- ':!docs/**'; then
  echo 'Potential secret found' >&2
  exit 1
fi
echo 'secret scan OK'
```

Temporarily add an empty `test.jks`, run the scan and confirm it fails, then remove it before implementation.

- [ ] **Step 2: Verify RED**

Run: `touch test.jks; bash scripts/check-no-secrets.sh; code=$?; rm test.jks; exit $code`  
Expected: FAIL with `Forbidden signing file found`.

- [ ] **Step 3: Add icons, labels and ignore rules**

Set `android:label="@string/app_name"`, launcher icons, theme, and `android:usesCleartextTraffic="false"`. Add to `.gitignore`:

```gitignore
*.jks
*.keystore
keystore.properties
local.properties
.signing/
```

- [ ] **Step 4: Verify GREEN and inspect APK**

Run: `bash scripts/check-no-secrets.sh && ./gradlew :app:assembleDebug && unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -E 'test\.jks|keystore\.properties' && exit 1 || true`  
Expected: `secret scan OK`; no signing files listed.

- [ ] **Step 5: Commit**

```bash
git add .gitignore app/src/main/res app/src/main/AndroidManifest.xml scripts/check-no-secrets.sh
git commit -m "feat: add MedLit branding and secret safeguards"
```

### Task 6: 建立持续验证工作流

**Files:**
- Create: `.github/workflows/android-verify.yml`

**Interfaces:**
- Consumes: Gradle and Node checks from Tasks 1–5.
- Produces: artifact `medlit-debug-apk`.

- [ ] **Step 1: Add a workflow contract test**

Extend `scripts/verify-project.mjs` to assert the workflow contains these literal commands:

```js
const workflow = readFileSync('.github/workflows/android-verify.yml', 'utf8');
for (const command of [
  'node scripts/verify-project.mjs',
  'node scripts/verify-web-assets.mjs',
  'bash scripts/check-no-secrets.sh',
  './gradlew testDebugUnitTest lintDebug assembleDebug'
]) assert.ok(workflow.includes(command), `missing CI command: ${command}`);
```

- [ ] **Step 2: Verify RED**

Run: `node scripts/verify-project.mjs`  
Expected: FAIL because `android-verify.yml` is missing.

- [ ] **Step 3: Create verification workflow**

Use pinned major official actions: `actions/checkout@v4`, `actions/setup-java@v4`, `android-actions/setup-android@v3`, `gradle/actions/setup-gradle@v4`, `actions/upload-artifact@v4`. Install platform 35 and build-tools 35.0.0, run all four commands, and upload `app/build/outputs/apk/debug/app-debug.apk`.

- [ ] **Step 4: Verify locally and on GitHub**

Run locally: `node scripts/verify-project.mjs`.  
Push and inspect the workflow run. Expected: all steps green and artifact `medlit-debug-apk` present.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/android-verify.yml scripts/verify-project.mjs
git commit -m "ci: verify Android app and upload debug APK"
```

### Task 7: 配置正式签名和 Release 工作流

**Files:**
- Modify: `app/build.gradle.kts`
- Create: `.github/workflows/android-release.yml`
- Create: `docs/SIGNING.md`
- Create: `docs/INSTALL.md`

**Interfaces:**
- Consumes: four GitHub Secrets named in the spec.
- Produces: signed `medlit-1.0.0-release.apk` and `.sha256`.

- [ ] **Step 1: Write failing release contract checks**

Extend `scripts/verify-project.mjs`:

```js
const release = readFileSync('.github/workflows/android-release.yml', 'utf8');
for (const secret of [
  'ANDROID_KEYSTORE_BASE64',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_PASSWORD'
]) assert.ok(release.includes('secrets.' + secret), `missing secret: ${secret}`);
for (const step of ['apksigner verify', 'sha256sum', 'assembleRelease']) {
  assert.ok(release.includes(step), `missing release step: ${step}`);
}
```

- [ ] **Step 2: Verify RED**

Run: `node scripts/verify-project.mjs`  
Expected: FAIL because `android-release.yml` is missing.

- [ ] **Step 3: Implement environment-only signing**

In `app/build.gradle.kts`, create a release signing config only when all four environment variables are nonblank. In the workflow, validate with shell parameter guards without printing values:

```bash
: "${ANDROID_KEYSTORE_BASE64:?Missing ANDROID_KEYSTORE_BASE64}"
: "${ANDROID_KEY_ALIAS:?Missing ANDROID_KEY_ALIAS}"
: "${ANDROID_KEYSTORE_PASSWORD:?Missing ANDROID_KEYSTORE_PASSWORD}"
: "${ANDROID_KEY_PASSWORD:?Missing ANDROID_KEY_PASSWORD}"
printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 --decode > "$RUNNER_TEMP/medlit-release.jks"
```

Build, locate one Release APK, verify with `apksigner verify --verbose`, rename it, calculate SHA-256, upload both files, and attach them to a GitHub Release only for `refs/tags/v*`.

- [ ] **Step 4: Generate the keystore outside the repository**

Create a private temporary directory with mode 700. Generate a random keystore password and key password without printing them to logs. Run `keytool -genkeypair` with alias `medlit-release`, RSA 4096, validity 10000 days, and distinguished name `CN=Su Yusheng, OU=MedLit, O=MedLit Education, C=CN`.

Store the keystore plus a UTF-8 recovery sheet in a password-protected deliverable outside the public repository. Save a second backup for the user. Never add either file to Git.

- [ ] **Step 5: User security gate — configure GitHub Secrets**

The user must enter the four values at:

`Repository → Settings → Secrets and variables → Actions`

Do not continue to a formal release until GitHub confirms the secret names exist. GitHub APIs used by this workflow cannot read back secret values; verification is by successful release build only.

- [ ] **Step 6: Verify release**

Trigger `workflow_dispatch`. Expected:

- workflow succeeds;
- `apksigner verify` passes;
- artifact contains APK and SHA-256;
- no secret value appears in logs.

Create tag `v1.0.0` only after the manual build passes, then confirm a GitHub Release contains the same two files.

- [ ] **Step 7: Commit**

```bash
git add app/build.gradle.kts .github/workflows/android-release.yml docs/SIGNING.md docs/INSTALL.md scripts/verify-project.mjs
git commit -m "ci: build and verify signed Android releases"
```

### Task 8: 最终验收与交付

**Files:**
- Modify: `README.md`
- Modify only if defects found: implementation/test files from earlier tasks

**Interfaces:**
- Consumes: signed APK and checksum from Task 7.
- Produces: version 1.0.0 release handoff.

- [ ] **Step 1: Write the release acceptance checklist**

README must state:

- app name and maker;
- supported Android version;
- offline capabilities;
- external-link behavior;
- APK download and SHA-256 verification;
- update rule using same signature;
- privacy statement: no analytics and no sensitive permissions.

Extend `scripts/verify-project.mjs` to assert those exact topics exist.

- [ ] **Step 2: Run complete automated verification**

```bash
node scripts/verify-project.mjs
node scripts/verify-web-assets.mjs
bash scripts/check-no-secrets.sh
./gradlew clean testDebugUnitTest lintDebug assembleDebug
```

Expected: every command exits 0.

- [ ] **Step 3: Verify Release APK contents and signature**

```bash
apksigner verify --verbose medlit-1.0.0-release.apk
sha256sum --check medlit-1.0.0-release.apk.sha256
unzip -l medlit-1.0.0-release.apk | grep -Ei '\.(jks|keystore)$|keystore\.properties' && exit 1 || true
```

Expected: signature and checksum pass; no secret files found.

- [ ] **Step 4: Device acceptance**

Install on Android 8.0 emulator and one current Android emulator/device. Enable flight mode before first launch and verify:

1. home, search, Zotero, reading, writing and ethics views open;
2. PubMed query generator produces and copies a query;
3. templates copy successfully;
4. install/update PWA UI is hidden;
5. external URL attempts leave the app and fail gracefully when offline;
6. back navigation works;
7. displayed app name and maker are correct.

- [ ] **Step 5: Publish and hand off**

Publish GitHub Release `v1.0.0`, provide the literal APK download location and SHA-256, and separately provide the signing backup. State that losing the signing backup prevents future in-place updates.

- [ ] **Step 6: Commit documentation**

```bash
git add README.md
git commit -m "docs: add Android installation and release guide"
```
