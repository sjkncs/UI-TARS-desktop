@echo off
chcp 65001 >nul
echo ========================================
echo UI-TARS Desktop 安全启动脚本
echo ========================================
echo.

REM 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 Node.js
    echo 请先安装 Node.js ^>= 20.x
    pause
    exit /b 1
)

echo ✅ Node.js 版本:
node --version
echo.

REM 检查 pnpm
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  未找到 pnpm，正在安装...
    npm install -g pnpm
    if %errorlevel% neq 0 (
        echo ❌ pnpm 安装失败
        pause
        exit /b 1
    )
)

echo ✅ pnpm 版本:
pnpm --version
echo.

REM 检查安全配置
if not exist "security.config.json" (
    echo ❌ 错误: 未找到 security.config.json
    echo 请确保安全配置文件存在
    pause
    exit /b 1
)

echo ✅ 安全配置文件: 已找到
echo.

REM 检查环境变量文件
if not exist ".env.local" (
    echo ⚠️  警告: 未找到 .env.local
    echo 请根据 .env.example 创建配置文件
    pause
)

REM 运行安全审计
echo 🔍 运行安全审计...
node security-audit.js
echo.

REM 询问是否继续
set /p continue="是否继续启动应用? (Y/N): "
if /i not "%continue%"=="Y" (
    echo 已取消启动
    pause
    exit /b 0
)

echo.
echo 🚀 正在启动 UI-TARS Desktop...
echo 📍 访问地址: http://127.0.0.1:18789
echo ⚠️  请勿将应用暴露到公网
echo.

REM 启动应用
pnpm run dev:ui-tars

pause
