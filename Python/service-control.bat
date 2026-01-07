@echo off
REM Modbus温湿度传感器读取服务控制脚本 (Windows)

SET SERVICE_NAME=ModbusSensorReader

if "%1"=="" (
    echo 用法: service-control.bat [start^|stop^|restart^|status^|logs^|install^|remove]
    echo.
    echo 命令:
    echo   start    - 启动服务
    echo   stop     - 停止服务
    echo   restart  - 重启服务
    echo   status   - 查看服务状态
    echo   logs     - 查看服务日志
    echo   install  - 安装服务
    echo   remove   - 删除服务
    exit /b 1
)

if "%1"=="start" (
    echo 正在启动服务...
    nssm start %SERVICE_NAME%
    echo 服务已启动
) else if "%1"=="stop" (
    echo 正在停止服务...
    nssm stop %SERVICE_NAME%
    echo 服务已停止
) else if "%1"=="restart" (
    echo 正在重启服务...
    nssm restart %SERVICE_NAME%
    echo 服务已重启
) else if "%1"=="status" (
    nssm status %SERVICE_NAME%
) else if "%1"=="logs" (
    if exist "%~dp0logs\service.log" (
        type "%~dp0logs\service.log"
    ) else (
        echo 日志文件不存在
    )
) else if "%1"=="install" (
    call install-service.bat
) else if "%1"=="remove" (
    echo 正在删除服务...
    nssm remove %SERVICE_NAME% confirm
    echo 服务已删除
) else (
    echo 未知命令: %1
    echo 用法: service-control.bat [start^|stop^|restart^|status^|logs^|install^|remove]
)
