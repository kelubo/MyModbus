#!/bin/bash

# 备份脚本

echo "========================================"
echo "Modbus RTU Manager - 数据备份"
echo "========================================"
echo ""

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 设置备份目录
BACKUP_DIR=${BACKUP_DIR:-./backups}
mkdir -p $BACKUP_DIR

# 生成时间戳
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

# 备份数据库
echo "正在备份数据库..."

case ${DB_TYPE:-sqlite} in
    sqlite)
        DB_FILE=${DB_FILE:-./modbus.db}
        if [ -f "$DB_FILE" ]; then
            BACKUP_FILE="$BACKUP_DIR/sqlite_backup_$TIMESTAMP.db"
            cp "$DB_FILE" "$BACKUP_FILE"
            echo "✓ SQLite 备份成功: $BACKUP_FILE"
        else
            echo "✗ 数据库文件不存在: $DB_FILE"
            exit 1
        fi
        ;;
    
    mysql)
        BACKUP_FILE="$BACKUP_DIR/mysql_backup_$TIMESTAMP.sql"
        mysqldump -h ${DB_HOST:-localhost} -P ${DB_PORT:-3306} \
                  -u ${DB_USER:-root} -p${DB_PASSWORD} \
                  ${DB_NAME:-modbus_manager} > "$BACKUP_FILE"
        
        if [ $? -eq 0 ]; then
            echo "✓ MySQL 备份成功: $BACKUP_FILE"
        else
            echo "✗ MySQL 备份失败"
            exit 1
        fi
        ;;
    
    postgresql)
        BACKUP_FILE="$BACKUP_DIR/postgres_backup_$TIMESTAMP.sql"
        PGPASSWORD=${DB_PASSWORD} pg_dump -h ${DB_HOST:-localhost} \
                                          -p ${DB_PORT:-5432} \
                                          -U ${DB_USER:-postgres} \
                                          ${DB_NAME:-modbus_manager} > "$BACKUP_FILE"
        
        if [ $? -eq 0 ]; then
            echo "✓ PostgreSQL 备份成功: $BACKUP_FILE"
        else
            echo "✗ PostgreSQL 备份失败"
            exit 1
        fi
        ;;
    
    *)
        echo "✗ 不支持的数据库类型: $DB_TYPE"
        exit 1
        ;;
esac

# 备份配置文件
echo ""
echo "正在备份配置..."
if [ -f .env ]; then
    CONFIG_BACKUP="$BACKUP_DIR/config_backup_$TIMESTAMP.env"
    cp .env "$CONFIG_BACKUP"
    echo "✓ 配置备份成功: $CONFIG_BACKUP"
fi

# 压缩备份
echo ""
echo "正在压缩备份..."
ARCHIVE_NAME="backup_$TIMESTAMP.tar.gz"
tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" -C "$BACKUP_DIR" \
    $(basename "$BACKUP_FILE") \
    $([ -f "$CONFIG_BACKUP" ] && basename "$CONFIG_BACKUP")

if [ $? -eq 0 ]; then
    echo "✓ 压缩成功: $ARCHIVE_NAME"
    
    # 删除未压缩的文件
    rm -f "$BACKUP_FILE" "$CONFIG_BACKUP"
fi

# 清理旧备份
echo ""
echo "正在清理旧备份..."
MAX_BACKUPS=${MAX_BACKUPS:-10}
BACKUP_COUNT=$(ls -1 $BACKUP_DIR/*.tar.gz 2>/dev/null | wc -l)

if [ $BACKUP_COUNT -gt $MAX_BACKUPS ]; then
    DELETE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
    ls -1t $BACKUP_DIR/*.tar.gz | tail -n $DELETE_COUNT | xargs rm -f
    echo "✓ 删除了 $DELETE_COUNT 个旧备份"
fi

echo ""
echo "========================================"
echo "备份完成！"
echo "========================================"
echo ""
echo "备份文件: $BACKUP_DIR/$ARCHIVE_NAME"
echo "备份大小: $(du -h "$BACKUP_DIR/$ARCHIVE_NAME" | cut -f1)"
echo ""
