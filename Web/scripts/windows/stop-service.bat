@echo off
echo 正在停止 Modbus RTU Manager 服务...
net stop "Modbus RTU Manager"
if %errorLevel% == 0 (
    echo 服务停止成功！
) else (
    echo 停止失败，请检查服务是否正在运行
    echo 或以管理员身份运行此脚本
)
pause
