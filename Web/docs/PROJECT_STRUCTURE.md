# 项目结构说明

## 📁 目录结构

```
modbus-rtu-manager/
│
├── 📄 核心文件
│   ├── server.js              # Express 服务器主文件
│   ├── database.js            # SQLite 数据库操作
│   ├── modbusManager.js       # Modbus 通信管理
│   ├── package.json           # 项目依赖配置
│   └── modbus.db             # 数据库文件（自动生成）
│
├── 🚀 安装脚本
│   ├── install.bat            # Windows 安装向导
│   └── install.sh             # Linux 安装向导
│
├── 🌐 前端文件 (public/)
│   ├── index.html            # 主页面
│   ├── app.js                # 前端 JavaScript
│   └── style.css             # 样式文件
│
├── 🔧 脚本文件 (scripts/)
│   │
│   ├── 💻 Windows (scripts/windows/)
│   │   ├── install-service.bat      # 安装服务
│   │   ├── install-service.js       # 安装脚本
│   │   ├── uninstall-service.bat    # 卸载服务
│   │   ├── uninstall-service.js     # 卸载脚本
│   │   ├── start-service.bat        # 启动服务
│   │   └── stop-service.bat         # 停止服务
│   │
│   └── 🐧 Linux (scripts/linux/)
│       ├── install-service.sh       # 通用安装
│       ├── install-raspberry-pi.sh  # 树莓派专用 ⭐
│       ├── uninstall-service.sh     # 卸载服务
│       ├── start-service.sh         # 启动服务
│       ├── stop-service.sh          # 停止服务
│       ├── restart-service.sh       # 重启服务
│       ├── status-service.sh        # 查看状态
│       ├── logs-service.sh          # 查看日志
│       └── check-system.sh          # 系统检测 🔍
│
└── 📚 文档 (docs/)
    ├── QUICK_START.md           # 快速开始指南
    ├── INSTALL.md               # 安装说明
    ├── SERVICE_GUIDE.md         # 服务安装详细指南
    ├── RASPBERRY_PI_GUIDE.md    # 树莓派部署指南 🍓
    ├── FILES_OVERVIEW.md        # 文件说明
    ├── README_CN.md             # 中文文档
    └── 使用说明.md              # 使用说明
```

## 📝 文件说明

### 核心文件

| 文件 | 说明 |
|-----|------|
| `server.js` | Express 服务器，处理 HTTP 请求和 WebSocket 连接 |
| `database.js` | SQLite 数据库操作，设备和数据管理 |
| `modbusManager.js` | Modbus 通信管理，数据采集和写入 |
| `package.json` | npm 依赖配置 |
| `modbus.db` | SQLite 数据库文件（运行时自动创建） |

### 安装脚本

| 文件 | 平台 | 说明 |
|-----|------|------|
| `install.bat` | Windows | 安装向导，提供交互式安装 |
| `install.sh` | Linux | 安装向导，支持多种安装方式 |

### 前端文件 (public/)

| 文件 | 说明 |
|-----|------|
| `index.html` | 主页面，包含设备管理、数据图表、系统监控 |
| `app.js` | 前端逻辑，WebSocket 通信、图表绘制 |
| `style.css` | 样式文件，响应式设计 |

### Windows 脚本 (scripts/windows/)

| 文件 | 需要管理员 | 说明 |
|-----|-----------|------|
| `install-service.bat` | ✅ | 安装 Windows 服务 |
| `install-service.js` | ✅ | Node.js 安装脚本 |
| `uninstall-service.bat` | ✅ | 卸载服务 |
| `uninstall-service.js` | ✅ | Node.js 卸载脚本 |
| `start-service.bat` | ✅ | 启动服务 |
| `stop-service.bat` | ✅ | 停止服务 |

### Linux 脚本 (scripts/linux/)

