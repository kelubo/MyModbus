# Modbus RTU Manager - Makefile

.PHONY: help build start stop restart logs clean

help:
	@echo "Modbus RTU Manager - Docker 命令"
	@echo ""
	@echo "使用方法:"
	@echo "  make build          - 构建 Docker 镜像"
	@echo "  make start          - 启动服务（单机模式）"
	@echo "  make start-mysql    - 启动服务（MySQL 模式）"
	@echo "  make start-cluster  - 启动服务（集群模式）"
	@echo "  make stop           - 停止服务"
	@echo "  make restart        - 重启服务"
	@echo "  make logs           - 查看日志"
	@echo "  make ps             - 查看状态"
	@echo "  make clean          - 清理所有数据"
	@echo ""

build:
	@echo "构建 Docker 镜像..."
	docker-compose build

start:
	@echo "启动服务（单机模式）..."
	docker-compose -f docker-compose.simple.yml up -d
	@echo "✓ 服务已启动"
	@echo "访问地址: http://localhost:3000"

start-mysql:
	@echo "启动服务（MySQL 模式）..."
	docker-compose --profile mysql up -d
	@echo "✓ 服务已启动"
	@echo "访问地址: http://localhost:3000"

start-postgres:
	@echo "启动服务（PostgreSQL 模式）..."
	docker-compose --profile postgres up -d
	@echo "✓ 服务已启动"
	@echo "访问地址: http://localhost:3000"

start-cluster:
	@echo "启动服务（集群模式）..."
	docker-compose --profile cluster up -d
	@echo "✓ 服务已启动"
	@echo "Master 节点: http://localhost:3000"
	@echo "Worker 节点 1: http://localhost:3001"
	@echo "Worker 节点 2: http://localhost:3002"

stop:
	@echo "停止服务..."
	docker-compose down
	docker-compose -f docker-compose.simple.yml down
	@echo "✓ 服务已停止"

restart:
	@echo "重启服务..."
	docker-compose restart
	@echo "✓ 服务已重启"

logs:
	docker-compose logs -f

ps:
	docker-compose ps

clean:
	@echo "清理所有数据..."
	@read -p "确定要删除所有数据吗？(y/N) " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		docker-compose down -v; \
		docker-compose -f docker-compose.simple.yml down -v; \
		rm -rf data/; \
		echo "✓ 清理完成"; \
	else \
		echo "取消清理"; \
	fi

shell:
	docker exec -it modbus-manager sh

stats:
	docker stats
