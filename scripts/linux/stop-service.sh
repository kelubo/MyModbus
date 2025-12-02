#!/bin/bash

echo "正在停止 Modbus RTU Manager 服务..."
sudo systemctl stop modbus-rtu-manager.service

if [ $? -eq 0 ]; then
    echo "服务停止成功！"
else
    echo "停止失败，请检查服务是否正在运行"
    echo "或使用 sudo 运行此脚本"
fi
