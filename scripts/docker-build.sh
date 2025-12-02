#!/bin/bash

# Docker 镜像构建脚本

echo "========================================"
echo "Modbus RTU Manager - Docker 构建"
echo "========================================"
echo ""

# 获取版本号
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "latest")

echo "版本: $VERSION"
echo ""

# 构建镜像
echo "正在构建 Docker 镜像..."
docker build -t modbus-manager:$VERSION .
docker build -t modbus-manager:latest .

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ 构建成功！"
    echo ""
    echo "镜像标签:"
    echo "  - modbus-manager:$VERSION"
    echo "  - modbus-manager:latest"
    echo ""
    echo "运行镜像:"
    echo "  docker run -d -p 3000:3000 --name modbus-manager modbus-manager:latest"
    echo ""
else
    echo ""
    echo "✗ 构建失败"
    exit 1
fi
