# 数据库快速配置

## 🚀 三种方式配置数据库

### 方式 1: 使用配置工具（推荐）

```bash
npm run db:config
```

按提示选择数据库类型并输入配置信息。

### 方式 2: 手动创建 .env 文件

复制示例文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，修改数据库配置。

### 方式 3: 使用环境变量

```bash
# SQLite (默认)
node server.js

# MySQL
DB_TYPE=mysql DB_HOST=localhost DB_USER=root DB_PASSWORD=pass DB_NAME=modbus_manager node server.js

# PostgreSQL
DB_TYPE=postgresql DB_HOST=localhost DB_USER=postgres DB_PASSWORD=pass DB_NAME=modbus_manager node server.js
```

## 📊 数据库选择建议

| 场景 | 推荐数据库 | 原因 |
|-----|-----------|------|
| 快速测试 | SQLite | 无需配置 |
| 树莓派 | SQLite | 资源占用少 |
| 小型部署 (< 10设备) | SQLite | 简单可靠 |
| 中型部署 (10-100设备) | MySQL | 性能好 |
| 大型部署 (> 100设备) | PostgreSQL | 功能强大 |
| 企业级应用 | PostgreSQL | 标准兼容 |

## 🔧 快速配置示例

### SQLite (默认)

无需配置，直接运行：
```bash
node server.js
```

### MySQL

1. 创建数据库：
```sql
CREATE DATABASE modbus_manager;
```

2. 配置：
```bash
npm run db:config
# 选择 MySQL，输入配置
```

3. 启动：
```bash
node server.js
```

### PostgreSQL

1. 创建数据库：
```bash
sudo -u postgres createdb modbus_manager
```

2. 配置：
```bash
npm run db:config
# 选择 PostgreSQL，输入配置
```

3. 启动：
```bash
node server.js
```

## 📖 详细文档

查看完整配置指南：[docs/DATABASE_GUIDE.md](docs/DATABASE_GUIDE.md)

---

**需要帮助？** 运行 `npm run db:config` 使用交互式配置工具！
