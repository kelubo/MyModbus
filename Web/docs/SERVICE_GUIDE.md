# Modbus RTU Manager 服务安装指南

## 概述

本系统支持在 Windows 和 Linux 系统上作为系统服务运行，实现开机自动启动功能。

---

# Windows 系统

## 安装步骤

### 1. 安装服务

**方法一：使用批处理文件（推荐）**

1. 右键点击 `install-service.bat`
2. 选择"以管理员身份运行"
3. 等待安装完成

**方法二：使用命令行**

以管理员身份打开 PowerShell 或命令提示符：

```bash
node install-service.js
```

### 2. 验证安装

安装成功后，服务会自动启动。你可以：

1. 打开浏览器访问 http://localhost:3000
2. 打开"服务"管理器（Win+R，输入 services.msc）
3. 查找"Modbus RTU Manager"服务

## 服务管理

### 启动服务

**方法一：使用批处理文件**
- 右键点击 `start-service.bat`，选择"以管理员身份运行"

**方法二：使用服务管理器**
1. Win+R，输入 `services.msc`
2. 找到"Modbus RTU Manager"
3. 右键选择"启动"

**方法三：使用命令行**
```bash
net start "Modbus RTU Manager"
```

### 停止服务

**方法一：使用批处理文件**
- 右键点击 `stop-service.bat`，选择"以管理员身份运行"

**方法二：使用服务管理器**
1. Win+R，输入 `services.msc`
2. 找到"Modbus RTU Manager"
3. 右键选择"停止"

**方法三：使用命令行**
```bash
net stop "Modbus RTU Manager"
```

### 卸载服务

**方法一：使用批处理文件**
1. 右键点击 `uninstall-service.bat`
2. 选择"以管理员身份运行"
3. 等待卸载完成

**方法二：使用命令行**

以管理员身份运行：

```bash
node uninstall-service.js
```

## 服务特性

- ✅ 开机自动启动
- ✅ 后台运行，不需要保持命令行窗口
- ✅ 崩溃自动重启
- ✅ 系统日志记录
- ✅ 可通过 Windows 服务管理器管理

## 日志位置

服务运行日志位于：
```
C:\ProgramData\Modbus RTU Manager\daemon\
```

## 常见问题

### Q: 安装失败，提示权限不足
**A:** 必须以管理员身份运行安装脚本

### Q: 服务无法启动
**A:** 检查：
1. Node.js 是否正确安装
2. 端口 3000 是否被占用
3. 查看服务日志文件

### Q: 如何修改端口
**A:** 编辑 `install-service.js` 文件中的 PORT 环境变量，然后重新安装服务

### Q: 如何查看服务状态
**A:** 
1. 打开服务管理器（services.msc）
2. 找到"Modbus RTU Manager"
3. 查看状态列

## 开发模式 vs 服务模式

### 开发模式（不安装服务）
```bash
node server.js
```
- 适合开发和测试
- 需要保持命令行窗口
- 关闭窗口后服务停止

### 服务模式（安装为服务）
```bash
# 安装后自动运行
```
- 适合生产环境
- 后台运行
- 开机自动启动
- 崩溃自动恢复

## 注意事项

1. 安装/卸载服务需要管理员权限
2. 修改代码后需要重启服务才能生效
3. 服务模式下，console.log 输出会记录到日志文件
4. 建议在生产环境使用服务模式，开发时使用普通模式

---

# Linux 系统

## 安装步骤

### 1. 安装服务

**使用安装脚本：**

```bash
# 添加执行权限
chmod +x install-service.sh

# 以 root 权限运行安装脚本
sudo bash install-service.sh
```

安装脚本会自动：
- 创建 systemd 服务文件
- 启用开机自启
- 启动服务

### 2. 验证安装

```bash
# 查看服务状态
sudo systemctl status modbus-rtu-manager

# 或使用快捷脚本
bash status-service.sh
```

访问 http://localhost:3000 验证服务是否正常运行

## 服务管理

### 启动服务

```bash
# 方法一：使用脚本
bash start-service.sh

# 方法二：使用 systemctl
sudo systemctl start modbus-rtu-manager
```

### 停止服务

```bash
# 方法一：使用脚本
bash stop-service.sh

# 方法二：使用 systemctl
sudo systemctl stop modbus-rtu-manager
```

### 重启服务

```bash
# 方法一：使用脚本
bash restart-service.sh

# 方法二：使用 systemctl
sudo systemctl restart modbus-rtu-manager
```

