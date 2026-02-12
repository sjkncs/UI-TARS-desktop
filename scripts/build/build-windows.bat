@echo off
chcp 65001 >nul
echo ========================================
echo UI-TARS Desktop Windows 打包脚本
echo ========================================
echo.

REM 检查环境
echo [1/6] 检查环境...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 Node.js
    pause
    exit /b 1
)

where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 pnpm
    pause
    exit /b 1
)

echo ✅ Node.js 版本: 
node --version
echo ✅ pnpm 版本:
pnpm --version
echo.

REM 询问是否继续
set /p continue="是否开始打包? (Y/N): "
if /i not "%continue%"=="Y" (
    echo 已取消打包
    pause
    exit /b 0
)
echo.

REM 清理旧文件
echo [2/6] 清理旧的构建文件...
cd apps\ui-tars
call pnpm run clean
if %errorlevel% neq 0 (
    echo ⚠️  清理失败，继续...
)
echo.

REM 构建依赖包
echo [3/6] 构建依赖包...
cd ..\..
call pnpm run build:deps
if %errorlevel% neq 0 (
    echo ❌ 依赖包构建失败
    pause
    exit /b 1
)
echo.

REM 构建应用
echo [4/6] 构建应用 (这可能需要几分钟)...
cd apps\ui-tars
call pnpm run build:dist
if %errorlevel% neq 0 (
    echo ❌ 应用构建失败
    pause
    exit /b 1
)
echo ✅ 应用构建成功
echo.

REM 打包应用
echo [5/6] 打包应用 (这可能需要几分钟)...
call pnpm run make
if %errorlevel% neq 0 (
    echo ❌ 打包失败
    pause
    exit /b 1
)
echo ✅ 打包成功
echo.

REM 显示结果
echo [6/6] 打包完成！
echo.
echo ========================================
echo 📦 打包文件位置:
echo ========================================
echo.

if exist "out\make\squirrel.windows\x64" (
    echo ✅ Squirrel 安装包:
    dir /b "out\make\squirrel.windows\x64\*.exe"
    echo.
    echo 完整路径:
    cd
    echo \out\make\squirrel.windows\x64\
    echo.
)

if exist "out\UI TARS-win32-x64" (
    echo ✅ 未打包的应用:
    cd
    echo \out\UI TARS-win32-x64\
    echo.
)

echo ========================================
echo 🎉 打包成功完成！
echo ========================================
echo.
echo 下一步:
echo 1. 测试安装包是否正常工作
echo 2. 检查应用功能是否完整
echo 3. 查看 docs\build-and-security\BUILD_PACKAGE.zh-CN.md 了解更多信息
echo.

REM 询问是否打开输出目录
set /p open="是否打开输出目录? (Y/N): "
if /i "%open%"=="Y" (
    explorer "out"
)

pause
