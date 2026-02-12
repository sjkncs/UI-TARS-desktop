@echo off
chcp 65001 >nul
echo ========================================
echo UI-TARS Desktop 快速打包脚本
echo (跳过类型检查和依赖构建)
echo ========================================
echo.

cd apps\ui-tars

echo [1/3] 清理旧文件...
call pnpm run clean
echo.

echo [2/3] 构建应用...
call pnpm run build:dist
if %errorlevel% neq 0 (
    echo ❌ 构建失败
    pause
    exit /b 1
)
echo.

echo [3/3] 打包应用...
call pnpm run make
if %errorlevel% neq 0 (
    echo ❌ 打包失败
    pause
    exit /b 1
)
echo.

echo ✅ 快速打包完成！
echo 输出目录: out\make\squirrel.windows\x64\
echo.

set /p open="是否打开输出目录? (Y/N): "
if /i "%open%"=="Y" (
    explorer "out"
)

pause
