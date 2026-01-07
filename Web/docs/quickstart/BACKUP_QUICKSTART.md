# 备份快速开始

## 🚀 快速备份

### 手动备份

```bash
bash scripts/backup.sh
```

### 查看备份

```bash
ls -lh backups/
```

## 🔄 快速还原

### 查看可用备份

```bash
ls -lt backups/
```

### 还原备份

```bash
bash scripts/restore.sh backups/backup_2024-12-01_02-00-00.tar.gz
```

## ⏰ 自动备份

### 配置自动备份

```bash
bash scripts/setup-auto-backup.sh
```

选择备份频率：
1. 每天（凌晨 2:00）
2. 每周（周日凌晨 2:00）
3. 每月（1号凌晨 2:00）

### 查看自动备份任务

```bash
crontab -l
```

## 📡 API 备份

### 创建备份

```bash
curl -X POST http://localhost:3000/api/backup/create
```

### 查看备份列表

```bash
curl http://localhost:3000/api/backup/list
```

### 下载备份

```bash
curl -O http://localhost:3000/api/backup/download/sqlite_backup_2024-12-01.db
```

### 还原备份

```bash
curl -X POST http://localhost:3000/api/backup/restore/sqlite_backup_2024-12-01.db
```

## 🐳 Docker 备份

### 备份容器数据

```bash
docker exec modbus-manager bash scripts/backup.sh
```

### 复制备份到主机

```bash
docker cp modbus-manager:/app/backups/backup_2024-12-01.tar.gz ./
```

## ⚙️ 配置

在 `.env` 文件中：

```bash
# 备份目录
BACKUP_DIR=./backups

# 最大备份数量
MAX_BACKUPS=10
```

## 📖 完整文档

查看详细文档：[docs/BACKUP_GUIDE.md](docs/BACKUP_GUIDE.md)

---

**重要：** 定期备份是数据安全的关键！
