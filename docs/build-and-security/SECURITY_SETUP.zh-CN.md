> **Fork Document**: This document was created as part of the community fork [sjkncs/UI-TARS-desktop](https://github.com/sjkncs/UI-TARS-desktop).
> Based on the original [bytedance/UI-TARS-desktop](https://github.com/bytedance/UI-TARS-desktop) project. All original code and IP belong to ByteDance.

# UI-TARS Desktop 安全配置指南

**创建日期**: 2026-02-11  
**版本**: 1.0.0

根据工信部网络安全风险通知，本文档提供 UI-TARS Desktop 的安全配置和使用指南。

---

## 📋 目录

- [快速开始](#快速开始)
- [安全规则](#安全规则)
- [配置说明](#配置说明)
- [使用指南](#使用指南)
- [安全检查](#安全检查)
- [故障排除](#故障排除)

---

## 🚀 快速开始

### 1. 安装依赖

确保已安装 Node.js >= 20.x 和 pnpm:

```bash
# 检查 Node.js 版本
node --version

# 安装 pnpm (如果未安装)
npm install -g pnpm

# 安装项目依赖
cd E:\2026.2.github\UI-TARS-desktop-main\UI-TARS-desktop-main
pnpm install
```

### 2. 配置环境变量

复制并编辑 `.env.local` 文件:

```bash
# 已为您创建 .env.local 文件，请根据实际情况修改以下配置:

# VLM 配置
VLM_PROVIDER=huggingface  # 或 volcengine
VLM_BASE_URL=http://localhost:8000/v1
VLM_API_KEY=your_api_key_here
VLM_MODEL_NAME=UI-TARS-1.5-7B

# 网关配置 - 仅本地访问
GATEWAY_HOST=127.0.0.1
GATEWAY_PORT=18789
```

### 3. 配置安全策略

安全配置文件 `security.config.json` 已创建，包含以下关键设置:

- ✅ 仅本地访问 (127.0.0.1:18789)
- ✅ 工作目录限制
- ✅ 危险命令拦截
- ✅ 审计日志记录

### 4. 启动应用

```bash
# 开发模式
pnpm run dev:ui-tars

# 或构建生产版本
pnpm run build
```

---

## 🔒 安全规则

### ⛔ 严格禁止的操作

以下操作将被**自动拦截**，无法执行:

#### 1. 危险系统命令

```bash
# ❌ 禁止执行
rm -rf /
del /f /s /q C:\
format
diskpart
reg delete
```

#### 2. 系统关键目录

```
❌ C:\Windows
❌ C:\Program Files
❌ C:\Program Files (x86)
❌ /System
❌ /Library
❌ /usr/bin
❌ /usr/lib
❌ /etc
```

#### 3. 注册表修改

```
❌ HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion
❌ HKLM\SYSTEM
❌ HKCU\Software\Microsoft\Windows\CurrentVersion\Run
```

#### 4. 恶意网络行为

```
❌ 端口扫描
❌ 网络攻击
❌ 未授权的外部连接
```

### ✅ 允许的操作范围

只能在以下目录内进行操作:

```
✅ C:\Users\Administrator\.openclaw\workspace
✅ E:\2026.2.github
```

### ⚠️ 需要授权的操作

以下操作需要**用户明确授权**:

- 删除文件
- 修改文件
- 终止进程
- 控制系统服务
- 修改注册表
- 外部网络请求
- 绑定网络端口

---

## ⚙️ 配置说明

### security.config.json

```json
{
  "security": {
    "enabled": true,        // 启用安全功能
    "mode": "strict"        // 严格模式
  },
  "gateway": {
    "binding": "loopback",  // 仅本地访问
    "host": "127.0.0.1",
    "port": 18789
  },
  "workspace": {
    "allowed": [            // 允许的工作目录
      "C:\\Users\\Administrator\\.openclaw\\workspace",
      "E:\\2026.2.github"
    ]
  },
  "audit": {
    "enabled": true,        // 启用审计日志
    "logPath": "C:\\Users\\Administrator\\.openclaw\\logs\\security-audit.log"
  }
}
```

### .env.local

```bash
# 安全配置
SECURITY_ENABLED=true
SECURITY_MODE=strict
AUDIT_ENABLED=true

# 网关配置 - 仅本地访问
GATEWAY_HOST=127.0.0.1
GATEWAY_PORT=18789
GATEWAY_BINDING=loopback
```

---

## 📖 使用指南

### 基本使用流程

1. **启动应用**
   ```bash
   pnpm run dev:ui-tars
   ```

2. **访问界面**
   ```
   http://127.0.0.1:18789
   ```

3. **配置 VLM**
   - 打开设置页面
   - 选择 VLM Provider (Hugging Face 或 VolcEngine)
   - 输入 API Key 和模型信息

4. **开始使用**
   - 输入自然语言指令
   - 系统会自动验证操作安全性
   - 危险操作会被拦截并提示

### 安全使用示例

#### ✅ 安全操作示例

```
指令: "在我的工作目录创建一个新文件夹"
结果: ✅ 允许 (在允许的工作目录内)

指令: "打开浏览器访问 GitHub"
结果: ✅ 允许 (正常浏览器操作)

指令: "帮我整理桌面文件"
结果: ✅ 允许 (用户目录操作)
```

#### ❌ 被拦截的操作示例

```
指令: "删除 C:\Windows 目录"
结果: ❌ 拦截 (系统关键目录)

指令: "修改系统注册表"
结果: ❌ 拦截 (危险系统操作)

指令: "扫描局域网端口"
结果: ❌ 拦截 (恶意网络行为)
```

### 飞书机器人安全使用

如果启用飞书机器人功能:

1. **仅添加信任的用户**
   ```json
   "feishu": {
     "enabled": true,
     "allowedUsers": ["user_id_1", "user_id_2"]
   }
   ```

2. **群组中必须 @机器人**
   ```json
   "requireMention": true
   ```

3. **不要在公开群组使用**
   ```json
   "blockedInPublicGroups": true
   ```

---

## 🔍 安全检查

### 每周检查清单

```bash
# 1. 检查审计日志
type C:\Users\Administrator\.openclaw\logs\security-audit.log

# 2. 查看最近的操作记录
# 检查是否有异常操作尝试

# 3. 验证安全配置
node -e "const sv = require('./security-validator'); sv.securityValidator.performSecurityAudit().then(console.log)"
```

### 每月维护任务

1. **更新到最新版本**
   ```bash
   cd E:\2026.2.github\UI-TARS-desktop-main\UI-TARS-desktop-main
   git pull
   pnpm install
   ```

2. **运行深度安全审计**
   ```bash
   # 使用安全验证器进行深度检查
   node security-audit.js
   ```

3. **清理旧日志** (可选)
   ```bash
   # 备份并清理 30 天前的日志
   ```

### 安全审计命令

创建 `security-audit.js` 文件用于安全检查:

```javascript
const { securityValidator } = require('./security-validator');

async function runAudit() {
  console.log('🔍 开始安全审计...\n');
  
  const report = await securityValidator.performSecurityAudit();
  
  console.log('审计结果:');
  console.log(`状态: ${report.passed ? '✅ 通过' : '❌ 发现问题'}\n`);
  
  if (report.issues.length > 0) {
    console.log('⚠️  发现的问题:');
    report.issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
    console.log('');
  }
  
  if (report.recommendations.length > 0) {
    console.log('💡 建议:');
    report.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
    console.log('');
  }
  
  console.log(securityValidator.getSecurityReport());
}

runAudit().catch(console.error);
```

---

## 🛠️ 故障排除

### 常见问题

#### 1. 端口 18789 被占用

```bash
# Windows
netstat -ano | findstr :18789
taskkill /PID <进程ID> /F

# 或修改 .env.local 中的端口
GATEWAY_PORT=18790
```

#### 2. 权限不足

```bash
# 确保工作目录存在且有写入权限
mkdir C:\Users\Administrator\.openclaw\workspace
mkdir C:\Users\Administrator\.openclaw\logs
```

#### 3. 审计日志无法写入

```bash
# 检查日志目录权限
icacls C:\Users\Administrator\.openclaw\logs

# 手动创建目录
mkdir C:\Users\Administrator\.openclaw\logs
```

#### 4. 安全配置未生效

```bash
# 检查配置文件是否存在
dir security.config.json

# 验证 JSON 格式
node -e "console.log(JSON.parse(require('fs').readFileSync('security.config.json', 'utf-8')))"
```

### 日志查看

```bash
# 查看最近 50 条审计日志
Get-Content C:\Users\Administrator\.openclaw\logs\security-audit.log -Tail 50

# 搜索被拦截的操作
Select-String -Path C:\Users\Administrator\.openclaw\logs\security-audit.log -Pattern "blocked"
```

---

## 📞 支持与反馈

### 安全问题报告

如果发现安全漏洞，请通过以下方式报告:

1. **不要**在公开 issue 中讨论安全问题
2. 发送邮件至项目维护者
3. 提供详细的复现步骤

### 获取帮助

- 📖 [官方文档](https://github.com/bytedance/UI-TARS-desktop)
- 💬 [Discord 社区](https://discord.gg/pTXwYVjfcs)
- 🐛 [GitHub Issues](https://github.com/bytedance/UI-TARS-desktop/issues)

---

## 📝 更新日志

### v1.0.0 (2026-02-11)

- ✅ 初始安全配置
- ✅ 命令验证器
- ✅ 路径安全检查
- ✅ 审计日志系统
- ✅ 用户授权机制

---

## ⚖️ 免责声明

本安全配置旨在提供基本的安全保护，但不能保证 100% 的安全性。用户应:

1. 定期更新软件到最新版本
2. 遵守所有安全使用规则
3. 不要禁用安全功能
4. 定期检查审计日志
5. 只在受信任的环境中使用

**重要**: 请勿将此应用暴露到公网，仅在本地使用。

---

## 📄 许可证

本项目基于 Apache License 2.0 许可证。

---

**最后更新**: 2026-02-11  
**维护者**: UI-TARS Desktop Team
