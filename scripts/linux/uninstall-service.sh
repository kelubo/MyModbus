#!/bin/bash

# Modbus RTU Manager Linux 服务卸载脚本

echo "========================================"
echo "Modbus RTU Manager 服务卸载程序"
echo "========================================"
echo ""

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then 
    echo "错误: 请使用 sudo 运行此脚本"
    echo "使用方法: sudo bash uninstall-service.sh"
    exit 1
fi

SERVICE_FILE="/etc/systemd/system/modbus-rtu-manager.service"

# 检查服务是否存在
if [ ! -f "$SERVICE_FILE" ]; then
    echo "服务未安装或已经卸载"
    exit 0
fi

# 停止服务
echo "正在停止服务..."
systemctl stop modbus-rtu-manager.service

# 禁用服务
echo "正在禁用开机自启..."
systemctl disable modbus-rtu-manager.service

# 删除服务文件
echo "正在删除服务文件..."
rm -f $SERVICE_FILE

# 重新加载 systemd
echo "重新加载 systemd..."
systemctl daemon-reload
systemctl reset-failed

echo ""
echo "========================================"
echo "卸载完成！"
echo "========================================"
echo ""
