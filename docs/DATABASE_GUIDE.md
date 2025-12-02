# 数据库配置指南

Modbus RTU Manager 支持三种数据库：SQLite、MySQL 和 PostgreSQL。

## 📊 支持的数据库

| 数据库 | 适用场景 | 优点 | 缺点 |
|--------|---------|------|------|
| **SQLite** | 小型部署、嵌入式设备 | 无需配置、零依赖、轻量级 | 并发性能有限 |
| **MySQL** | 中大型部署、多用户 | 成熟稳定、性能好、生态丰富 | 需要独立服务器 |
| **PostgreSQL** | 企业级部署、复杂查询 | 功能强大、标准兼容、扩展性好 | 资源占用较高 |

## 🚀 快速开始

### 默认配置（SQLite）

无需任何配置，开箱即用：

```bash
npm install
node server.js
```

数据库文件自动创建在 `./modbus.db`

### 使用 MySQL

#### 1. 安装 MySQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

**CentOS/RHEL:**
```bash
sudo yum install mysql-server
sudo systemctl start mysqld
sudo mysql_secure_installation
```

**Windows:**
下载并安装 [MySQL Community Server](https://dev.mysql.com/downloads/mysql/)

#### 2. 创建数据库

```sql
-- 登录 MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE modbus_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（可选）
CREATE USER 'modbus_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON modbus_manager.* TO 'modbus_user'@'localhost';
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

#### 3. 配置环境变量

创建 `.env` 文件：

```bash
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=modbus_user
DB_PASSWORD=your_password
DB_NAME=modbus_manager
```

#### 4. 启动服务

```bash
node server.js
```

### 使用 PostgreSQL

#### 1. 安装 PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**CentOS/RHEL:**
```bash
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
```

**Windows:**
下载并安装 [PostgreSQL](https://www.postgresql.org/download/windows/)

#### 2. 创建数据库

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 在 psql 中执行
CREATE DATABASE modbus_manager;
CREATE USER modbus_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE modbus_manager TO modbus_user;

# 退出
\q
```

#### 3. 配置环境变量

创建 `.env` 文件：

```bash
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_USER=modbus_user
DB_PASSWORD=your_password
DB_NAME=modbus_manager
```

#### 4. 启动服务

```bash
node server.js
```

## ⚙️ 配置说明

### 环境变量

所有配置通过环境变量设置，支持 `.env` 文件。

#### 通用配置

```bash
# 服务器端口
PORT=3000

# 运行环境
NODE_ENV=production

# 数据库类型
DB_TYPE=sqlite  # 可选: sqlite, mysql, postgresql
```

#### SQLite 配置

```bash
DB_TYPE=sqlite
DB_FILE=./modbus.db  # 数据库文件路径
```

#### MySQL 配置

```bash
DB_TYPE=mysql
DB_HOST=localhost      # 数据库主机
DB_PORT=3306          # 端口
DB_USER=root          # 用户名
DB_PASSWORD=password  # 密码
DB_NAME=modbus_manager  # 数据库名
```

#### PostgreSQL 配置

```bash
DB_TYPE=postgresql
DB_HOST=localhost      # 数据库主机
DB_PORT=5432          # 端口
DB_USER=postgres      # 用户名
DB_PASSWORD=password  # 密码
DB_NAME=modbus_manager  # 数据库名
```

### 配置文件

配置文件位于 `config/database.config.js`，可以直接修改默认值。

## 📋 数据库表结构

### devices 表

存储设备配置信息。

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | INTEGER/INT/SERIAL | 主键 |
| name | TEXT/VARCHAR | 设备名称 |
| slave_id | INTEGER/INT | 从站ID |
| port | TEXT/VARCHAR | 串口路径 |
| baudrate | INTEGER/INT | 波特率 |
| register_address | INTEGER/INT | 寄存器地址 |
| register_count | INTEGER/INT | 寄存器数量 |
| data_type | TEXT/VARCHAR | 数据类型 |
| interval | INTEGER/INT | 采集间隔(ms) |
| enabled | INTEGER/TINYINT/SMALLINT | 是否启用 |
| connection_type | TEXT/VARCHAR | 连接类型 |
| ip_address | TEXT/VARCHAR | IP地址 |
| tcp_port | INTEGER/INT | TCP端口 |

### data 表

存储采集的数据。

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | INTEGER/BIGINT/BIGSERIAL | 主键 |
| device_id | INTEGER/INT | 设备ID（外键） |
| value | REAL/DOUBLE | 数据值 |
| timestamp | INTEGER/BIGINT | 时间戳 |

## 🔄 数据库迁移

### 从 SQLite 迁移到 MySQL/PostgreSQL

#### 1. 导出 SQLite 数据

```bash
# 安装 sqlite3
sudo apt install sqlite3

# 导出为 SQL
sqlite3 modbus.db .dump > backup.sql
```

#### 2. 转换并导入

**MySQL:**
```bash
# 编辑 backup.sql，调整语法差异
# 然后导入
mysql -u modbus_user -p modbus_manager < backup.sql
```

**PostgreSQL:**
```bash
# 编辑 backup.sql，调整语法差异
# 然后导入
psql -U modbus_user -d modbus_manager -f backup.sql
```

#### 3. 更新配置

修改 `.env` 文件，更改 `DB_TYPE`。

#### 4. 重启服务

```bash
node server.js
```

## 🔧 故障排查

### MySQL 连接失败

**问题：** `ER_NOT_SUPPORTED_AUTH_MODE`

**解决：**
```sql
ALTER USER 'modbus_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

**问题：** `ER_ACCESS_DENIED_ERROR`

**解决：**
- 检查用户名和密码
- 检查用户权限
- 检查防火墙设置

### PostgreSQL 连接失败

**问题：** `password authentication failed`

**解决：**
1. 编辑 `pg_hba.conf`
2. 修改认证方式为 `md5`
3. 重启 PostgreSQL

**问题：** `FATAL: database does not exist`

**解决：**
```bash
sudo -u postgres createdb modbus_manager
```

### SQLite 文件权限

**问题：** `SQLITE_CANTOPEN`

**解决：**
```bash
# 检查文件权限
ls -l modbus.db

# 修改权限
chmod 666 modbus.db
```

## 📊 性能优化

### MySQL 优化

```sql
-- 添加索引
CREATE INDEX idx_device_timestamp ON data(device_id, timestamp);

-- 定期清理旧数据
DELETE FROM data WHERE timestamp < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 DAY)) * 1000;

