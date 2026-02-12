@echo off
REM UI-TARS Desktop 集成测试脚本
REM 在真实环境中测试优化功能

echo ================================================================================
echo UI-TARS Desktop 优化功能集成测试
echo ================================================================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查 pnpm
where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到 pnpm，请先安装 pnpm
    echo 运行: npm install -g pnpm
    pause
    exit /b 1
)

echo [信息] 准备运行集成测试...
echo.

REM 进入项目目录
cd apps\ui-tars

REM 编译 TypeScript
echo [步骤 1/2] 编译测试脚本...
call pnpm exec tsc src/main/test-integration.ts --outDir out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --resolveJsonModule
if %ERRORLEVEL% NEQ 0 (
    echo [错误] TypeScript 编译失败
    cd ..\..
    pause
    exit /b 1
)

echo [步骤 2/2] 运行集成测试...
echo.

REM 运行测试
node out/main/test-integration.js

REM 保存退出码
set TEST_EXIT_CODE=%ERRORLEVEL%

REM 返回根目录
cd ..\..

echo.
echo ================================================================================
if %TEST_EXIT_CODE% EQU 0 (
    echo 测试完成！所有测试通过。
) else (
    echo 测试完成，但有失败的测试。请查看上述输出。
)
echo ================================================================================
echo.

pause
exit /b %TEST_EXIT_CODE%
