# 备份和还原指南

## 📦 概述

Modbus RTU Manager 提供完整的备份和还原功能，支持手动备份、自动备份和 API 备份。

## 🎯 备份内容

### 1. 数据库备份
- SQLite 数据库文件
- MySQL 数据库导出
- PostgreSQL 数据库导出

### 2. 配置备份
- 环境变量配置
- 系统设置

## 🚀 快速开始

### 手动备份

```bash
# 运行备份脚本
bash scripts/backup.sh
```

### 手动还原

```bash
# 查看可用备份
ls -lt backups/

# 还原指定备份
bash scripts/restore.sh backups/backup_2024-12-01_02-00-00.tar.gz
```

### API 备份

```bash
# 创建备份
curl -X POST http://localhost:3000/api/backup/create

# 查看备份列表
curl http://localhost:3000/api/backup/list

# 下载备份
curl -O http://localhost:3000/api/backup/download/sqlite_backup_2024-12-01.db
```

## ⚙️ 配置说明

### 环境变量

在 `.env` 文件中配置：

```bash
# 备份目录
BACKUP_DIR=./backups

# 最大备份数量
MAX_BACKUPS=10
```

### 备份目录

默认备份目录：`./backups`

可以修改为其他位置：
```bash
BACKUP_DIR=/var/backups/modbus-manager
```

### 备份保留策略

默认保留最近 10 个备份，超过的自动删除。

修改保留数量：
```bash
MAX_BACKUPS=30
```

## 📋 备份方式

### 方式 1: 脚本备份（推荐）

**优点：**
- 简单易用
- 自动压缩
- 自动清理

**使用：**
```bash
bash scripts/backup.sh
```

**输出：**
```
backups/
└── backup_2024-12-01_02-00-00.tar.gz
```

### 方式 2: API 备份

**优点：**
- 可编程
- 远程调用
- 集成方便

**创建备份：**
```bash
curl -X POST http://localhost:3000/api/backup/create
```

**响应：**
```json
{
  "success": true,
  "database": {
    "backupName": "sqlite_backup_2024-12-01.db",
    "size": 102400
  },
  "config": {
    "backupName": "config_backup_2024-12-01.json",
    "size": 512
  }
}
```

### 方式 3: 数据库工具

**SQLite：**
```bash
cp modbus.db backups/modbus_$(date +%Y%m%d).db
```

**MySQL：**
```bash
mysqldump -u root -p modbus_manager > backup.sql
```

**PostgreSQL：**
```bash
pg_dump modbus_manager > backup.sql
```

## 🔄 还原方式

### 方式 1: 脚本还原（推荐）

```bash
# 查看可用备份
ls -lt backups/

# 还原备份
bash scripts/restore.sh backups/backup_2024-12-01_02-00-00.tar.gz
```

**流程：**
1. 解压备份文件
2. 备份当前数据
3. 还原数据库
4. 还原配置
5. 提示重启服务

### 方式 2: API 还原

```bash
# 还原指定备份
curl -X POST http://localhost:3000/api/backup/restore/sqlite_backup_2024-12-01.db
```

### 方式 3: 手动还原

**SQLite：**
```bash
# 备份当前数据库
cp modbus.db modbus.db.backup

# 还原
cp backups/sqlite_backup_2024-12-01.db modbus.db

# 重启服务
sudo systemctl restart modbus-rtu-manager
```

**MySQL：**
```bash
mysql -u root -p modbus_manager < backup.sql
```

**PostgreSQL：**
```bash
psql modbus_manager < backup.sql
```

## ⏰ 自动备份

### 配置自动备份

```bash
# 运行配置脚本
bash scripts/setup-auto-backup.sh
```

**选项：**
1. 每天（凌晨 2:00）
2. 每周（周日凌晨 2:00）
3. 每月（1号凌晨 2:00）
4. 自定义

### 查看自动备份任务

```bash
crontab -l
```

### 手动编辑

```bash
crontab -e
```

添加：
```
0 2 * * * cd /path/to/modbus-rtu-manager && bash scripts/backup.sh >> backups/backup.log 2>&1
```

### 查看备份日志

```bash
tail -f backups/backup.log
```

## 📊 备份管理

### 查看备份列表

**脚本：**
```bash
ls -lh backups/
```

**API：**
```bash
curl http://localhost:3000/api/backup/list
```

**响应：**
```json
[
  {
    "name": "backup_2024-12-01_02-00-00.tar.gz",
    "size": 102400,
    "created": "2024-12-01T02:00:00.000Z"
  }
]
```

### 查看备份详情

```bash
curl http://localhost:3000/api/backup/sqlite_backup_2024-12-01.db
```

### 下载备份

```bash
curl -O http://localhost:3000/api/backup/download/sqlite_backup_2024-12-01.db
```

### 删除备份

**API：**
```bash
curl -X DELETE http://localhost:3000/api/backup/sqlite_backup_2024-12-01.db
```

