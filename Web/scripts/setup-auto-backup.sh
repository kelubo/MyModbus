#!/bin/bash

# 自动备份配置脚本

echo "========================================"
echo "Modbus RTU Manager - 自动备份配置"
echo "========================================"
echo ""

# 获取项目目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "项目目录: $PROJECT_DIR"
echo ""

echo "请选择备份频率:"
echo "1. 每天（凌晨 2:00）"
echo "2. 每周（周日凌晨 2:00）"
echo "3. 每月（1号凌晨 2:00）"
echo "4. 自定义"
echo "5. 取消"
echo ""

read -p "请输入选项 (1-5): " choice

case $choice in
    1)
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="每天凌晨 2:00"
        ;;
    2)
        CRON_SCHEDULE="0 2 * * 0"
        DESCRIPTION="每周日凌晨 2:00"
        ;;
    3)
        CRON_SCHEDULE="0 2 1 * *"
        DESCRIPTION="每月1号凌晨 2:00"
        ;;
    4)
        echo ""
        echo "Cron 表达式格式: 分 时 日 月 周"
        echo "示例: 0 2 * * * (每天凌晨2点)"
        read -p "请输入 Cron 表达式: " CRON_SCHEDULE
        DESCRIPTION="自定义: $CRON_SCHEDULE"
        ;;
    5)
        echo "取消配置"
        exit 0
        ;;
    *)
        echo "无效选项"
        exit 1
        ;;
esac

# 创建备份脚本
BACKUP_SCRIPT="$PROJECT_DIR/scripts/backup.sh"

# 添加到 crontab
CRON_COMMAND="$CRON_SCHEDULE cd $PROJECT_DIR && bash $BACKUP_SCRIPT >> $PROJECT_DIR/backups/backup.log 2>&1"

# 检查是否已存在
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo ""
    echo "警告: 已存在自动备份任务"
    read -p "是否替换？(y/n): " replace
    
    if [ "$replace" != "y" ]; then
        echo "取消配置"
        exit 0
    fi
    
    # 删除旧任务
    crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab -
fi

# 添加新任务
(crontab -l 2>/dev/null; echo "$CRON_COMMAND") | crontab -

echo ""
echo "========================================"
echo "配置完成！"
echo "========================================"
echo ""
echo "备份计划: $DESCRIPTION"
echo "备份脚本: $BACKUP_SCRIPT"
echo "日志文件: $PROJECT_DIR/backups/backup.log"
echo ""
echo "查看当前任务:"
echo "  crontab -l"
echo ""
echo "删除自动备份:"
echo "  crontab -e"
echo "  (删除包含 backup.sh 的行)"
echo ""