| 文件 | 需要 sudo | 说明 |
|-----|----------|------|
| `install-service.sh` | ✅ | 通用 Linux 安装 |
| `install-raspberry-pi.sh` | ✅ | 树莓派一键安装（推荐） |
| `uninstall-service.sh` | ✅ | 卸载服务 |
| `start-service.sh` | ✅ | 启动服务 |
| `stop-service.sh` | ✅ | 停止服务 |
| `restart-service.sh` | ✅ | 重启服务 |
| `status-service.sh` | ✅ | 查看服务状态 |
| `logs-service.sh` | ✅ | 查看服务日志 |
| `check-system.sh` | ❌ | 系统检测工具 |

### 文档 (docs/)

| 文件 | 说明 | 推荐阅读顺序 |
|-----|------|------------|
| `QUICK_START.md` | 快速开始指南 | 1️⃣ |
| `INSTALL.md` | 详细安装说明 | 2️⃣ |
| `SERVICE_GUIDE.md` | 服务安装和管理 | 3️⃣ |
| `RASPBERRY_PI_GUIDE.md` | 树莓派专用指南 | 🍓 |
| `FILES_OVERVIEW.md` | 文件结构说明 | 📁 |
| `README_CN.md` | 中文版文档 | 🇨🇳 |
| `使用说明.md` | 中文使用说明 | 🇨🇳 |

## 🎯 快速导航

### 我想...

#### 快速开始
→ 阅读 [docs/QUICK_START.md](docs/QUICK_START.md)

#### 在 Windows 上安装
→ 运行 `install.bat`

#### 在 Linux 上安装
→ 运行 `bash install.sh`

#### 在树莓派上安装
→ 运行 `bash scripts/linux/install-raspberry-pi.sh`

#### 检测系统问题
→ 运行 `bash scripts/linux/check-system.sh`

#### 查看服务日志
→ 运行 `bash scripts/linux/logs-service.sh`

#### 了解详细功能
→ 阅读 [README.md](README.md)

## 🔄 工作流程

### 开发模式
```bash
npm install          # 安装依赖
node server.js       # 启动服务器
# 访问 http://localhost:3000
```

### 生产部署（Windows）
```bash
install.bat          # 运行安装向导
# 选择 "安装为系统服务"
```

### 生产部署（Linux/树莓派）
```bash
bash install.sh      # 运行安装向导
# 选择对应的安装方式
```

## 📊 数据流

```
设备 (Modbus RTU/TCP)
    ↓
modbusManager.js (数据采集)
    ↓
database.js (数据存储)
    ↓
server.js (WebSocket 推送)
    ↓
前端 (实时显示)
```

## 🔐 权限要求

### Windows
- 安装/卸载服务：需要管理员权限
- 启动/停止服务：需要管理员权限
- 运行开发模式：普通用户权限

### Linux
- 安装/卸载服务：需要 sudo
- 管理服务：需要 sudo
- 串口访问：需要 dialout 组权限
- 运行开发模式：普通用户权限

## 🌟 推荐配置

### 开发环境
- 运行方式：`node server.js`
- 适合：开发、测试、调试

### 生产环境（Windows）
- 运行方式：Windows 服务
- 脚本：`scripts/windows/install-service.bat`

### 生产环境（Linux）
- 运行方式：systemd 服务
- 脚本：`scripts/linux/install-service.sh`

### 生产环境（树莓派）
- 运行方式：systemd 服务（优化配置）
- 脚本：`scripts/linux/install-raspberry-pi.sh` ⭐

## 📦 依赖包

主要依赖：
- `express` - Web 服务器
- `modbus-serial` - Modbus 通信
- `sql.js` - SQLite 数据库
- `ws` - WebSocket
- `systeminformation` - 系统信息
- `node-windows` - Windows 服务（仅 Windows）

## 🔧 配置文件

- `package.json` - npm 配置
- `.gitignore` - Git 忽略规则
- `modbus.db` - 数据库（自动生成）

## 📝 日志位置

### Windows 服务
```
C:\ProgramData\Modbus RTU Manager\daemon\
```

### Linux 服务
```bash
sudo journalctl -u modbus-rtu-manager -f
```

### 开发模式
控制台输出

---

**需要帮助？** 查看 [docs/](docs/) 目录中的详细文档！
