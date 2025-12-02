# 项目文件说明

## 核心文件

| 文件 | 说明 |
|-----|------|
| server.js | Express 服务器主文件 |
| database.js | SQLite 数据库操作 |
| modbusManager.js | Modbus 通信管理 |
| package.json | 项目依赖配置 |
| modbus.db | SQLite 数据库文件（自动生成） |

## 前端文件

| 文件 | 说明 |
|-----|------|
| public/index.html | 主页面 |
| public/app.js | 前端 JavaScript |
| public/style.css | 样式文件 |

## Windows 服务文件

| 文件 | 说明 | 需要管理员 |
|-----|------|-----------|
| install-service.bat | 安装服务（批处理） | 是 |
| install-service.js | 安装服务（Node.js） | 是 |
| uninstall-service.bat | 卸载服务（批处理） | 是 |
| uninstall-service.js | 卸载服务（Node.js） | 是 |
| start-service.bat | 启动服务 | 是 |
| stop-service.bat | 停止服务 | 是 |

## Linux 服务文件

| 文件 | 说明 | 需要 sudo |
|-----|------|-----------|
| install-service.sh | 安装服务（通用） | 是 |
| install-raspberry-pi.sh | 树莓派一键安装（推荐） | 是 |
| uninstall-service.sh | 卸载服务 | 是 |
| start-service.sh | 启动服务 | 是 |
| stop-service.sh | 停止服务 | 是 |
| restart-service.sh | 重启服务 | 是 |
| status-service.sh | 查看状态 | 是 |
| logs-service.sh | 查看日志 | 是 |
| check-system.sh | 系统检测工具 | 否 |

## 文档文件

| 文件 | 说明 |
|-----|------|
| README.md | 项目主文档 |
| README_CN.md | 项目文档（中文） |
| SERVICE_GUIDE.md | 服务安装详细指南（Windows + Linux） |
| RASPBERRY_PI_GUIDE.md | 树莓派部署完整指南 ⭐ |
| QUICK_START.md | 快速开始指南 |
| INSTALL.md | 安装说明 |
| FILES_OVERVIEW.md | 本文件 - 文件说明 |
| START.md | 启动说明 |
| 使用说明.md | 使用说明（中文） |

## 配置文件

| 文件 | 说明 |
|-----|------|
| .gitignore | Git 忽略文件配置 |
| package.json | npm 依赖配置 |
| package-lock.json | npm 依赖锁定文件 |

## 目录结构

```
modbus-rtu-manager/
├── server.js                    # 服务器主文件
├── database.js                  # 数据库操作
├── modbusManager.js            # Modbus 管理
├── package.json                # 依赖配置
├── modbus.db                   # 数据库文件
│
├── public/                     # 前端文件
│   ├── index.html             # 主页面
│   ├── app.js                 # 前端脚本
│   └── style.css              # 样式文件
│
├── Windows 服务脚本/
│   ├── install-service.bat    # 安装服务
│   ├── install-service.js     # 安装脚本
│   ├── uninstall-service.bat  # 卸载服务
│   ├── uninstall-service.js   # 卸载脚本
│   ├── start-service.bat      # 启动服务
│   └── stop-service.bat       # 停止服务
│
├── Linux 服务脚本/
│   ├── install-service.sh     # 安装服务
│   ├── uninstall-service.sh   # 卸载服务
│   ├── start-service.sh       # 启动服务
│   ├── stop-service.sh        # 停止服务
│   ├── restart-service.sh     # 重启服务
│   ├── status-service.sh      # 查看状态
│   └── logs-service.sh        # 查看日志
│
└── 文档/
    ├── README.md              # 主文档
    ├── README_CN.md           # 中文文档
    ├── SERVICE_GUIDE.md       # 服务指南
    ├── QUICK_START.md         # 快速开始
    ├── FILES_OVERVIEW.md      # 文件说明
    └── 使用说明.md            # 使用说明
```

## 使用建议

### 开发阶段
- 使用 `node server.js` 或 `npm start` 运行
- 修改代码后手动重启

### 生产部署
- Windows: 使用 `install-service.bat` 安装服务
- Linux: 使用 `install-service.sh` 安装服务
- 实现开机自启和自动恢复

### 文档查阅顺序
1. **QUICK_START.md** - 快速上手
2. **README.md** - 详细功能说明
3. **SERVICE_GUIDE.md** - 服务安装和管理
4. **使用说明.md** - 中文使用指南

## 注意事项

1. **权限要求**
   - Windows: 服务安装需要管理员权限
   - Linux: 服务安装需要 sudo 权限

2. **脚本执行权限**
   - Linux 脚本需要添加执行权限：`chmod +x *.sh`

3. **端口占用**
   - 默认端口：3000
   - 可通过环境变量修改：`PORT=8080 node server.js`

4. **串口权限（Linux）**
   - 需要将用户添加到 dialout 组
   - 命令：`sudo usermod -a -G dialout $USER`

5. **依赖安装**
   - 首次运行前必须执行：`npm install`

## 更新日志

### 最新功能
- ✅ 支持 Modbus RTU 和 Modbus TCP
- ✅ 系统监控（CPU、内存、磁盘、网络）
- ✅ 修改设备 IP 地址功能
- ✅ Windows 服务支持
- ✅ Linux systemd 服务支持
- ✅ 开机自动启动
- ✅ 崩溃自动恢复

## 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite3
- **通信**: Modbus RTU/TCP (modbus-serial)
- **实时通信**: WebSocket
- **系统信息**: systeminformation
- **Windows 服务**: node-windows
- **Linux 服务**: systemd
- **前端**: 原生 JavaScript + Canvas

## 支持平台

- ✅ Windows 10/11
- ✅ Windows Server
- ✅ Linux (Ubuntu, Debian, CentOS, etc.)
- ✅ 树莓派 (Raspberry Pi OS)
- ✅ 其他支持 Node.js 的平台
