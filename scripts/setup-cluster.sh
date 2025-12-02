#!/bin/bash

# 集群配置向导

echo "========================================"
echo "Modbus RTU Manager - 集群配置向导"
echo "========================================"
echo ""

# 检查 Redis
echo "检查 Redis..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo "✓ Redis 运行正常"
    else
        echo "✗ Redis 未运行"
        echo "  启动命令: sudo systemctl start redis"
        exit 1
    fi
else
    echo "✗ Redis 未安装"
    echo "  安装命令: sudo apt install redis-server"
    exit 1
fi

echo ""
echo "请选择节点类型:"
echo "1. Master 节点（处理 Web 请求 + 数据采集）"
echo "2. Worker 节点（仅数据采集）"
echo "3. 取消"
echo ""

read -p "请输入选项 (1-3): " choice

case $choice in
    1)
        ROLE="both"
        echo ""
        echo "配置 Master 节点..."
        ;;
    2)
        ROLE="worker"
        echo ""
        echo "配置 Worker 节点..."
        ;;
    3)
        echo "取消配置"
        exit 0
        ;;
    *)
        echo "无效选项"
        exit 1
        ;;
esac

# 输入配置
read -p "节点ID (默认: 自动生成): " NODE_ID
read -p "服务端口 (默认: 3000): " PORT
PORT=${PORT:-3000}

read -p "Redis 主机 (默认: localhost): " REDIS_HOST
REDIS_HOST=${REDIS_HOST:-localhost}

read -p "Redis 端口 (默认: 6379): " REDIS_PORT
REDIS_PORT=${REDIS_PORT:-6379}

read -p "Redis 密码 (可选): " REDIS_PASSWORD

echo ""
echo "数据库配置:"
echo "1. MySQL"
echo "2. PostgreSQL"
read -p "选择数据库 (1-2): " db_choice

case $db_choice in
    1)
        DB_TYPE="mysql"
        DEFAULT_PORT=3306
        ;;
    2)
        DB_TYPE="postgresql"
        DEFAULT_PORT=5432
        ;;
    *)
        echo "无效选项"
        exit 1
        ;;
esac

read -p "数据库主机 (默认: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "数据库端口 (默认: $DEFAULT_PORT): " DB_PORT
DB_PORT=${DB_PORT:-$DEFAULT_PORT}

read -p "数据库用户名: " DB_USER
read -sp "数据库密码: " DB_PASSWORD
echo ""

read -p "数据库名 (默认: modbus_manager): " DB_NAME
DB_NAME=${DB_NAME:-modbus_manager}

# 生成 .env 文件
cat > .env << EOF
# Modbus RTU Manager 集群配置
# 生成时间: $(date)

# 服务器配置
PORT=$PORT
NODE_ENV=production

# 集群配置
CLUSTER_ENABLED=true
${NODE_ID:+NODE_ID=$NODE_ID}
NODE_ROLE=$ROLE

# Redis 配置
REDIS_HOST=$REDIS_HOST
REDIS_PORT=$REDIS_PORT
${REDIS_PASSWORD:+REDIS_PASSWORD=$REDIS_PASSWORD}
REDIS_DB=0

# 任务分配策略
TASK_STRATEGY=round-robin

# 数据库配置
DB_TYPE=$DB_TYPE
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
EOF

echo ""
echo "========================================"
echo "配置完成！"
echo "========================================"
echo ""
echo "配置文件已保存到: .env"
echo ""
echo "下一步:"
echo "1. 确保 Redis 和数据库服务正在运行"
echo "2. 运行: node server.js"
echo ""
echo "查看集群状态:"
echo "  curl http://localhost:$PORT/api/cluster/status"
echo ""
echo "详细文档: docs/CLUSTER_GUIDE.md"
echo ""
