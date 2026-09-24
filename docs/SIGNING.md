# Android 正式签名

正式 APK 使用固定的 `medlit-release` 密钥签名。后续版本必须继续使用同一密钥，否则 Android 无法覆盖更新。

## GitHub Actions Secrets

在仓库的 `Settings → Secrets and variables → Actions` 中建立：

- `ANDROID_KEYSTORE_BASE64`：JKS 文件的单行 Base64 内容。
- `ANDROID_KEY_ALIAS`：默认值为 `medlit-release`。
- `ANDROID_KEYSTORE_PASSWORD`：JKS 密码。
- `ANDROID_KEY_PASSWORD`：私钥密码。

Linux/macOS 可用以下命令取得单行内容：

```bash
base64 -w0 medlit-release.jks
```

macOS 若不支持 `-w0`，可使用：

```bash
base64 < medlit-release.jks | tr -d '\n'
```

不要把 JKS、密码、Base64 内容或 `keystore.properties` 提交到仓库。至少保存两份加密备份，并分别存放。遗失签名密钥后，旧版用户将无法原位升级。

配置完成后，在 GitHub 的 `Actions → Android Release → Run workflow` 先执行手动构建。确认签名与校验步骤成功后，再建立 `v1.0.0` 标签发布正式版本。
