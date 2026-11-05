# Contributing

感谢你愿意参与问事客户端。

## 开发环境

- Node.js 20+
- Xcode（iOS）或 Android Studio（Android）
- 可选：正在运行的 [wenshi-server](https://github.com/Xuezhihengg/wenshi_server)

```bash
cp .env.example .env
npm install
npm run start
```

## 提交前检查

```bash
npm run typecheck
```

涉及 UI 的改动请在 iOS 或 Android 上手动验证，并在 PR 中附截图或录屏。

## Pull Request

- 一个 PR 只解决一个问题。
- 说明动机、实现方式与验证步骤。
- 新增环境变量时同步更新 `.env.example` 与 README。
- 不要提交 `.env`、keystore、证书、Token、用户数据或生产日志。
- 不要提交 `ios/`、`android/` 生成目录（由 Expo prebuild 生成）。

## 安全问题

请按 [SECURITY.md](SECURITY.md) 私下报告，不要在公开 Issue 中披露。
