@echo off
REM Modbus温湿度传感器读取服务安装脚本 (Windows)
REM 使用NSSM (Non-Sucking Service Manager) 管理服务

SET SERVICE_NAME=ModbusSensorReader
SET EXECUTABLE=%~dp0modbus_sensor_reader.py
SET DISPLAY_NAME=Modbus温湿度传感器读取服务
SET DESCRIPTION=通过RS485接口读取Modbus温湿度传感器数据
SET LOG_FILE=%~dp0logs\service.log
SET CONFIG_FILE=%~dp0config.json

REM 检查NSSM是否已安装
where nssm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] NSSM未安装。请访问 https://nssm.cc/download 下载并安装
    pause
    exit /b 1
)

REM 检查Python是否可用
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] Python未找到。请确保Python已安装并添加到PATH
    pause
    exit /b 1
)

REM 创建日志目录
if not exist "%~dp0logs" mkdir "%~dp0logs"

REM 安装服务
echo 正在安装服务...
nssm install %SERVICE_NAME% "python"
nssm set %SERVICE_NAME% AppParameters "%EXECUTABLE% -c %CONFIG_FILE%"
nssm set %SERVICE_NAME% DisplayName "%DISPLAY_NAME%"
nssm set %SERVICE_NAME% Description "%DESCRIPTION%"
nssm set %SERVICE_NAME% AppDirectory "%~dp0"
nssm set %SERVICE_NAME% AppStdout "%LOG_FILE%"
nssm set %SERVICE_NAME% AppStderr "%LOG_FILE%"
nssm set %SERVICE_NAME% AppStdoutCreationDisposition 4
nssm set %SERVICE_NAME% AppStderrCreationDisposition 4
nssm set %SERVICE_NAME% AppRotateFiles 1
nssm set %SERVICE_NAME% AppRotateOnline 1
nssm set %SERVICE_NAME% AppRotateBytes 10485760
nssm set %SERVICE_NAME% AppRotateMax 5
nssm set %SERVICE_NAME% Start SERVICE_DEMAND_START
nssm set %SERVICE_NAME% AppExit Default Restart
nssm set %SERVICE_NAME% AppRestartDelay 5000

REM 设置服务依赖
nssm set %SERVICE_NAME% DependOnService Serial

echo.
echo 服务安装完成！
echo.
echo 可用命令:
echo   启动服务:   nssm start %SERVICE_NAME%
echo   停止服务:   nssm stop %SERVICE_NAME%
echo   重启服务:   nssm restart %SERVICE_NAME%
echo   查看状态:   nssm status %SERVICE_NAME%
echo   删除服务:   nssm remove %SERVICE_NAME% confirm
echo.
echo 日志文件: %LOG_FILE%
echo.
pause
