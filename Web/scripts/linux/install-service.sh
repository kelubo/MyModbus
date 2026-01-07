#!/bin/bash

# Modbus RTU Manager Linux 服务安装脚本

echo "========================================"
echo "Modbus RTU Manager 服务安装程序"
echo "========================================"
echo ""

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then 
    echo "错误: 请使用 sudo 运行此脚本"
    echo "使用方法: sudo bash install-service.sh"
    exit 1
fi

# 获取当前目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_PATH=$(which node)

if [ -z "$NODE_PATH" ]; then
    echo "错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

echo "当前目录: $SCRIPT_DIR"
echo "Node.js 路径: $NODE_PATH"
echo ""

# 创建 systemd 服务文件
SERVICE_FILE="/etc/systemd/system/modbus-rtu-manager.service"

echo "正在创建服务文件: $SERVICE_FILE"

cat > $SERVICE_FILE << EOF
[Unit]
Description=Modbus RTU Manager Service
Documentation=https://github.com/your-repo/modbus-rtu-manager
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$SUDO_USER
WorkingDirectory=$SCRIPT_DIR
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="NODE_OPTIONS=--max-old-space-size=512"
ExecStart=$NODE_PATH $SCRIPT_DIR/src/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=modbus-rtu-manager

# 资源限制（适合树莓派）
MemoryLimit=512M
CPUQuota=80%

[Install]
WantedBy=multi-user.target
EOF

echo "服务文件创建成功！"
echo ""

# 重新加载 systemd
echo "重新加载 systemd..."
systemctl daemon-reload

# 启用服务（开机自启）
echo "启用开机自启..."
systemctl enable modbus-rtu-manager.service

# 启动服务
echo "启动服务..."
systemctl start modbus-rtu-manager.service

# 检查服务状态
echo ""
echo "========================================"
echo "安装完成！"
echo "========================================"
echo ""
echo "服务状态:"
systemctl status modbus-rtu-manager.service --no-pager
echo ""
echo "访问地址: http://localhost:3000"
echo ""
echo "常用命令:"
echo "  查看状态: sudo systemctl status modbus-rtu-manager"
echo "  启动服务: sudo systemctl start modbus-rtu-manager"
echo "  停止服务: sudo systemctl stop modbus-rtu-manager"
echo "  重启服务: sudo systemctl restart modbus-rtu-manager"
echo "  查看日志: sudo journalctl -u modbus-rtu-manager -f"
echo "  卸载服务: sudo bash uninstall-service.sh"
echo ""
