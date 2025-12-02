# 项目目录结构

## 📁 根目录

```
modbus-rtu-manager/
├── alarm/                    # 告警管理模块
│   ├── AlarmManager.js      # 告警管理器
│   └── NotificationManager.js # 通知管理器
├── backup/                   # 备份管理模块
│   └── BackupManager.js     # 备份管理器
├── backups/                  # 备份文件存储目录
├── cluster/                  # 集群管理模块
│   └── ClusterManager.js    # 集群管理器
├── config/                   # 配置文件
│   ├── cluster.config.js    # 集群配置
│   ├── database.config.js   # 数据库配置
│   └── system.config.js     # 系统配置
├── database/                 # 数据库模块
│   ├── adapters/            # 数据库适配器
│   └── index.js             # 数据库主文件
├── docs/                     # 📚 文档目录
│   ├── guides/              # 详细指南
│   ├── quickstart/          # 快速开始指南
│   ├── *.md                 # 其他文档
│   └── README_CN.md         # 中文说明
├── public/                   # 前端静态文件
│   ├── images/              # 图片资源
│   ├── uploads/             # 上传文件
│   ├── app.js               # 前端主脚本
│   ├── device-initializer.html # 设备初始化工具
│   ├── index.html           # 主页面
│   └── style.css            # 样式文件
├── scripts/                  # 脚本工具
│   ├── linux/               # Linux 脚本
│   ├── windows/             # Windows 脚本
│   └── *.sh                 # Shell 脚本
├── time/                     # ⏰ 时间同步模块
│   ├── NTPServer.js         # NTP 服务器
│   ├── TimeSync.js          # 时间同步管理器
│   └── TimeSyncMonitor.js   # 时间同步监控
├── tools/                    # 🔧 工具模块
│   └── ModbusDeviceInitializer.js # 设备初始化工具
├── .env.example              # 环境变量示例
├── .env.notification.example # 通知配置示例
├── database.js               # 数据库接口
├── modbusManager.js          # Modbus 管理器
├── package.json              # 项目配置
├── README.md                 # 项目说明
└── server.js                 # 服务器主文件
```

## 📚 文档目录结构

```
docs/
├── guides/                   # 详细使用指南
│   ├── GPS_PPS_SETUP.md     # GPS PPS 配置指南
│   ├── NTP_SERVER_GUIDE.md  # NTP 服务器指南
│   ├── SYSTEM_SETTINGS_GUIDE.md # 系统设置指南
│   ├── TIME_SETTINGS_GUIDE.md # 时间设置指南
│   ├── TIME_SYNC_GUIDE.md   # 时间同步指南
│   ├── TOPOLOGY_GUIDE.md    # 拓扑图指南
│   ├── ALARM_GUIDE.md       # 告警指南
│   ├── BACKUP_GUIDE.md      # 备份指南
│   ├── CLUSTER_GUIDE.md     # 集群指南
│   ├── DATABASE_GUIDE.md    # 数据库指南
│   └── DOCKER_GUIDE.md      # Docker 指南
├── quickstart/               # 快速开始指南
│   ├── TIME_SYNC_QUICKSTART.md # 时间同步快速开始
│   ├── ALARM_QUICKSTART.md  # 告警快速开始
│   ├── BACKUP_QUICKSTART.md # 备份快速开始
│   ├── CLUSTER_MONITORING_QUICKSTART.md # 集群监控快速开始
│   ├── DATABASE_QUICKSTART.md # 数据库快速开始
│   └── DOCKER_QUICKSTART.md # Docker 快速开始
├── BROWSER_COMPATIBILITY.md  # 浏览器兼容性
├── CHANGELOG.md              # 更新日志
├── DEMO.md                   # 演示说明
├── DIRECTORY_STRUCTURE.md    # 目录结构（本文件）
├── FEATURES_SUMMARY.md       # 功能总结
├── FILES_OVERVIEW.md         # 文件概览
├── INDEX.md                  # 文档索引
├── INSTALL.md                # 安装指南
├── PROJECT_COMPLETE.md       # 项目完成说明
├── PROJECT_OVERVIEW.md       # 项目概览
├── PROJECT_STRUCTURE.md      # 项目结构
├── QUICK_REFERENCE.md        # 快速参考
├── QUICK_START.md            # 快速开始
├── README_CN.md              # 中文说明
├── RELEASE_NOTES.md          # 发布说明
├── SERVICE_GUIDE.md          # 服务指南
├── START.md                  # 启动指南
├── SUMMARY.md                # 总结
├── TIME_SYNC_SUMMARY.md      # 时间同步总结
└── 使用说明.md               # 中文使用说明
```