**手动：**
```bash
rm backups/backup_2024-12-01_02-00-00.tar.gz
```

## 🐳 Docker 备份

### 备份 Docker 容器数据

```bash
# 备份数据卷
docker run --rm \
  -v modbus-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/docker-data-$(date +%Y%m%d).tar.gz /data

# 备份数据库容器
docker exec modbus-mysql mysqldump -u root -p modbus_manager > backups/mysql-$(date +%Y%m%d).sql
```

### 还原 Docker 数据

```bash
# 还原数据卷
docker run --rm \
  -v modbus-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/docker-data-20241201.tar.gz -C /

# 还原数据库
docker exec -i modbus-mysql mysql -u root -p modbus_manager < backups/mysql-20241201.sql
```

## 🔐 备份安全

### 1. 加密备份

```bash
# 加密备份文件
gpg -c backups/backup_2024-12-01.tar.gz

# 解密
gpg backups/backup_2024-12-01.tar.gz.gpg
```

### 2. 远程备份

**使用 rsync：**
```bash
rsync -avz backups/ user@remote-server:/backups/modbus-manager/
```

**使用 scp：**
```bash
scp backups/backup_2024-12-01.tar.gz user@remote-server:/backups/
```

### 3. 云存储备份

**AWS S3：**
```bash
aws s3 cp backups/backup_2024-12-01.tar.gz s3://my-bucket/modbus-backups/
```

**阿里云 OSS：**
```bash
ossutil cp backups/backup_2024-12-01.tar.gz oss://my-bucket/modbus-backups/
```

## 📈 备份策略

### 小型部署

**策略：**
- 频率：每天
- 保留：7 天
- 位置：本地

**配置：**
```bash
BACKUP_DIR=./backups
MAX_BACKUPS=7
```

### 中型部署

**策略：**
- 频率：每天
- 保留：30 天
- 位置：本地 + 远程

**配置：**
```bash
BACKUP_DIR=./backups
MAX_BACKUPS=30

# 添加远程同步
0 3 * * * rsync -avz /path/to/backups/ user@remote:/backups/
```

### 大型部署

**策略：**
- 频率：每 6 小时
- 保留：本地 7 天，远程 90 天
- 位置：本地 + 云存储

**配置：**
```bash
# 每 6 小时备份
0 */6 * * * cd /path/to/modbus-rtu-manager && bash scripts/backup.sh

# 每天同步到云存储
0 4 * * * aws s3 sync /path/to/backups/ s3://my-bucket/modbus-backups/
```

## 🔍 故障排查

### 备份失败

**检查：**
1. 磁盘空间是否充足
2. 数据库是否可访问
3. 权限是否正确

**查看日志：**
```bash
tail -f backups/backup.log
```

### 还原失败

**检查：**
1. 备份文件是否完整
2. 数据库版本是否兼容
3. 配置是否正确

**手动验证：**
```bash
# 验证备份文件
tar -tzf backups/backup_2024-12-01.tar.gz

# 测试数据库连接
mysql -u root -p -e "SHOW DATABASES;"
```

### 权限问题

```bash
# 修改备份目录权限
chmod 755 backups/
chmod 644 backups/*

# 修改脚本权限
chmod +x scripts/backup.sh
chmod +x scripts/restore.sh
```

## 📝 最佳实践

### 1. 定期测试还原

```bash
# 每月测试一次还原流程
bash scripts/restore.sh backups/latest-backup.tar.gz
```

### 2. 多地备份

- 本地备份（快速恢复）
- 远程备份（灾难恢复）
- 云存储备份（长期保存）

### 3. 备份验证

```bash
# 验证备份完整性
tar -tzf backups/backup_2024-12-01.tar.gz > /dev/null
echo $?  # 0 表示成功
```

### 4. 文档记录

记录：
- 备份时间
- 备份内容
- 还原步骤
- 联系人

### 5. 监控告警

```bash
# 检查备份是否成功
if [ ! -f "backups/backup_$(date +%Y-%m-%d)*.tar.gz" ]; then
    echo "备份失败！" | mail -s "备份告警" admin@example.com
fi
```

## 🆘 紧急恢复

### 数据丢失

1. 停止服务
2. 找到最近的备份
3. 还原备份
4. 验证数据
5. 重启服务

### 数据库损坏

1. 尝试修复
2. 如果失败，还原备份
3. 重放最近的事务日志（如果有）

### 配置错误

1. 还原配置备份
2. 检查配置文件
3. 重启服务

## 📞 获取帮助

### 文档
- [安装指南](INSTALL.md)
- [数据库配置](DATABASE_GUIDE.md)
- [Docker 部署](DOCKER_GUIDE.md)

### 工具
- 备份脚本：`scripts/backup.sh`
- 还原脚本：`scripts/restore.sh`
- 自动备份：`scripts/setup-auto-backup.sh`

---

**重要提示：** 定期备份是数据安全的关键！建议至少每天备份一次。
