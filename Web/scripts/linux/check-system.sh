#!/bin/bash

# 系统检测脚本

echo "========================================"
echo "Modbus RTU Manager 系统检测"
echo "========================================"
echo ""

# 1. 系统信息
echo "【系统信息】"
if [ -f /proc/device-tree/model ]; then
    echo "设备型号: $(cat /proc/device-tree/model)"
fi
echo "操作系统: $(uname -s)"
echo "内核版本: $(uname -r)"
echo "架构: $(uname -m)"
echo ""

# 2. Node.js
echo "【Node.js】"
if command -v node &> /dev/null; then
    echo "✓ Node.js: $(node --version)"
    echo "✓ npm: $(npm --version)"
else
    echo "✗ Node.js 未安装"
    echo "  安装命令: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs"
fi
echo ""

# 3. 项目依赖
echo "【项目依赖】"
if [ -f package.json ]; then
    echo "✓ package.json 存在"
    if [ -d node_modules ]; then
        echo "✓ node_modules 存在"
    else
        echo "✗ node_modules 不存在"
        echo "  运行: npm install"
    fi
else
    echo "✗ package.json 不存在"
    echo "  请确认在项目目录中运行此脚本"
fi
echo ""

# 4. 串口设备
echo "【串口设备】"
if ls /dev/tty* &> /dev/null; then
    echo "可用串口设备:"
    ls -l /dev/ttyUSB* 2>/dev/null && echo "  USB串口: 存在" || echo "  USB串口: 未找到"
    ls -l /dev/ttyAMA* 2>/dev/null && echo "  硬件串口: 存在" || echo "  硬件串口: 未找到"
    ls -l /dev/ttyS* 2>/dev/null && echo "  标准串口: 存在" || echo "  标准串口: 未找到"
else
    echo "✗ 未找到串口设备"
fi
echo ""

# 5. 串口权限
echo "【串口权限】"
if groups | grep -q dialout; then
    echo "✓ 当前用户在 dialout 组中"
else
    echo "✗ 当前用户不在 dialout 组中"
    echo "  添加命令: sudo usermod -a -G dialout $USER"
    echo "  注意: 需要重新登录才能生效"
fi
echo ""

# 6. 网络
echo "【网络配置】"
if command -v ip &> /dev/null; then
    IP_ADDR=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -1)
    if [ -n "$IP_ADDR" ]; then
        echo "✓ IP地址: $IP_ADDR"
        echo "  访问地址: http://$IP_ADDR:3000"
    else
        echo "✗ 未获取到IP地址"
    fi
else
    echo "✗ 无法检测网络配置"
fi
echo ""

# 7. 端口占用
echo "【端口检测】"
if command -v netstat &> /dev/null; then
    if netstat -tuln | grep -q ':3000'; then
        echo "✓ 端口 3000 正在使用"
        PID=$(netstat -tulpn 2>/dev/null | grep ':3000' | awk '{print $7}' | cut -d'/' -f1)
        if [ -n "$PID" ]; then
            echo "  进程 PID: $PID"
        fi
    else
        echo "○ 端口 3000 空闲"
    fi
else
    echo "○ 无法检测端口状态（需要 netstat）"
fi
echo ""

# 8. 系统服务
echo "【系统服务】"
if systemctl list-unit-files | grep -q modbus-rtu-manager; then
    echo "✓ 服务已安装"
    if systemctl is-active --quiet modbus-rtu-manager; then
        echo "✓ 服务正在运行"
    else
        echo "✗ 服务未运行"
        echo "  启动命令: sudo systemctl start modbus-rtu-manager"
    fi
    if systemctl is-enabled --quiet modbus-rtu-manager; then
        echo "✓ 开机自启已启用"
    else
        echo "○ 开机自启未启用"
    fi
else
    echo "○ 服务未安装"
    echo "  安装命令: sudo bash install-service.sh"
fi
echo ""

# 9. 系统资源
echo "【系统资源】"
if command -v free &> /dev/null; then
    TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
    USED_MEM=$(free -m | awk 'NR==2{print $3}')
    FREE_MEM=$(free -m | awk 'NR==2{print $4}')
    echo "内存: 总计 ${TOTAL_MEM}MB / 已用 ${USED_MEM}MB / 空闲 ${FREE_MEM}MB"
fi

if command -v df &> /dev/null; then
    DISK_USAGE=$(df -h / | awk 'NR==2{print $5}')
    echo "磁盘: 使用率 $DISK_USAGE"
fi

if command -v vcgencmd &> /dev/null; then
    TEMP=$(vcgencmd measure_temp 2>/dev/null | cut -d'=' -f2)
    echo "温度: $TEMP"
fi
echo ""

# 10. 建议
echo "【建议】"
ISSUES=0

if ! command -v node &> /dev/null; then
    echo "⚠ 需要安装 Node.js"
    ISSUES=$((ISSUES+1))
fi

if [ ! -d node_modules ]; then
    echo "⚠ 需要安装项目依赖: npm install"
    ISSUES=$((ISSUES+1))
fi

if ! groups | grep -q dialout; then
    echo "⚠ 需要配置串口权限: sudo usermod -a -G dialout $USER"
    ISSUES=$((ISSUES+1))
fi

if [ $ISSUES -eq 0 ]; then
    echo "✓ 系统配置正常"
else
    echo "发现 $ISSUES 个需要处理的问题"
fi
echo ""

echo "========================================"
echo "检测完成"
echo "========================================"
echo ""
echo "快速安装: sudo bash install-raspberry-pi.sh"
echo "查看文档: cat RASPBERRY_PI_GUIDE.md"
echo ""