### 查看服务状态

```bash
# 方法一：使用脚本
bash status-service.sh

# 方法二：使用 systemctl
sudo systemctl status modbus-rtu-manager
```

### 查看日志

```bash
# 方法一：使用脚本（实时日志）
bash logs-service.sh

# 方法二：使用 journalctl
sudo journalctl -u modbus-rtu-manager -f

# 查看最近100行日志
sudo journalctl -u modbus-rtu-manager -n 100

# 查看今天的日志
sudo journalctl -u modbus-rtu-manager --since today
```

### 卸载服务

```bash
# 添加执行权限（如果需要）
chmod +x uninstall-service.sh

# 运行卸载脚本
sudo bash uninstall-service.sh
```

## 服务特性

- ✅ 开机自动启动
- ✅ 后台运行
- ✅ 崩溃自动重启（10秒后）
- ✅ 系统日志集成（journalctl）
- ✅ 可通过 systemctl 管理

## 服务文件位置

服务配置文件：
```
/etc/systemd/system/modbus-rtu-manager.service
```

## 日志查看

系统日志通过 journalctl 查看：

```bash
# 实时日志
sudo journalctl -u modbus-rtu-manager -f

# 最近的日志
sudo journalctl -u modbus-rtu-manager -n 100

# 今天的日志
sudo journalctl -u modbus-rtu-manager --since today

# 指定时间范围
sudo journalctl -u modbus-rtu-manager --since "2024-01-01" --until "2024-01-02"
```

## 常见问题

### Q: 安装失败，提示权限不足
**A:** 必须使用 sudo 运行安装脚本

### Q: 服务无法启动
**A:** 检查：
1. Node.js 是否正确安装：`node --version`
2. 依赖是否安装：`npm install`
3. 端口 3000 是否被占用：`sudo lsof -i :3000`
4. 查看详细日志：`sudo journalctl -u modbus-rtu-manager -n 50`

### Q: 串口权限问题
**A:** 将用户添加到 dialout 组：
```bash
sudo usermod -a -G dialout $USER
# 需要重新登录才能生效
```

### Q: 如何修改端口
**A:** 编辑服务文件：
```bash
sudo nano /etc/systemd/system/modbus-rtu-manager.service
# 修改 Environment="PORT=3000" 为其他端口
sudo systemctl daemon-reload
sudo systemctl restart modbus-rtu-manager
```

### Q: 如何查看服务是否开机自启
**A:** 
```bash
sudo systemctl is-enabled modbus-rtu-manager
# 输出 "enabled" 表示已启用开机自启
```

### Q: 如何禁用开机自启（但不卸载服务）
**A:** 
```bash
sudo systemctl disable modbus-rtu-manager
```

### Q: 如何重新启用开机自启
**A:** 
```bash
sudo systemctl enable modbus-rtu-manager
```

## 脚本文件说明

| 脚本文件 | 说明 | 需要 sudo |
|---------|------|----------|
| install-service.sh | 安装服务 | 是 |
| uninstall-service.sh | 卸载服务 | 是 |
| start-service.sh | 启动服务 | 是 |
| stop-service.sh | 停止服务 | 是 |
| restart-service.sh | 重启服务 | 是 |
| status-service.sh | 查看状态 | 是 |
| logs-service.sh | 查看日志 | 是 |

**使用前添加执行权限：**
```bash
chmod +x *.sh
```

---

# 跨平台说明

## 开发模式 vs 服务模式

### 开发模式（不安装服务）
```bash
node server.js
# 或
npm start
```
- 适合开发和测试
- 需要保持终端窗口
- 关闭终端后服务停止
- 跨平台通用

### 服务模式（安装为系统服务）

**Windows:**
```bash
# 右键以管理员身份运行
install-service.bat
```

**Linux:**
```bash
sudo bash install-service.sh
```

- 适合生产环境
- 后台运行
- 开机自动启动
- 崩溃自动恢复

## 技术支持

如有问题，请检查：
1. Node.js 版本是否 >= 14.0
2. 所有依赖是否正确安装（npm install）
3. 防火墙是否允许端口 3000
4. 服务日志文件中的错误信息

**Windows 日志位置：**
```
C:\ProgramData\Modbus RTU Manager\daemon\
```

**Linux 日志查看：**
```bash
sudo journalctl -u modbus-rtu-manager -f
```
