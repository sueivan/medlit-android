# 医学文献检索与写作（Android 离线版）

制作者：苏裕盛 教授

这是“医学文献检索与写作”课程的原生 Android 离线容器。应用把学习概览、PubMed 检索式练习、Zotero 文献管理、循证精读、论文写作与 AI 学术诚信内容完整打包进 APK，启动和浏览核心课程不依赖境外服务器。

## 系统与功能

- 支持 Android 8.0（API 26）及以上版本。
- 课程页面、检索式生成器、Zotero 教学、阅读与写作模板可离线使用。
- PubMed、知网、MeSH Browser、EQUATOR 等外部链接交给系统浏览器打开，不会留在应用内的 WebView。
- 应用不含分析统计、广告、登录、推送或云同步。
- 应用不申请敏感权限，包括相机、麦克风、定位、通讯录、短信及存储权限。

## 下载与安装

正式版发布后，请从 [GitHub Releases](https://github.com/sueivan/medlit-android/releases) 下载：

- `medlit-1.0.0-release.apk`
- `medlit-1.0.0-release.apk.sha256`

安装前建议核对 SHA-256：

```bash
sha256sum --check medlit-1.0.0-release.apk.sha256
```

Android 可能要求临时允许浏览器或文件管理器“安装未知应用”。安装结束后即可关闭该权限。详细步骤见 [docs/INSTALL.md](docs/INSTALL.md)。

## 更新规则

新版 APK 必须使用同一签名，Android 才允许直接覆盖安装。正式签名密钥不得提交到本仓库；备份和 GitHub Secrets 配置见 [docs/SIGNING.md](docs/SIGNING.md)。

## 开发验证

```bash
node scripts/verify-project.mjs
node scripts/verify-web-assets.mjs
bash scripts/check-no-secrets.sh
./gradlew clean testDebugUnitTest lintDebug assembleDebug
```

GitHub Actions 会上传 `medlit-debug-apk` 供测试。正式发布工作流会验证 APK 签名、生成 SHA-256，并在 `v*` 标签上建立 GitHub Release。
