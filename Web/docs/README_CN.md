# Modbus RTU 设备管理系统

一个基于Node.js的Web应用程序，用于嵌入式系统的Modbus RTU设备管理，实现设备增删查改、定期数据采集和图形化显示。

## ✅ 系统状态

**服务器已启动并运行在：http://localhost:3000**

## 核心功能

- ✅ **设备管理**：添加、编辑、删除Modbus RTU设备
- ✅ **数据采集**：定期自动采集设备数据
- ✅ **实时监控**：WebSocket实时推送数据更新
- ✅ **图形化显示**：Canvas绘制实时数据曲线
- ✅ **数据持久化**：SQLite数据库存储
- ✅ **多设备支持**：支持多个串口和多个从站设备

## 技术栈

- **后端**：Node.js + Express
- **数据库**：SQLite (sql.js)
- **通信协议**：Modbus RTU (modbus-serial)
- **实时通信**：WebSocket (ws)
- **前端**：原生JavaScript + Canvas

## 快速开始

### 访问系统

```
http://localhost:3000
```

### 停止服务器

在命令行窗口按 `Ctrl + C`

### 重新启动

```bash
npm start
```

或直接运行：
```bash
node server.js
```

## 项目结构

```
modbus-rtu-manager/
├── server.js              # Express服务器主文件
├── database.js            # SQLite数据库操作
├── modbusManager.js       # Modbus通信管理
├── package.json           # 项目配置和依赖
├── modbus.db             # SQLite数据库文件
├── public/               # 前端静态文件
│   ├── index.html        # 主页面
│   ├── app.js            # 前端JavaScript
│   └── style.css         # 样式文件
├── README.md             # 英文文档
├── README_CN.md          # 中文文档（本文件）
├── START.md              # 快速启动指南
└── 使用说明.md           # 详细使用说明
```

## 使用流程

### 1. 添加设备

1. 点击"添加设备"按钮
2. 填写设备配置信息
3. 点击"保存"

### 2. 启动采集

1. 确保设备已正确配置
2. 点击"启动采集"按钮
3. 系统自动开始采集数据

### 3. 查看数据

1. 切换到"数据图表"标签页
2. 查看实时数值和历史曲线

## 设备配置参数

| 参数 | 说明 | 示例 |
|------|------|------|
| 设备名称 | 自定义标识 | 温度传感器 |
| 从站ID | Modbus从站地址 | 1-247 |
| 串口 | 串口设备路径 | COM1 (Windows)<br>/dev/ttyUSB0 (Linux) |
| 波特率 | 通信速率 | 9600, 19200, 38400, 57600, 115200 |
| 寄存器地址 | 起始地址 | 0, 100, 1000 等 |
| 寄存器数量 | 连续读取数量 | 1, 2, 10 等 |
| 数据类型 | 寄存器类型 | 保持寄存器、输入寄存器、线圈、离散输入 |
| 采集间隔 | 采集周期（毫秒） | 5000（建议≥5000） |
| 启用状态 | 是否启用采集 | 启用/禁用 |

## 查看可用串口

### Windows
```powershell
# 设备管理器 → 端口(COM和LPT)
# 或使用命令
Get-WmiObject Win32_SerialPort | Select-Object Name, DeviceID
```

### Linux
```bash
ls /dev/tty*
# 或
dmesg | grep tty
```

## 常见问题

### 无法读取设备数据

**检查清单：**
- [ ] 串口号是否正确
- [ ] 波特率是否匹配
- [ ] 从站ID是否正确
- [ ] 寄存器地址是否正确
- [ ] 设备是否正确连接
- [ ] 串口是否被占用

### Linux串口权限

```bash
# 添加用户到dialout组
sudo usermod -a -G dialout $USER
# 重新登录生效

# 或临时授权
sudo chmod 666 /dev/ttyUSB0
```

### 端口被占用

修改 `server.js` 中的端口号：
```javascript
const PORT = process.env.PORT || 3000;  // 改为其他端口
```

## 嵌入式部署

### 树莓派/工控机

1. **安装Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **克隆项目并安装依赖**
```bash
cd /home/pi/
git clone <your-repo>
cd modbus-rtu-manager
npm install
```

3. **配置开机自启动（使用systemd）**

创建服务文件 `/etc/systemd/system/modbus-manager.service`：
```ini
[Unit]
Description=Modbus RTU Manager
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/modbus-rtu-manager
ExecStart=/usr/bin/node /home/pi/modbus-rtu-manager/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable modbus-manager
sudo systemctl start modbus-manager
sudo systemctl status modbus-manager
```

## 扩展功能建议

- [ ] 数据导出（CSV/Excel）
- [ ] 报警阈值设置
- [ ] 邮件/短信通知
- [ ] 历史数据查询
- [ ] 用户认证
- [ ] 数据统计分析
- [ ] 远程控制（写寄存器）
- [ ] 多语言支持
- [ ] 移动端适配

## 性能优化

- 使用Redis缓存实时数据
- 定期清理历史数据
- 数据库索引优化
- WebSocket连接池管理

## 安全建议

- 添加用户认证
- 使用HTTPS
- 限制访问IP
- 定期备份数据库
- 日志审计

## 许可证

MIT License

## 技术支持

- 详细使用说明：`使用说明.md`
- 快速启动指南：`START.md`
- 英文文档：`README.md`

---

**开发者提示：** 如果需要修改代码，建议使用开发模式：
```bash
npm run dev  # 需要先安装 nodemon
```
