#!/bin/bash

# 还原脚本

echo "========================================"
echo "Modbus RTU Manager - 数据还原"
echo "========================================"
echo ""

# 检查参数
if [ -z "$1" ]; then
    echo "使用方法: bash restore.sh <备份文件>"
    echo ""
    echo "可用的备份文件:"
    ls -1t backups/*.tar.gz 2>/dev/null | head -10
    echo ""
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "✗ 备份文件不存在: $BACKUP_FILE"
    exit 1
fi

# 确认还原
echo "警告: 此操作将覆盖当前数据！"
echo "备份文件: $BACKUP_FILE"
echo ""
read -p "确定要还原吗？(yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "取消还原"
    exit 0
fi

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 创建临时目录
TEMP_DIR=$(mktemp -d)
echo ""
echo "正在解压备份..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

if [ $? -ne 0 ]; then
    echo "✗ 解压失败"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo "✓ 解压成功"

# 还原数据库
echo ""
echo "正在还原数据库..."

case ${DB_TYPE:-sqlite} in
    sqlite)
        DB_FILE=${DB_FILE:-./modbus.db}
        BACKUP_DB=$(ls -1 $TEMP_DIR/sqlite_backup_*.db 2>/dev/null | head -1)
        
        if [ -z "$BACKUP_DB" ]; then
            echo "✗ 未找到 SQLite 备份文件"
            rm -rf "$TEMP_DIR"
            exit 1
        fi
        
        # 备份当前数据库
        if [ -f "$DB_FILE" ]; then
            cp "$DB_FILE" "${DB_FILE}.before-restore"
            echo "✓ 当前数据库已备份: ${DB_FILE}.before-restore"
        fi
        
        # 还原
        cp "$BACKUP_DB" "$DB_FILE"
        echo "✓ SQLite 还原成功"
        ;;
    
    mysql)
        BACKUP_SQL=$(ls -1 $TEMP_DIR/mysql_backup_*.sql 2>/dev/null | head -1)
        
        if [ -z "$BACKUP_SQL" ]; then
            echo "✗ 未找到 MySQL 备份文件"
            rm -rf "$TEMP_DIR"
            exit 1
        fi
        
        mysql -h ${DB_HOST:-localhost} -P ${DB_PORT:-3306} \
              -u ${DB_USER:-root} -p${DB_PASSWORD} \
              ${DB_NAME:-modbus_manager} < "$BACKUP_SQL"
        
        if [ $? -eq 0 ]; then
            echo "✓ MySQL 还原成功"
        else
            echo "✗ MySQL 还原失败"
            rm -rf "$TEMP_DIR"
            exit 1
        fi
        ;;
    
    postgresql)
        BACKUP_SQL=$(ls -1 $TEMP_DIR/postgres_backup_*.sql 2>/dev/null | head -1)
        
        if [ -z "$BACKUP_SQL" ]; then
            echo "✗ 未找到 PostgreSQL 备份文件"
            rm -rf "$TEMP_DIR"
            exit 1
        fi
        
        PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST:-localhost} \
                                       -p ${DB_PORT:-5432} \
                                       -U ${DB_USER:-postgres} \
                                       ${DB_NAME:-modbus_manager} < "$BACKUP_SQL"
        
        if [ $? -eq 0 ]; then
            echo "✓ PostgreSQL 还原成功"
        else
            echo "✗ PostgreSQL 还原失败"
            rm -rf "$TEMP_DIR"
            exit 1
        fi
        ;;
esac

# 还原配置
echo ""
echo "正在还原配置..."
BACKUP_CONFIG=$(ls -1 $TEMP_DIR/config_backup_*.env 2>/dev/null | head -1)

if [ -n "$BACKUP_CONFIG" ]; then
    if [ -f .env ]; then
        cp .env .env.before-restore
        echo "✓ 当前配置已备份: .env.before-restore"
    fi
    
    cp "$BACKUP_CONFIG" .env
    echo "✓ 配置还原成功"
fi

# 清理临时文件
rm -rf "$TEMP_DIR"

echo ""
echo "========================================"
echo "还原完成！"
echo "========================================"
echo ""
echo "建议重启服务以应用更改:"
echo "  sudo systemctl restart modbus-rtu-manager"
echo "  或"
echo "  docker-compose restart"
echo ""