## 🔧 核心模块说明

### 1. 告警管理 (alarm/)
- **AlarmManager.js**: 管理告警规则、触发告警、记录告警历史
- **NotificationManager.js**: 处理邮件、短信、企业微信、钉钉通知

### 2. 备份管理 (backup/)
- **BackupManager.js**: 数据库备份、配置备份、自动备份、还原功能

### 3. 集群管理 (cluster/)
- **ClusterManager.js**: 多节点集群、任务分配、负载均衡、故障转移

### 4. 数据库 (database/)
- **adapters/**: 支持 SQLite、MySQL、PostgreSQL
- **index.js**: 统一数据库接口

### 5. 时间同步 (time/)
- **TimeSync.js**: 支持本地时钟、GPS、GPS+PPS、NTP
- **NTPServer.js**: NTP 服务器，可使用 GPS 作为时钟源
- **TimeSyncMonitor.js**: 监控时间同步状态和精度

### 6. 工具 (tools/)
- **ModbusDeviceInitializer.js**: 初始化新的 Modbus 从节点设备

## 📄 主要文件说明

### 配置文件
- **.env.example**: 环境变量配置示例
- **.env.notification.example**: 通知配置示例
- **config/*.config.js**: 各模块配置文件

### 核心文件
- **server.js**: Express 服务器主文件
- **modbusManager.js**: Modbus 设备管理
- **database.js**: 数据库操作接口

### 前端文件
- **public/index.html**: 主界面
- **public/app.js**: 前端逻辑
- **public/device-initializer.html**: 设备初始化工具界面

## 🚀 快速导航

### 新手入门
1. [README.md](../README.md) - 项目介绍
2. [docs/INSTALL.md](INSTALL.md) - 安装指南
3. [docs/QUICK_START.md](QUICK_START.md) - 快速开始

### 功能指南
- [时间同步](guides/TIME_SYNC_GUIDE.md)
- [GPS PPS 配置](guides/GPS_PPS_SETUP.md)
- [NTP 服务器](guides/NTP_SERVER_GUIDE.md)
- [告警管理](guides/ALARM_GUIDE.md)
- [备份还原](guides/BACKUP_GUIDE.md)
- [集群部署](guides/CLUSTER_GUIDE.md)

### 快速开始
- [时间同步快速开始](quickstart/TIME_SYNC_QUICKSTART.md)
- [告警快速开始](quickstart/ALARM_QUICKSTART.md)
- [备份快速开始](quickstart/BACKUP_QUICKSTART.md)
- [Docker 快速开始](quickstart/DOCKER_QUICKSTART.md)

## 📊 数据存储

### 数据库文件
- **modbus.db**: SQLite 数据库（默认）
- **backups/**: 备份文件存储

### 上传文件
- **public/uploads/**: 用户上传的文件（如 Logo）
- **public/images/**: 系统图片资源

## 🔒 配置文件

### 环境变量
- **.env**: 主配置文件（不提交到 Git）
- **.env.example**: 配置示例

### 系统配置
- **config/system.config.js**: 系统配置
- **config/database.config.js**: 数据库配置
- **config/cluster.config.js**: 集群配置

## 📝 开发说明

### 添加新功能
1. 在相应模块目录创建文件
2. 在 server.js 中注册路由
3. 在 public/ 中添加前端界面
4. 在 docs/ 中添加文档

### 文档规范
- 详细指南放在 `docs/guides/`
- 快速开始放在 `docs/quickstart/`
- 项目级文档放在 `docs/` 根目录

---

**版本**: v2.0.0  
**更新**: 2024-12-01
