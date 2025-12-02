#!/bin/bash

echo "正在重启 Modbus RTU Manager 服务..."
sudo systemctl restart modbus-rtu-manager.service

if [ $? -eq 0 ]; then
    echo "服务重启成功！"
    echo "访问地址: http://localhost:3000"
    echo ""
    echo "查看状态: sudo systemctl status modbus-rtu-manager"
else
    echo "重启失败，请检查服务是否已安装"
    echo "或使用 sudo 运行此脚本"
fi
