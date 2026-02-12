> **Fork Document**: This document was created as part of the community fork [sjkncs/UI-TARS-desktop](https://github.com/sjkncs/UI-TARS-desktop).
> Based on the original [bytedance/UI-TARS-desktop](https://github.com/bytedance/UI-TARS-desktop) project. All original code and IP belong to ByteDance.

# UI-TARS Desktop 打包指南

**版本**: 1.0.0  
**日期**: 2026-02-11

本指南介绍如何将 UI-TARS Desktop 打包为 Windows 桌面应用程序。

---

## 📦 支持的打包格式

### Windows
- ✅ **Squirrel 安装包** (.exe) - 推荐
- ✅ **便携版** (.zip)
- ✅ **NSIS 安装包** (.exe)

### macOS (如需要)
- ✅ **DMG 镜像** (.dmg)
- ✅ **ZIP 压缩包** (.zip)

### Linux (如需要)
- ✅ **AppImage** (.AppImage)
- ✅ **Snap** (.snap)
- ✅ **Deb** (.deb)

---

## 🚀 快速打包 Windows 应用

### 方式一：使用打包脚本 (推荐)

我已为您创建了自动化打包脚本：

```cmd
build-windows.bat
```

此脚本会自动：
1. 清理旧的构建文件
2. 构建生产版本
3. 打包为 Windows 安装程序
4. 生成安装包到 `out` 目录

### 方式二：手动打包

```cmd
# 1. 进入项目目录
cd E:\2026.2.github\UI-TARS-desktop-main\UI-TARS-desktop-main

# 2. 清理旧文件
pnpm run clean

# 3. 构建生产版本
cd apps\ui-tars
pnpm run build:dist

# 4. 打包应用
pnpm run make

# 5. 查看输出
# 安装包位于: apps\ui-tars\out\make\squirrel.windows\x64\
```

---

## 📋 详细步骤

### 1. 准备环境

确保已安装所有依赖：

```cmd
# 检查 Node.js 版本 (需要 >= 20.x)
node --version

# 检查 pnpm
pnpm --version

# 安装依赖 (如果还没安装)
pnpm install
```

### 2. 配置打包选项

#### 修改应用信息

编辑 `apps/ui-tars/package.json`:

```json
{
  "name": "ui-tars-desktop",
  "version": "0.2.4",
  "description": "您的应用描述",
  "author": "您的名字"
}
```

#### 修改图标

替换以下文件：
- `apps/ui-tars/resources/icon.ico` - Windows 图标
- `apps/ui-tars/resources/icon.png` - 通用图标

### 3. 构建应用

```cmd
cd apps\ui-tars

# 完整构建（包含类型检查）
pnpm run build

# 或仅构建（跳过类型检查，更快）
pnpm run build:dist
```

构建输出：
- `dist/main/` - 主进程代码
- `dist/preload/` - 预加载脚本
- `dist/renderer/` - 渲染进程代码

### 4. 打包应用

```cmd
# 使用 Electron Forge 打包
pnpm run make
```

打包过程：
1. 📦 打包 Electron 应用
2. 🔧 创建安装程序
3. ✅ 生成可分发文件

### 5. 查看输出

打包完成后，文件位于：

```
apps/ui-tars/out/
├── make/
│   └── squirrel.windows/
│       └── x64/
│           ├── UiTars-0.2.4 Setup.exe    # 安装程序
│           └── RELEASES                   # 更新清单
└── UI TARS-win32-x64/                     # 未打包的应用
```

---

## 🎯 不同打包方式

### Squirrel 安装包 (默认)

**优点**:
- 自动更新支持
- 静默安装
- 用户友好

**配置**: `apps/ui-tars/forge.config.ts`

```typescript
new MakerSquirrel({
  name: 'UiTars',
  setupIcon: 'resources/icon.ico',
})
```

### 便携版 (ZIP)

添加到 `forge.config.ts`:

```typescript
makers: [
  new MakerZIP({}, ['win32']),
  // ... 其他 makers
]
```

然后运行：
```cmd
pnpm run make
```

### NSIS 安装包

需要安装 NSIS 和额外配置。使用 `electron-builder.yml` 配置。

---

## ⚙️ 高级配置

### 自定义打包选项

编辑 `apps/ui-tars/forge.config.ts`:

```typescript
const config: ForgeConfig = {
  packagerConfig: {
    name: 'UI TARS',              // 应用名称
    icon: 'resources/icon',        // 图标路径
    executableName: 'UI-TARS',     // 可执行文件名
    asar: true,                    // 启用 ASAR 打包
  },
  // ...
}
```

### 包含额外资源

```typescript
packagerConfig: {
  extraResource: [
    './resources/app-update.yml',
    './security.config.json',      // 包含安全配置
    './README.md',
  ],
}
```

### 排除不必要的文件

```typescript
packagerConfig: {
  ignore: [
    /^\/\.git/,
    /^\/node_modules\/(?!required-module)/,
    /^\/src/,
  ],
}
```

---

## 🔒 安全打包配置

### 包含安全文件

确保打包时包含安全配置：

```typescript
// 在 forge.config.ts 中
extraResource: [
  './security.config.json',
  './.env.local',  // 注意：不要包含敏感信息！
]
```

### 环境变量处理

**重要**: 不要在打包文件中包含敏感的 API Key！

创建 `.env.production`:

```bash
# 生产环境配置（不包含敏感信息）
SECURITY_ENABLED=true
SECURITY_MODE=strict
GATEWAY_HOST=127.0.0.1
GATEWAY_PORT=18789

# API Key 应该由用户在首次运行时配置
VLM_PROVIDER=
VLM_BASE_URL=
VLM_API_KEY=
```

---

## 📝 打包检查清单

打包前检查：

- [ ] 已运行 `pnpm install` 安装所有依赖
- [ ] 已更新 `package.json` 中的版本号
- [ ] 已更新应用图标
- [ ] 已测试开发版本运行正常
- [ ] 已移除敏感信息（API Key 等）
- [ ] 已包含必要的配置文件
- [ ] 已运行 `pnpm run clean` 清理旧文件

打包后检查：

- [ ] 安装包可以正常安装
- [ ] 应用可以正常启动
- [ ] 安全配置正常工作
- [ ] 所有功能正常运行
- [ ] 卸载程序正常工作

---

## 🐛 常见问题

### 1. 打包失败：缺少依赖

```cmd
# 重新安装依赖
pnpm install --force

# 清理并重新构建
pnpm run clean
pnpm run build
```

### 2. 打包文件过大

优化方法：
- 移除开发依赖
- 使用 ASAR 压缩
- 排除不必要的 node_modules

### 3. 图标未显示

确保图标文件格式正确：
- Windows: `.ico` 格式，256x256 或 512x512
- 放置在 `apps/ui-tars/resources/` 目录

### 4. 应用无法启动

检查：
- 是否包含所有必要的资源文件
- 环境变量配置是否正确
- 日志文件中的错误信息

---

## 🌐 关于 Chrome 插件

### 当前架构说明

UI-TARS Desktop 是基于 **Electron** 的桌面应用，架构如下：

```
┌─────────────────────────────────────┐
│     Electron 桌面应用                │
├─────────────────────────────────────┤
│  主进程 (Node.js)                    │
│  - 系统控制                          │
│  - 文件操作                          │
│  - 安全验证                          │
├─────────────────────────────────────┤
│  渲染进程 (Chromium)                 │
│  - React UI                         │
│  - 用户界面                          │
└─────────────────────────────────────┘
```

### Chrome 插件的限制

Chrome 插件**无法**实现以下功能：
- ❌ 系统级控制（鼠标、键盘）
- ❌ 访问本地文件系统
- ❌ 执行系统命令
- ❌ 截取整个屏幕

### 可行的替代方案

#### 方案 1: Web 版本（有限功能）

可以将 UI 部分提取为 Web 应用：

```
┌─────────────────────┐      ┌──────────────────┐
│   Chrome 插件/Web    │ ←──→ │  后端服务器       │
│   (用户界面)         │      │  (实际控制)       │
└─────────────────────┘      └──────────────────┘
```

**优点**:
- 跨平台访问
- 无需安装

**缺点**:
- 需要运行后端服务
- 功能受限

#### 方案 2: 浏览器自动化插件

仅用于**浏览器内**操作：

```javascript
// Chrome 插件可以做的
- 操作网页 DOM
- 自动填表
- 页面导航
- 数据提取

// Chrome 插件不能做的
- 控制桌面应用
- 系统级操作
- 访问其他应用
```

#### 方案 3: 混合方案

```
┌──────────────┐      ┌─────────────────┐
│ Chrome 插件   │ ←──→ │ 本地桌面应用     │
│ (浏览器控制)  │      │ (系统控制)       │
└──────────────┘      └─────────────────┘
```

通过 Native Messaging 协议通信。

### 推荐方案

**对于 UI-TARS Desktop，推荐使用 Electron 桌面应用**，因为：

1. ✅ 完整的系统控制能力
2. ✅ 更好的安全性
3. ✅ 离线运行
4. ✅ 原生性能
5. ✅ 已有完整实现

---

## 📦 分发打包文件

### 本地分发

将打包文件复制到：
```
E:\2026.2.github\UI-TARS-desktop-main\releases\
├── UI-TARS-0.2.4-Setup.exe
├── README.txt
└── security.config.json
```

### 安装说明

创建 `INSTALL.txt`:

```
UI-TARS Desktop 安装说明
========================

1. 运行 UI-TARS-0.2.4-Setup.exe
2. 按照安装向导完成安装
3. 首次运行时配置 VLM API Key
4. 查看 SECURITY_SETUP.zh-CN.md 了解安全使用规则

系统要求:
- Windows 10/11
- 4GB RAM
- 500MB 磁盘空间

安全提醒:
- 仅本地使用，不要暴露到公网
- 遵守安全使用规则
- 定期检查审计日志
```

---

## 🎉 总结

### Windows 桌面应用打包

**推荐方式**:
```cmd
# 使用自动化脚本
build-windows.bat
```

**输出位置**:
```
apps/ui-tars/out/make/squirrel.windows/x64/UiTars-0.2.4 Setup.exe
```

### Chrome 插件

**不推荐**，因为功能限制太多。如需浏览器功能，建议：
1. 使用现有的 Browser Operator 功能
2. 或开发独立的浏览器自动化插件（仅限网页操作）

---

**需要帮助？** 查看 [故障排除](#-常见问题) 或提交 Issue。
