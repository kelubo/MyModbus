#!/bin/bash

# Docker 快速启动脚本

echo "========================================"
echo "Modbus RTU Manager - Docker 启动"
echo "========================================"
echo ""

echo "请选择部署模式:"
echo "1. 单机模式（SQLite）"
echo "2. MySQL 模式"
echo "3. PostgreSQL 模式"
echo "4. 集群模式"
echo "5. 退出"
echo ""

read -p "请输入选项 (1-5): " choice

case $choice in
    1)
        echo ""
        echo "启动单机模式..."
        docker-compose -f docker-compose.simple.yml up -d
        ;;
    2)
        echo ""
        echo "启动 MySQL 模式..."
        docker-compose --profile mysql up -d
        ;;
    3)
        echo ""
        echo "启动 PostgreSQL 模式..."
        docker-compose --profile postgres up -d
        ;;
    4)
        echo ""
        echo "启动集群模式..."
        docker-compose --profile cluster up -d
        ;;
    5)
        echo "退出"
        exit 0
        ;;
    *)
        echo "无效选项"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ 启动成功！"
    echo ""
    echo "访问地址: http://localhost:3000"
    echo ""
    echo "查看日志:"
    echo "  docker-compose logs -f"
    echo ""
    echo "停止服务:"
    echo "  docker-compose down"
    echo ""
else
    echo ""
    echo "✗ 启动失败"
    echo "查看日志: docker-compose logs"
    exit 1
fi
