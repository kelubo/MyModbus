#!/bin/bash

# Modbus RTU Manager 树莓派一键安装脚本

echo "========================================"
echo "Modbus RTU Manager 树莓派安装程序"
echo "========================================"
echo ""

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then 
    echo "错误: 请使用 sudo 运行此脚本"
    echo "使用方法: sudo bash install-raspberry-pi.sh"
    exit 1
fi

# 获取实际用户
ACTUAL_USER=${SUDO_USER:-$USER}
echo "当前用户: $ACTUAL_USER"
echo ""

# 1. 检查系统
echo "1. 检查系统环境..."
if [ -f /proc/device-tree/model ]; then
    MODEL=$(cat /proc/device-tree/model)
    echo "检测到: $MODEL"
else
    echo "警告: 未检测到树莓派，但将继续安装"
fi
echo ""

# 2. 检查 Node.js
echo "2. 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "未找到 Node.js，正在安装..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
else
    NODE_VERSION=$(node --version)
    echo "Node.js 版本: $NODE_VERSION"
fi
echo ""

# 3. 配置串口权限
echo "3. 配置串口权限..."
if ! groups $ACTUAL_USER | grep -q dialout; then
    echo "添加用户 $ACTUAL_USER 到 dialout 组..."
    usermod -a -G dialout $ACTUAL_USER
    echo "✓ 已添加到 dialout 组（需要重新登录生效）"
else
    echo "✓ 用户已在 dialout 组中"
fi
echo ""

# 4. 安装依赖
echo "4. 安装项目依赖..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd $SCRIPT_DIR

if [ -f package.json ]; then
    sudo -u $ACTUAL_USER npm install
    echo "✓ 依赖安装完成"
else
    echo "错误: 未找到 package.json"
    exit 1
fi
echo ""

# 5. 创建系统服务
echo "5. 创建系统服务..."
NODE_PATH=$(which node)
SERVICE_FILE="/etc/systemd/system/modbus-rtu-manager.service"

# 检测树莓派型号并设置内存限制
MEMORY_LIMIT="512M"
if grep -q "Raspberry Pi 3" /proc/device-tree/model 2>/dev/null; then
    MEMORY_LIMIT="256M"
    echo "检测到树莓派 3，设置内存限制为 256MB"
elif grep -q "Raspberry Pi 4" /proc/device-tree/model 2>/dev/null; then
    MEMORY_LIMIT="512M"
    echo "检测到树莓派 4，设置内存限制为 512MB"
elif grep -q "Raspberry Pi 5" /proc/device-tree/model 2>/dev/null; then
    MEMORY_LIMIT="1G"
    echo "检测到树莓派 5，设置内存限制为 1GB"
fi

cat > $SERVICE_FILE << EOF
[Unit]
Description=Modbus RTU Manager Service
Documentation=https://github.com/your-repo/modbus-rtu-manager
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$ACTUAL_USER
WorkingDirectory=$SCRIPT_DIR
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="NODE_OPTIONS=--max-old-space-size=${MEMORY_LIMIT%M}"
ExecStart=$NODE_PATH $SCRIPT_DIR/src/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=modbus-rtu-manager

# 资源限制（树莓派优化）
MemoryLimit=$MEMORY_LIMIT
CPUQuota=80%

[Install]
WantedBy=multi-user.target
EOF

echo "✓ 服务文件创建完成"
echo ""

# 6. 启用并启动服务
echo "6. 启用并启动服务..."
systemctl daemon-reload
systemctl enable modbus-rtu-manager.service
systemctl start modbus-rtu-manager.service
echo ""

# 7. 等待服务启动
echo "7. 等待服务启动..."
sleep 3
echo ""

# 8. 检查服务状态
echo "========================================"
echo "安装完成！"
echo "========================================"
echo ""

if systemctl is-active --quiet modbus-rtu-manager; then
    echo "✓ 服务运行正常"
    
    # 获取 IP 地址
    IP_ADDR=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo "访问地址:"
    echo "  本地: http://localhost:3000"
    echo "  网络: http://$IP_ADDR:3000"
    echo ""
    echo "系统信息:"
    echo "  CPU 温度: $(vcgencmd measure_temp 2>/dev/null || echo '无法获取')"
    echo "  内存限制: $MEMORY_LIMIT"
    echo ""
else
    echo "✗ 服务启动失败，请查看日志:"
    echo "  sudo journalctl -u modbus-rtu-manager -n 50"
    echo ""
fi

echo "常用命令:"
echo "  查看状态: sudo systemctl status modbus-rtu-manager"
echo "  启动服务: sudo systemctl start modbus-rtu-manager"
echo "  停止服务: sudo systemctl stop modbus-rtu-manager"
echo "  重启服务: sudo systemctl restart modbus-rtu-manager"
echo "  查看日志: sudo journalctl -u modbus-rtu-manager -f"
echo "  卸载服务: sudo bash uninstall-service.sh"
echo ""
echo "注意事项:"
echo "  1. 串口权限需要重新登录后生效"
echo "  2. 默认端口为 3000"
echo "  3. 数据库文件: $SCRIPT_DIR/modbus.db"
echo ""
echo "树莓派部署指南: RASPBERRY_PI_GUIDE.md"
echo ""
