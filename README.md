# Modbus RTU Manager

> 功能强大的工业设备管理系统，支持 Modbus RTU/TCP 协议，提供 Web 界面进行设备管理、数据采集和实时监控。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)

[English](README.md) | [中文文档](docs/README_CN.md) | [项目概览](PROJECT_OVERVIEW.md)

## ✨ 功能特性

- ✅ **双协议支持** - Modbus RTU（串口）和 Modbus TCP（网络）
- ✅ **设备管理** - 添加、编辑、删除设备
- ✅ **数据采集** - 定期自动采集设备数据
- ✅ **实时监控** - WebSocket 实时推送数据更新
- ✅ **图形化显示** - 实时数据图表展示
- ✅ **拓扑图** - 可视化设备网络结构和状态
- ✅ **告警管理** - 阈值告警，支持邮件/短信/企业微信/钉钉通知
- ✅ **系统设置** - 自定义系统名称、Logo 和主题色
- ✅ **时间同步** - 支持本地时钟、GPS 和 NTP 时间源
- ✅ **系统监控** - CPU、内存、磁盘、网络信息监控
- ✅ **集群监控** - 实时查看集群节点状态和任务分配
- ✅ **远程配置** - 通过 Modbus 写入寄存器修改设备 IP
- ✅ **多数据库支持** - SQLite / MySQL / PostgreSQL
- ✅ **分布式集群** - 支持多节点分布式部署（可选）
- ✅ **备份还原** - 完整的备份和还原功能
- ✅ **开机自启** - 支持 Windows 和 Linux 系统服务
- ✅ **树莓派优化** - 专门优化的树莓派部署方案

## 🚀 快速开始

### 🐳 Docker 部署（推荐）

最简单的部署方式：

```bash
# 单机模式
docker-compose -f docker-compose.simple.yml up -d

# 访问应用
http://localhost:3000
```

详细说明：[Docker 部署指南](docs/DOCKER_GUIDE.md)

### 💻 传统部署

#### Windows 系统

```bash
# 双击运行
install.bat
```

#### Linux / 树莓派

```bash
# 添加执行权限
chmod +x install.sh

# 运行安装向导
bash install.sh
```

#### 手动安装

```bash
# 1. 安装依赖
npm install

# 2. 启动服务
npm start
# 或
node src/server.js

# 3. 访问应用
# 浏览器打开: http://localhost:3000
```

## 📁 项目结构

```
modbus-rtu-manager/
├── src/                      # 源代码目录 ⭐ v2.0 新结构
│   ├── server.js            # 服务器主文件
│   ├── database.js          # 数据库操作
│   ├── modbusManager.js     # Modbus 通信管理
│   ├── alarm/               # 告警模块
│   ├── backup/              # 备份模块
│   ├── cluster/             # 集群模块
│   ├── config/              # 配置模块
│   ├── database/            # 数据库适配器
│   ├── monitoring/          # 监控模块
│   ├── time/                # 时间同步模块
│   └── tools/               # 工具模块
│
├── public/                   # 前端文件
│   ├── index.html           # 主页面
│   ├── app.js               # 前端脚本
│   ├── style.css            # 样式文件
│   └── uploads/             # 上传文件
│
├── docs/                     # 文档目录
│   ├── README.md            # 文档索引
│   ├── guides/              # 详细指南
│   └── quickstart/          # 快速开始
│
├── scripts/                  # 脚本文件
│   ├── windows/             # Windows 服务脚本
│   │   ├── install-service.bat
│   │   ├── start-service.bat
│   │   ├── stop-service.bat
│   │   └── uninstall-service.bat
│   └── linux/               # Linux 服务脚本
│       ├── install-service.sh
│       ├── install-raspberry-pi.sh  # 树莓派专用
│       ├── check-system.sh          # 系统检测
│       ├── start-service.sh
│       ├── stop-service.sh
│       ├── restart-service.sh
│       ├── status-service.sh
│       └── logs-service.sh
│
└── docs/                     # 文档
    ├── QUICK_START.md       # 快速开始
    ├── INSTALL.md           # 安装说明
    ├── SERVICE_GUIDE.md     # 服务安装指南
    ├── RASPBERRY_PI_GUIDE.md # 树莓派部署指南
    ├── FILES_OVERVIEW.md    # 文件说明
    ├── README_CN.md         # 中文文档
    └── 使用说明.md          # 使用说明
```

