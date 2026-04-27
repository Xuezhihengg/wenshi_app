# iPhone 真机运行

## 开发版安装

开发版 App 不内置 JS bundle，手机启动时必须连接 Mac 上正在运行的 Metro。

1. 确认 Mac 和 iPhone 在同一 Wi-Fi。
2. 确认 `app.json` 中 `plugins[1][1].host` 等于 Mac 当前 IP：

```sh
ipconfig getifaddr en0
```

3. 如果 IP 改了，更新 `app.json` 后重新生成 iOS 工程：

```sh
npm run prebuild:ios
```

4. 启动 Metro：

```sh
npm run start:ios-device
```

5. 另开一个终端安装到 iPhone：

```sh
npm run ios:device
```

如果看到 `No script URL provided`，优先检查：

- Metro 是否正在以 `8083` 端口运行。
- iPhone 是否能访问 Mac 的 `http://<Mac IP>:8083/status`。
- Mac 防火墙是否允许 Node/Terminal 入站连接。
- `app.json` 的 host 是否是当前 Wi-Fi IP，切换网络后需要更新并重新 `prebuild`。

## 离线可打开的安装包

如果希望 App 在没有 Metro 的情况下也能打开，需要做 Release 构建或 EAS 构建。Release 包会内置 JS bundle，不依赖 `8083`。

