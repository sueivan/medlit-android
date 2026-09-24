# 安装医学文献检索与写作

支持 Android 8.0（API 26）及以上版本。

1. 从 GitHub Release 下载 `medlit-1.0.0-release.apk` 和同名 `.sha256` 文件。
2. 核对 SHA-256 后，在 Android 设置中临时允许浏览器或文件管理器“安装未知应用”。
3. 点选 APK 安装；完成后关闭该项临时权限。

在 Linux/macOS 上核对校验值：

```bash
sha256sum --check medlit-1.0.0-release.apk.sha256
```

应用的课程页面、检索式练习、Zotero 教学、阅读与写作模板均内置在 APK 中，可以离线打开。PubMed、知网、MeSH 等外部链接会交给系统浏览器，离线时可能无法访问。

后续版本只要使用同一正式签名，即可直接覆盖安装并保留 Android 的应用身份。
