@echo off
echo 正在启动 Modbus RTU Manager 服务...
net start "Modbus RTU Manager"
if %errorLevel% == 0 (
    echo 服务启动成功！
    echo 访问地址: http://localhost:3000
) else (
    echo 启动失败，请检查服务是否已安装
    echo 或以管理员身份运行此脚本
)
pause