-- 优化表
OPTIMIZE TABLE data;
```

### PostgreSQL 优化

```sql
-- 添加索引
CREATE INDEX idx_device_timestamp ON data(device_id, timestamp DESC);

-- 定期清理
DELETE FROM data WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000;

-- 清理和分析
VACUUM ANALYZE data;
```

### SQLite 优化

```sql
-- 定期清理
DELETE FROM data WHERE timestamp < (strftime('%s', 'now') - 2592000) * 1000;

-- 优化数据库
VACUUM;
```

## 🔐 安全建议

1. **使用强密码**
   - 数据库用户密码至少12位
   - 包含大小写字母、数字和特殊字符

2. **限制访问**
   - 仅允许本地连接
   - 使用防火墙限制端口访问

3. **定期备份**
   - 设置自动备份计划
   - 测试备份恢复流程

4. **更新维护**
   - 定期更新数据库版本
   - 应用安全补丁

## 📦 备份和恢复

### SQLite

**备份：**
```bash
cp modbus.db modbus_backup_$(date +%Y%m%d).db
```

**恢复：**
```bash
cp modbus_backup_20240101.db modbus.db
```

### MySQL

**备份：**
```bash
mysqldump -u modbus_user -p modbus_manager > backup_$(date +%Y%m%d).sql
```

**恢复：**
```bash
mysql -u modbus_user -p modbus_manager < backup_20240101.sql
```

### PostgreSQL

**备份：**
```bash
pg_dump -U modbus_user modbus_manager > backup_$(date +%Y%m%d).sql
```

**恢复：**
```bash
psql -U modbus_user modbus_manager < backup_20240101.sql
```

## 🌟 推荐配置

### 开发环境
- **数据库：** SQLite
- **原因：** 快速启动，无需配置

### 小型部署（< 10 设备）
- **数据库：** SQLite
- **原因：** 简单可靠，资源占用少

### 中型部署（10-100 设备）
- **数据库：** MySQL
- **原因：** 性能好，成熟稳定

### 大型部署（> 100 设备）
- **数据库：** PostgreSQL
- **原因：** 功能强大，扩展性好

### 树莓派
- **数据库：** SQLite 或 MySQL
- **原因：** 资源占用适中

## 📞 技术支持

遇到问题？

1. 查看日志输出
2. 检查数据库连接
3. 验证配置文件
4. 查阅本文档

---

**祝使用愉快！** 🚀
