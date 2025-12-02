# Modbus RTU Manager 快速开始指南

## 🍓 树莓派用户看这里！

如果你使用树莓派，推荐使用一键安装脚本：

```bash
chmod +x install-raspberry-pi.sh
sudo bash install-raspberry-pi.sh
```

脚本会自动完成所有配置，包括 Node.js 安装、串口权限、服务安装等。

详细说明：[RASPBERRY_PI_GUIDE.md](RASPBERRY_PI_GUIDE.md)

---

## 一、安装依赖

```bash
npm install
```

## 二、运行方式选择

### 方式1：开发模式（临时运行）

适合：开发、测试

```bash
# 启动服务器
node server.js

# 或使用 npm
npm start
```

访问：http://localhost:3000

**特点：**
- ✅ 快速启动
- ❌ 关闭终端后停止
- ❌ 不会开机自启

---

### 方式2：系统服务（生产环境）

适合：生产环境、嵌入式设备

#### Windows 系统

```bash
# 1. 右键点击 install-service.bat
# 2. 选择"以管理员身份运行"
# 3. 等待安装完成
```

#### Linux 系统

```bash
# 添加执行权限
chmod +x *.sh

# 安装服务
sudo bash install-service.sh
```

**特点：**
- ✅ 开机自动启动
- ✅ 后台运行
- ✅ 崩溃自动重启
- ✅ 系统日志记录

---

## 三、基本使用

### 1. 添加设备

1. 打开浏览器访问 http://localhost:3000
2. 点击"添加设备"按钮
3. 选择连接类型：
   - **Modbus RTU**：串口连接
   - **Modbus TCP**：网络连接
4. 填写设备信息
5. 点击"保存"

### 2. 启动数据采集

1. 确保设备已添加并启用
2. 点击"启动采集"按钮
3. 系统开始自动采集数据

### 3. 查看数据

- **设备管理**：查看设备列表和状态
- **数据图表**：查看实时数据和历史曲线
- **系统监控**：查看服务器 CPU、内存、磁盘、网络状态

### 4. 高级功能

- **修改连接IP**：修改系统连接到 TCP 设备的 IP 地址
- **设置设备IP**：通过 Modbus 写入寄存器修改设备自身的 IP 地址

---

## 四、服务管理

### Windows

| 操作 | 命令 |
|-----|------|
| 安装服务 | 右键运行 `install-service.bat`（管理员） |
| 启动服务 | 右键运行 `start-service.bat`（管理员） |
| 停止服务 | 右键运行 `stop-service.bat`（管理员） |
| 卸载服务 | 右键运行 `uninstall-service.bat`（管理员） |

### Linux

| 操作 | 命令 |
|-----|------|
| 安装服务 | `sudo bash install-service.sh` |
| 启动服务 | `bash start-service.sh` |
| 停止服务 | `bash stop-service.sh` |
| 重启服务 | `bash restart-service.sh` |
| 查看状态 | `bash status-service.sh` |
| 查看日志 | `bash logs-service.sh` |
| 卸载服务 | `sudo bash uninstall-service.sh` |

---

## 五、常见问题

### Q1: 无法连接串口

**Windows:**
- 检查串口号（如 COM1, COM2）
- 确保串口未被其他程序占用

**Linux:**
- 检查串口路径（如 /dev/ttyUSB0）
- 添加串口权限：
  ```bash
  sudo usermod -a -G dialout $USER
  # 重新登录后生效
  ```

### Q2: 端口 3000 被占用

**查看占用：**

Windows:
```bash
netstat -ano | findstr :3000
```

Linux:
```bash
sudo lsof -i :3000
```

**修改端口：**

编辑 `server.js` 或设置环境变量：
```bash
PORT=8080 node server.js
```

### Q3: 服务无法启动

**检查步骤：**
1. 确认 Node.js 已安装：`node --version`
2. 确认依赖已安装：`npm install`
3. 查看错误日志：
   - Windows: `C:\ProgramData\Modbus RTU Manager\daemon\`
   - Linux: `sudo journalctl -u modbus-rtu-manager -n 50`

### Q4: 数据采集失败

**检查：**
1. 设备连接是否正常
2. 从站 ID 是否正确
3. 寄存器地址是否正确
4. 波特率/IP地址是否匹配
5. 查看浏览器控制台错误信息

---

## 六、推荐配置

### 开发环境
- 运行方式：`node server.js` 或 `npm start`
- 便于调试和修改代码

### 生产环境
- 运行方式：系统服务
- 稳定可靠，开机自启

### 嵌入式设备（树莓派、工控机）
- 运行方式：系统服务（推荐）
- 或使用 PM2 进程管理

---

## 七、更多帮助

- 详细文档：[README.md](README.md)
- 服务安装：[SERVICE_GUIDE.md](SERVICE_GUIDE.md)
- 中文说明：[使用说明.md](使用说明.md)

---

## 八、技术支持

遇到问题？

1. 查看日志文件
2. 检查网络连接
3. 验证设备配置
4. 查阅文档

**祝使用愉快！** 🚀
