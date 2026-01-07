# Docker 部署指南

## 📦 概述

Modbus RTU Manager 提供完整的 Docker 支持，可以快速部署单机或集群模式。

## 🚀 快速开始

### 前提条件

- Docker >= 20.10
- Docker Compose >= 2.0

### 安装 Docker

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**CentOS/RHEL:**
```bash
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
```

**Windows/Mac:**
下载并安装 [Docker Desktop](https://www.docker.com/products/docker-desktop)

## 📋 部署模式

### 1. 单机模式（推荐入门）

最简单的部署方式，使用 SQLite 数据库。

```bash
# 使用简化配置
docker-compose -f docker-compose.simple.yml up -d

# 或使用完整配置
docker-compose --profile standalone up -d
```

访问：http://localhost:3000

### 2. MySQL 模式

使用 MySQL 数据库的单机部署。

```bash
docker-compose --profile mysql up -d
```

### 3. PostgreSQL 模式

使用 PostgreSQL 数据库的单机部署。

```bash
docker-compose --profile postgres up -d
```

### 4. 集群模式

多节点分布式部署。

```bash
docker-compose --profile cluster up -d
```

包含：
- 1 个 Master 节点（端口 3000）
- 2 个 Worker 节点（端口 3001, 3002）
- MySQL 数据库
- Redis 消息队列

## 🔧 配置说明

### 环境变量

在 `docker-compose.yml` 中修改环境变量：

```yaml
environment:
  - PORT=3000
  - NODE_ENV=production
  - DB_TYPE=sqlite
  - DB_FILE=/app/data/modbus.db
  - CLUSTER_ENABLED=false
```

### 串口设备

修改 `devices` 配置以匹配实际串口：

```yaml
devices:
  - /dev/ttyUSB0:/dev/ttyUSB0  # USB 串口
  - /dev/ttyAMA0:/dev/ttyAMA0  # 树莓派硬件串口
  - /dev/ttyS0:/dev/ttyS0      # 标准串口
```

查看可用串口：
```bash
ls -l /dev/tty*
```

### 数据持久化

数据存储在 Docker volumes 中：

```yaml
volumes:
  - ./data:/app/data           # 应用数据
  - mysql-data:/var/lib/mysql  # MySQL 数据
  - redis-data:/data           # Redis 数据
```

## 📝 常用命令

### 启动服务

```bash
# 单机模式
docker-compose -f docker-compose.simple.yml up -d

# 集群模式
docker-compose --profile cluster up -d

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f modbus-master
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据
docker-compose down -v
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart modbus-master
```

### 查看状态

```bash
# 查看运行中的容器
docker-compose ps

# 查看资源使用
docker stats
```

### 进入容器

```bash
# 进入容器 shell
docker exec -it modbus-manager sh

# 查看日志
docker logs modbus-manager

# 实时日志
docker logs -f modbus-manager
```

## 🔍 故障排查

### 串口访问问题

**问题：** 无法访问串口设备

**解决：**
```bash
# 1. 检查串口设备
ls -l /dev/ttyUSB*

# 2. 添加用户到 dialout 组
sudo usermod -aG dialout $USER

# 3. 确保容器有 privileged 权限
# 在 docker-compose.yml 中设置:
privileged: true
```

### 容器无法启动

**问题：** 容器启动失败

**解决：**
```bash
# 查看详细日志
docker-compose logs modbus-manager

# 检查端口占用
sudo netstat -tulpn | grep 3000

# 重新构建镜像
docker-compose build --no-cache
```

### 数据库连接失败

**问题：** 无法连接数据库

**解决：**
```bash
# 检查数据库容器状态
docker-compose ps mysql

# 查看数据库日志
docker-compose logs mysql

# 等待数据库完全启动
docker-compose up -d mysql
sleep 10
docker-compose up -d modbus-manager
```

### 网络问题

**问题：** 容器间无法通信

**解决：**
```bash
# 检查网络
docker network ls
docker network inspect modbus-network

# 重新创建网络
docker-compose down
docker-compose up -d
```

## 🏗️ 自定义构建

### 修改 Dockerfile

```dockerfile
FROM node:18-alpine

# 添加自定义依赖
RUN apk add --no-cache your-package

# 其他配置...
```

### 构建自定义镜像

```bash
# 构建镜像
docker build -t modbus-manager:custom .

# 使用自定义镜像
docker run -d \
  --name modbus-manager \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --device /dev/ttyUSB0:/dev/ttyUSB0 \
  --privileged \
  modbus-manager:custom
```

## 🌐 生产部署

### 使用外部数据库

修改 `docker-compose.yml`：

```yaml
services:
  modbus-manager:
    environment:
      - DB_TYPE=mysql
      - DB_HOST=external-mysql-server.com
      - DB_PORT=3306
      - DB_USER=modbus_user
      - DB_PASSWORD=secure_password
      - DB_NAME=modbus_manager
```

### 使用环境变量文件

创建 `.env` 文件：

```bash
# .env
PORT=3000
DB_TYPE=mysql
DB_HOST=mysql
DB_USER=modbus_user
DB_PASSWORD=secure_password
DB_NAME=modbus_manager
```

使用：
```bash
docker-compose --env-file .env up -d
```

### 反向代理（Nginx）

```nginx
server {
    listen 80;
    server_name modbus.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL/TLS 支持

使用 Let's Encrypt：

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d modbus.example.com

# 自动续期
sudo certbot renew --dry-run
```

## 📊 监控和日志

### 日志管理

```bash
# 查看日志
docker-compose logs -f

# 限制日志大小
# 在 docker-compose.yml 中添加:
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### 健康检查

```bash
# 检查容器健康状态
docker ps

# 查看健康检查日志
docker inspect --format='{{json .State.Health}}' modbus-manager
```

### 资源限制

```yaml
services:
  modbus-manager:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## 🔄 备份和恢复

### 备份数据

```bash
# 备份 SQLite 数据库
docker cp modbus-manager:/app/data/modbus.db ./backup/

# 备份 MySQL 数据库
docker exec modbus-mysql mysqldump -u modbus_user -pmodbus_pass modbus_manager > backup.sql

# 备份 Docker volumes
docker run --rm -v modbus-data:/data -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz /data
```

### 恢复数据

```bash
# 恢复 SQLite 数据库
docker cp ./backup/modbus.db modbus-manager:/app/data/

# 恢复 MySQL 数据库
docker exec -i modbus-mysql mysql -u modbus_user -pmodbus_pass modbus_manager < backup.sql

# 恢复 Docker volumes
docker run --rm -v modbus-data:/data -v $(pwd):/backup alpine tar xzf /backup/data-backup.tar.gz -C /
```

## 🚢 多架构支持

### 构建多架构镜像

```bash
# 创建 buildx builder
docker buildx create --name multiarch --use

# 构建并推送多架构镜像
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t your-registry/modbus-manager:latest \
  --push .
```

### 树莓派部署

```bash
# 使用 ARM 架构镜像
docker-compose -f docker-compose.simple.yml up -d
```

## 📦 Docker Hub 部署

### 推送镜像

```bash
# 登录 Docker Hub
docker login

# 标记镜像
docker tag modbus-manager:latest your-username/modbus-manager:latest

# 推送镜像
docker push your-username/modbus-manager:latest
```

### 使用预构建镜像

```yaml
services:
  modbus-manager:
    image: your-username/modbus-manager:latest
    # 其他配置...
```

## 🔐 安全建议

1. **不要使用默认密码**
   ```yaml
   environment:
     - MYSQL_ROOT_PASSWORD=change_this_password
     - MYSQL_PASSWORD=change_this_password
   ```

2. **限制网络访问**
   ```yaml
   ports:
     - "127.0.0.1:3000:3000"  # 只允许本地访问
   ```

3. **使用 secrets**
   ```yaml
   secrets:
     db_password:
       file: ./secrets/db_password.txt
   ```

4. **定期更新镜像**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

## 📈 性能优化

### 资源配置

```yaml
services:
  modbus-manager:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
    environment:
      - NODE_OPTIONS=--max-old-space-size=1024
```

### 网络优化

```yaml
networks:
  default:
    driver: bridge
    driver_opts:
      com.docker.network.driver.mtu: 1500
```

## 🧪 开发环境

### 开发模式

```yaml
services:
  modbus-dev:
    build: .
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
    environment:
      - NODE_ENV=development
```

### 热重载

```bash
docker-compose -f docker-compose.dev.yml up
```

## 📚 示例配置

### 完整的生产配置

```yaml
version: '3.8'

services:
  modbus-manager:
    image: modbus-manager:latest
    container_name: modbus-production
    restart: always
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - modbus-data:/app/data
    environment:
      - NODE_ENV=production
      - DB_TYPE=postgresql
      - DB_HOST=postgres
      - DB_USER=modbus_user
      - DB_PASSWORD_FILE=/run/secrets/db_password
      - DB_NAME=modbus_manager
    secrets:
      - db_password
    depends_on:
      - postgres
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  postgres:
    image: postgres:15-alpine
    restart: always
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password

volumes:
  modbus-data:
  postgres-data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

---

**需要帮助？** 查看 [Docker 官方文档](https://docs.docker.com/) 或提交 Issue！
