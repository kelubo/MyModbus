#!/bin/bash

cd "$(dirname "$0")"

echo "========================================"
echo "Modbus RTU Manager 安装向导 (Linux)"
echo "========================================"
echo ""
echo "请选择安装方式:"
echo ""
echo "1. 树莓派一键安装 (推荐)"
echo "2. 通用 Linux 安装"
echo "3. 仅安装依赖"
echo "4. 退出"
echo ""
read -p "请输入选项 (1-4): " choice

case $choice in
    1)
        echo ""
        echo "正在执行树莓派一键安装..."
        chmod +x scripts/linux/*.sh
        sudo bash scripts/linux/install-raspberry-pi.sh
        ;;
    2)
        echo ""
        echo "正在安装依赖..."
        npm install
        echo ""
        echo "正在安装系统服务..."
        chmod +x scripts/linux/*.sh
        sudo bash scripts/linux/install-service.sh
        ;;
    3)
        echo ""
        echo "正在安装依赖..."
        npm install
        echo ""
        echo "安装完成！"
        echo ""
        echo "运行方式:"
        echo "  node src/server.js"
        echo "  或"
        echo "  npm start"
        echo ""
        echo "访问地址: http://localhost:3000"
        ;;
    4)
        echo "退出安装"
        exit 0
        ;;
    *)
        echo "无效选项"
        exit 1
        ;;
esac
