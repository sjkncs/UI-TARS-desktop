> **Fork Document**: This document was created as part of the community fork [sjkncs/UI-TARS-desktop](https://github.com/sjkncs/UI-TARS-desktop).
> Based on the original [bytedance/UI-TARS-desktop](https://github.com/bytedance/UI-TARS-desktop) project. All original code and IP belong to ByteDance.

# 🔒 安全配置完成

本项目已根据您的要求配置了安全规则和本地运行环境。

## 📁 已创建的文件

### 1. 核心配置文件
- ✅ `security.config.json` - 安全策略配置
- ✅ `.env.local` - 本地环境变量配置
- ✅ `security-validator.ts` - 安全验证器模块
- ✅ `security-audit.js` - 安全审计脚本
- ✅ `start-secure.bat` - 安全启动脚本

### 2. 文档文件
- ✅ `SECURITY_SETUP.zh-CN.md` - 完整安全配置指南
- ✅ `README.SECURITY.md` - 本文件

## 🚀 快速开始

### Windows 系统

1. **使用安全启动脚本** (推荐)
   ```cmd
   start-secure.bat
   ```
   此脚本会自动:
   - 检查 Node.js 和 pnpm
   - 验证安全配置
   - 运行安全审计
   - 启动应用

2. **手动启动**
   ```cmd
   # 安装依赖
   pnpm install
   
   # 运行安全审计
   node security-audit.js
   
   # 启动应用
   pnpm run dev:ui-tars
   ```

### 访问应用

启动后访问: **http://127.0.0.1:18789**

⚠️ **重要**: 仅本地访问，不要暴露到公网！

## 🔒 安全特性

### 已启用的保护

✅ **网关限制**: 仅绑定到 127.0.0.1:18789 (本地访问)  
✅ **路径限制**: 只能操作指定的工作目录  
✅ **命令拦截**: 自动拦截危险系统命令  
✅ **审计日志**: 记录所有操作到日志文件  
✅ **授权机制**: 危险操作需要用户明确授权  

### 禁止的操作

❌ 删除系统关键目录 (C:\Windows, C:\Program Files 等)  
❌ 危险命令 (rm -rf /, format, diskpart 等)  
❌ 修改系统注册表关键项  
❌ 网络攻击和端口扫描  

### 允许的工作目录

✅ `C:\Users\Administrator\.openclaw\workspace`  
✅ `E:\2026.2.github`  

## ⚙️ 配置说明

### 修改 VLM 配置

编辑 `.env.local` 文件:

```bash
# 选择提供商: huggingface 或 volcengine
VLM_PROVIDER=huggingface

# 配置 API 信息
VLM_BASE_URL=http://your-endpoint/v1
VLM_API_KEY=your_api_key
VLM_MODEL_NAME=UI-TARS-1.5-7B
```

### 修改安全策略

编辑 `security.config.json` 文件，可以:
- 添加/删除允许的工作目录
- 修改危险命令规则
- 调整授权要求
- 配置审计日志

## 🔍 安全检查

### 运行安全审计

```cmd
node security-audit.js
```

审计内容包括:
- ✅ 安全功能状态
- ✅ 网关配置检查
- ✅ 工作目录验证
- ✅ 审计日志分析
- ✅ 授权配置检查

### 查看审计日志

```cmd
# 查看最近的日志
type C:\Users\Administrator\.openclaw\logs\security-audit.log

# 搜索被拦截的操作
findstr "blocked" C:\Users\Administrator\.openclaw\logs\security-audit.log
```

## 📋 维护计划

### 每周检查
- [ ] 查看审计日志，检查异常操作
- [ ] 验证安全配置是否生效

### 每月维护
- [ ] 更新到最新版本
- [ ] 运行深度安全审计
- [ ] 清理旧日志文件

## 📖 完整文档

详细的配置和使用说明，请查看:
- **[SECURITY_SETUP.zh-CN.md](./SECURITY_SETUP.zh-CN.md)** - 完整安全配置指南

## ⚠️ 重要提醒

1. **不要禁用安全功能** - 保持 `SECURITY_ENABLED=true`
2. **不要暴露到公网** - 仅在本地使用
3. **定期检查日志** - 及时发现异常操作
4. **保护 API Key** - 不要泄露到代码仓库
5. **遵守安全规则** - 不要尝试绕过安全限制

## 🛠️ 故障排除

### 端口被占用

```cmd
# 查找占用端口的进程
netstat -ano | findstr :18789

# 修改端口 (编辑 .env.local)
GATEWAY_PORT=18790
```

### 权限不足

```cmd
# 创建必要的目录
mkdir C:\Users\Administrator\.openclaw\workspace
mkdir C:\Users\Administrator\.openclaw\logs
```

### 配置文件错误

```cmd
# 验证 JSON 格式
node -e "console.log(JSON.parse(require('fs').readFileSync('security.config.json', 'utf-8')))"
```

## 📞 获取帮助

- 📖 [官方文档](https://github.com/bytedance/UI-TARS-desktop)
- 📄 [快速开始](./docs/quick-start.md)
- 🔒 [安全配置指南](./SECURITY_SETUP.zh-CN.md)

---

**配置完成日期**: 2026-02-11  
**安全配置版本**: 1.0.0  
**遵守**: 工信部网络安全风险通知要求
