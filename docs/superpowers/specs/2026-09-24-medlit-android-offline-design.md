# 医学文献检索与写作 Android 离线版设计

日期：2026-09-24  
状态：待用户复核  
制作者：苏裕盛 教授

## 1. 目标

建立一个可在中国大陆 Android 设备上侧载安装、无需访问海外服务器即可运行的离线教学应用。应用完整承载现有“医学文献检索与写作”网站的课程内容与交互，并允许后续版本使用同一签名覆盖安装。

## 2. 用户与使用场景

主要用户为医学、护理及健康科学专业学生和教师。典型场景包括课堂投屏、学生个人手机学习、网络受限环境及临时断网环境。

成功标准：

- 首次启动和日常使用均不依赖网络。
- 首页、检索式生成器、Zotero 教学、精读、写作与 AI 学术规范均可离线使用。
- PubMed、知网、Zotero、EQUATOR 等外部链接在有网络时由系统浏览器打开。
- 正式 APK 可在 Android 8.0 及以上设备安装。
- 新版本使用同一签名时可覆盖安装，并保留应用身份。
- 不申请与教学功能无关的敏感权限。

## 3. 技术方案

采用单模块原生 Android 应用：

- 语言：Kotlin。
- UI 容器：Android WebView。
- 本地资源访问：AndroidX WebKit 的 WebViewAssetLoader。
- 应用包名：`com.suyusheng.medlit`。
- 最低系统版本：Android 8.0（API 26）。
- 编译与目标版本：API 35。
- Java 工具链：17。
- 构建系统：Gradle Wrapper。
- 网页入口：`https://appassets.androidplatform.net/assets/www/index.html#home`。

选择 WebViewAssetLoader 而不是 `file://`，以获得标准 HTTPS 来源、正确的相对资源解析和更严格的来源隔离。

## 4. 内容封装

现有静态网站文件复制到：

`app/src/main/assets/www/`

包含：

- HTML 页面；
- CSS 样式；
- JavaScript 交互；
- Zotero 教学模块；
- 应用图标及页面图片；
- Manifest 等网页资源。

Android 版本检测 `appassets.androidplatform.net`，并执行以下差异化处理：

- 隐藏网页版“安装到设备”卡片；
- 不注册网页 Service Worker；
- 不显示网页版本更新提示；
- 保留检索式生成、复制模板、清单和页面导航等本地功能。

Android APK 自身就是离线载体，因此不依赖 PWA 缓存。

## 5. 导航与外部链接

WebView 仅在应用内部加载：

- `appassets.androidplatform.net`；
- 页面内 Hash 导航；
- 内置 HTML、CSS、JavaScript、字体和图片。

所有其他 `http://` 或 `https://` 地址交给系统浏览器。应用不在内部模拟 PubMed、知网或 Zotero 登录，也不保存其账号信息。

Android 返回键行为：

1. WebView 有历史记录时返回上一页；
2. 无历史记录时退出应用。

## 6. 权限与安全

默认不申请以下权限：

- 相机；
- 麦克风；
- 定位；
- 通讯录；
- 短信；
- 文件读写；
- 后台运行。

应用不需要 `INTERNET` 权限来加载内置课程；外部链接由系统浏览器处理。禁止明文网络流量，不添加 JavaScript Interface，不接受任意文件选择或下载，不允许非内置来源留在 WebView 中。

发布仓库不得包含：

- 签名密钥；
- 密钥口令；
- GitHub Token；
- 任何个人账号凭据。

## 7. 签名与更新

正式版本使用专用 Android keystore。密钥由安全环境生成，必须长期保存；丢失后无法用新版覆盖安装旧版。

GitHub Secrets：

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`

Gradle 仅在发布构建时从环境变量读取签名资料，并将临时 keystore 写入构建机的临时目录。构建结束后不保留密钥文件。

版本规则：

- 初始版本：`versionName 1.0.0`、`versionCode 1`。
- 每次正式发布必须递增 `versionCode`。
- 使用相同包名及签名，允许覆盖安装。

## 8. GitHub Actions

建立两条工作流：

### 验证工作流

在推送和 Pull Request 时执行：

- 配置 Java 17；
- 安装固定版本 Android SDK；
- 运行 Kotlin/Gradle 单元测试；
- 运行 Android Lint；
- 构建 Debug APK；
- 上传 Debug APK 作为临时构建产物。

### 发布工作流

在创建 `v*` 标签或手动触发时执行：

- 验证四项签名 Secret 均存在；
- 解码临时 keystore；
- 构建签名 Release APK；
- 使用 `apksigner verify` 验证签名；
- 计算 SHA-256；
- 上传 APK 和校验文件为 GitHub Actions 产物；
- 标签发布时附加到 GitHub Release。

任何签名信息不得写入日志。

## 9. 测试策略

### JVM 单元测试

- 内部 appassets URL 留在 WebView；
- Hash 导航不触发外部浏览器；
- PubMed、知网、Zotero 等 URL 触发外部 Intent；
- 非 HTTP(S) 协议默认拒绝，仅允许明确需要的 `mailto:`。

### Android 仪器测试

- 冷启动显示首页；
- 断网时六个主要视图可以打开；
- 检索式生成器可用；
- 网页安装按钮在 APK 中隐藏；
- 系统返回键行为正确。

### 静态检查

- Android Lint 无阻断级错误；
- APK 不包含签名密钥或口令；
- AndroidManifest 不包含未批准的敏感权限；
- Release APK 签名验证成功。

## 10. 交付物

- 可安装的签名 Release APK；
- APK SHA-256 校验文件；
- 完整 Android 工程源码；
- GitHub Actions 自动构建配置；
- 单元测试与仪器测试；
- 应用图标；
- 中文安装、更新及签名密钥保管说明；
- 独立备份的正式签名资料，不进入公开仓库。

## 11. 非目标

第一版不包含：

- 应用商店上架；
- 用户注册和登录；
- 云端同步；
- 内置 Zotero 客户端；
- 文献数据库镜像；
- 推送通知；
- 后台自动更新；
- 收集用户数据或分析行为。

## 12. 风险与处理

- **外部数据库仍可能无法访问：** 应用只保证内置教学内容离线可用，不代理第三方网站。
- **签名密钥丢失：** 同时保存两份离线备份，并记录别名和口令。
- **网页功能在 WebView 中差异：** 通过 Android 仪器测试覆盖复制、导航和表单交互。
- **GitHub 在大陆访问不稳定：** 正式 APK 下载后可通过学校平台、微信群文件或 U 盘分发；GitHub 仅用于源码和自动构建。
- **公开仓库泄密：** 发布前执行敏感文件扫描，并将密钥扩展名加入 `.gitignore`。

## 13. 验收标准

以下条件全部满足才视为完成：

1. GitHub Actions 验证与发布工作流通过。
2. 生成签名 Release APK 及 SHA-256。
3. Android 8.0 及一台较新 Android 设备或模拟器完成安装和冷启动验证。
4. 飞行模式下核心课程与本地交互可用。
5. 外部链接不会在 WebView 内加载。
6. Manifest 无未批准敏感权限。
7. APK 内不包含签名密钥、密码或 Token。
8. 页面和应用信息显示“医学文献检索与写作”及“制作者：苏裕盛 教授”。