## 📖 文档

### 快速开始
- **[快速开始](docs/QUICK_START.md)** - 5分钟上手指南
- **[安装说明](docs/INSTALL.md)** - 详细安装步骤
- **[告警快速开始](ALARM_QUICKSTART.md)** - 告警功能快速配置
- **[功能总结](FEATURES_SUMMARY.md)** - 完整功能列表
- **[发布说明](RELEASE_NOTES.md)** - 版本更新日志

### 部署指南
- **[数据库配置](docs/DATABASE_GUIDE.md)** - MySQL/PostgreSQL 配置指南
- **[集群部署](docs/CLUSTER_GUIDE.md)** - 分布式集群部署指南
- **[Docker 部署](docs/DOCKER_GUIDE.md)** - Docker 容器化部署指南
- **[树莓派部署指南](docs/RASPBERRY_PI_GUIDE.md)** - 树莓派专用指南
- **[服务安装指南](docs/SERVICE_GUIDE.md)** - Windows/Linux 服务配置

### 功能指南
- **[设备拓扑图指南](TOPOLOGY_GUIDE.md)** - 可视化设备网络结构
- **[告警管理指南](docs/ALARM_GUIDE.md)** - 告警配置和通知设置
- **[系统设置指南](SYSTEM_SETTINGS_GUIDE.md)** - 自定义系统外观
- **[时间设置指南](TIME_SETTINGS_GUIDE.md)** - 配置时区和时间格式
- **[时间同步指南](TIME_SYNC_GUIDE.md)** - GPS 和 NTP 时间同步
- **[集群监控指南](docs/CLUSTER_MONITORING_GUIDE.md)** - 集群节点监控
- **[备份还原](docs/BACKUP_GUIDE.md)** - 数据备份和还原指南
- **[文件说明](docs/FILES_OVERVIEW.md)** - 项目文件结构说明

## 🍓 树莓派部署

树莓派用户推荐使用一键安装脚本：

```bash
# 方法1: 使用安装向导
bash install.sh
# 选择选项 1 (树莓派一键安装)

# 方法2: 直接运行
chmod +x scripts/linux/install-raspberry-pi.sh
sudo bash scripts/linux/install-raspberry-pi.sh
```

脚本会自动：
- ✅ 检测树莓派型号
- ✅ 安装 Node.js（如需要）
- ✅ 配置串口权限
- ✅ 安装项目依赖
- ✅ 创建系统服务
- ✅ 优化内存配置

详细说明：[树莓派部署指南](docs/RASPBERRY_PI_GUIDE.md)

## 🔧 系统服务管理

### Windows

```bash
# 安装服务
scripts\windows\install-service.bat  (以管理员身份运行)

# 启动/停止服务
scripts\windows\start-service.bat
scripts\windows\stop-service.bat

# 卸载服务
scripts\windows\uninstall-service.bat
```

### Linux

```bash
# 启动服务
bash scripts/linux/start-service.sh

# 停止服务
bash scripts/linux/stop-service.sh

# 重启服务
bash scripts/linux/restart-service.sh

# 查看状态
bash scripts/linux/status-service.sh

# 查看日志
bash scripts/linux/logs-service.sh

# 系统检测
bash scripts/linux/check-system.sh
```

