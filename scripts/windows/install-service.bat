@echo off
echo ========================================
echo Modbus RTU Manager 服务安装程序
echo ========================================
echo.
echo 正在检查管理员权限...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo 管理员权限确认成功
    echo.
    echo 正在安装服务...
    node "%~dp0install-service.js"
    echo.
    echo 安装完成！
    echo 服务将在系统启动时自动运行
    echo 访问地址: http://localhost:3000
) else (
    echo 错误: 需要管理员权限！
    echo 请右键点击此文件，选择"以管理员身份运行"
)
echo.
pause
