# Docker 快速开始

## 🐳 一键部署

### 单机模式（最简单）

```bash
docker-compose -f docker-compose.simple.yml up -d
```

访问：http://localhost:3000

### 停止服务

```bash
docker-compose -f docker-compose.simple.yml down
```

## 📋 其他部署模式

### MySQL 模式

```bash
docker-compose --profile mysql up -d
```

### PostgreSQL 模式

```bash
docker-compose --profile postgres up -d
```

### 集群模式

```bash
docker-compose --profile cluster up -d
```

## 🔧 常用命令

```bash
# 查看日志
docker-compose logs -f

# 查看状态
docker-compose ps

# 重启服务
docker-compose restart

# 进入容器
docker exec -it modbus-manager sh

# 查看资源使用
docker stats
```

## 📊 配置串口

编辑 `docker-compose.simple.yml`：

```yaml
devices:
  - /dev/ttyUSB0:/dev/ttyUSB0  # 修改为实际串口
```

查看可用串口：
```bash
ls -l /dev/tty*
```

## 🔍 故障排查

### 查看日志
```bash
docker-compose logs modbus-manager
```

### 重新构建
```bash
docker-compose build --no-cache
docker-compose up -d
```

### 清理并重启
```bash
docker-compose down -v
docker-compose up -d
```

## 📖 完整文档

查看详细文档：[docs/DOCKER_GUIDE.md](docs/DOCKER_GUIDE.md)

---

**就这么简单！** 🚀