## 💻 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite / MySQL / PostgreSQL（多数据库支持）
- **通信**: Modbus RTU/TCP (modbus-serial)
- **实时通信**: WebSocket
- **系统信息**: systeminformation
- **Windows 服务**: node-windows
- **Linux 服务**: systemd
- **前端**: 原生 JavaScript + Canvas

## 🌟 主要功能

### 1. 设备管理
- 支持 Modbus RTU（串口）和 TCP（网络）
- 添加、编辑、删除设备
- 配置寄存器地址、数据类型、采集间隔

### 2. 数据采集
- 自动定期采集设备数据
- 支持多种数据类型（保持寄存器、输入寄存器、线圈、离散输入）
- WebSocket 实时推送

### 3. 数据可视化
- 实时数据图表
- 历史数据曲线
- 自定义时间范围

### 4. 系统监控
- CPU 使用率
- 内存使用情况
- 磁盘空间
- 网络接口信息

### 5. 远程配置
- 修改 Client 端连接 IP
- 通过 Modbus 修改设备自身 IP

## ⚙️ 配置说明

### 串口配置

**Windows:**
- 串口格式：COM1, COM2, COM3...
- 查看：设备管理器 → 端口

**Linux:**
- 串口格式：/dev/ttyUSB0, /dev/ttyAMA0, /dev/ttyS0...
- 权限配置：`sudo usermod -a -G dialout $USER`

### 网络配置

- 默认端口：3000
- 修改端口：编辑 `server.js` 或设置环境变量 `PORT=8080`

## 🐛 故障排查

### 串口无法访问
- Windows: 检查设备管理器中的串口号
- Linux: 检查串口权限和设备路径

### 服务无法启动
- 检查 Node.js 是否安装
- 检查依赖是否安装完整
- 查看服务日志

### 端口被占用
- Windows: `netstat -ano | findstr :3000`
- Linux: `sudo lsof -i :3000`

### 更多问题
- 运行系统检测：`bash scripts/linux/check-system.sh`
- 查看日志：`bash scripts/linux/logs-service.sh`
- 查阅文档：[docs/](docs/)

## 📝 版本信息

**当前版本**: v2.0.0  
**发布日期**: 2024-12-02

### v2.0.0 重大更新

- ✅ **项目结构重构** - 代码移至 `src/` 目录，结构更清晰
- ✅ **位置管理功能** - 新增设备位置管理，支持层级化组织
- ✅ **界面优化** - 改进模态框布局和响应式设计
- ✅ **文档完善** - 新增迁移指南和详细文档

**从 v1.x 升级？** 请查看 [迁移指南](docs/MIGRATION_V2.md)

### 更新日志

完整的更新日志请查看 [CHANGELOG.md](docs/CHANGELOG.md)

## 📚 文档

- [📖 完整文档](docs/README.md) - 文档中心
- [🚀 快速开始](docs/QUICK_START.md) - 5分钟上手
- [📁 项目结构](docs/PROJECT_STRUCTURE_NEW.md) - 详细的项目结构说明
- [🔄 迁移指南](docs/MIGRATION_V2.md) - v1.x → v2.0 升级指南
- [🐳 Docker 部署](docs/DOCKER_GUIDE.md) - 容器化部署
- [🔧 集群部署](docs/CLUSTER_GUIDE.md) - 高可用集群
- [📍 位置管理](docs/guides/LOCATION_GUIDE.md) - 设备位置管理
- [🚨 告警配置](docs/ALARM_GUIDE.md) - 告警和通知
- [💾 备份恢复](docs/BACKUP_GUIDE.md) - 数据备份

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

在贡献之前，请阅读 [贡献指南](docs/CONTRIBUTING.md)。

## 📧 联系方式

- 📮 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-repo/discussions)
- 📖 Wiki: [项目 Wiki](https://github.com/your-repo/wiki)

## 🙏 致谢

感谢所有为本项目做出贡献的开发者！

---

**⭐ 如果这个项目对您有帮助，请给我们一个 Star！**

**祝使用愉快！** 🚀
