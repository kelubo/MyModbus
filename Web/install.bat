@echo off
cd /d "%~dp0"
echo ========================================
echo Modbus RTU Manager 安装向导 (Windows)
echo ========================================
echo.
echo 请选择安装方式:
echo.
echo 1. 安装为系统服务 (开机自启，推荐)
echo 2. 仅安装依赖 (手动运行)
echo 3. 退出
echo.
set /p choice=请输入选项 (1-3): 

if "%choice%"=="1" goto install_service
if "%choice%"=="2" goto install_deps
if "%choice%"=="3" goto end

:install_service
echo.
echo 正在安装依赖...
call npm install
echo.
echo 正在安装系统服务...
cd scripts\windows
call install-service.bat
goto end

:install_deps
echo.
echo 正在安装依赖...
call npm install
echo.
echo 安装完成！
echo.
echo 运行方式:
echo   node src/server.js
echo   或
echo   npm start
echo.
echo 访问地址: http://localhost:3000
pause
goto end

:end
